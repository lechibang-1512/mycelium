const express = require('express');
const mariadb = require('mariadb');
const path = require('path');
const { format, isValid, parseISO } = require('date-fns');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('connect-flash');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Database configuration
const dbConfig = {
    host: '127.0.0.1', // Note: If you have issues, try changing this back to 'localhost'
    user: 'lechibang', // Change this to your database user
    password: '1212', // Change this to your database password
    database: 'master_specs_db',
    connectionLimit: 5,
    bigIntAsNumber: true // Convert BigInt to Number
};

// Suppliers database configuration
const suppliersDbConfig = {
    host: '127.0.0.1', // Note: If you have issues, try changing this back to 'localhost'
    user: 'lechibang',
    password: '1212',
    database: 'suppliers_db',
    connectionLimit: 5,
    bigIntAsNumber: true
};

// Authentication database configuration
const authDbConfig = {
    host: '127.0.0.1',
    user: 'lechibang',
    password: '1212',
    database: 'users_db',
    connectionLimit: 5,
    bigIntAsNumber: true
};

// Create connection pools
const pool = mariadb.createPool(dbConfig);
const suppliersPool = mariadb.createPool(suppliersDbConfig);
const authPool = mariadb.createPool(authDbConfig);

// Helper function to convert BigInt values to numbers
function convertBigIntToNumber(obj) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'bigint') {
        return Number(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(convertBigIntToNumber);
    }

    // Handle Date objects specifically to preserve them
    if (obj instanceof Date) {
        return obj;
    }

    if (typeof obj === 'object') {
        const converted = {};
        for (const [key, value] of Object.entries(obj)) {
            converted[key] = convertBigIntToNumber(value);
        }
        return converted;
    }

    return obj;
}

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({
    extended: true
})); // For form data

// Session configuration
app.use(session({
    secret: 'inventoryapp-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Cookie parser middleware (required for CSRF)
app.use(cookieParser());

// CSRF protection middleware
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

// Flash messages middleware
app.use(flash());

// Import and use auth middleware
const { setUserLocals } = require('./middleware/auth');
app.use(setUserLocals);

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===============================================
// IMPORT ROUTES
// ===============================================
const authRoutes = require('./routes/auth')(authPool, convertBigIntToNumber);
app.use('/', authRoutes);

// Import analytics routes
const analyticsRoutes = require('./routes/analytics')(pool, suppliersPool, convertBigIntToNumber);
app.use('/', analyticsRoutes);

// Import auth middleware for protecting routes
const { isAuthenticated, isAdmin, isStaffOrAdmin } = require('./middleware/auth');

// ===============================================
// ROUTES
// ===============================================

// Home page - display all phone specs
app.get('/', isAuthenticated, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let query = 'SELECT * FROM phone_specs';
        let countQuery = 'SELECT COUNT(*) as total FROM phone_specs';
        let params = [];

        if (search) {
            query += ' WHERE sm_name LIKE ? OR sm_maker LIKE ?';
            countQuery += ' WHERE sm_name LIKE ? OR sm_maker LIKE ?';
            params = [`%${search}%`, `%${search}%`];
        }

        // Get total count
        const countResult = await conn.query(countQuery, params);
        const total = convertBigIntToNumber(countResult[0].total);

        // Get paginated results
        query += ' ORDER BY id LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const phonesResult = await conn.query(query, params);
        const phones = convertBigIntToNumber(phonesResult);
        conn.end();

        const totalPages = Math.ceil(total / limit);

        res.render('index', {
            phones,
            currentPage: page,
            totalPages,
            limit,
            search,
            total,
            req
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Database connection failed'
        });
    }
});

// Phone details page
app.get('/phone/:id', isAuthenticated, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const suppliersConn = await suppliersPool.getConnection();
        
        // Get phone details
        const phonesResult = await conn.query('SELECT * FROM phone_specs WHERE id = ?', [req.params.id]);
        const phones = convertBigIntToNumber(phonesResult);

        if (phones.length === 0) {
            conn.end();
            suppliersConn.end();
            return res.status(404).render('error', {
                error: 'Phone not found'
            });
        }

        const phone = phones[0];
        
        // Get inventory history for this phone
        const inventoryHistoryQuery = `
            SELECT 
                il.transaction_type, il.quantity_changed, il.new_inventory_level, il.notes, il.supplier_id,
                DATE_FORMAT(il.transaction_date, '%Y-%m-%d %H:%i:%s') as formatted_date
            FROM inventory_log il
            WHERE il.phone_id = ?
            ORDER BY il.transaction_date DESC
            LIMIT 10
        `;
        const inventoryHistoryResult = await conn.query(inventoryHistoryQuery, [req.params.id]);
        let inventoryHistory = convertBigIntToNumber(inventoryHistoryResult);
        
        // Get supplier names for history items that don't have supplier names
        if (inventoryHistory.length > 0) {
            const supplierIds = inventoryHistory
                .filter(item => item.supplier_id)
                .map(item => item.supplier_id);
                
            if (supplierIds.length > 0) {
                const suppliersResult = await suppliersConn.query(
                    'SELECT supplier_id, name FROM suppliers WHERE supplier_id IN (?)', 
                    [supplierIds]
                );
                const suppliers = convertBigIntToNumber(suppliersResult);
                const supplierMap = {};
                suppliers.forEach(supplier => {
                    supplierMap[supplier.supplier_id] = supplier.name;
                });
                
                inventoryHistory = inventoryHistory.map(item => ({
                    ...item,
                    supplier_name: supplierMap[item.supplier_id] || null
                }));
            }
        }
        
        // Calculate analytics for this phone
        const salesAnalyticsQuery = `
            SELECT 
                SUM(CASE WHEN transaction_type = 'outgoing' THEN ABS(quantity_changed) ELSE 0 END) as total_sold,
                SUM(CASE WHEN transaction_type = 'incoming' THEN quantity_changed ELSE 0 END) as total_received,
                COUNT(CASE WHEN transaction_type = 'outgoing' THEN 1 END) as sale_transactions,
                MIN(CASE WHEN transaction_type = 'outgoing' THEN transaction_date END) as first_sale,
                MAX(CASE WHEN transaction_type = 'outgoing' THEN transaction_date END) as last_sale
            FROM inventory_log 
            WHERE phone_id = ?
        `;
        const salesAnalyticsResult = await conn.query(salesAnalyticsQuery, [req.params.id]);
        const salesAnalytics = convertBigIntToNumber(salesAnalyticsResult[0]);
        
        // Calculate revenue
        const totalRevenue = (salesAnalytics.total_sold || 0) * (phone.sm_price || 0);
        
        // Calculate days since last sale
        const daysSinceLastSale = salesAnalytics.last_sale ? 
            Math.floor((new Date() - new Date(salesAnalytics.last_sale)) / (1000 * 60 * 60 * 24)) : null;
        
        // Get stock level recommendation
        const avgMonthlySales = salesAnalytics.total_sold > 0 && salesAnalytics.first_sale ? 
            (salesAnalytics.total_sold / Math.max(1, Math.floor((new Date() - new Date(salesAnalytics.first_sale)) / (1000 * 60 * 60 * 24 * 30)))) : 0;
        
        const stockRecommendation = avgMonthlySales > 0 ? Math.ceil(avgMonthlySales * 2) : 10; // 2 months of stock
        
        // Determine stock status
        let stockStatus = 'good';
        let stockStatusText = 'Good Stock Level';
        let stockStatusClass = 'success';
        
        if (phone.sm_inventory <= 1) {
            stockStatus = 'critical';
            stockStatusText = 'Critical - Restock Immediately';
            stockStatusClass = 'danger';
        } else if (phone.sm_inventory <= 5) {
            stockStatus = 'low';
            stockStatusText = 'Low Stock - Restock Soon';
            stockStatusClass = 'warning';
        } else if (phone.sm_inventory > stockRecommendation * 1.5) {
            stockStatus = 'high';
            stockStatusText = 'High Stock - Consider Promotion';
            stockStatusClass = 'info';
        }
        
        conn.end();
        suppliersConn.end();

        res.render('details', {
            phone,
            success: req.query.success,
            inventoryHistory,
            salesAnalytics: {
                ...salesAnalytics,
                totalRevenue,
                daysSinceLastSale,
                avgMonthlySales: avgMonthlySales.toFixed(1)
            },
            stockRecommendation,
            stockStatus,
            stockStatusText,
            stockStatusClass
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Database connection failed'
        });
    }
});

// ===============================================
// SUPPLIERS ROUTES
// ===============================================

// Suppliers page - display all suppliers
app.get('/suppliers', isAuthenticated, async (req, res) => {
    try {
        const conn = await suppliersPool.getConnection();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let query = 'SELECT * FROM suppliers';
        let countQuery = 'SELECT COUNT(*) as total FROM suppliers';
        let params = [];

        if (search) {
            query += ' WHERE name LIKE ? OR contact_person LIKE ? OR contact_email LIKE ? OR email LIKE ? OR category LIKE ?';
            countQuery += ' WHERE name LIKE ? OR contact_person LIKE ? OR contact_email LIKE ? OR email LIKE ? OR category LIKE ?';
            params = [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`];
        }

        const countResult = await conn.query(countQuery, params);
        const total = convertBigIntToNumber(countResult[0].total);

        query += ' ORDER BY id LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const suppliersResult = await conn.query(query, params);
        const suppliers = convertBigIntToNumber(suppliersResult);
        conn.end();

        const totalPages = Math.ceil(total / limit);

        res.render('suppliers', {
            suppliers,
            currentPage: page,
            totalPages,
            limit,
            search,
            total,
            success: req.query.success
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Suppliers database connection failed'
        });
    }
});

// Supplier details page
app.get('/supplier/:id', isAuthenticated, async (req, res) => {
    try {
        const conn = await suppliersPool.getConnection();
        const suppliersResult = await conn.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
        const suppliers = convertBigIntToNumber(suppliersResult);
        conn.end();

        if (suppliers.length === 0) {
            return res.status(404).render('error', {
                error: 'Supplier not found'
            });
        }

        res.render('supplier-details', {
            supplier: suppliers[0],
            success: req.query.success
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Suppliers database connection failed'
        });
    }
});


// ===============================================
// SUPPLIER MANAGEMENT ROUTES
// ===============================================

// Add supplier form page
app.get('/suppliers/add', isStaffOrAdmin, (req, res) => {
    res.render('supplier-form', {
        supplier: null,
        action: 'add',
        title: 'Add New Supplier'
    });
});

// Edit supplier form page
app.get('/suppliers/edit/:id', isStaffOrAdmin, async (req, res) => {
    try {
        const conn = await suppliersPool.getConnection();
        const suppliersResult = await conn.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
        const suppliers = convertBigIntToNumber(suppliersResult);
        conn.end();

        if (suppliers.length === 0) {
            return res.status(404).render('error', {
                error: 'Supplier not found'
            });
        }

        res.render('supplier-form', {
            supplier: suppliers[0],
            action: 'edit',
            title: 'Edit Supplier'
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Suppliers database connection failed'
        });
    }
});

// Create new supplier (POST)
app.post('/suppliers', isStaffOrAdmin, async (req, res) => {
    try {
        const {
            name,
            category,
            contact_person,
            contact_position,
            contact_email,
            email,
            phone,
            website,
            address,
            notes,
            is_active,
            supplier_id
        } = req.body;

        const conn = await suppliersPool.getConnection();
        const result = await conn.query(
            `INSERT INTO suppliers (name, category, contact_person, contact_position, contact_email, email, phone, website, address, notes, is_active, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, category, contact_person, contact_position, contact_email, email, phone, website, address, notes, is_active ? 1 : 0, supplier_id]
        );
        conn.end();

        res.redirect(`/supplier/${result.insertId}?success=created`);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Failed to create supplier: ' + err.message
        });
    }
});

// Update supplier (POST)
app.post('/suppliers/:id', async (req, res) => {
    try {
        const {
            name,
            category,
            contact_person,
            contact_position,
            contact_email,
            email,
            phone,
            website,
            address,
            notes,
            is_active,
            supplier_id
        } = req.body;

        const conn = await suppliersPool.getConnection();
        const result = await conn.query(
            `UPDATE suppliers SET name = ?, category = ?, contact_person = ?, contact_position = ?, contact_email = ?, email = ?, phone = ?, website = ?, address = ?, notes = ?, is_active = ?, supplier_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [name, category, contact_person, contact_position, contact_email, email, phone, website, address, notes, is_active ? 1 : 0, supplier_id, req.params.id]
        );
        conn.end();

        if (result.affectedRows === 0) {
            return res.status(404).render('error', {
                error: 'Supplier not found'
            });
        }

        res.redirect(`/supplier/${req.params.id}?success=updated`);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Failed to update supplier: ' + err.message
        });
    }
});

// Delete supplier (POST)
app.post('/suppliers/:id/delete', async (req, res) => {
    try {
        const conn = await suppliersPool.getConnection();
        const result = await conn.query('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
        conn.end();

        if (result.affectedRows === 0) {
            return res.status(404).render('error', {
                error: 'Supplier not found'
            });
        }

        res.redirect('/suppliers?success=deleted');
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Failed to delete supplier: ' + err.message
        });
    }
});

// Toggle supplier active status (POST)
app.post('/suppliers/:id/toggle-status', async (req, res) => {
    try {
        const conn = await suppliersPool.getConnection();
        const currentResult = await conn.query('SELECT is_active FROM suppliers WHERE id = ?', [req.params.id]);

        if (currentResult.length === 0) {
            conn.end();
            return res.status(404).json({
                error: 'Supplier not found'
            });
        }

        const newStatus = currentResult[0].is_active ? 0 : 1;
        await conn.query(
            'UPDATE suppliers SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus, req.params.id]
        );
        conn.end();

        res.json({
            success: true,
            is_active: newStatus
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            error: 'Failed to toggle supplier status: ' + err.message
        });
    }
});


// ===============================================
// INVENTORY MANAGEMENT ROUTES
// ===============================================

// Display form to receive new stock
app.get('/inventory/receive', isStaffOrAdmin, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const suppliersConn = await suppliersPool.getConnection();

        const phonesResult = await conn.query('SELECT id, sm_name FROM phone_specs ORDER BY sm_name');
        const phones = convertBigIntToNumber(phonesResult);

        const suppliersResult = await suppliersConn.query("SELECT supplier_id, name FROM suppliers WHERE is_active = 1 ORDER BY name");
        const suppliers = convertBigIntToNumber(suppliersResult);

        conn.end();
        suppliersConn.end();

        res.render('receive-stock', {
            phones,
            suppliers,
            title: 'Receive New Stock'
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Database connection failed'
        });
    }
});

// Handle the form submission for receiving stock
app.post('/inventory/receive', isStaffOrAdmin, async (req, res) => {
    const {
        phone_id,
        supplier_id,
        quantity,
        notes
    } = req.body;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const currentStockResult = await conn.query('SELECT sm_inventory FROM phone_specs WHERE id = ?', [phone_id]);
        const currentStock = currentStockResult[0].sm_inventory;
        const newStockLevel = parseInt(currentStock) + parseInt(quantity);

        await conn.query('UPDATE phone_specs SET sm_inventory = ? WHERE id = ?', [newStockLevel, phone_id]);

        await conn.query(
            `INSERT INTO inventory_log (phone_id, transaction_type, quantity_changed, new_inventory_level, supplier_id, notes) VALUES (?, 'incoming', ?, ?, ?, ?)`,
            [phone_id, quantity, newStockLevel, supplier_id, notes]
        );

        await conn.commit();
        conn.end();

        res.redirect(`/phone/${phone_id}?success=stock_received`);

    } catch (err) {
        await conn.rollback();
        conn.end();
        console.error('Transaction Error:', err);
        res.status(500).render('error', {
            error: 'Failed to update stock: ' + err.message
        });
    }
});

// Display form to sell stock
app.get('/inventory/sell', isStaffOrAdmin, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const phonesResult = await conn.query('SELECT id, sm_name, sm_inventory FROM phone_specs WHERE sm_inventory > 0 ORDER BY sm_name');
        const phones = convertBigIntToNumber(phonesResult);
        conn.end();

        res.render('sell-stock', {
            phones,
            title: 'Record a Sale'
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Database connection failed'
        });
    }
});

// Handle the form submission for selling stock
app.post('/inventory/sell', isStaffOrAdmin, async (req, res) => {
    const {
        phone_id,
        quantity,
        notes
    } = req.body;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const stockResult = await conn.query('SELECT sm_inventory FROM phone_specs WHERE id = ? FOR UPDATE', [phone_id]);
        const currentStock = stockResult[0].sm_inventory;

        if (currentStock < quantity) {
            throw new Error('Insufficient stock to complete the sale.');
        }

        const newStockLevel = parseInt(currentStock) - parseInt(quantity);

        await conn.query('UPDATE phone_specs SET sm_inventory = ? WHERE id = ?', [newStockLevel, phone_id]);

        await conn.query(
            `INSERT INTO inventory_log (phone_id, transaction_type, quantity_changed, new_inventory_level, notes) VALUES (?, 'outgoing', ?, ?, ?)`,
            [phone_id, quantity, newStockLevel, notes]
        );

        await conn.commit();
        conn.end();

        res.redirect(`/phone/${phone_id}?success=stock_sold`);

    } catch (err) {
        await conn.rollback();
        conn.end();
        console.error('Transaction Error:', err);
        res.status(500).render('error', {
            error: 'Failed to record sale: ' + err.message
        });
    }
});

// Reports page -  display inventory log
app.get('/reports', isAuthenticated, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const suppliersConn = await suppliersPool.getConnection();
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const transactionType = req.query.transaction_type || '';
        const phoneId = req.query.phone_id || '';
        const startDate = req.query.start_date || '';
        const endDate = req.query.end_date || '';

        let query = `
            SELECT il.log_id, il.phone_id, il.transaction_type, il.quantity_changed, 
                   il.new_inventory_level, il.supplier_id, il.notes,
                   DATE_FORMAT(il.transaction_date, '%Y-%m-%d %H:%i:%s') as formatted_date,
                   il.transaction_date,
                   ps.sm_name, ps.sm_maker
            FROM inventory_log il 
            LEFT JOIN phone_specs ps ON il.phone_id = ps.id
            WHERE 1=1
        `;
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM inventory_log il 
            LEFT JOIN phone_specs ps ON il.phone_id = ps.id
            WHERE 1=1
        `;
        let params = [];

        // Apply filters
        if (transactionType) {
            query += ' AND il.transaction_type = ?';
            countQuery += ' AND il.transaction_type = ?';
            params.push(transactionType);
        }

        if (phoneId) {
            query += ' AND il.phone_id = ?';
            countQuery += ' AND il.phone_id = ?';
            params.push(phoneId);
        }

        if (startDate) {
            query += ' AND DATE(il.transaction_date) >= ?';
            countQuery += ' AND DATE(il.transaction_date) >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND DATE(il.transaction_date) <= ?';
            countQuery += ' AND DATE(il.transaction_date) <= ?';
            params.push(endDate);
        }

        // Get total count
        const countResult = await conn.query(countQuery, params);
        const total = convertBigIntToNumber(countResult[0].total);

        // Get paginated results
        query += ' ORDER BY il.transaction_date DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const reportsResult = await conn.query(query, params);
        let reports = convertBigIntToNumber(reportsResult);

        // Get supplier names separately to avoid cross-database join issues
        const suppliersResult = await suppliersConn.query('SELECT supplier_id, name FROM suppliers');
        const suppliers = convertBigIntToNumber(suppliersResult);
        const supplierMap = {};
        suppliers.forEach(supplier => {
            supplierMap[supplier.supplier_id] = supplier.name;
        });

        // Add supplier names to reports
        reports = reports.map(report => {
            return {
                ...report,
                supplier_name: report.supplier_id ? supplierMap[report.supplier_id] : null
                // formatted_date is already correctly formatted by MySQL DATE_FORMAT
            };
        });

        // Get unique phones for filter dropdown
        const phonesResult = await conn.query('SELECT id, sm_name, sm_maker FROM phone_specs ORDER BY sm_name');
        const phones = convertBigIntToNumber(phonesResult);

        conn.end();
        suppliersConn.end();

        const totalPages = Math.ceil(total / limit);

        res.render('reports', {
            reports,
            phones,
            currentPage: page,
            totalPages,
            limit,
            total,
            filters: {
                transaction_type: transactionType,
                phone_id: phoneId,
                start_date: startDate,
                end_date: endDate
            }
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Database connection failed: ' + err.message
        });
    }
});

// ===============================================
// API ROUTES
// ===============================================
app.get('/api/phones', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const phonesResult = await conn.query('SELECT * FROM phone_specs');
        const phones = convertBigIntToNumber(phonesResult);
        conn.end();
        res.json(phones);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

app.get('/api/phones/:id', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const phonesResult = await conn.query('SELECT * FROM phone_specs WHERE id = ?', [req.params.id]);
        const phones = convertBigIntToNumber(phonesResult);
        conn.end();
        
        if (phones.length === 0) {
            return res.status(404).json({ error: 'Phone not found' });
        }
        
        res.json(phones[0]);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

app.get('/api/suppliers', async (req, res) => {
    try {
        const conn = await suppliersPool.getConnection();
        const suppliersResult = await conn.query('SELECT * FROM suppliers');
        const suppliers = convertBigIntToNumber(suppliersResult);
        conn.end();
        res.json(suppliers);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Suppliers database connection failed' });
    }
});

app.get('/api/suppliers/:id', async (req, res) => {
    try {
        const conn = await suppliersPool.getConnection();
        const suppliersResult = await conn.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
        const suppliers = convertBigIntToNumber(suppliersResult);
        conn.end();
        
        if (suppliers.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        
        res.json(suppliers[0]);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Suppliers database connection failed' });
    }
});


// ===============================================
// PHONE MANAGEMENT ROUTES
// ===============================================

// Add phone form page
app.get('/phones/add', isStaffOrAdmin, (req, res) => {
    res.render('phone-form', {
        phone: null,
        action: 'add',
        title: 'Add New Phone'
    });
});

// Edit phone form page
app.get('/phones/edit/:id', isStaffOrAdmin, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const phonesResult = await conn.query('SELECT * FROM phone_specs WHERE id = ?', [req.params.id]);
        const phones = convertBigIntToNumber(phonesResult);
        conn.end();

        if (phones.length === 0) {
            return res.status(404).render('error', {
                error: 'Phone not found'
            });
        }

        res.render('phone-form', {
            phone: phones[0],
            action: 'edit',
            title: 'Edit Phone'
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Database connection failed'
        });
    }
});

// Create new phone (POST)
app.post('/phones', isStaffOrAdmin, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        
        // Helper function to convert empty strings to null for numeric fields
        const parseNumeric = (value) => {
            if (value === '' || value === null || value === undefined) return null;
            const parsed = parseFloat(value);
            return isNaN(parsed) ? null : parsed;
        };

        // Helper function to convert empty strings to null for integer fields
        const parseInteger = (value) => {
            if (value === '' || value === null || value === undefined) return null;
            const parsed = parseInt(value);
            return isNaN(parsed) ? null : parsed;
        };

        // Helper function to handle empty strings
        const parseString = (value) => {
            return (value === '' || value === null || value === undefined) ? null : value;
        };

        const insertQuery = `
            INSERT INTO phone_specs (
                sm_name, sm_maker, sm_price, sm_inventory, color, water_and_dust_rating,
                processor, process_node, cpu_cores, cpu_frequency, gpu, memory_type,
                ram, rom, expandable_memory, length_mm, width_mm, thickness_mm, weight_g,
                display_size, resolution, pixel_density, refresh_rate, brightness, display_features,
                rear_camera_main, rear_camera_macro, rear_camera_features, rear_video_resolution,
                front_camera, front_camera_features, front_video_resolution,
                battery_capacity, fast_charging, connector, security_features, sim_card,
                nfc, network_bands, wireless_connectivity, navigation, audio_jack,
                audio_playback, video_playback, sensors, operating_system, package_contents
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            parseString(req.body.sm_name),
            parseString(req.body.sm_maker),
            parseNumeric(req.body.sm_price),
            parseInteger(req.body.sm_inventory) || 0,
            parseString(req.body.color),
            parseString(req.body.water_and_dust_rating),
            parseString(req.body.processor),
            parseString(req.body.process_node),
            parseString(req.body.cpu_cores),
            parseString(req.body.cpu_frequency),
            parseString(req.body.gpu),
            parseString(req.body.memory_type),
            parseString(req.body.ram),
            parseString(req.body.rom),
            parseString(req.body.expandable_memory),
            parseNumeric(req.body.length_mm),
            parseNumeric(req.body.width_mm),
            parseNumeric(req.body.thickness_mm),
            parseNumeric(req.body.weight_g),
            parseNumeric(req.body.display_size),
            parseString(req.body.resolution),
            parseString(req.body.pixel_density),
            parseString(req.body.refresh_rate),
            parseString(req.body.brightness),
            parseString(req.body.display_features),
            parseString(req.body.rear_camera_main),
            parseString(req.body.rear_camera_macro),
            parseString(req.body.rear_camera_features),
            parseString(req.body.rear_video_resolution),
            parseString(req.body.front_camera),
            parseString(req.body.front_camera_features),
            parseString(req.body.front_video_resolution),
            parseString(req.body.battery_capacity),
            parseString(req.body.fast_charging),
            parseString(req.body.connector),
            parseString(req.body.security_features),
            parseString(req.body.sim_card),
            parseString(req.body.nfc),
            parseString(req.body.network_bands),
            parseString(req.body.wireless_connectivity),
            parseString(req.body.navigation),
            parseString(req.body.audio_jack),
            parseString(req.body.audio_playback),
            parseString(req.body.video_playback),
            parseString(req.body.sensors),
            parseString(req.body.operating_system),
            parseString(req.body.package_contents)
        ];

        const result = await conn.query(insertQuery, values);
        conn.end();

        res.redirect(`/phone/${result.insertId}?success=created`);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Failed to create phone: ' + err.message
        });
    }
});

// Update phone (POST)
app.post('/phones/:id', isStaffOrAdmin, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        
        // Helper function to convert empty strings to null for numeric fields
        const parseNumeric = (value) => {
            if (value === '' || value === null || value === undefined) return null;
            const parsed = parseFloat(value);
            return isNaN(parsed) ? null : parsed;
        };

        // Helper function to convert empty strings to null for integer fields
        const parseInteger = (value) => {
            if (value === '' || value === null || value === undefined) return null;
            const parsed = parseInt(value);
            return isNaN(parsed) ? null : parsed;
        };

        // Helper function to handle empty strings
        const parseString = (value) => {
            return (value === '' || value === null || value === undefined) ? null : value;
        };
        
        const updateQuery = `
            UPDATE phone_specs SET
                sm_name = ?, sm_maker = ?, sm_price = ?, sm_inventory = ?, color = ?, water_and_dust_rating = ?,
                processor = ?, process_node = ?, cpu_cores = ?, cpu_frequency = ?, gpu = ?, memory_type = ?,
                ram = ?, rom = ?, expandable_memory = ?, length_mm = ?, width_mm = ?, thickness_mm = ?, weight_g = ?,
                display_size = ?, resolution = ?, pixel_density = ?, refresh_rate = ?, brightness = ?, display_features = ?,
                rear_camera_main = ?, rear_camera_macro = ?, rear_camera_features = ?, rear_video_resolution = ?,
                front_camera = ?, front_camera_features = ?, front_video_resolution = ?,
                battery_capacity = ?, fast_charging = ?, connector = ?, security_features = ?, sim_card = ?,
                nfc = ?, network_bands = ?, wireless_connectivity = ?, navigation = ?, audio_jack = ?,
                audio_playback = ?, video_playback = ?, sensors = ?,
                operating_system = ?, package_contents = ?
            WHERE id = ?
        `;

        const values = [
            parseString(req.body.sm_name),
            parseString(req.body.sm_maker),
            parseNumeric(req.body.sm_price),
            parseInteger(req.body.sm_inventory) || 0,
            parseString(req.body.color),
            parseString(req.body.water_and_dust_rating),
            parseString(req.body.processor),
            parseString(req.body.process_node),
            parseString(req.body.cpu_cores),
            parseString(req.body.cpu_frequency),
            parseString(req.body.gpu),
            parseString(req.body.memory_type),
            parseString(req.body.ram),
            parseString(req.body.rom),
            parseString(req.body.expandable_memory),
            parseNumeric(req.body.length_mm),
            parseNumeric(req.body.width_mm),
            parseNumeric(req.body.thickness_mm),
            parseNumeric(req.body.weight_g),
            parseNumeric(req.body.display_size),
            parseString(req.body.resolution),
            parseString(req.body.pixel_density),
            parseString(req.body.refresh_rate),
            parseString(req.body.brightness),
            parseString(req.body.display_features),
            parseString(req.body.rear_camera_main),
            parseString(req.body.rear_camera_macro),
            parseString(req.body.rear_camera_features),
            parseString(req.body.rear_video_resolution),
            parseString(req.body.front_camera),
            parseString(req.body.front_camera_features),
            parseString(req.body.front_video_resolution),
            parseString(req.body.battery_capacity),
            parseString(req.body.fast_charging),
            parseString(req.body.connector),
            parseString(req.body.security_features),
            parseString(req.body.sim_card),
            parseString(req.body.nfc),
            parseString(req.body.network_bands),
            parseString(req.body.wireless_connectivity),
            parseString(req.body.navigation),
            parseString(req.body.audio_jack),
            parseString(req.body.audio_playback),
            parseString(req.body.video_playback),
            parseString(req.body.sensors),
            parseString(req.body.operating_system),
            parseString(req.body.package_contents),
            req.params.id
        ];

        await conn.query(updateQuery, values);
        conn.end();

        res.redirect(`/phone/${req.params.id}?success=updated`);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Failed to update phone: ' + err.message
        });
    }
});

// Delete phone (POST)
app.post('/phones/:id/delete', isStaffOrAdmin, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        await conn.query('DELETE FROM phone_specs WHERE id = ?', [req.params.id]);
        conn.end();

        res.redirect('/?success=deleted');
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).render('error', {
            error: 'Failed to delete phone'
        });
    }
});

// ===============================================
// ANALYTICS ROUTES (now handled by separate module)
// ===============================================

// Stock Alerts and Recommendations page
app.get('/stock-alerts', isAuthenticated, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        
        // Get critical stock products (≤1)
        const criticalQuery = `
            SELECT id, sm_name, sm_maker, sm_inventory, sm_price 
            FROM phone_specs 
            WHERE sm_inventory <= 1 
            ORDER BY sm_inventory ASC, sm_name ASC
        `;
        const criticalResult = await conn.query(criticalQuery);
        const criticalStockProducts = convertBigIntToNumber(criticalResult);
        
        // Get low stock products (≤5 but >1)
        const lowStockQuery = `
            SELECT id, sm_name, sm_maker, sm_inventory, sm_price 
            FROM phone_specs 
            WHERE sm_inventory > 1 AND sm_inventory <= 5 
            ORDER BY sm_inventory ASC, sm_name ASC
        `;
        const lowStockResult = await conn.query(lowStockQuery);
        const lowStockProducts = convertBigIntToNumber(lowStockResult);
        
        // Get fast moving products (products sold in last 30 days)
        const fastMovingQuery = `
            SELECT 
                ps.id, ps.sm_name, ps.sm_maker,
                SUM(ABS(il.quantity_changed)) as total_sold
            FROM phone_specs ps
            JOIN inventory_log il ON ps.id = il.phone_id
            WHERE il.transaction_type = 'outgoing' 
            AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY ps.id, ps.sm_name, ps.sm_maker
            HAVING total_sold >= 5
            ORDER BY total_sold DESC
        `;
        const fastMovingResult = await conn.query(fastMovingQuery);
        const fastMovingProducts = convertBigIntToNumber(fastMovingResult);
        
        // Get slow moving products (products with no sales in last 30 days)
        const slowMovingQuery = `
            SELECT ps.id, ps.sm_name, ps.sm_maker, ps.sm_inventory
            FROM phone_specs ps
            LEFT JOIN inventory_log il ON ps.id = il.phone_id 
                AND il.transaction_type = 'outgoing' 
                AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            WHERE il.phone_id IS NULL AND ps.sm_inventory > 0
            ORDER BY ps.sm_inventory DESC, ps.sm_name ASC
        `;
        const slowMovingResult = await conn.query(slowMovingQuery);
        const slowMovingProducts = convertBigIntToNumber(slowMovingResult);
        
        // Get top performers this month
        const topPerformersQuery = `
            SELECT 
                ps.sm_name, ps.sm_maker,
                SUM(ABS(il.quantity_changed)) as units_sold,
                SUM(ps.sm_price * ABS(il.quantity_changed)) as revenue
            FROM phone_specs ps
            JOIN inventory_log il ON ps.id = il.phone_id
            WHERE il.transaction_type = 'outgoing' 
            AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY ps.id, ps.sm_name, ps.sm_maker
            ORDER BY units_sold DESC
            LIMIT 5
        `;
        const topPerformersResult = await conn.query(topPerformersQuery);
        const topPerformers = convertBigIntToNumber(topPerformersResult);
        
        // Calculate averages
        const avgQuery = `
            SELECT 
                AVG(sm_inventory) as avg_inventory,
                AVG(sm_price * sm_inventory) as avg_inventory_value
            FROM phone_specs
            WHERE sm_inventory > 0
        `;
        const avgResult = await conn.query(avgQuery);
        const avgData = convertBigIntToNumber(avgResult[0]);
        
        // Generate smart recommendations
        const recommendations = [];
        
        if (criticalStockProducts.length > 0) {
            recommendations.push({
                title: 'Urgent Restocking Required',
                description: `${criticalStockProducts.length} products are critically low. Consider emergency reordering.`,
                confidence: 95
            });
        }
        
        if (fastMovingProducts.length > 3) {
            recommendations.push({
                title: 'Increase Stock for Fast Movers',
                description: `${fastMovingProducts.length} products are selling quickly. Consider increasing their safety stock levels.`,
                confidence: 85
            });
        }
        
        if (slowMovingProducts.length > 5) {
            recommendations.push({
                title: 'Review Slow Moving Items',
                description: `${slowMovingProducts.length} products haven't sold recently. Consider promotional pricing.`,
                confidence: 70
            });
        }
        
        conn.end();
        
        res.render('stock-alerts', {
            criticalStockProducts,
            lowStockProducts,
            fastMovingProducts,
            slowMovingProducts,
            topPerformers,
            recommendations,
            criticalStockCount: criticalStockProducts.length,
            lowStockCount: lowStockProducts.length,
            fastMovingCount: fastMovingProducts.length,
            slowMovingCount: slowMovingProducts.length,
            avgStockTurnover: fastMovingProducts.length > 0 ? 
                fastMovingProducts.reduce((sum, p) => sum + p.total_sold, 0) / fastMovingProducts.length : 0,
            avgInventoryValue: avgData.avg_inventory_value || 0
        });
        
    } catch (err) {
        console.error('Stock alerts error:', err);
        res.status(500).render('error', {
            error: 'Failed to load stock alerts: ' + err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
