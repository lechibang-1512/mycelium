/**
 * Equipment Management Routes
 * Handles equipment tracking, condition assessment, and maintenance scheduling
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated, isStaffOrAdmin, isAdmin } = require('../middleware/auth');

module.exports = (pool, convertBigIntToNumber) => {
    
    // ===============================================
    // EQUIPMENT LISTING AND MANAGEMENT
    // ===============================================
    
    /**
     * GET /equipment - List all equipment
     */
    router.get('/equipment', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            // Get query parameters
            const search = req.query.search || '';
            const category = req.query.category || '';
            const status = req.query.status || '';
            const condition = req.query.condition || '';
            const warehouse_id = req.query.warehouse_id || '';
            
            // Build query
            let query = `
                SELECT e.*, 
                       w.name as warehouse_name,
                       wz.name as zone_name,
                       ec.name as category_name,
                       ech.condition_status as latest_condition,
                       ech.assessment_date as last_assessment_date,
                       DATE_ADD(ech.assessment_date, INTERVAL 90 DAY) as next_assessment_due
                FROM equipment e
                LEFT JOIN warehouses w ON e.warehouse_id = w.warehouse_id
                LEFT JOIN warehouse_zones wz ON e.zone_id = wz.zone_id
                LEFT JOIN equipment_categories ec ON e.category_id = ec.id
                LEFT JOIN (
                    SELECT equipment_id, condition_status, assessment_date,
                           ROW_NUMBER() OVER (PARTITION BY equipment_id ORDER BY assessment_date DESC) as rn
                    FROM equipment_condition_history
                ) ech ON e.equipment_id = ech.equipment_id AND ech.rn = 1
                WHERE 1=1
            `;
            
            const params = [];
            
            if (search) {
                query += ` AND (e.equipment_name LIKE ? OR e.serial_number LIKE ? OR e.asset_tag LIKE ?)`;
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
            
            if (category) {
                query += ` AND e.category_id = ?`;
                params.push(category);
            }
            
            if (status) {
                query += ` AND e.operational_status = ?`;
                params.push(status);
            }
            
            if (condition) {
                query += ` AND ech.condition_status = ?`;
                params.push(condition);
            }
            
            if (warehouse_id) {
                query += ` AND e.warehouse_id = ?`;
                params.push(warehouse_id);
            }
            
            query += ` ORDER BY e.equipment_name`;
            
            const equipment = await conn.query(query, params);
            
            // Get categories and warehouses for filters
            const [categories, warehouses] = await Promise.all([
                conn.query('SELECT * FROM equipment_categories ORDER BY name'),
                conn.query('SELECT warehouse_id, name FROM warehouses WHERE is_active = TRUE ORDER BY name')
            ]);
            
            // Get statistics
            const [stats] = await conn.query(`
                SELECT 
                    COUNT(*) as total_equipment,
                    SUM(CASE WHEN operational_status = 'operational' THEN 1 ELSE 0 END) as operational_count,
                    SUM(CASE WHEN operational_status = 'non_operational' THEN 1 ELSE 0 END) as non_operational_count,
                    SUM(CASE WHEN operational_status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_count
                FROM equipment
            `);
            
            res.render('equipment/index', {
                title: 'Equipment Management',
                equipment: convertBigIntToNumber(equipment),
                categories: convertBigIntToNumber(categories),
                warehouses: convertBigIntToNumber(warehouses),
                stats: convertBigIntToNumber(stats),
                filters: { search, category, status, condition, warehouse_id },
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error'),
                    warning: req.flash('warning')
                },
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('Equipment listing error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * GET /equipment/:id - View equipment details
     */
    router.get('/equipment/:id', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const equipmentId = req.params.id;
            
            // Get equipment details
            const [equipment] = await conn.query(`
                SELECT e.*, 
                       w.name as warehouse_name,
                       wz.name as zone_name,
                       ec.name as category_name,
                       s.name as supplier_name
                FROM equipment e
                LEFT JOIN warehouses w ON e.warehouse_id = w.warehouse_id
                LEFT JOIN warehouse_zones wz ON e.zone_id = wz.zone_id
                LEFT JOIN equipment_categories ec ON e.category_id = ec.id
                LEFT JOIN suppliers s ON e.supplier_id = s.id
                WHERE e.equipment_id = ?
            `, [equipmentId]);
            
            if (!equipment) {
                req.flash('error', 'Equipment not found');
                return res.redirect('/equipment');
            }
            
            // Get condition history
            const conditionHistory = await conn.query(`
                SELECT ech.*, u.fullName as assessed_by_name
                FROM equipment_condition_history ech
                LEFT JOIN users u ON ech.assessed_by = u.id
                WHERE ech.equipment_id = ?
                ORDER BY ech.assessment_date DESC
            `, [equipmentId]);
            
            // Get maintenance requests
            const maintenanceRequests = await conn.query(`
                SELECT mr.*, u.fullName as requested_by_name
                FROM maintenance_requests mr
                LEFT JOIN users u ON mr.requested_by = u.id
                WHERE mr.equipment_id = ?
                ORDER BY mr.created_at DESC
            `, [equipmentId]);
            
            res.render('equipment/details', {
                title: `Equipment: ${equipment.equipment_name}`,
                equipment: convertBigIntToNumber(equipment),
                conditionHistory: convertBigIntToNumber(conditionHistory),
                maintenanceRequests: convertBigIntToNumber(maintenanceRequests),
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error')
                },
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('Equipment details error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * GET /equipment/:id/assess - Equipment assessment form
     */
    router.get('/equipment/:id/assess', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const equipmentId = req.params.id;
            
            // Get equipment
            const [equipment] = await conn.query(`
                SELECT e.*, 
                       w.name as warehouse_name,
                       ec.name as category_name
                FROM equipment e
                LEFT JOIN warehouses w ON e.warehouse_id = w.warehouse_id
                LEFT JOIN equipment_categories ec ON e.category_id = ec.id
                WHERE e.equipment_id = ?
            `, [equipmentId]);
            
            if (!equipment) {
                req.flash('error', 'Equipment not found');
                return res.redirect('/equipment');
            }
            
            // Get previous assessment
            const [previousAssessment] = await conn.query(`
                SELECT * FROM equipment_condition_history 
                WHERE equipment_id = ? 
                ORDER BY assessment_date DESC 
                LIMIT 1
            `, [equipmentId]);
            
            res.render('equipment/assess', {
                title: `Assess: ${equipment.equipment_name}`,
                equipment: convertBigIntToNumber(equipment),
                previousAssessment: previousAssessment ? convertBigIntToNumber(previousAssessment) : null,
                messages: {
                    error: req.flash('error')
                },
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('Assessment form error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /equipment/:id/assess - Record equipment assessment
     */
    router.post('/equipment/:id/assess', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const equipmentId = req.params.id;
            const {
                condition_status,
                physical_condition,
                operational_notes,
                maintenance_needed,
                maintenance_priority,
                maintenance_notes,
                estimated_remaining_life_months,
                recommended_action
            } = req.body;
            
            // Validate required fields
            if (!condition_status) {
                await conn.rollback();
                req.flash('error', 'Condition status is required');
                return res.redirect(`/equipment/${equipmentId}/assess`);
            }
            
            // Record condition assessment
            await conn.query(`
                INSERT INTO equipment_condition_history 
                (equipment_id, condition_status, physical_condition, operational_notes,
                 maintenance_needed, estimated_remaining_life_months, recommended_action,
                 assessed_by, assessment_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                equipmentId, condition_status, physical_condition || null, 
                operational_notes || null, maintenance_needed === 'on' ? 1 : 0,
                estimated_remaining_life_months || null, recommended_action || null,
                req.session.user.id
            ]);
            
            // Update equipment operational status
            let newStatus = 'operational';
            if (condition_status === 'critical' || condition_status === 'failed') {
                newStatus = 'non_operational';
            } else if (maintenance_needed === 'on') {
                newStatus = 'maintenance';
            }
            
            await conn.query(`
                UPDATE equipment 
                SET operational_status = ?,
                    last_assessment_date = NOW()
                WHERE equipment_id = ?
            `, [newStatus, equipmentId]);
            
            // Create maintenance request if needed
            if (maintenance_needed === 'on') {
                await conn.query(`
                    INSERT INTO maintenance_requests 
                    (equipment_id, request_type, priority, description, status, requested_by, created_at)
                    VALUES (?, 'preventive', ?, ?, 'pending', ?, NOW())
                `, [
                    equipmentId, 
                    maintenance_priority || 'medium',
                    maintenance_notes || 'Maintenance needed based on condition assessment',
                    req.session.user.id
                ]);
            }
            
            // If critical/failed, create urgent maintenance request
            if (condition_status === 'critical' || condition_status === 'failed') {
                await conn.query(`
                    INSERT INTO maintenance_requests 
                    (equipment_id, request_type, priority, description, status, requested_by, created_at)
                    VALUES (?, 'repair', 'high', ?, 'pending', ?, NOW())
                `, [
                    equipmentId,
                    `Equipment ${condition_status}: ${operational_notes || 'Immediate attention required'}`,
                    req.session.user.id
                ]);
            }
            
            await conn.commit();
            
            req.flash('success', 'Equipment assessment recorded successfully');
            res.redirect(`/equipment/${equipmentId}`);
            
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Record assessment error:', err);
            req.flash('error', 'Failed to record assessment');
            res.redirect(`/equipment/${req.params.id}/assess`);
        } finally {
            if (conn) conn.release();
        }
    });
    
    // ===============================================
    // MAINTENANCE MANAGEMENT
    // ===============================================
    
    /**
     * GET /equipment/maintenance - Maintenance requests listing
     */
    router.get('/equipment/maintenance', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            const status = req.query.status || 'pending';
            
            // Get maintenance requests
            const requests = await conn.query(`
                SELECT mr.*, 
                       e.equipment_name, e.asset_tag,
                       u.fullName as requested_by_name,
                       u2.fullName as assigned_to_name
                FROM maintenance_requests mr
                LEFT JOIN equipment e ON mr.equipment_id = e.equipment_id
                LEFT JOIN users u ON mr.requested_by = u.id
                LEFT JOIN users u2 ON mr.assigned_to = u2.id
                WHERE mr.status = ?
                ORDER BY 
                    FIELD(mr.priority, 'critical', 'high', 'medium', 'low'),
                    mr.created_at DESC
            `, [status]);
            
            // Get statistics
            const [stats] = await conn.query(`
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                    SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as critical_count
                FROM maintenance_requests
            `);
            
            res.render('equipment/maintenance', {
                title: 'Maintenance Requests',
                requests: convertBigIntToNumber(requests),
                stats: convertBigIntToNumber(stats),
                currentStatus: status,
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error')
                },
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('Maintenance listing error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /equipment/maintenance - Create maintenance request
     */
    router.post('/equipment/maintenance', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            const {
                equipment_id,
                request_type,
                priority,
                description,
                scheduled_date
            } = req.body;
            
            // Validate
            if (!equipment_id || !request_type || !description) {
                return res.status(400).json({
                    success: false,
                    error: 'Equipment, request type, and description are required'
                });
            }
            
            // Create request
            const result = await conn.query(`
                INSERT INTO maintenance_requests 
                (equipment_id, request_type, priority, description, scheduled_date, 
                 status, requested_by, created_at)
                VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW())
            `, [
                equipment_id, request_type, priority || 'medium', description,
                scheduled_date || null, req.session.user.id
            ]);
            
            res.json({ 
                success: true, 
                message: 'Maintenance request created successfully',
                requestId: convertBigIntToNumber(result.insertId)
            });
            
        } catch (err) {
            console.error('Create maintenance request error:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to create maintenance request' 
            });
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /equipment/maintenance/:id/update-status - Update maintenance request status
     */
    router.post('/equipment/maintenance/:id/update-status', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const requestId = req.params.id;
            const { status, resolution_notes, assigned_to } = req.body;
            
            // Update request
            let updateQuery = 'UPDATE maintenance_requests SET status = ?';
            const updateParams = [status];
            
            if (resolution_notes) {
                updateQuery += ', resolution_notes = ?';
                updateParams.push(resolution_notes);
            }
            
            if (assigned_to) {
                updateQuery += ', assigned_to = ?';
                updateParams.push(assigned_to);
            }
            
            if (status === 'completed') {
                updateQuery += ', completed_at = NOW()';
                
                // Update equipment status to operational if repair completed
                const [request] = await conn.query(
                    'SELECT equipment_id, request_type FROM maintenance_requests WHERE id = ?',
                    [requestId]
                );
                
                if (request && request.request_type === 'repair') {
                    await conn.query(
                        'UPDATE equipment SET operational_status = ? WHERE equipment_id = ?',
                        ['operational', request.equipment_id]
                    );
                }
            }
            
            updateQuery += ' WHERE id = ?';
            updateParams.push(requestId);
            
            await conn.query(updateQuery, updateParams);
            
            await conn.commit();
            
            res.json({ success: true, message: 'Maintenance request updated successfully' });
            
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Update maintenance status error:', err);
            res.status(500).json({ success: false, error: 'Failed to update status' });
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /equipment - Create new equipment
     */
    router.post('/equipment', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            const {
                equipment_name, category_id, serial_number, asset_tag,
                manufacturer, model, purchase_date, purchase_cost,
                warranty_expiry, supplier_id, warehouse_id, zone_id,
                description
            } = req.body;
            
            // Validate required fields
            if (!equipment_name || !category_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Equipment name and category are required'
                });
            }
            
            // Create equipment
            const result = await conn.query(`
                INSERT INTO equipment 
                (equipment_name, category_id, serial_number, asset_tag, manufacturer, model,
                 purchase_date, purchase_cost, warranty_expiry, supplier_id, warehouse_id, zone_id,
                 description, operational_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'operational', NOW())
            `, [
                equipment_name, category_id, serial_number || null, asset_tag || null,
                manufacturer || null, model || null, purchase_date || null, purchase_cost || null,
                warranty_expiry || null, supplier_id || null, warehouse_id || null, zone_id || null,
                description || null
            ]);
            
            req.flash('success', 'Equipment created successfully');
            res.redirect(`/equipment/${result.insertId}`);
            
        } catch (err) {
            console.error('Create equipment error:', err);
            req.flash('error', 'Failed to create equipment');
            res.redirect('/equipment');
        } finally {
            if (conn) conn.release();
        }
    });
    
    return router;
};
