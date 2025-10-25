/**
 * Inventory Audit Routes
 * Handles periodic inventory verification, reconciliation, and adjustment workflows
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated, isStaffOrAdmin, isAdmin } = require('../middleware/auth');

module.exports = (pool, convertBigIntToNumber) => {
    
    // ===============================================
    // INVENTORY AUDIT MODULE
    // ===============================================
    
    /**
     * GET /inventory/audit - Main audit interface
     * Display active audits and ability to create new audit
     */
    router.get('/inventory/audit', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            // Get active audits
            const activeAudits = await conn.query(`
                SELECT ia.*, 
                       w.name as warehouse_name,
                       COUNT(DISTINCT iad.id) as discrepancy_count,
                       SUM(CASE WHEN iad.status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
                       u.fullName as created_by_name
                FROM inventory_audits ia
                LEFT JOIN warehouses w ON ia.warehouse_id = w.warehouse_id
                LEFT JOIN audit_discrepancies iad ON ia.audit_id = iad.audit_id
                LEFT JOIN users u ON ia.created_by = u.id
                WHERE ia.status IN ('in_progress', 'pending_approval')
                GROUP BY ia.audit_id
                ORDER BY ia.created_at DESC
            `);
            
            // Get completed audits (recent 10)
            const completedAudits = await conn.query(`
                SELECT ia.*, 
                       w.name as warehouse_name,
                       COUNT(DISTINCT iad.id) as discrepancy_count,
                       u.fullName as created_by_name,
                       u2.fullName as approved_by_name
                FROM inventory_audits ia
                LEFT JOIN warehouses w ON ia.warehouse_id = w.warehouse_id
                LEFT JOIN audit_discrepancies iad ON ia.audit_id = iad.audit_id
                LEFT JOIN users u ON ia.created_by = u.id
                LEFT JOIN users u2 ON ia.approved_by = u2.id
                WHERE ia.status = 'completed'
                GROUP BY ia.audit_id
                ORDER BY ia.completed_at DESC
                LIMIT 10
            `);
            
            // Get warehouses for dropdown
            const warehouses = await conn.query(`
                SELECT warehouse_id, name, address, city
                FROM warehouses
                WHERE is_active = TRUE
                ORDER BY name
            `);
            
            res.render('inventory/audit', {
                title: 'Inventory Audit',
                activeAudits: convertBigIntToNumber(activeAudits),
                completedAudits: convertBigIntToNumber(completedAudits),
                warehouses: convertBigIntToNumber(warehouses),
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error'),
                    warning: req.flash('warning')
                },
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Audit listing error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /inventory/audit - Create new audit
     * Generates audit worksheet by location
     */
    router.post('/inventory/audit', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const { warehouse_id, zone_id, audit_type, notes } = req.body;
            
            // Validate inputs
            if (!warehouse_id || !audit_type) {
                await conn.rollback();
                req.flash('error', 'Warehouse and audit type are required');
                return res.redirect('/inventory/audit');
            }
            
            // Create audit record
            const auditResult = await conn.query(`
                INSERT INTO inventory_audits 
                (warehouse_id, zone_id, audit_type, status, created_by, notes, created_at)
                VALUES (?, ?, ?, 'in_progress', ?, ?, NOW())
            `, [warehouse_id, zone_id || null, audit_type, req.session.user.id, notes || null]);
            
            const auditId = auditResult.insertId;
            
            // Generate audit worksheet items
            let worksheetQuery = `
                INSERT INTO audit_worksheet 
                (audit_id, product_id, warehouse_id, zone_id, system_quantity, bin_location, created_at)
                SELECT ?, wpl.product_id, wpl.warehouse_id, wpl.zone_id, wpl.quantity,
                       CONCAT_WS('-', wpl.aisle, wpl.shelf, wpl.bin) as bin_location,
                       NOW()
                FROM warehouse_product_locations wpl
                WHERE wpl.warehouse_id = ?
            `;
            
            const worksheetParams = [auditId, warehouse_id];
            
            if (zone_id) {
                worksheetQuery += ' AND wpl.zone_id = ?';
                worksheetParams.push(zone_id);
            }
            
            await conn.query(worksheetQuery, worksheetParams);
            
            await conn.commit();
            
            req.flash('success', `Audit ${auditId} created successfully. Start counting inventory.`);
            res.redirect(`/inventory/audit/${auditId}`);
            
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Create audit error:', err);
            req.flash('error', 'Failed to create audit: ' + err.message);
            res.redirect('/inventory/audit');
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * GET /inventory/audit/:auditId - View audit details and worksheet
     */
    router.get('/inventory/audit/:auditId', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const auditId = req.params.auditId;
            
            // Get audit header
            const [audit] = await conn.query(`
                SELECT ia.*, 
                       w.name as warehouse_name,
                       wz.name as zone_name,
                       u.fullName as created_by_name,
                       u2.fullName as approved_by_name
                FROM inventory_audits ia
                LEFT JOIN warehouses w ON ia.warehouse_id = w.warehouse_id
                LEFT JOIN warehouse_zones wz ON ia.zone_id = wz.zone_id
                LEFT JOIN users u ON ia.created_by = u.id
                LEFT JOIN users u2 ON ia.approved_by = u2.id
                WHERE ia.audit_id = ?
            `, [auditId]);
            
            if (!audit) {
                req.flash('error', 'Audit not found');
                return res.redirect('/inventory/audit');
            }
            
            // Get worksheet items with product details
            const worksheetItems = await conn.query(`
                SELECT aw.*, 
                       s.device_name, s.device_maker,
                       CASE 
                           WHEN aw.counted_quantity IS NOT NULL THEN aw.counted_quantity - aw.system_quantity
                           ELSE NULL
                       END as variance,
                       CASE
                           WHEN aw.counted_quantity IS NOT NULL AND ABS(aw.counted_quantity - aw.system_quantity) > (aw.system_quantity * 0.1) THEN 1
                           ELSE 0
                       END as is_major_discrepancy
                FROM audit_worksheet aw
                LEFT JOIN specs_db s ON aw.product_id = s.product_id
                WHERE aw.audit_id = ?
                ORDER BY s.device_name
            `, [auditId]);
            
            // Get discrepancies
            const discrepancies = await conn.query(`
                SELECT ad.*, 
                       s.device_name, s.device_maker,
                       u.fullName as investigated_by_name
                FROM audit_discrepancies ad
                LEFT JOIN specs_db s ON ad.product_id = s.product_id
                LEFT JOIN users u ON ad.investigated_by = u.id
                WHERE ad.audit_id = ?
                ORDER BY ad.created_at DESC
            `, [auditId]);
            
            // Calculate statistics
            const totalItems = worksheetItems.length;
            const countedItems = worksheetItems.filter(i => i.counted_quantity !== null).length;
            const discrepancyCount = worksheetItems.filter(i => i.variance && i.variance !== 0).length;
            const majorDiscrepancyCount = worksheetItems.filter(i => i.is_major_discrepancy).length;
            
            res.render('inventory/audit-detail', {
                title: `Audit ${auditId} - ${audit.warehouse_name}`,
                audit: convertBigIntToNumber(audit),
                worksheetItems: convertBigIntToNumber(worksheetItems),
                discrepancies: convertBigIntToNumber(discrepancies),
                stats: {
                    totalItems,
                    countedItems,
                    discrepancyCount,
                    majorDiscrepancyCount,
                    percentComplete: totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0
                },
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error'),
                    warning: req.flash('warning')
                },
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('Audit detail error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /inventory/audit/:auditId/count - Record physical count
     */
    router.post('/inventory/audit/:auditId/count', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const auditId = req.params.auditId;
            const { worksheet_id, counted_quantity, count_notes } = req.body;
            
            // Validate audit is in progress
            const [audit] = await conn.query(`
                SELECT status FROM inventory_audits WHERE audit_id = ?
            `, [auditId]);
            
            if (!audit || audit.status !== 'in_progress') {
                await conn.rollback();
                return res.status(400).json({ 
                    success: false, 
                    error: 'Audit is not in progress' 
                });
            }
            
            // Update worksheet item
            await conn.query(`
                UPDATE audit_worksheet 
                SET counted_quantity = ?, 
                    count_notes = ?,
                    counted_at = NOW(),
                    counted_by = ?
                WHERE id = ? AND audit_id = ?
            `, [counted_quantity, count_notes || null, req.session.user.id, worksheet_id, auditId]);
            
            // Get updated item to check for discrepancy
            const [item] = await conn.query(`
                SELECT * FROM audit_worksheet WHERE id = ?
            `, [worksheet_id]);
            
            const variance = counted_quantity - item.system_quantity;
            
            // If major discrepancy (>10%), create discrepancy record
            if (Math.abs(variance) > (item.system_quantity * 0.1)) {
                await conn.query(`
                    INSERT INTO audit_discrepancies 
                    (audit_id, product_id, warehouse_id, zone_id, system_quantity, counted_quantity, 
                     variance, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
                `, [auditId, item.product_id, item.warehouse_id, item.zone_id, 
                    item.system_quantity, counted_quantity, variance]);
            }
            
            await conn.commit();
            
            res.json({ 
                success: true, 
                variance,
                isMajorDiscrepancy: Math.abs(variance) > (item.system_quantity * 0.1)
            });
            
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Record count error:', err);
            res.status(500).json({ success: false, error: 'Failed to record count' });
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * GET /inventory/audit/reconciliation - Reconciliation page
     */
    router.get('/inventory/audit/:auditId/reconciliation', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const auditId = req.params.auditId;
            
            // Get audit
            const [audit] = await conn.query(`
                SELECT ia.*, w.name as warehouse_name
                FROM inventory_audits ia
                LEFT JOIN warehouses w ON ia.warehouse_id = w.warehouse_id
                WHERE ia.audit_id = ?
            `, [auditId]);
            
            if (!audit) {
                req.flash('error', 'Audit not found');
                return res.redirect('/inventory/audit');
            }
            
            // Get all discrepancies
            const discrepancies = await conn.query(`
                SELECT ad.*, 
                       s.device_name, s.device_maker,
                       wz.name as zone_name
                FROM audit_discrepancies ad
                LEFT JOIN specs_db s ON ad.product_id = s.product_id
                LEFT JOIN warehouse_zones wz ON ad.zone_id = wz.zone_id
                WHERE ad.audit_id = ?
                ORDER BY ABS(ad.variance) DESC
            `, [auditId]);
            
            res.render('inventory/audit-reconciliation', {
                title: `Reconciliation - Audit ${auditId}`,
                audit: convertBigIntToNumber(audit),
                discrepancies: convertBigIntToNumber(discrepancies),
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error'),
                    warning: req.flash('warning')
                },
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('Reconciliation page error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /inventory/audit/reconciliation - Process reconciliation
     */
    router.post('/inventory/audit/:auditId/reconciliation', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const auditId = req.params.auditId;
            const { discrepancy_id, action, adjustment_reason, resolution_notes } = req.body;
            
            // Get discrepancy
            const [discrepancy] = await conn.query(`
                SELECT * FROM audit_discrepancies WHERE id = ?
            `, [discrepancy_id]);
            
            if (!discrepancy) {
                await conn.rollback();
                return res.status(404).json({ success: false, error: 'Discrepancy not found' });
            }
            
            if (action === 'adjust') {
                // Apply inventory adjustment
                const adjustmentQty = discrepancy.counted_quantity - discrepancy.system_quantity;
                
                // Update warehouse product location
                await conn.query(`
                    UPDATE warehouse_product_locations 
                    SET quantity = quantity + ?,
                        updated_at = NOW()
                    WHERE product_id = ? AND warehouse_id = ? AND zone_id = ?
                `, [adjustmentQty, discrepancy.product_id, discrepancy.warehouse_id, discrepancy.zone_id]);
                
                // Update main inventory
                await conn.query(`
                    UPDATE specs_db 
                    SET device_inventory = device_inventory + ?
                    WHERE product_id = ?
                `, [adjustmentQty, discrepancy.product_id]);
                
                // Log adjustment
                await conn.query(`
                    INSERT INTO inventory_log 
                    (product_id, transaction_type, quantity_changed, new_inventory_level,
                     warehouse_id, zone_id, notes, transaction_date)
                    SELECT ?, 'audit_adjustment', ?, device_inventory, ?, ?, ?, NOW()
                    FROM specs_db WHERE product_id = ?
                `, [discrepancy.product_id, adjustmentQty, discrepancy.warehouse_id, 
                    discrepancy.zone_id, `Audit ${auditId} adjustment: ${adjustment_reason}`, 
                    discrepancy.product_id]);
                
                // Update discrepancy status
                await conn.query(`
                    UPDATE audit_discrepancies 
                    SET status = 'resolved',
                        adjustment_applied = TRUE,
                        adjustment_reason = ?,
                        resolution_notes = ?,
                        investigated_by = ?,
                        resolved_at = NOW()
                    WHERE id = ?
                `, [adjustment_reason, resolution_notes || null, req.session.user.id, discrepancy_id]);
                
            } else if (action === 'accept_system') {
                // Accept system quantity as correct (no adjustment)
                await conn.query(`
                    UPDATE audit_discrepancies 
                    SET status = 'resolved',
                        adjustment_applied = FALSE,
                        resolution_notes = ?,
                        investigated_by = ?,
                        resolved_at = NOW()
                    WHERE id = ?
                `, [resolution_notes || 'System quantity accepted as correct', 
                    req.session.user.id, discrepancy_id]);
            }
            
            await conn.commit();
            
            res.json({ success: true, message: 'Discrepancy resolved successfully' });
            
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Reconciliation error:', err);
            res.status(500).json({ success: false, error: 'Failed to process reconciliation' });
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /inventory/audit/:auditId/complete - Complete audit and submit for approval
     */
    router.post('/inventory/audit/:auditId/complete', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const auditId = req.params.auditId;
            
            // Check all items are counted
            const [stats] = await conn.query(`
                SELECT 
                    COUNT(*) as total_items,
                    SUM(CASE WHEN counted_quantity IS NOT NULL THEN 1 ELSE 0 END) as counted_items,
                    COUNT(DISTINCT ad.id) as unresolved_discrepancies
                FROM audit_worksheet aw
                LEFT JOIN audit_discrepancies ad ON aw.audit_id = ad.audit_id 
                    AND ad.status = 'pending'
                WHERE aw.audit_id = ?
            `, [auditId]);
            
            if (stats.counted_items < stats.total_items) {
                await conn.rollback();
                return res.status(400).json({ 
                    success: false, 
                    error: `Only ${stats.counted_items} of ${stats.total_items} items counted. Complete all counts first.` 
                });
            }
            
            if (stats.unresolved_discrepancies > 0) {
                await conn.rollback();
                return res.status(400).json({ 
                    success: false, 
                    error: `${stats.unresolved_discrepancies} unresolved discrepancies. Resolve all discrepancies first.` 
                });
            }
            
            // Update audit status
            await conn.query(`
                UPDATE inventory_audits 
                SET status = 'pending_approval',
                    completed_at = NOW()
                WHERE audit_id = ?
            `, [auditId]);
            
            await conn.commit();
            
            req.flash('success', 'Audit completed and submitted for admin approval');
            res.redirect(`/inventory/audit/${auditId}`);
            
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Complete audit error:', err);
            req.flash('error', 'Failed to complete audit');
            res.redirect(`/inventory/audit/${auditId}`);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /inventory/audit/:auditId/approve - Admin approval
     */
    router.post('/inventory/audit/:auditId/approve', isAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const auditId = req.params.auditId;
            const { approval_notes } = req.body;
            
            // Update audit status
            await conn.query(`
                UPDATE inventory_audits 
                SET status = 'completed',
                    approved_by = ?,
                    approval_notes = ?,
                    approved_at = NOW()
                WHERE audit_id = ? AND status = 'pending_approval'
            `, [req.session.user.id, approval_notes || null, auditId]);
            
            // Update last audit date for locations
            await conn.query(`
                UPDATE warehouse_product_locations wpl
                INNER JOIN audit_worksheet aw ON wpl.product_id = aw.product_id 
                    AND wpl.warehouse_id = aw.warehouse_id 
                    AND wpl.zone_id = aw.zone_id
                SET wpl.last_audit_date = NOW()
                WHERE aw.audit_id = ?
            `, [auditId]);
            
            await conn.commit();
            
            req.flash('success', `Audit ${auditId} approved successfully`);
            res.redirect('/inventory/audit');
            
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Approve audit error:', err);
            req.flash('error', 'Failed to approve audit');
            res.redirect(`/inventory/audit/${auditId}`);
        } finally {
            if (conn) conn.release();
        }
    });
    
    return router;
};
