/**
 * Consumable Components Management Routes
 * Handles tracking of consumable inventory items with usage patterns and burn rate analysis
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated, isStaffOrAdmin } = require('../middleware/auth');

module.exports = (pool, convertBigIntToNumber) => {
    
    // ===============================================
    // CONSUMABLES LISTING AND MANAGEMENT
    // ===============================================
    
    /**
     * GET /inventory/consumables - List all consumable items
     */
    router.get('/inventory/consumables', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            // Get query parameters
            const search = req.query.search || '';
            const category = req.query.category || '';
            const alert_level = req.query.alert_level || '';
            
            // Build query
            let query = `
                SELECT ci.*,
                       cc.name as category_name,
                       w.name as warehouse_name,
                       CASE 
                           WHEN ci.current_quantity <= ci.critical_level THEN 'critical'
                           WHEN ci.current_quantity <= ci.reorder_level THEN 'low'
                           ELSE 'normal'
                       END as stock_status,
                       CASE
                           WHEN ci.average_daily_usage > 0 THEN 
                               FLOOR(ci.current_quantity / ci.average_daily_usage)
                           ELSE NULL
                       END as days_until_depletion
                FROM consumable_inventory ci
                LEFT JOIN consumable_categories cc ON ci.category_id = cc.id
                LEFT JOIN warehouses w ON ci.warehouse_id = w.warehouse_id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (search) {
                query += ` AND (ci.item_name LIKE ? OR ci.part_number LIKE ?)`;
                params.push(`%${search}%`, `%${search}%`);
            }
            
            if (category) {
                query += ` AND ci.category_id = ?`;
                params.push(category);
            }
            
            if (alert_level === 'critical') {
                query += ` AND ci.current_quantity <= ci.critical_level`;
            } else if (alert_level === 'low') {
                query += ` AND ci.current_quantity <= ci.reorder_level AND ci.current_quantity > ci.critical_level`;
            }
            
            query += ` ORDER BY ci.item_name`;
            
            const consumables = await conn.query(query, params);
            
            // Get categories for filter
            const categories = await conn.query(
                'SELECT * FROM consumable_categories ORDER BY name'
            );
            
            // Get statistics
            const [stats] = await conn.query(`
                SELECT 
                    COUNT(*) as total_items,
                    SUM(current_quantity * unit_cost) as total_value,
                    SUM(CASE WHEN current_quantity <= critical_level THEN 1 ELSE 0 END) as critical_count,
                    SUM(CASE WHEN current_quantity <= reorder_level THEN 1 ELSE 0 END) as low_stock_count
                FROM consumable_inventory
            `);
            
            res.render('inventory/consumables', {
                title: 'Consumable Inventory',
                consumables: convertBigIntToNumber(consumables),
                categories: convertBigIntToNumber(categories),
                stats: convertBigIntToNumber(stats),
                filters: { search, category, alert_level },
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error'),
                    warning: req.flash('warning')
                },
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('Consumables listing error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * GET /inventory/consumables/:id - View consumable details
     */
    router.get('/inventory/consumables/:id', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const consumableId = req.params.id;
            
            // Get consumable details
            const [consumable] = await conn.query(`
                SELECT ci.*,
                       cc.name as category_name,
                       w.name as warehouse_name,
                       wz.name as zone_name,
                       s.name as supplier_name,
                       CASE 
                           WHEN ci.current_quantity <= ci.critical_level THEN 'critical'
                           WHEN ci.current_quantity <= ci.reorder_level THEN 'low'
                           ELSE 'normal'
                       END as stock_status,
                       CASE
                           WHEN ci.average_daily_usage > 0 THEN 
                               FLOOR(ci.current_quantity / ci.average_daily_usage)
                           ELSE NULL
                       END as days_until_depletion
                FROM consumable_inventory ci
                LEFT JOIN consumable_categories cc ON ci.category_id = cc.id
                LEFT JOIN warehouses w ON ci.warehouse_id = w.warehouse_id
                LEFT JOIN warehouse_zones wz ON ci.zone_id = wz.zone_id
                LEFT JOIN suppliers s ON ci.supplier_id = s.id
                WHERE ci.id = ?
            `, [consumableId]);
            
            if (!consumable) {
                req.flash('error', 'Consumable item not found');
                return res.redirect('/inventory/consumables');
            }
            
            // Get consumption history (last 30 days)
            const consumptionHistory = await conn.query(`
                SELECT cr.*,
                       u.fullName as recorded_by_name,
                       CONCAT_WS(' - ', cr.department, cr.project_code) as allocation
                FROM consumption_records cr
                LEFT JOIN users u ON cr.recorded_by = u.id
                WHERE cr.consumable_id = ?
                  AND cr.consumption_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ORDER BY cr.consumption_date DESC
            `, [consumableId]);
            
            // Calculate usage statistics
            const [usageStats] = await conn.query(`
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(quantity_consumed) as total_consumed_30d,
                    AVG(quantity_consumed) as avg_per_transaction,
                    MIN(consumption_date) as first_consumption,
                    MAX(consumption_date) as last_consumption,
                    COUNT(DISTINCT department) as departments_count
                FROM consumption_records
                WHERE consumable_id = ?
                  AND consumption_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [consumableId]);
            
            res.render('inventory/consumable-details', {
                title: `Consumable: ${consumable.item_name}`,
                consumable: convertBigIntToNumber(consumable),
                consumptionHistory: convertBigIntToNumber(consumptionHistory),
                usageStats: convertBigIntToNumber(usageStats),
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error')
                },
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('Consumable details error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /inventory/consumables/:id/consume - Record consumption
     */
    router.post('/inventory/consumables/:id/consume', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const consumableId = req.params.id;
            const {
                quantity_consumed,
                department,
                project_code,
                cost_center,
                notes
            } = req.body;
            
            // Validate quantity
            const quantityValue = parseFloat(quantity_consumed);
            if (isNaN(quantityValue) || quantityValue <= 0) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid quantity'
                });
            }
            
            // Get current inventory
            const [consumable] = await conn.query(
                'SELECT * FROM consumable_inventory WHERE id = ?',
                [consumableId]
            );
            
            if (!consumable) {
                await conn.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Consumable not found'
                });
            }
            
            // Check sufficient quantity
            if (quantityValue > consumable.current_quantity) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    error: `Insufficient quantity. Available: ${consumable.current_quantity}`
                });
            }
            
            // Record consumption
            await conn.query(`
                INSERT INTO consumption_records 
                (consumable_id, quantity_consumed, department, project_code, cost_center,
                 consumption_date, recorded_by, notes)
                VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)
            `, [
                consumableId, quantityValue, department || null, project_code || null,
                cost_center || null, req.session.user.id, notes || null
            ]);
            
            // Update inventory quantity
            const newQuantity = consumable.current_quantity - quantityValue;
            await conn.query(`
                UPDATE consumable_inventory 
                SET current_quantity = ?,
                    total_consumed = total_consumed + ?,
                    last_consumption_date = NOW()
                WHERE id = ?
            `, [newQuantity, quantityValue, consumableId]);
            
            // Recalculate burn rate (30-day average)
            const [burnRate] = await conn.query(`
                SELECT 
                    SUM(quantity_consumed) / GREATEST(DATEDIFF(NOW(), MIN(consumption_date)), 1) as daily_usage
                FROM consumption_records
                WHERE consumable_id = ?
                  AND consumption_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [consumableId]);
            
            if (burnRate && burnRate.daily_usage) {
                await conn.query(`
                    UPDATE consumable_inventory 
                    SET average_daily_usage = ?
                    WHERE id = ?
                `, [burnRate.daily_usage, consumableId]);
            }
            
            await conn.commit();
            
            // Check if replenishment alert needed
            let alertMessage = 'Consumption recorded successfully';
            if (newQuantity <= consumable.critical_level) {
                alertMessage += '. CRITICAL: Immediate replenishment required!';
            } else if (newQuantity <= consumable.reorder_level) {
                alertMessage += '. LOW STOCK: Replenishment recommended.';
            }
            
            res.json({ 
                success: true, 
                message: alertMessage,
                newQuantity,
                stockStatus: newQuantity <= consumable.critical_level ? 'critical' : 
                           newQuantity <= consumable.reorder_level ? 'low' : 'normal'
            });
            
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Record consumption error:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to record consumption'
            });
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /inventory/consumables/:id/replenish - Replenish stock
     */
    router.post('/inventory/consumables/:id/replenish', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const consumableId = req.params.id;
            const {
                quantity_received,
                unit_cost,
                supplier_id,
                po_number,
                batch_number,
                expiry_date,
                notes
            } = req.body;
            
            // Validate quantity
            const quantityValue = parseFloat(quantity_received);
            if (isNaN(quantityValue) || quantityValue <= 0) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid quantity'
                });
            }
            
            // Get current inventory
            const [consumable] = await conn.query(
                'SELECT * FROM consumable_inventory WHERE id = ?',
                [consumableId]
            );
            
            if (!consumable) {
                await conn.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Consumable not found'
                });
            }
            
            // Record replenishment
            await conn.query(`
                INSERT INTO consumption_records 
                (consumable_id, quantity_consumed, department, notes, consumption_date, recorded_by)
                VALUES (?, ?, 'REPLENISHMENT', ?, NOW(), ?)
            `, [
                consumableId, -quantityValue, // Negative for replenishment
                `Replenishment - PO: ${po_number || 'N/A'}, Batch: ${batch_number || 'N/A'}${notes ? '. ' + notes : ''}`,
                req.session.user.id
            ]);
            
            // Update inventory
            const newQuantity = consumable.current_quantity + quantityValue;
            const newCost = unit_cost || consumable.unit_cost;
            
            await conn.query(`
                UPDATE consumable_inventory 
                SET current_quantity = ?,
                    unit_cost = ?,
                    last_replenishment_date = NOW(),
                    supplier_id = COALESCE(?, supplier_id)
                WHERE id = ?
            `, [newQuantity, newCost, supplier_id || null, consumableId]);
            
            // Adjust reorder level if needed (keep buffer of 7 days based on burn rate)
            if (consumable.average_daily_usage > 0) {
                const suggestedReorder = Math.ceil(consumable.average_daily_usage * 7);
                if (suggestedReorder > consumable.reorder_level) {
                    await conn.query(`
                        UPDATE consumable_inventory 
                        SET reorder_level = ?
                        WHERE id = ?
                    `, [suggestedReorder, consumableId]);
                }
            }
            
            await conn.commit();
            
            res.json({ 
                success: true, 
                message: 'Stock replenished successfully',
                newQuantity
            });
            
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Replenish stock error:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to replenish stock'
            });
        } finally {
            if (conn) conn.release();
        }
    });
    
    // ===============================================
    // CONSUMPTION REPORTS
    // ===============================================
    
    /**
     * GET /reports/consumption - Consumption reports and analytics
     */
    router.get('/reports/consumption', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            const date_from = req.query.date_from || '';
            const date_to = req.query.date_to || '';
            const department = req.query.department || '';
            const project_code = req.query.project_code || '';
            
            // Build query for consumption data
            let query = `
                SELECT 
                    cr.consumption_date,
                    ci.item_name,
                    cc.name as category_name,
                    cr.quantity_consumed,
                    ci.unit_cost,
                    (cr.quantity_consumed * ci.unit_cost) as total_cost,
                    cr.department,
                    cr.project_code,
                    cr.cost_center
                FROM consumption_records cr
                LEFT JOIN consumable_inventory ci ON cr.consumable_id = ci.id
                LEFT JOIN consumable_categories cc ON ci.category_id = cc.id
                WHERE cr.department != 'REPLENISHMENT'
            `;
            
            const params = [];
            
            if (date_from) {
                query += ` AND cr.consumption_date >= ?`;
                params.push(date_from);
            } else {
                query += ` AND cr.consumption_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
            }
            
            if (date_to) {
                query += ` AND cr.consumption_date <= ?`;
                params.push(date_to);
            }
            
            if (department) {
                query += ` AND cr.department = ?`;
                params.push(department);
            }
            
            if (project_code) {
                query += ` AND cr.project_code = ?`;
                params.push(project_code);
            }
            
            query += ` ORDER BY cr.consumption_date DESC`;
            
            const consumptionData = await conn.query(query, params);
            
            // Get summary by department
            const departmentSummary = await conn.query(`
                SELECT 
                    cr.department,
                    COUNT(*) as transaction_count,
                    SUM(cr.quantity_consumed * ci.unit_cost) as total_cost,
                    COUNT(DISTINCT cr.consumable_id) as unique_items
                FROM consumption_records cr
                LEFT JOIN consumable_inventory ci ON cr.consumable_id = ci.id
                WHERE cr.department != 'REPLENISHMENT'
                  ${date_from ? 'AND cr.consumption_date >= ?' : ''}
                  ${date_to ? 'AND cr.consumption_date <= ?' : ''}
                GROUP BY cr.department
                ORDER BY total_cost DESC
            `, params.filter((_, i) => (date_from && i === 0) || (date_to && i === (date_from ? 1 : 0))));
            
            // Get summary by category
            const categorySummary = await conn.query(`
                SELECT 
                    cc.name as category_name,
                    COUNT(*) as transaction_count,
                    SUM(cr.quantity_consumed * ci.unit_cost) as total_cost,
                    SUM(cr.quantity_consumed) as total_quantity
                FROM consumption_records cr
                LEFT JOIN consumable_inventory ci ON cr.consumable_id = ci.id
                LEFT JOIN consumable_categories cc ON ci.category_id = cc.id
                WHERE cr.department != 'REPLENISHMENT'
                  ${date_from ? 'AND cr.consumption_date >= ?' : ''}
                  ${date_to ? 'AND cr.consumption_date <= ?' : ''}
                GROUP BY cc.id, cc.name
                ORDER BY total_cost DESC
            `, params.filter((_, i) => (date_from && i === 0) || (date_to && i === (date_from ? 1 : 0))));
            
            // Get distinct departments and projects for filters
            const [departments, projects] = await Promise.all([
                conn.query(`
                    SELECT DISTINCT department 
                    FROM consumption_records 
                    WHERE department IS NOT NULL AND department != 'REPLENISHMENT'
                    ORDER BY department
                `),
                conn.query(`
                    SELECT DISTINCT project_code 
                    FROM consumption_records 
                    WHERE project_code IS NOT NULL
                    ORDER BY project_code
                `)
            ]);
            
            res.render('reports/consumption', {
                title: 'Consumption Reports',
                consumptionData: convertBigIntToNumber(consumptionData),
                departmentSummary: convertBigIntToNumber(departmentSummary),
                categorySummary: convertBigIntToNumber(categorySummary),
                departments: convertBigIntToNumber(departments),
                projects: convertBigIntToNumber(projects),
                filters: { date_from, date_to, department, project_code },
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            console.error('Consumption reports error:', err);
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    /**
     * POST /inventory/consumables - Create new consumable item
     */
    router.post('/inventory/consumables', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            const {
                item_name, category_id, part_number, unit_of_measure,
                current_quantity, unit_cost, reorder_level, critical_level,
                warehouse_id, zone_id, supplier_id, description
            } = req.body;
            
            // Validate required fields
            if (!item_name || !category_id || !unit_of_measure) {
                return res.status(400).json({
                    success: false,
                    error: 'Item name, category, and unit of measure are required'
                });
            }
            
            // Create consumable
            const result = await conn.query(`
                INSERT INTO consumable_inventory 
                (item_name, category_id, part_number, unit_of_measure, current_quantity,
                 unit_cost, reorder_level, critical_level, warehouse_id, zone_id,
                 supplier_id, description, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                item_name, category_id, part_number || null, unit_of_measure,
                current_quantity || 0, unit_cost || 0, reorder_level || 0, 
                critical_level || 0, warehouse_id || null, zone_id || null,
                supplier_id || null, description || null
            ]);
            
            res.json({ 
                success: true, 
                message: 'Consumable item created successfully',
                itemId: convertBigIntToNumber(result.insertId)
            });
            
        } catch (err) {
            console.error('Create consumable error:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to create consumable item'
            });
        } finally {
            if (conn) conn.release();
        }
    });
    
    return router;
};
