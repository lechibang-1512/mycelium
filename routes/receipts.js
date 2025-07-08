const express = require('express');
const router = express.Router();
const { isAuthenticated, isStaffOrAdmin } = require('../middleware/auth');

module.exports = (pool, suppliersPool, convertBigIntToNumber) => {
    
    // Receipts Route
    router.get('/receipts', isAuthenticated, async (req, res, next) => {
        let conn, suppliersConn;
        try {
            conn = await pool.getConnection();
            suppliersConn = await suppliersPool.getConnection();
            
            // Get receipts with product info (no JOIN with suppliers since they're in different DB)
            const receiptsResult = await conn.query(`
                SELECT r.*, s.device_name, s.device_maker,
                       DATE_FORMAT(r.transaction_date, '%M %d, %Y at %h:%i %p') as formatted_date
                FROM receipts r
                LEFT JOIN specs_db s ON r.product_id = s.product_id
                ORDER BY r.transaction_date DESC LIMIT 50
            `);
            
            // Get supplier names separately
            const supplierIds = [...new Set(receiptsResult.filter(r => r.supplier_id).map(r => r.supplier_id))];
            let supplierMap = {};
            
            if (supplierIds.length > 0) {
                const supplierQuery = `SELECT id as supplier_id, name FROM suppliers WHERE id IN (${supplierIds.map(() => '?').join(',')})`;
                const suppliersData = await suppliersConn.query(supplierQuery, supplierIds);
                supplierMap = Object.fromEntries(suppliersData.map(s => [s.supplier_id, s.name]));
            }

            // Add supplier names to receipts
            const receiptsWithSuppliers = receiptsResult.map(receipt => ({
                ...receipt,
                supplier_name: supplierMap[receipt.supplier_id] || null
            }));
            
            const suppliersResult = await suppliersConn.query('SELECT id as supplier_id, name FROM suppliers WHERE is_active = 1');
            const phonesResult = await conn.query('SELECT product_id, device_name, device_maker FROM specs_db ORDER BY device_name');

            res.render('receipts', {
                title: 'Receipts',
                receipts: convertBigIntToNumber(receiptsWithSuppliers),
                suppliers: convertBigIntToNumber(suppliersResult),
                phones: convertBigIntToNumber(phonesResult),
                pagination: { currentPage: 1, totalPages: 1, totalReceipts: receiptsResult.length },
                filters: {},
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
            if (suppliersConn) suppliersConn.release();
        }
    });

    // Individual Receipt Details Route
    router.get('/receipt/:receipt_id', isAuthenticated, async (req, res, next) => {
        let conn, suppliersConn;
        try {
            conn = await pool.getConnection();
            suppliersConn = await suppliersPool.getConnection();
            
            const receiptId = req.params.receipt_id;
            const isDownload = req.query.download === '1';
            const isPrint = !('download' in req.query); // Print view if no download param
            
            // Get receipt with product info
            const [receipt] = await conn.query(`
                SELECT r.*, s.device_name, s.device_maker, s.ram, s.rom, s.color,
                       DATE_FORMAT(r.transaction_date, '%M %d, %Y at %h:%i %p') as formatted_date
                FROM receipts r
                LEFT JOIN specs_db s ON r.product_id = s.product_id
                WHERE r.receipt_id = ?
            `, [receiptId]);
            
            if (!receipt) {
                req.flash('error', 'Receipt not found');
                return res.redirect('/receipts');
            }
            
            // Get supplier information if this is a purchase receipt
            let supplier = null;
            if (receipt.supplier_id && receipt.receipt_type === 'PURCHASE_RECEIPT') {
                const [supplierResult] = await suppliersConn.query(
                    'SELECT * FROM suppliers WHERE id = ?', 
                    [receipt.supplier_id]
                );
                supplier = supplierResult;
            }
            
            // Get phone information
            let phone = null;
            if (receipt.product_id) {
                const [phoneResult] = await conn.query(
                    'SELECT * FROM specs_db WHERE product_id = ?', 
                    [receipt.product_id]
                );
                phone = phoneResult;
            }
            
            // Parse receipt data JSON
            let receiptData = {};
            try {
                receiptData = JSON.parse(receipt.receipt_data || '{}');
            } catch (e) {
                console.warn('Failed to parse receipt data:', e);
                receiptData = {};
            }

            if (isDownload) {
                // Handle PDF download - for now, redirect to print view
                // PDF generation can be implemented later with libraries like puppeteer
                res.setHeader('Content-Type', 'text/html');
                res.setHeader('Content-Disposition', `inline; filename="receipt-${receiptId}.html"`);
                
                res.render('receipt-details', {
                    title: `Receipt ${receiptId}`,
                    receipt: convertBigIntToNumber(receipt),
                    receiptData: receiptData,
                    supplier: supplier ? convertBigIntToNumber(supplier) : null,
                    phone: phone ? convertBigIntToNumber(phone) : null,
                    isDownload: true,
                    csrfToken: req.csrfToken()
                });
            } else {
                // Render normal details view or print view
                res.render('receipt-details', {
                    title: `Receipt ${receiptId}`,
                    receipt: convertBigIntToNumber(receipt),
                    receiptData: receiptData,
                    supplier: supplier ? convertBigIntToNumber(supplier) : null,
                    phone: phone ? convertBigIntToNumber(phone) : null,
                    isPrintView: isPrint,
                    csrfToken: req.csrfToken()
                });
            }
            
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
            if (suppliersConn) suppliersConn.release();
        }
    });

    // Receipts Analytics Route
    router.get('/receipts/analytics', isAuthenticated, async (req, res, next) => {
        let conn, suppliersConn;
        try {
            conn = await pool.getConnection();
            suppliersConn = await suppliersPool.getConnection();
            
            // Get receipts analytics data
            const totalReceipts = await conn.query('SELECT COUNT(*) as count FROM receipts');
            const totalPurchases = await conn.query('SELECT COUNT(*) as count FROM receipts WHERE receipt_type = "PURCHASE_RECEIPT"');
            const totalSales = await conn.query('SELECT COUNT(*) as count FROM receipts WHERE receipt_type = "SALE_RECEIPT"');
            const totalValue = await conn.query('SELECT SUM(total_amount) as total FROM receipts');
            
            // Recent receipts
            const recentReceipts = await conn.query(`
                SELECT r.*, s.device_name, s.device_maker,
                       DATE_FORMAT(r.transaction_date, '%M %d, %Y at %h:%i %p') as formatted_date
                FROM receipts r
                LEFT JOIN specs_db s ON r.product_id = s.product_id
                ORDER BY r.transaction_date DESC
                LIMIT 10
            `);
            
            // Monthly trends
            const monthlyTrends = await conn.query(`
                SELECT 
                    DATE_FORMAT(transaction_date, '%Y-%m') as month,
                    COUNT(*) as count,
                    SUM(total_amount) as total
                FROM receipts
                WHERE transaction_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
                ORDER BY month ASC
            `);
            
            res.render('receipts-analytics', {
                title: 'Receipts Analytics',
                totalReceipts: totalReceipts[0]?.count || 0,
                totalPurchases: totalPurchases[0]?.count || 0,
                totalSales: totalSales[0]?.count || 0,
                totalValue: totalValue[0]?.total || 0,
                recentReceipts: convertBigIntToNumber(recentReceipts),
                monthlyTrends: convertBigIntToNumber(monthlyTrends),
                csrfToken: req.csrfToken()
            });
            
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
            if (suppliersConn) suppliersConn.release();
        }
    });

    // Delete Receipt Route
    router.post('/receipts/:receipt_id/delete', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            const receiptId = req.params.receipt_id;
            
            // Check if receipt exists
            const [receipt] = await conn.query('SELECT * FROM receipts WHERE receipt_id = ?', [receiptId]);
            if (!receipt) {
                return res.json({ success: false, error: 'Receipt not found' });
            }
            
            // Delete the receipt
            await conn.query('DELETE FROM receipts WHERE receipt_id = ?', [receiptId]);
            
            res.json({ success: true, message: 'Receipt deleted successfully' });
            
        } catch (err) {
            console.error('Error deleting receipt:', err);
            res.json({ success: false, error: 'Failed to delete receipt' });
        } finally {
            if (conn) conn.release();
        }
    });

    // Bulk Export Receipts Route
    router.post('/receipts/bulk-export', isAuthenticated, async (req, res, next) => {
        let conn, suppliersConn;
        try {
            conn = await pool.getConnection();
            suppliersConn = await suppliersPool.getConnection();
            
            const receiptIds = JSON.parse(req.body.receiptIds || '[]');
            
            if (receiptIds.length === 0) {
                req.flash('error', 'No receipts selected for export');
                return res.redirect('/receipts');
            }
            
            // Get receipts with product info
            const placeholders = receiptIds.map(() => '?').join(',');
            const receipts = await conn.query(`
                SELECT r.*, s.device_name, s.device_maker, s.ram, s.rom, s.color,
                       DATE_FORMAT(r.transaction_date, '%M %d, %Y at %h:%i %p') as formatted_date
                FROM receipts r
                LEFT JOIN specs_db s ON r.product_id = s.product_id
                WHERE r.receipt_id IN (${placeholders})
            `, receiptIds);
            
            // For now, return JSON. Can be enhanced to CSV/PDF later
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="receipts-export.json"');
            res.json(convertBigIntToNumber(receipts));
            
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
            if (suppliersConn) suppliersConn.release();
        }
    });

    // Bulk Delete Receipts Route
    router.post('/receipts/bulk-delete', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            const receiptIds = req.body.receiptIds || [];
            
            if (receiptIds.length === 0) {
                return res.json({ success: false, error: 'No receipts selected for deletion' });
            }
            
            // Delete the receipts
            const placeholders = receiptIds.map(() => '?').join(',');
            const result = await conn.query(`DELETE FROM receipts WHERE receipt_id IN (${placeholders})`, receiptIds);
            
            res.json({ 
                success: true, 
                message: `Successfully deleted ${result.affectedRows} receipt(s)` 
            });
            
        } catch (err) {
            console.error('Error bulk deleting receipts:', err);
            res.json({ success: false, error: 'Failed to delete receipts' });
        } finally {
            if (conn) conn.release();
        }
    });

    // Export Receipts Route
    router.get('/receipts/export/:format', isAuthenticated, async (req, res, next) => {
        let conn, suppliersConn;
        try {
            conn = await pool.getConnection();
            suppliersConn = await suppliersPool.getConnection();
            
            const format = req.params.format;
            const { search, dateFrom, dateTo, type } = req.query;
            
            // Build query with filters
            let query = `
                SELECT r.*, s.device_name, s.device_maker, s.ram, s.rom, s.color,
                       DATE_FORMAT(r.transaction_date, '%M %d, %Y at %h:%i %p') as formatted_date
                FROM receipts r
                LEFT JOIN specs_db s ON r.product_id = s.product_id
                WHERE 1=1
            `;
            const params = [];
            
            if (search) {
                query += ` AND (r.receipt_id LIKE ? OR s.device_name LIKE ?)`;
                params.push(`%${search}%`, `%${search}%`);
            }
            
            if (dateFrom) {
                query += ` AND r.transaction_date >= ?`;
                params.push(dateFrom);
            }
            
            if (dateTo) {
                query += ` AND r.transaction_date <= ?`;
                params.push(dateTo);
            }
            
            if (type) {
                query += ` AND r.receipt_type = ?`;
                params.push(type);
            }
            
            query += ` ORDER BY r.transaction_date DESC`;
            
            const receipts = await conn.query(query, params);
            
            // Export based on format
            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="receipts-export.csv"');
                
                // Simple CSV export
                const csvHeaders = 'Receipt ID,Type,Amount,Phone,Created At\n';
                const csvData = receipts.map(r => 
                    `${r.receipt_id},${r.receipt_type},${r.amount || 0},${r.device_name || 'N/A'},${r.transaction_date}`
                ).join('\n');
                
                res.send(csvHeaders + csvData);
            } else if (format === 'json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename="receipts-export.json"');
                res.json(convertBigIntToNumber(receipts));
            } else if (format === 'pdf') {
                // For now, render as HTML that can be printed to PDF
                res.setHeader('Content-Type', 'text/html');
                res.setHeader('Content-Disposition', 'inline; filename="receipts-export.html"');
                
                // Render a simple HTML report
                const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Receipts Export</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                            .header { text-align: center; margin-bottom: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Receipts Export Report</h1>
                            <p>Generated on: ${new Date().toLocaleString()}</p>
                            <p>Total Receipts: ${receipts.length}</p>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Receipt ID</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Phone</th>
                                    <th>Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${receipts.map(r => `
                                    <tr>
                                        <td>${r.receipt_id}</td>
                                        <td>${r.receipt_type}</td>
                                        <td>$${(r.amount || 0).toLocaleString()}</td>
                                        <td>${r.device_name || 'N/A'}</td>
                                        <td>${new Date(r.transaction_date).toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </body>
                    </html>
                `;
                
                res.send(htmlContent);
            } else {
                res.status(400).json({ error: 'Unsupported export format' });
            }
            
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
            if (suppliersConn) suppliersConn.release();
        }
    });

    return router;
};
