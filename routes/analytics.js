const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

module.exports = (pool, suppliersPool, convertBigIntToNumber) => {
    
    // Basic Analytics Route (temporary replacement)
    router.get('/analytics', isAuthenticated, async (req, res, next) => {
        let conn, suppliersConn;
        try {
            conn = await pool.getConnection();
            suppliersConn = await suppliersPool.getConnection();
            
            const period = parseInt(req.query.period) || 30;
            
            // Basic analytics data without complex joins
            const [totalRevenue] = await conn.query(`
                SELECT COALESCE(SUM(ps.device_price * ABS(il.quantity_changed)), 0) as total_revenue
                FROM inventory_log il
                JOIN specs_db ps ON il.product_id = ps.product_id
                WHERE il.transaction_type = 'outgoing' 
                AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [period]);
            
            const [totalUnitsSold] = await conn.query(`
                SELECT COALESCE(SUM(ABS(il.quantity_changed)), 0) as units_sold
                FROM inventory_log il
                WHERE il.transaction_type = 'outgoing' 
                AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [period]);
            
            const [totalProducts] = await conn.query('SELECT COUNT(*) as total FROM specs_db');
            const [lowStock] = await conn.query('SELECT COUNT(*) as count FROM specs_db WHERE device_inventory <= 5');
            
            // Get low stock products
            const [lowStockProducts] = await conn.query(`
                SELECT device_name, device_maker, device_price, device_inventory
                FROM specs_db
                WHERE device_inventory <= 5
                ORDER BY device_inventory ASC
                LIMIT 10
            `);
            
            // Get recent transactions
            const recentTransactions = await conn.query(`
                SELECT il.*, s.device_name, s.device_maker,
                       DATE_FORMAT(il.transaction_date, '%M %d, %Y at %h:%i %p') as formatted_date
                FROM inventory_log il
                LEFT JOIN specs_db s ON il.product_id = s.product_id
                ORDER BY il.transaction_date DESC
                LIMIT 10
            `);
            
            res.render('analytics', {
                title: 'Analytics Dashboard',
                totalRevenue: parseFloat(totalRevenue.total_revenue || 0).toFixed(2),
                totalUnitsSold: totalUnitsSold.units_sold || 0,
                totalProducts: totalProducts.total || 0,
                lowStockCount: lowStock.count || 0,
                topSellingProducts: [],
                lowStockProducts: convertBigIntToNumber(lowStockProducts),
                recentTransactions: convertBigIntToNumber(recentTransactions),
                selectedPeriod: period,
                filters: { period },
                showFilterNotification: req.query.period && req.query.period !== '30',
                insights: [],
                growthRate: 0, // Default growth rate (will be calculated later)
                averageOrderValue: totalUnitsSold.units_sold > 0 ? parseFloat((parseFloat(totalRevenue.total_revenue || 0) / totalUnitsSold.units_sold).toFixed(2)) : 0.00,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
            if (suppliersConn) suppliersConn.release();
        }
    });

    return router;
};
