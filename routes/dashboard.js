const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

module.exports = (pool, suppliersPool, convertBigIntToNumber) => {
    
    // Dashboard Route
    router.get('/dashboard', isAuthenticated, async (req, res, next) => {
        let conn, suppliersConn;
        try {
            conn = await pool.getConnection();
            suppliersConn = await suppliersPool.getConnection();
    
            const [totalProductsResult] = await conn.query('SELECT COUNT(*) as count FROM specs_db');
            const [totalInventoryResult] = await conn.query('SELECT SUM(device_inventory) as total FROM specs_db');
            const [lowStockResult] = await conn.query('SELECT COUNT(*) as count FROM specs_db WHERE device_inventory <= 5');
            const [suppliersResult] = await suppliersConn.query('SELECT COUNT(*) as count FROM suppliers WHERE is_active = 1');
            const lowStockProducts = await conn.query('SELECT device_name, device_maker, device_inventory FROM specs_db WHERE device_inventory <= 5 ORDER BY device_inventory ASC LIMIT 10');
            const recentTransactions = await conn.query(`SELECT il.transaction_date, il.transaction_type, il.quantity_changed, s.device_name, s.device_maker FROM inventory_log il LEFT JOIN specs_db s ON il.product_id = s.product_id ORDER BY il.transaction_date DESC LIMIT 10`);
            const topProducts = await conn.query(`SELECT s.device_name, s.device_maker, SUM(ABS(il.quantity_changed)) as total_sold FROM inventory_log il LEFT JOIN specs_db s ON il.product_id = s.product_id WHERE il.transaction_type = 'outgoing' GROUP BY il.product_id ORDER BY total_sold DESC LIMIT 5`);

            res.render('dashboard', {
                title: 'Dashboard',
                totalProducts: convertBigIntToNumber(totalProductsResult.count),
                totalInventory: convertBigIntToNumber(totalInventoryResult.total) || 0,
                lowStockCount: convertBigIntToNumber(lowStockResult.count),
                totalSuppliers: convertBigIntToNumber(suppliersResult.count),
                lowStockProducts: convertBigIntToNumber(lowStockProducts),
                recentTransactions: convertBigIntToNumber(recentTransactions),
                topProducts: convertBigIntToNumber(topProducts),
                success: req.query.success,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
            if (suppliersConn) suppliersConn.release();
        }
    });

    // Home Route (Product listing)
    router.get('/', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const search = req.query.search || '';

            let query = 'SELECT * FROM specs_db';
            let countQuery = 'SELECT COUNT(*) as total FROM specs_db';
            let params = [];

            if (search) {
                const searchPattern = `%${search}%`;
                query += ' WHERE device_name LIKE ? OR device_maker LIKE ?';
                countQuery += ' WHERE device_name LIKE ? OR device_maker LIKE ?';
                params.push(searchPattern, searchPattern);
            }
            
            const [countResult] = await conn.query(countQuery, params);
            const total = convertBigIntToNumber(countResult.total);

            query += ' ORDER BY product_id LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            const phonesResult = await conn.query(query, params);

            res.render('index', {
                phones: convertBigIntToNumber(phonesResult),
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                limit,
                search,
                total,
                req,
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
