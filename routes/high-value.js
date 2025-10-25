/**
 * High-Value Item Tracking Routes
 * Handles enhanced security controls and chain of custody for high-value inventory items
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated, isStaffOrAdmin, isAdmin } = require('../middleware/auth');

module.exports = (pool, convertBigIntToNumber) => {
    
    // ===============================================
    // HIGH-VALUE ITEM MANAGEMENT
    // ===============================================
    
    /**
     * GET /inventory/high-value - List all high-value items
     */
    router.get('/inventory/high-value', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            // Get query parameters
            const search = req.query.search || '';
            const status = req.query.status || '';
            const threshold = req.query.threshold || '';
            
            // Build query
            let query = `
                SELECT hv.*,
                       p.name as product_name,
                       p.brand,
                       w.name as warehouse_name,
                       wz.name as zone_name,
                       u.fullName as custodian_name,
                       COALESCE(SUM(inv.available_quantity * p.price), 0) as total_value,
                       COUNT(DISTINCT cc.id) as custody_transfer_count,
                       MAX(cc.transfer_date) as last_custody_change
                FROM high_value_items hv
                LEFT JOIN products p ON hv.product_id = p.id
                LEFT JOIN inventory inv ON p.id = inv.product_id
                LEFT JOIN warehouses w ON hv.warehouse_id = w.warehouse_id
                LEFT JOIN warehouse_zones wz ON hv.zone_id = wz.zone_id
                LEFT JOIN users u ON hv.current_custodian = u.id
                LEFT JOIN custody_chain cc ON hv.item_id = cc.item_id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (search) {
                query += ` AND (p.name LIKE ? OR hv.serial_number LIKE ?)`;
                params.push(`%${search}%`, `%${search}%`);
            }
            
            if (status) {
                query += ` AND hv.status = ?`;
                params.push(status);
            }
            
            if (threshold) {
                const thresholdValue = parseFloat(threshold);
                query += ` AND p.price >= ?`;
                params.push(thresholdValue);
            }
            
            query += ` GROUP BY hv.item_id ORDER BY p.price DESC, p.name`;
            
            const highValueItems = await conn.query(query, params);
            
            // Get statistics
            const [stats] = await conn.query(`
                SELECT 
                    COUNT(DISTINCT hv.item_id) as total_items,
                    SUM(inv.available_quantity * p.price) as total_inventory_value,
                    COUNT(DISTINCT CASE WHEN hv.status = 'in_storage' THEN hv.item_id END) as items_in_storage,
                    COUNT(DISTINCT CASE WHEN hv.status = 'in_transit' THEN hv.item_id END) as items_in_transit,
                    COUNT(DISTINCT CASE WHEN hv.status = 'assigned' THEN hv.item_id END) as items_assigned
                FROM high_value_items hv
                LEFT JOIN products p ON hv.product_id = p.id
                LEFT JOIN inventory inv ON p.id = inv.product_id
            `);
            
            // Get high-value threshold configuration
            const [config] = await conn.query(`
                SELECT config_value FROM system_config 
                WHERE config_key = 'high_value_threshold'
            `);
            
            const highValueThreshold = config ? parseFloat(config.config_value) : 10000;
            
            res.render('inventory/high-value', {
                title: 'High-Value Items',
                highValueItems: convertBigIntToNumber(highValueItems),
                stats: convertBigIntToNumber(stats),
                highValueThreshold,
                filters: { search, status, threshold },
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error'),
                    warning: req.flash('warning')
                },
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('High-value items listing error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * GET /inventory/high-value/:itemId - View high-value item details
     */
    router.get('/inventory/high-value/:itemId', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const itemId = req.params.itemId;
            
            // Get item details
            const [item] = await conn.query(`
                SELECT hv.*,
                       p.name as product_name,
                       p.brand,
                       p.price as unit_value,
                       w.name as warehouse_name,
                       wz.name as zone_name,
                       u.fullName as custodian_name,
                       u.email as custodian_email
                FROM high_value_items hv
                LEFT JOIN products p ON hv.product_id = p.id
                LEFT JOIN warehouses w ON hv.warehouse_id = w.warehouse_id
                LEFT JOIN warehouse_zones wz ON hv.zone_id = wz.zone_id
                LEFT JOIN users u ON hv.current_custodian = u.id
                WHERE hv.item_id = ?
            `, [itemId]);
            
            if (!item) {
                req.flash('error', 'High-value item not found');
                return res.redirect('/inventory/high-value');
            }
            
            // Get custody chain history
            const custodyChain = await conn.query(`
                SELECT cc.*,
                       u_from.fullName as from_custodian_name,
                       u_to.fullName as to_custodian_name,
                       u_auth.fullName as authorized_by_name
                FROM custody_chain cc
                LEFT JOIN users u_from ON cc.from_custodian = u_from.id
                LEFT JOIN users u_to ON cc.to_custodian = u_to.id
                LEFT JOIN users u_auth ON cc.authorized_by = u_auth.id
                WHERE cc.item_id = ?
                ORDER BY cc.transfer_date DESC
            `, [itemId]);
            
            // Get approval history for this item
            const approvalHistory = await conn.query(`
                SELECT app.*,
                       u_req.fullName as requester_name,
                       u_app.fullName as approver_name,
                       p.name as product_name
                FROM high_value_approvals app
                LEFT JOIN users u_req ON app.requested_by = u_req.id
                LEFT JOIN users u_app ON app.approved_by = u_app.id
                LEFT JOIN products p ON app.product_id = p.id
                WHERE app.item_id = ?
                ORDER BY app.request_date DESC
            `, [itemId]);
            
            // Get audit history
            const auditHistory = await conn.query(`
                SELECT al.*,
                       u.fullName as audited_by_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.item_type = 'high_value'
                  AND al.item_id = ?
                ORDER BY al.audit_date DESC
                LIMIT 50
            `, [itemId]);
            
            res.render('inventory/high-value-details', {
                title: `High-Value Item: ${item.product_name}`,
                item: convertBigIntToNumber(item),
                custodyChain: convertBigIntToNumber(custodyChain),
                approvalHistory: convertBigIntToNumber(approvalHistory),
                auditHistory: convertBigIntToNumber(auditHistory),
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error')
                },
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('High-value item details error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    // ===============================================
    // CUSTODY TRANSFER
    // ===============================================
    
    /**
     * GET /inventory/high-value/:itemId/transfer - Transfer custody form
     */
    router.get('/inventory/high-value/:itemId/transfer', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const itemId = req.params.itemId;
            
            // Get item details
            const [item] = await conn.query(`
                SELECT hv.*,
                       p.name as product_name,
                       p.price as unit_value,
                       u.fullName as current_custodian_name
                FROM high_value_items hv
                LEFT JOIN products p ON hv.product_id = p.id
                LEFT JOIN users u ON hv.current_custodian = u.id
                WHERE hv.item_id = ?
            `, [itemId]);
            
            if (!item) {
                req.flash('error', 'High-value item not found');
                return res.redirect('/inventory/high-value');
            }
            
            // Get eligible custodians (staff and admin users)
            const eligibleUsers = await conn.query(`
                SELECT id, fullName, email, role 
                FROM users 
                WHERE role IN ('staff', 'admin') AND id != ?
                ORDER BY fullName
            `, [item.current_custodian || 0]);
            
            res.render('inventory/custody-transfer', {
                title: 'Transfer Custody',
                item: convertBigIntToNumber(item),
                eligibleUsers: convertBigIntToNumber(eligibleUsers),
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('Transfer custody form error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /inventory/high-value/:itemId/transfer - Execute custody transfer
     */
    router.post('/inventory/high-value/:itemId/transfer', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const itemId = req.params.itemId;
            const {
                to_custodian,
                transfer_reason,
                location_from,
                location_to,
                notes,
                require_approval
            } = req.body;
            
            // Get current item details
            const [item] = await conn.query(
                'SELECT * FROM high_value_items WHERE item_id = ?',
                [itemId]
            );
            
            if (!item) {
                await conn.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'High-value item not found'
                });
            }
            
            // Check if approval required based on value
            const [product] = await conn.query(
                'SELECT price FROM products WHERE id = ?',
                [item.product_id]
            );
            
            const [threshold] = await conn.query(`
                SELECT config_value FROM system_config 
                WHERE config_key = 'high_value_approval_threshold'
            `);
            
            const approvalThreshold = threshold ? parseFloat(threshold.config_value) : 50000;
            const requiresApproval = require_approval === 'true' || product.price >= approvalThreshold;
            
            if (requiresApproval && req.session.user.role !== 'admin') {
                // Create approval request
                const approvalResult = await conn.query(`
                    INSERT INTO high_value_approvals
                    (item_id, product_id, transaction_type, from_custodian, to_custodian,
                     transfer_reason, requested_by, request_date, status, notes)
                    VALUES (?, ?, 'custody_transfer', ?, ?, ?, ?, NOW(), 'pending', ?)
                `, [
                    itemId, item.product_id, item.current_custodian, to_custodian,
                    transfer_reason, req.session.user.id, notes || null
                ]);
                
                await conn.commit();
                
                return res.json({
                    success: true,
                    requiresApproval: true,
                    message: 'Custody transfer request submitted for admin approval',
                    approvalId: convertBigIntToNumber(approvalResult.insertId)
                });
            }
            
            // Execute immediate transfer (no approval required or admin user)
            const transferResult = await conn.query(`
                INSERT INTO custody_chain
                (item_id, from_custodian, to_custodian, transfer_date, transfer_reason,
                 location_from, location_to, authorized_by, notes)
                VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?)
            `, [
                itemId, item.current_custodian, to_custodian, transfer_reason,
                location_from || null, location_to || null, req.session.user.id, notes || null
            ]);
            
            // Update current custodian
            await conn.query(`
                UPDATE high_value_items 
                SET current_custodian = ?,
                    status = 'in_transit',
                    last_custody_change = NOW()
                WHERE item_id = ?
            `, [to_custodian, itemId]);
            
            // Log audit trail
            await conn.query(`
                INSERT INTO audit_logs
                (item_type, item_id, action, user_id, audit_date, details)
                VALUES ('high_value', ?, 'custody_transfer', ?, NOW(), ?)
            `, [
                itemId, req.session.user.id,
                JSON.stringify({
                    from_custodian: item.current_custodian,
                    to_custodian,
                    transfer_reason,
                    chain_id: convertBigIntToNumber(transferResult.insertId)
                })
            ]);
            
            await conn.commit();
            
            res.json({
                success: true,
                requiresApproval: false,
                message: 'Custody transferred successfully',
                transferId: convertBigIntToNumber(transferResult.insertId)
            });
            
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Transfer custody error:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to transfer custody'
            });
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /inventory/high-value/:itemId/acknowledge - Acknowledge receipt of custody
     */
    router.post('/inventory/high-value/:itemId/acknowledge', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const itemId = req.params.itemId;
            const { notes } = req.body;
            
            // Get item
            const [item] = await conn.query(
                'SELECT * FROM high_value_items WHERE item_id = ?',
                [itemId]
            );
            
            if (!item) {
                await conn.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'High-value item not found'
                });
            }
            
            // Verify user is the current custodian
            if (item.current_custodian !== req.session.user.id) {
                await conn.rollback();
                return res.status(403).json({
                    success: false,
                    error: 'Only the current custodian can acknowledge receipt'
                });
            }
            
            // Get latest custody transfer
            const [latestTransfer] = await conn.query(`
                SELECT * FROM custody_chain 
                WHERE item_id = ? AND to_custodian = ?
                ORDER BY transfer_date DESC
                LIMIT 1
            `, [itemId, req.session.user.id]);
            
            if (!latestTransfer) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'No pending custody transfer found'
                });
            }
            
            // Update custody chain record
            await conn.query(`
                UPDATE custody_chain
                SET acknowledgment_date = NOW(),
                    acknowledgment_notes = ?
                WHERE chain_id = ?
            `, [notes || null, latestTransfer.chain_id]);
            
            // Update item status to in_storage
            await conn.query(`
                UPDATE high_value_items
                SET status = 'in_storage'
                WHERE item_id = ?
            `, [itemId]);
            
            // Log audit trail
            await conn.query(`
                INSERT INTO audit_logs
                (item_type, item_id, action, user_id, audit_date, details)
                VALUES ('high_value', ?, 'custody_acknowledged', ?, NOW(), ?)
            `, [
                itemId, req.session.user.id,
                JSON.stringify({
                    chain_id: latestTransfer.chain_id,
                    notes: notes || null
                })
            ]);
            
            await conn.commit();
            
            res.json({
                success: true,
                message: 'Custody receipt acknowledged successfully'
            });
            
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Acknowledge custody error:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to acknowledge custody receipt'
            });
        } finally {
            if (conn) conn.release();
        }
    });
    
    // ===============================================
    // APPROVAL MANAGEMENT (ADMIN ONLY)
    // ===============================================
    
    /**
     * GET /inventory/high-value/approvals - List pending approvals
     */
    router.get('/inventory/high-value/approvals', isAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            const status = req.query.status || 'pending';
            
            const approvals = await conn.query(`
                SELECT app.*,
                       hv.item_id,
                       hv.serial_number,
                       p.name as product_name,
                       p.price as unit_value,
                       u_req.fullName as requester_name,
                       u_from.fullName as from_custodian_name,
                       u_to.fullName as to_custodian_name,
                       u_app.fullName as approver_name
                FROM high_value_approvals app
                LEFT JOIN high_value_items hv ON app.item_id = hv.item_id
                LEFT JOIN products p ON app.product_id = p.id
                LEFT JOIN users u_req ON app.requested_by = u_req.id
                LEFT JOIN users u_from ON app.from_custodian = u_from.id
                LEFT JOIN users u_to ON app.to_custodian = u_to.id
                LEFT JOIN users u_app ON app.approved_by = u_app.id
                WHERE app.status = ?
                ORDER BY app.request_date DESC
            `, [status]);
            
            res.render('inventory/high-value-approvals', {
                title: 'High-Value Transaction Approvals',
                approvals: convertBigIntToNumber(approvals),
                statusFilter: status,
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('High-value approvals listing error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /inventory/high-value/approvals/:approvalId/approve - Approve request
     */
    router.post('/inventory/high-value/approvals/:approvalId/approve', isAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const approvalId = req.params.approvalId;
            const { approval_notes } = req.body;
            
            // Get approval details
            const [approval] = await conn.query(
                'SELECT * FROM high_value_approvals WHERE approval_id = ?',
                [approvalId]
            );
            
            if (!approval) {
                await conn.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Approval request not found'
                });
            }
            
            if (approval.status !== 'pending') {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Approval request has already been processed'
                });
            }
            
            // Execute the custody transfer
            const transferResult = await conn.query(`
                INSERT INTO custody_chain
                (item_id, from_custodian, to_custodian, transfer_date, transfer_reason,
                 authorized_by, notes)
                VALUES (?, ?, ?, NOW(), ?, ?, ?)
            `, [
                approval.item_id, approval.from_custodian, approval.to_custodian,
                approval.transfer_reason, req.session.user.id,
                `Approved transfer. ${approval_notes || ''}`
            ]);
            
            // Update item custodian
            await conn.query(`
                UPDATE high_value_items
                SET current_custodian = ?,
                    status = 'in_transit',
                    last_custody_change = NOW()
                WHERE item_id = ?
            `, [approval.to_custodian, approval.item_id]);
            
            // Update approval status
            await conn.query(`
                UPDATE high_value_approvals
                SET status = 'approved',
                    approved_by = ?,
                    approval_date = NOW(),
                    approval_notes = ?
                WHERE approval_id = ?
            `, [req.session.user.id, approval_notes || null, approvalId]);
            
            // Log audit trail
            await conn.query(`
                INSERT INTO audit_logs
                (item_type, item_id, action, user_id, audit_date, details)
                VALUES ('high_value', ?, 'transfer_approved', ?, NOW(), ?)
            `, [
                approval.item_id, req.session.user.id,
                JSON.stringify({
                    approval_id: approvalId,
                    chain_id: convertBigIntToNumber(transferResult.insertId)
                })
            ]);
            
            await conn.commit();
            
            res.json({
                success: true,
                message: 'Transfer request approved successfully'
            });
            
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Approve transfer error:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to approve transfer request'
            });
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /inventory/high-value/approvals/:approvalId/reject - Reject request
     */
    router.post('/inventory/high-value/approvals/:approvalId/reject', isAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const approvalId = req.params.approvalId;
            const { rejection_reason } = req.body;
            
            // Get approval details
            const [approval] = await conn.query(
                'SELECT * FROM high_value_approvals WHERE approval_id = ?',
                [approvalId]
            );
            
            if (!approval) {
                await conn.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Approval request not found'
                });
            }
            
            if (approval.status !== 'pending') {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Approval request has already been processed'
                });
            }
            
            // Update approval status
            await conn.query(`
                UPDATE high_value_approvals
                SET status = 'rejected',
                    approved_by = ?,
                    approval_date = NOW(),
                    approval_notes = ?
                WHERE approval_id = ?
            `, [req.session.user.id, rejection_reason || 'Rejected', approvalId]);
            
            // Log audit trail
            await conn.query(`
                INSERT INTO audit_logs
                (item_type, item_id, action, user_id, audit_date, details)
                VALUES ('high_value', ?, 'transfer_rejected', ?, NOW(), ?)
            `, [
                approval.item_id, req.session.user.id,
                JSON.stringify({
                    approval_id: approvalId,
                    rejection_reason: rejection_reason || 'Rejected'
                })
            ]);
            
            await conn.commit();
            
            res.json({
                success: true,
                message: 'Transfer request rejected'
            });
            
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Reject transfer error:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to reject transfer request'
            });
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * GET /inventory/high-value/config - High-value threshold configuration (Admin only)
     */
    router.get('/inventory/high-value/config', isAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            const configs = await conn.query(`
                SELECT * FROM system_config 
                WHERE config_key IN ('high_value_threshold', 'high_value_approval_threshold')
            `);
            
            const configMap = {};
            configs.forEach(c => {
                configMap[c.config_key] = c.config_value;
            });
            
            res.render('inventory/high-value-config', {
                title: 'High-Value Configuration',
                configs: configMap,
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('High-value config error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /inventory/high-value/config - Update threshold configuration
     */
    router.post('/inventory/high-value/config', isAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            const {
                high_value_threshold,
                high_value_approval_threshold
            } = req.body;
            
            // Update or insert threshold values
            await conn.query(`
                INSERT INTO system_config (config_key, config_value)
                VALUES ('high_value_threshold', ?),
                       ('high_value_approval_threshold', ?)
                ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)
            `, [high_value_threshold, high_value_approval_threshold]);
            
            res.json({
                success: true,
                message: 'High-value thresholds updated successfully'
            });
            
        } catch (err) {
            console.error('Update config error:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to update configuration'
            });
        } finally {
            if (conn) conn.release();
        }
    });
    
    return router;
};
