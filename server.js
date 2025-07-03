// Load environment variables first
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = [
    'DB_USER',
    'DB_PASSWORD',
    'SUPPLIERS_DB_USER', 
    'SUPPLIERS_DB_PASSWORD',
    'AUTH_DB_USER',
    'AUTH_DB_PASSWORD',
    'SESSION_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingEnvVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    console.error('See .env.example for reference.');
    process.exit(1);
}

console.log('✅ All required environment variables are present');

const express = require('express');
const mariadb = require('mariadb');
const path = require('path');
const { format, isValid, parseISO } = require('date-fns');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('connect-flash');
const csrf = require('@dr.pogodin/csurf');
const cookieParser = require('cookie-parser');
const SanitizationService = require('./services/SanitizationService');
const SessionManagementService = require('./services/SessionManagementService');

const app = express();
const PORT = process.env.PORT || 3000;

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'master_specs_db',
    connectionLimit: 5,
    bigIntAsNumber: true // Convert BigInt to Number
};

// Suppliers database configuration
const suppliersDbConfig = {
    host: process.env.SUPPLIERS_DB_HOST || '127.0.0.1',
    port: process.env.SUPPLIERS_DB_PORT || 3306,
    user: process.env.SUPPLIERS_DB_USER,
    password: process.env.SUPPLIERS_DB_PASSWORD,
    database: process.env.SUPPLIERS_DB_NAME || 'suppliers_db',
    connectionLimit: 5,
    bigIntAsNumber: true
};

// Authentication database configuration
const authDbConfig = {
    host: process.env.AUTH_DB_HOST || '127.0.0.1',
    port: process.env.AUTH_DB_PORT || 3306,
    user: process.env.AUTH_DB_USER,
    password: process.env.AUTH_DB_PASSWORD,
    database: process.env.AUTH_DB_NAME || 'users_db',
    connectionLimit: 5,
    bigIntAsNumber: true
};

// Create connection pools
const pool = mariadb.createPool(dbConfig);
const suppliersPool = mariadb.createPool(suppliersDbConfig);
const authPool = mariadb.createPool(authDbConfig);

// Use SanitizationService for BigInt conversion
const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

// Initialize Session Management Service
const sessionManagementService = new SessionManagementService(authPool, convertBigIntToNumber);

// Graceful shutdown handler
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    sessionManagementService.shutdown();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    sessionManagementService.shutdown();
    process.exit(0);
});

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({
    extended: true
})); // For form data

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'strict'
    }
}));

// Cookie parser middleware (required for CSRF)
app.use(cookieParser());

// CSRF protection middleware with proper configuration
const csrfProtection = csrf({ 
    cookie: {
        key: '_csrf',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'strict'
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'], // Only protect state-changing methods
    value: (req) => {
        // Look for CSRF token in various places (ordered by preference)
        return req.body._csrf || 
               req.query._csrf || 
               req.headers['x-csrf-token'] ||
               req.headers['csrf-token'] ||
               req.headers['x-xsrf-token'];
    }
});

// Apply CSRF protection conditionally
app.use((req, res, next) => {
    // Skip CSRF for safe HTTP methods on API routes (but not /csrf-token)
    if ((req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') && 
        req.path.startsWith('/api/')) {
        return next();
    }
    
    // Apply CSRF protection for all state-changing requests
    csrfProtection(req, res, next);
});

// Expose CSRF token for client-side use (requires CSRF middleware to run first)
app.get('/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Set CSRF token in locals for all templates
app.use((req, res, next) => {
    try {
        res.locals.csrfToken = req.csrfToken();
    } catch (err) {
        // In case csrfToken() is not available (e.g., for exempted routes)
        res.locals.csrfToken = '';
    }
    next();
});

// CSRF error handling middleware
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        // Handle CSRF token errors
        console.error('CSRF token validation failed for:', req.method, req.path);
        console.error('Request headers:', req.headers);
        console.error('Request body:', req.body);
        
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            // For AJAX requests, return JSON error
            return res.status(403).json({ 
                error: 'Invalid CSRF token',
                code: 'CSRF_TOKEN_INVALID'
            });
        } else {
            // For regular requests, render error page with proper locals
            return res.status(403).render('error', {
                error: 'Invalid CSRF token. Please refresh the page and try again.',
                title: 'Security Error',
                user: req.session?.user || null,
                isAuthenticated: !!req.session?.user,
                isAdmin: req.session?.user?.role === 'admin',
                isStaffOrAdmin: req.session?.user && (req.session.user.role === 'admin' || req.session.user.role === 'staff')
            });
        }
    }
    next(err);
});

// Flash messages middleware
app.use(flash());

// Import and use auth middleware
const { setUserLocals, SessionSecurity } = require('./middleware/auth');

// Connect session management service to auth middleware
SessionSecurity.setSessionManagementService(sessionManagementService);

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
            receipt: req.query.receipt, // Add receipt ID if provided
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

        const phonesResult = await conn.query(
            'SELECT id, sm_name, sm_maker, sm_price, sm_inventory, ram, rom, color FROM phone_specs ORDER BY sm_name'
        );
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
        unit_cost,
        vat_rate,
        notes,
        generate_receipt,
        po_number
    } = req.body;
    const conn = await pool.getConnection();
    const suppliersConn = await suppliersPool.getConnection();

    try {
        await conn.beginTransaction();

        // Get the phone details
        const phoneResult = await conn.query('SELECT * FROM phone_specs WHERE id = ?', [phone_id]);
        if (phoneResult.length === 0) {
            throw new Error('Phone not found');
        }
        const phone = convertBigIntToNumber(phoneResult[0]);
        
        // Get supplier details
        const supplierResult = await suppliersConn.query('SELECT * FROM suppliers WHERE supplier_id = ?', [supplier_id]);
        if (supplierResult.length === 0) {
            throw new Error('Supplier not found');
        }
        const supplier = convertBigIntToNumber(supplierResult[0]);

        // Update inventory
        const currentStock = parseInt(phone.sm_inventory) || 0;
        const newStockLevel = currentStock + parseInt(quantity);

        await conn.query('UPDATE phone_specs SET sm_inventory = ? WHERE id = ?', [newStockLevel, phone_id]);

        // Add transaction notes
        const fullNotes = po_number ? `${notes || ''}${notes ? '\n' : ''}PO #: ${po_number}` : notes;
        
        // Log inventory change
        await conn.query(
            `INSERT INTO inventory_log (phone_id, transaction_type, quantity_changed, new_inventory_level, supplier_id, notes) VALUES (?, 'incoming', ?, ?, ?, ?)`,
            [phone_id, quantity, newStockLevel, supplier_id, fullNotes]
        );

        // Generate receipt if requested
        let receiptId = null;
        if (generate_receipt === 'on') {
            // Create receipt service instance
            const receiptService = new (require('./services/ReceiptService'))();
            
            // Generate receipt data
            const receiptData = {
                receiptId: receiptService.generateReceiptId('PUR'),
                date: new Date(),
                phone,
                supplier,
                quantity: parseInt(quantity),
                unitPrice: parseFloat(unit_cost),
                vatRate: parseFloat(vat_rate),
                notes: fullNotes
            };
            
            // Generate receipt and save to database
            const receipt = receiptService.generateReceiveReceipt(receiptData);
            receiptId = await receiptService.saveReceipt(conn, receipt, {
                phone_id,
                supplier_id,
                quantity,
                unit_cost,
                vat_rate,
                notes: fullNotes
            });
        }

        await conn.commit();
        conn.end();
        suppliersConn.end();

        // Redirect with appropriate success message and receipt ID if available
        const redirectUrl = receiptId ? 
            `/phone/${phone_id}?success=stock_received&receipt=${receiptId}` : 
            `/phone/${phone_id}?success=stock_received`;
        res.redirect(redirectUrl);

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
        const phonesResult = await conn.query(
            'SELECT id, sm_name, sm_maker, sm_price, sm_inventory, ram, rom, color FROM phone_specs WHERE sm_inventory > 0 ORDER BY sm_name'
        );
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
        tax_rate,
        customer_name,
        customer_email,
        customer_phone,
        notes,
        generate_receipt
    } = req.body;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // Get the phone details
        const phoneResult = await conn.query('SELECT * FROM phone_specs WHERE id = ? FOR UPDATE', [phone_id]);
        if (phoneResult.length === 0) {
            throw new Error('Phone not found');
        }
        const phone = convertBigIntToNumber(phoneResult[0]);
        const currentStock = parseInt(phone.sm_inventory);

        if (currentStock < quantity) {
            throw new Error('Insufficient stock to complete the sale.');
        }

        const newStockLevel = currentStock - parseInt(quantity);

        await conn.query('UPDATE phone_specs SET sm_inventory = ? WHERE id = ?', [newStockLevel, phone_id]);

        await conn.query(
            `INSERT INTO inventory_log (phone_id, transaction_type, quantity_changed, new_inventory_level, notes) VALUES (?, 'outgoing', ?, ?, ?)`,
            [phone_id, quantity, newStockLevel, notes]
        );

        // Generate receipt if requested
        let receiptId = null;
        if (generate_receipt === 'on') {
            // Create receipt service instance
            const receiptService = new (require('./services/ReceiptService'))();
            
            // Generate receipt data
            const receiptData = {
                receiptId: receiptService.generateReceiptId('SAL'),
                date: new Date(),
                phone,
                quantity: parseInt(quantity),
                unitPrice: parseFloat(phone.sm_price),
                taxRate: parseFloat(tax_rate),
                customerInfo: {
                    name: customer_name || 'Walk-in Customer',
                    email: customer_email || '',
                    phone: customer_phone || ''
                },
                notes
            };
            
            // Generate receipt and save to database
            const receipt = receiptService.generateSaleReceipt(receiptData);
            receiptId = await receiptService.saveReceipt(conn, receipt, {
                phone_id,
                quantity,
                tax_rate,
                notes
            });
        }

        await conn.commit();
        conn.end();

        // Redirect with appropriate success message and receipt ID if available
        const redirectUrl = receiptId ? 
            `/phone/${phone_id}?success=stock_sold&receipt=${receiptId}` : 
            `/phone/${phone_id}?success=stock_sold`;
        res.redirect(redirectUrl);

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
        const hasFilters = transactionType || phoneId || startDate || endDate;

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
            },
            showFilterNotification: hasFilters
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
        
        // Use SanitizationService to sanitize input
        const sanitizedData = SanitizationService.sanitizePhoneInput(req.body);

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
            ) VALUES (${Array(46).fill('?').join(', ')})
        `;

        const result = await conn.query(insertQuery, Object.values(sanitizedData));
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

        try {
            await conn.beginTransaction();

            // Get current inventory level before update
            const currentStockResult = await conn.query('SELECT sm_inventory FROM phone_specs WHERE id = ?', [req.params.id]);
            if (currentStockResult.length === 0) {
                throw new Error('Phone not found');
            }
            const currentStock = parseInt(currentStockResult[0].sm_inventory) || 0;
            
            // Use SanitizationService to sanitize input
            const sanitizedData = SanitizationService.sanitizePhoneInput(req.body);
            const newStock = sanitizedData.sm_inventory;
            
            const updateQuery = `
                UPDATE phone_specs SET
                    sm_name = ?, sm_maker = ?, sm_price = ?, sm_inventory = ?, color = ?, water_and_dust_rating = ?,
                    processor = ?, process_node = ?, cpu_cores = ?, cpu_frequency = ?, gpu = ?, memory_type = ?,
                    ram = ?, rom = ?, expandable_memory = ?, length_mm = ?, width_mm = ?, thickness_mm = ?, weight_g = ?,
                    display_size = ?, resolution = ?, pixel_density = ?, refresh_rate = ?, brightness = ?, display_features = ?,
                    rear_camera_main = ?, rear_camera_macro = ?, rear_camera_features = ?, rear_video_resolution = ?,
                    front_camera = ?, front_camera_features = ?, front_video_resolution = ?,
                    battery_capacity = ?, fast_charging = ?, connector = ?, security_features = ?, sim_card = ?,
                    nfc = ?, network_bands, wireless_connectivity = ?, navigation = ?, audio_jack = ?,
                    audio_playback = ?, video_playback = ?, sensors = ?,
                    operating_system = ?, package_contents = ?
                WHERE id = ?
            `;

            const values = [...Object.values(sanitizedData), req.params.id];

            await conn.query(updateQuery, values);

            // Log inventory change as adjustment if inventory level changed
            if (currentStock !== newStock) {
                const quantityChanged = newStock - currentStock;
                const notes = `Inventory adjustment from product edit: ${currentStock} → ${newStock}`;
                
                await conn.query(
                    `INSERT INTO inventory_log (phone_id, transaction_type, quantity_changed, new_inventory_level, notes) 
                     VALUES (?, 'adjustment', ?, ?, ?)`,
                    [req.params.id, quantityChanged, newStock, notes]
                );
            }

            await conn.commit();
            conn.end();

            res.redirect(`/phone/${req.params.id}?success=updated`);
        } catch (transactionErr) {
            await conn.rollback();
            conn.end();
            throw transactionErr;
        }
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

// View receipt
app.get('/receipt/:id', isAuthenticated, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const receiptService = new (require('./services/ReceiptService'))();
        
        const receipt = await receiptService.getReceipt(conn, req.params.id);
        conn.end();
        
        if (!receipt) {
            return res.status(404).render('error', {
                error: 'Receipt not found'
            });
        }
        
        // Generate HTML view of receipt
        const receiptHtml = receiptService.generateHTML(receipt.receipt_data);
        
        // Send the receipt HTML directly to the browser
        res.send(receiptHtml);
        
    } catch (err) {
        console.error('Receipt error:', err);
        res.status(500).render('error', {
            error: 'Failed to load receipt: ' + err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
