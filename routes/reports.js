const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

module.exports = (pool, convertBigIntToNumber) => {
    
    // Reports Route
    router.get('/reports', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            // Extract filter parameters
            const filters = {
                transaction_type: req.query.transaction_type || '',
                phone_id: req.query.phone_id || '',
                start_date: req.query.start_date || '',
                end_date: req.query.end_date || ''
            };
            
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const offset = (page - 1) * limit;
            
            // Build query with filters
            let whereConditions = [];
            let queryParams = [];
            
            if (filters.transaction_type) {
                whereConditions.push('il.transaction_type = ?');
                queryParams.push(filters.transaction_type);
            }
            
            if (filters.phone_id) {
                whereConditions.push('il.phone_id = ?');
                queryParams.push(filters.phone_id);
            }
            
            if (filters.start_date) {
                whereConditions.push('DATE(il.transaction_date) >= ?');
                queryParams.push(filters.start_date);
            }
            
            if (filters.end_date) {
                whereConditions.push('DATE(il.transaction_date) <= ?');
                queryParams.push(filters.end_date);
            }
            
            const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
            
            // Get total count for pagination
            const countQuery = `
                SELECT COUNT(*) as total
                FROM inventory_log il
                LEFT JOIN specs_db s ON il.phone_id = s.product_id
                ${whereClause}
            `;
            
            const [totalResult] = await conn.query(countQuery, queryParams);
            const total = convertBigIntToNumber(totalResult.total);
            
            // Get reports with pagination
            const reportsQuery = `
                SELECT il.*, s.device_name, s.device_maker,
                       DATE_FORMAT(il.transaction_date, '%M %d, %Y at %h:%i %p') as formatted_date
                FROM inventory_log il
                LEFT JOIN specs_db s ON il.phone_id = s.product_id
                ${whereClause}
                ORDER BY il.transaction_date DESC
                LIMIT ? OFFSET ?
            `;
            
            queryParams.push(limit, offset);
            const reports = await conn.query(reportsQuery, queryParams);
            
            // Get phones for filter dropdown
            const phones = await conn.query('SELECT product_id, device_name, device_maker FROM specs_db ORDER BY device_name');
            
            const [totalProducts] = await conn.query('SELECT COUNT(*) as count FROM specs_db');
            const [totalInventory] = await conn.query('SELECT SUM(device_inventory) as total FROM specs_db');
            const [lowStock] = await conn.query('SELECT COUNT(*) as count FROM specs_db WHERE device_inventory <= 5');

            res.render('reports', {
                title: 'Reports',
                reports: convertBigIntToNumber(reports),
                phones: convertBigIntToNumber(phones),
                filters: filters || {}, // Ensure filters object is always defined
                total: total || 0,
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                limit,
                showFilterNotification: Object.values(filters).some(f => f !== ''),
                stats: {
                    totalProducts: convertBigIntToNumber(totalProducts.count),
                    totalInventory: convertBigIntToNumber(totalInventory.total) || 0,
                    lowStockCount: convertBigIntToNumber(lowStock.count)
                },
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};
