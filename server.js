// Load environment variables first
require('dotenv').config();

// Safe formatter for device information - add to prevent template literal syntax errors
function formatDeviceInfo(maker, name) {
    // Ensure both inputs are strings
    const deviceMaker = (maker || '').toString();
    const deviceName = (name || '').toString();
    // Combine and trim, providing a default if empty
    return (deviceMaker + ' ' + deviceName).trim() || 'N/A';
}

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
const flash = require('connect-flash');
const csrf = require('@dr.pogodin/csurf');
const cookieParser = require('cookie-parser');
const SanitizationService = require('./services/SanitizationService');
const SessionManagementService = require('./services/SessionManagementService');

// Import dynamic session secret services
const DynamicSessionSecretService = require('./services/DynamicSessionSecretService');
const { createDynamicSessionMiddleware } = require('./middleware/DynamicSessionMiddleware');

// Import security middleware
const { sanitizeApiResponse, securityHeaders, preventSecretExposure } = require('./middleware/security');

// Import rate limiting middleware
const {
    generalLimiter,
    authLimiter,
    passwordResetLimiter,
    speedLimiter,
    adminLimiter,
    apiWriteLimiter
} = require('./middleware/rateLimiting');

// Import input validation middleware
const InputValidator = require('./middleware/inputValidation');

// Import password validation service
const PasswordValidator = require('./services/PasswordValidator');

// Import security enhancement services
const TokenInvalidationService = require('./services/TokenInvalidationService');
const SecurityLogger = require('./services/SecurityLogger');

const app = express();
const PORT = process.env.PORT || 3000;

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'master_specs_db',
    connectionLimit: 10, // Increased connection limit for better performance
    bigIntAsNumber: true // Convert BigInt to Number
};

// Suppliers database configuration
const suppliersDbConfig = {
    host: process.env.SUPPLIERS_DB_HOST || '127.0.0.1',
    port: process.env.SUPPLIERS_DB_PORT || 3306,
    user: process.env.SUPPLIERS_DB_USER,
    password: process.env.SUPPLIERS_DB_PASSWORD,
    database: process.env.SUPPLIERS_DB_NAME || 'suppliers_db',
    connectionLimit: 10,
    bigIntAsNumber: true
};

// Authentication database configuration
const authDbConfig = {
    host: process.env.AUTH_DB_HOST || '127.0.0.1',
    port: process.env.AUTH_DB_PORT || 3306,
    user: process.env.AUTH_DB_USER,
    password: process.env.AUTH_DB_PASSWORD,
    database: process.env.AUTH_DB_NAME || 'users_db',
    connectionLimit: 10,
    bigIntAsNumber: true
};

// Create connection pools
const pool = mariadb.createPool(dbConfig);
const suppliersPool = mariadb.createPool(suppliersDbConfig);
const authPool = mariadb.createPool(authDbConfig);

// Use SanitizationService for BigInt conversion
const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

// Initialize Dynamic Session Secret Service
const dynamicSecretService = new DynamicSessionSecretService();

// Initialize Session Management Service
const sessionManagementService = new SessionManagementService(authPool, convertBigIntToNumber);

// Initialize security enhancement services
const tokenInvalidationService = new TokenInvalidationService(authPool);
const securityLogger = new SecurityLogger(authPool);

// Enhanced startup function
async function startServer() {
    try {
        console.log('🚀 Starting Mycelium ERP Server with Dynamic Session Management...');

        // Initialize dynamic session secret service
        const secretServiceInitialized = await dynamicSecretService.initialize();

        if (secretServiceInitialized) {
            console.log('✅ Dynamic session secret service ready');
        } else {
            console.warn('⚠️  Falling back to static session secret from environment');
        }

        // Create dynamic session middleware
        const dynamicSessionMiddleware = createDynamicSessionMiddleware(dynamicSecretService, {
            cookie: {
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            }
        });

        // Middleware
        app.use(express.static('public'));
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Apply rate limiting
        app.use(generalLimiter);
        app.use(speedLimiter);

        // Security middleware
        app.use(securityHeaders);
        app.use(preventSecretExposure);
        app.use(sanitizeApiResponse);
        app.use(InputValidator.sanitizeText);
        app.use(InputValidator.validateApiParams);

        // Block access to sensitive files
        app.use((req, res, next) => {
            const sensitivePatterns = [
                /\.session-secrets\.json$/,
                /\.env$/,
            ];
            if (sensitivePatterns.some(pattern => pattern.test(req.path))) {
                console.warn(`🚨 Blocked access to sensitive file: ${req.path} from IP: ${req.ip}`);
                return res.status(403).json({ error: 'Access denied' });
            }
            next();
        });
        
        // CORRECT MIDDLEWARE ORDER
        app.use(cookieParser());
        app.use(dynamicSessionMiddleware.getMiddleware());
        app.use(flash());

        // CSRF Protection
        app.use(csrf({ cookie: false })); // Use session-based storage

        // Make CSRF token available to all views and handle errors
        app.use((req, res, next) => {
            res.locals.csrfToken = req.csrfToken();
            res.locals.formatDeviceInfo = formatDeviceInfo; // Make the formatter available to views
            next();
        });

        // Import and use auth middleware
        const { setUserLocals, SessionSecurity, isAuthenticated, isAdmin, isStaffOrAdmin } = require('./middleware/auth');

        // Initialize and connect services to auth middleware
        await tokenInvalidationService.initialize();
        await securityLogger.initialize();
        SessionSecurity.setSessionManagementService(sessionManagementService);
        SessionSecurity.setTokenInvalidationService(tokenInvalidationService);
        SessionSecurity.setSecurityLogger(securityLogger);

        app.use(setUserLocals);

        // Set view engine
        app.set('view engine', 'ejs');
        app.set('views', path.join(__dirname, 'views'));

        // Import routes
        const authRoutes = require('./routes/auth')(authPool, convertBigIntToNumber);
        // Temporarily disable analytics routes to fix SQL error
        // const analyticsRoutes = require('./routes/analytics')(pool, suppliersPool, convertBigIntToNumber);

        // Apply rate limiting to specific routes
        app.use('/auth/login', authLimiter);
        app.use('/auth/forgot-password', passwordResetLimiter);
        app.use('/admin', adminLimiter);
        app.use((req, res, next) => {
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
                return apiWriteLimiter(req, res, next);
            }
            next();
        });
        
        // Use routes
        app.use('/', authRoutes);
        // Temporarily disable analytics routes to fix SQL error
        // app.use('/', analyticsRoutes);

        // ===============================================
        // ROUTES
        // ===============================================

        // Import ReceiptService for receipt functionality
        const ReceiptService = require('./services/ReceiptService');
        const receiptService = new ReceiptService();

        app.get('/dashboard', isAuthenticated, async (req, res, next) => {
            let conn, suppliersConn;
            try {
                conn = await pool.getConnection();
                suppliersConn = await suppliersPool.getConnection();
        
                const [totalProductsResult] = await conn.query('SELECT COUNT(*) as count FROM specs_db');
                const [totalInventoryResult] = await conn.query('SELECT SUM(device_inventory) as total FROM specs_db');
                const [lowStockResult] = await conn.query('SELECT COUNT(*) as count FROM specs_db WHERE device_inventory <= 5');
                const [suppliersResult] = await suppliersConn.query('SELECT COUNT(*) as count FROM suppliers WHERE is_active = 1');
                const lowStockProducts = await conn.query('SELECT device_name, device_maker, device_inventory FROM specs_db WHERE device_inventory <= 5 ORDER BY device_inventory ASC LIMIT 10');
                const recentTransactions = await conn.query(`SELECT il.transaction_date, il.transaction_type, il.quantity_changed, s.device_name, s.device_maker FROM inventory_log il LEFT JOIN specs_db s ON il.phone_id = s.product_id ORDER BY il.transaction_date DESC LIMIT 10`);
                const topProducts = await conn.query(`SELECT s.device_name, s.device_maker, SUM(ABS(il.quantity_changed)) as total_sold FROM inventory_log il LEFT JOIN specs_db s ON il.phone_id = s.product_id WHERE il.transaction_type = 'outgoing' GROUP BY il.phone_id ORDER BY total_sold DESC LIMIT 5`);

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

        app.get('/', isAuthenticated, async (req, res, next) => {
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

        // Suppliers Route
        app.get('/suppliers', isAuthenticated, async (req, res, next) => {
            let conn;
            try {
                conn = await suppliersPool.getConnection();
                
                const search = req.query.search || '';
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 20;
                const offset = (page - 1) * limit;

                let query = 'SELECT * FROM suppliers';
                let countQuery = 'SELECT COUNT(*) as total FROM suppliers';
                let params = [];

                if (search) {
                    const searchCondition = ' WHERE name LIKE ? OR contact_person LIKE ? OR contact_email LIKE ? OR email LIKE ?';
                    query += searchCondition + ' ORDER BY name';
                    countQuery += searchCondition;
                    const searchTerm = `%${search}%`;
                    params = [searchTerm, searchTerm, searchTerm, searchTerm];
                } else {
                    query += ' ORDER BY name';
                }

                query += ' LIMIT ? OFFSET ?';
                params.push(limit, offset);

                const [totalResult] = await conn.query(countQuery, search ? params.slice(0, -2) : []);
                const total = convertBigIntToNumber(totalResult.total);

                const suppliersResult = await conn.query(query, params);

                res.render('suppliers', {
                    title: 'Suppliers',
                    suppliers: convertBigIntToNumber(suppliersResult),
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    limit,
                    search: search || '', // Ensure search is always defined
                    total,
                    csrfToken: req.csrfToken()
                });
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Individual Supplier Details Route
        app.get('/supplier/:id', isAuthenticated, async (req, res, next) => {
            let conn;
            try {
                conn = await suppliersPool.getConnection();
                const supplierId = req.params.id;
                
                const [supplier] = await conn.query('SELECT * FROM suppliers WHERE id = ?', [supplierId]);
                
                if (!supplier) {
                    req.flash('error', 'Supplier not found');
                    return res.redirect('/suppliers');
                }

                res.render('supplier-details', {
                    title: 'Supplier Details',
                    supplier: convertBigIntToNumber(supplier),
                    csrfToken: req.csrfToken()
                });
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Add Supplier Form Route
        app.get('/suppliers/add', isStaffOrAdmin, (req, res) => {
            res.render('supplier-form', {
                title: 'Add New Supplier',
                action: 'add',
                supplier: null,
                csrfToken: req.csrfToken()
            });
        });

        // Create Supplier Route
        app.post('/suppliers', isStaffOrAdmin, InputValidator.validateSupplierData, async (req, res, next) => {
            let conn;
            try {
                conn = await suppliersPool.getConnection();
                const sanitizedData = SanitizationService.sanitizeSupplierInput(req.body);
                
                // Check if supplier name already exists
                const [existingSupplier] = await conn.query('SELECT id FROM suppliers WHERE name = ?', [sanitizedData.name]);
                if (existingSupplier) {
                    req.flash('error', 'Supplier name already exists. Please use a different name.');
                    return res.redirect('/suppliers/add');
                }
                
                // Build dynamic insert query
                const fields = [];
                const placeholders = [];
                const values = [];
                
                Object.entries(sanitizedData).forEach(([key, value]) => {
                    if (value !== null && value !== undefined && value !== '') {
                        fields.push(key);
                        placeholders.push('?');
                        values.push(value);
                    }
                });
                
                const insertQuery = `INSERT INTO suppliers (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
                const result = await conn.query(insertQuery, values);
                
                req.flash('success', 'Supplier added successfully');
                res.redirect(`/supplier/${result.insertId}?success=created`);
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Edit Supplier Form Route
        app.get('/suppliers/edit/:id', isStaffOrAdmin, async (req, res, next) => {
            let conn;
            try {
                conn = await suppliersPool.getConnection();
                const supplierId = req.params.id;
                
                const [supplier] = await conn.query('SELECT * FROM suppliers WHERE id = ?', [supplierId]);
                
                if (!supplier) {
                    req.flash('error', 'Supplier not found');
                    return res.redirect('/suppliers');
                }

                res.render('supplier-form', {
                    title: 'Edit Supplier',
                    action: 'edit',
                    supplier: convertBigIntToNumber(supplier),
                    csrfToken: req.csrfToken()
                });
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Update Supplier Route
        app.post('/suppliers/:id', isStaffOrAdmin, InputValidator.validateSupplierData, async (req, res, next) => {
            let conn;
            try {
                conn = await suppliersPool.getConnection();
                const supplierId = req.params.id;
                const sanitizedData = SanitizationService.sanitizeSupplierInput(req.body);
                
                // Check if supplier exists
                const [existingSupplier] = await conn.query('SELECT id FROM suppliers WHERE id = ?', [supplierId]);
                if (!existingSupplier) {
                    req.flash('error', 'Supplier not found');
                    return res.redirect('/suppliers');
                }
                
                // Build dynamic update query
                const updateFields = [];
                const updateValues = [];
                
                Object.entries(sanitizedData).forEach(([key, value]) => {
                    if (value !== null && value !== undefined && value !== '') {
                        updateFields.push(`${key} = ?`);
                        updateValues.push(value);
                    }
                });
                
                if (updateFields.length === 0) {
                    req.flash('error', 'No valid data to update');
                    return res.redirect(`/supplier/${supplierId}`);
                }
                
                updateValues.push(supplierId);
                
                const updateQuery = `UPDATE suppliers SET ${updateFields.join(', ')} WHERE id = ?`;
                await conn.query(updateQuery, updateValues);
                
                req.flash('success', 'Supplier updated successfully');
                res.redirect(`/supplier/${supplierId}?success=updated`);
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Toggle Supplier Status Route
        app.post('/suppliers/:id/toggle-status', isStaffOrAdmin, async (req, res, next) => {
            let conn;
            try {
                conn = await suppliersPool.getConnection();
                const supplierId = req.params.id;
                
                const [supplier] = await conn.query('SELECT is_active FROM suppliers WHERE id = ?', [supplierId]);
                if (!supplier) {
                    return res.status(404).json({ success: false, error: 'Supplier not found' });
                }
                
                const newStatus = !supplier.is_active;
                await conn.query('UPDATE suppliers SET is_active = ? WHERE id = ?', [newStatus, supplierId]);
                
                res.json({ success: true, newStatus });
            } catch (err) {
                console.error('Toggle supplier status error:', err);
                res.status(500).json({ success: false, error: 'Failed to update supplier status' });
            } finally {
                if (conn) conn.release();
            }
        });

        // Delete Supplier Route
        app.post('/suppliers/:id/delete', isStaffOrAdmin, async (req, res, next) => {
            let conn;
            try {
                conn = await suppliersPool.getConnection();
                const supplierId = req.params.id;
                
                // Check if supplier exists
                const [supplier] = await conn.query('SELECT name FROM suppliers WHERE id = ?', [supplierId]);
                if (!supplier) {
                    req.flash('error', 'Supplier not found');
                    return res.redirect('/suppliers');
                }
                
                // Delete the supplier
                await conn.query('DELETE FROM suppliers WHERE id = ?', [supplierId]);
                
                req.flash('success', `Supplier "${supplier.name}" deleted successfully`);
                res.redirect('/suppliers?success=deleted');
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Receipts Route
        app.get('/receipts', isAuthenticated, async (req, res, next) => {
            let conn, suppliersConn;
            try {
                conn = await pool.getConnection();
                suppliersConn = await suppliersPool.getConnection();
                
                // Get receipts with product info (no JOIN with suppliers since they're in different DB)
                const receiptsResult = await conn.query(`
                    SELECT r.*, s.device_name, s.device_maker,
                           DATE_FORMAT(r.transaction_date, '%M %d, %Y at %h:%i %p') as formatted_date
                    FROM receipts r
                    LEFT JOIN specs_db s ON r.phone_id = s.product_id
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
        app.get('/receipt/:receipt_id', isAuthenticated, async (req, res, next) => {
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
                    LEFT JOIN specs_db s ON r.phone_id = s.product_id
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
                if (receipt.phone_id) {
                    const [phoneResult] = await conn.query(
                        'SELECT * FROM specs_db WHERE product_id = ?', 
                        [receipt.phone_id]
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

        // Receive Stock Route
        app.get('/inventory/receive', isStaffOrAdmin, async (req, res, next) => {
            let conn, suppliersConn;
            try {
                conn = await pool.getConnection();
                suppliersConn = await suppliersPool.getConnection();
                
                const phonesResult = await conn.query('SELECT product_id, device_name, device_maker, device_price, device_inventory, ram, rom, color FROM specs_db ORDER BY device_name');
                const suppliersResult = await suppliersConn.query('SELECT id as supplier_id, name FROM suppliers WHERE is_active = 1');

                res.render('receive-stock', {
                    title: 'Receive Stock',
                    phones: convertBigIntToNumber(phonesResult),
                    suppliers: convertBigIntToNumber(suppliersResult),
                    csrfToken: req.csrfToken()
                });
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
                if (suppliersConn) suppliersConn.release();
            }
        });

        // Process Receive Stock Route
        app.post('/inventory/receive', isStaffOrAdmin, async (req, res, next) => {
            let conn;
            try {
                conn = await pool.getConnection();
                await conn.beginTransaction();
                
                const {
                    phone_id,
                    supplier_id,
                    quantity,
                    unit_cost,
                    tax_type,
                    vat_rate,
                    import_duty,
                    other_fees,
                    po_number,
                    notes,
                    generate_receipt
                } = req.body;
                
                // Validate inputs
                if (!phone_id || !supplier_id || !quantity || quantity <= 0) {
                    req.flash('error', 'Please provide all required fields with valid values');
                    return res.redirect('/inventory/receive');
                }
                
                // Get current phone data
                const [phone] = await conn.query('SELECT * FROM specs_db WHERE product_id = ?', [phone_id]);
                if (!phone) {
                    req.flash('error', 'Phone not found');
                    return res.redirect('/inventory/receive');
                }
                
                // Calculate financial values
                const unitCostValue = parseFloat(unit_cost) || 0;
                const quantityValue = parseInt(quantity);
                const vatRateValue = parseFloat(vat_rate) || 0;
                const importDutyValue = parseFloat(import_duty) || 0;
                const otherFeesValue = parseFloat(other_fees) || 0;
                
                const subtotal = unitCostValue * quantityValue;
                const vatAmount = tax_type === 'vat' ? subtotal * vatRateValue : 0;
                const importDutyAmount = (subtotal * importDutyValue) / 100;
                const totalCost = subtotal + vatAmount + importDutyAmount + otherFeesValue;
                
                // Update inventory
                const newInventoryLevel = (phone.device_inventory || 0) + quantityValue;
                await conn.query(
                    'UPDATE specs_db SET device_inventory = ? WHERE product_id = ?',
                    [newInventoryLevel, phone_id]
                );
                
                // Log the inventory transaction
                await conn.query(
                    'INSERT INTO inventory_log (phone_id, transaction_type, quantity_changed, total_value, new_inventory_level, supplier_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [phone_id, 'incoming', quantityValue, totalCost, newInventoryLevel, supplier_id, notes || null]
                );
                
                // Generate receipt if requested
                if (generate_receipt === 'on') {
                    const receiptData = {
                        phone_info: {
                            id: phone.product_id,
                            name: phone.device_name,
                            maker: phone.device_maker
                        },
                        supplier_id: supplier_id,
                        quantity: quantityValue,
                        unit_cost: unitCostValue,
                        subtotal: subtotal,
                        vat_amount: vatAmount,
                        import_duty_amount: importDutyAmount,
                        other_fees: otherFeesValue,
                        total_cost: totalCost,
                        po_number: po_number || null,
                        tax_type: tax_type,
                        notes: notes || null
                    };
                    
                    const receiptId = `PUR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                    
                    await conn.query(
                        'INSERT INTO receipts (receipt_id, receipt_type, receipt_data, phone_id, supplier_id, transaction_date, subtotal, tax_amount, total_amount, notes) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)',
                        [receiptId, 'PURCHASE_RECEIPT', JSON.stringify(receiptData), phone_id, supplier_id, subtotal, vatAmount, totalCost, notes || null]
                    );
                }
                
                await conn.commit();
                
                req.flash('success', `Successfully received ${quantityValue} units of ${phone.device_name}. New inventory level: ${newInventoryLevel}`);
                res.redirect('/inventory/receive?success=received');
                
            } catch (err) {
                if (conn) await conn.rollback();
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Sell Stock Route
        app.get('/inventory/sell', isStaffOrAdmin, async (req, res, next) => {
            let conn;
            try {
                conn = await pool.getConnection();
                const phonesResult = await conn.query('SELECT product_id, device_name, device_maker, device_price, device_inventory, ram, rom, color FROM specs_db WHERE device_inventory > 0 ORDER BY device_name');

                res.render('sell-stock', {
                    title: 'Sell Stock',
                    phones: convertBigIntToNumber(phonesResult),
                    csrfToken: req.csrfToken()
                });
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Process Sell Stock Route
        app.post('/inventory/sell', isStaffOrAdmin, async (req, res, next) => {
            let conn;
            try {
                conn = await pool.getConnection();
                await conn.beginTransaction();
                
                const {
                    phone_id,
                    quantity,
                    tax_type,
                    tax_rate,
                    discount_percent,
                    service_fee,
                    customer_name,
                    customer_email,
                    customer_phone,
                    generate_receipt,
                    email_receipt,
                    notes
                } = req.body;
                
                // Validate inputs
                if (!phone_id || !quantity || quantity <= 0) {
                    req.flash('error', 'Please provide all required fields with valid values');
                    return res.redirect('/inventory/sell');
                }
                
                // Get current phone data
                const [phone] = await conn.query('SELECT * FROM specs_db WHERE product_id = ?', [phone_id]);
                if (!phone) {
                    req.flash('error', 'Phone not found');
                    return res.redirect('/inventory/sell');
                }
                
                const quantityValue = parseInt(quantity);
                const currentInventory = phone.device_inventory || 0;
                
                // Check if sufficient stock is available
                if (quantityValue > currentInventory) {
                    req.flash('error', `Insufficient stock. Available: ${currentInventory}, Requested: ${quantityValue}`);
                    return res.redirect('/inventory/sell');
                }
                
                // Calculate financial values
                const unitPrice = parseFloat(phone.device_price) || 0;
                const subtotal = unitPrice * quantityValue;
                const taxRateValue = parseFloat(tax_rate) || 0;
                const discountPercentValue = parseFloat(discount_percent) || 0;
                const serviceFeeValue = parseFloat(service_fee) || 0;
                
                const taxAmount = tax_type !== 'none' ? subtotal * taxRateValue : 0;
                const discountAmount = (subtotal * discountPercentValue) / 100;
                const totalAmount = subtotal + taxAmount - discountAmount + serviceFeeValue;
                
                // Update inventory
                const newInventoryLevel = currentInventory - quantityValue;
                await conn.query(
                    'UPDATE specs_db SET device_inventory = ? WHERE product_id = ?',
                    [newInventoryLevel, phone_id]
                );
                
                // Log the inventory transaction
                await conn.query(
                    'INSERT INTO inventory_log (phone_id, transaction_type, quantity_changed, total_value, new_inventory_level, notes) VALUES (?, ?, ?, ?, ?, ?)',
                    [phone_id, 'outgoing', -quantityValue, totalAmount, newInventoryLevel, notes || null]
                );
                
                // Generate receipt if requested
                if (generate_receipt === 'on') {
                    const receiptData = {
                        phone_info: {
                            id: phone.product_id,
                            name: phone.device_name,
                            maker: phone.device_maker
                        },
                        customer: {
                            name: customer_name || null,
                            email: customer_email || null,
                            phone: customer_phone || null
                        },
                        quantity: quantityValue,
                        unit_price: unitPrice,
                        subtotal: subtotal,
                        tax_amount: taxAmount,
                        discount_amount: discountAmount,
                        service_fee: serviceFeeValue,
                        total_amount: totalAmount,
                        tax_type: tax_type,
                        notes: notes || null
                    };
                    
                    const receiptId = `SAL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                    
                    await conn.query(
                        'INSERT INTO receipts (receipt_id, receipt_type, receipt_data, phone_id, transaction_date, subtotal, tax_amount, total_amount, notes) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)',
                        [receiptId, 'SALES_RECEIPT', JSON.stringify(receiptData), phone_id, subtotal, taxAmount, totalAmount, notes || null]
                    );
                }
                
                await conn.commit();
                
                req.flash('success', `Successfully sold ${quantityValue} units of ${phone.device_name}. Remaining inventory: ${newInventoryLevel}`);
                res.redirect('/inventory/sell?success=sold');
                
            } catch (err) {
                if (conn) await conn.rollback();
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Stock Alerts Route
        app.get('/stock-alerts', isAuthenticated, async (req, res, next) => {
            let conn;
            try {
                conn = await pool.getConnection();
                const lowStockThreshold = 5;
                const criticalStockThreshold = 1;
                
                // Get critical stock products
                const criticalStockResult = await conn.query(
                    'SELECT * FROM specs_db WHERE device_inventory <= ? ORDER BY device_inventory ASC',
                    [criticalStockThreshold]
                );
                
                // Get low stock products  
                const lowStockResult = await conn.query(
                    'SELECT * FROM specs_db WHERE device_inventory > ? AND device_inventory <= ? ORDER BY device_inventory ASC',
                    [criticalStockThreshold, lowStockThreshold]
                );
                
                // Get fast moving products (mock data for now)
                const fastMovingResult = await conn.query(
                    'SELECT * FROM specs_db WHERE device_inventory > 20 ORDER BY device_inventory DESC LIMIT 5'
                );
                
                // Get slow moving products (mock data for now)
                const slowMovingResult = await conn.query(
                    'SELECT * FROM specs_db WHERE device_inventory > 50 ORDER BY device_inventory DESC LIMIT 3'
                );
                
                // Mock data for analytics
                const topPerformers = [
                    { sm_name: 'iPhone 14 Pro', units_sold: 45 },
                    { sm_name: 'Samsung Galaxy S23', units_sold: 38 },
                    { sm_name: 'Google Pixel 7', units_sold: 24 }
                ];
                
                const recommendations = criticalStockResult.length > 0 ? [
                    {
                        title: 'Critical Stock Alert',
                        description: `You have ${criticalStockResult.length} product(s) with critical stock levels. Immediate restocking recommended.`,
                        confidence: 95
                    }
                ] : [];

                res.render('stock-alerts', {
                    title: 'Stock Alerts',
                    criticalStockProducts: convertBigIntToNumber(criticalStockResult),
                    lowStockProducts: convertBigIntToNumber(lowStockResult),
                    criticalStockCount: criticalStockResult.length || 0,
                    lowStockCount: lowStockResult.length || 0,
                    fastMovingCount: fastMovingResult.length || 0,
                    slowMovingCount: slowMovingResult.length || 0,
                    topPerformers: topPerformers || [],
                    recommendations: recommendations || [],
                    avgStockTurnover: 4.2,
                    avgInventoryValue: 125000,
                    threshold: lowStockThreshold,
                    csrfToken: req.csrfToken()
                });
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Reports Route
        app.get('/reports', isAuthenticated, async (req, res, next) => {
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

        // Individual Phone Details Route
        app.get('/phone/:id', isAuthenticated, async (req, res, next) => {
            let conn;
            try {
                conn = await pool.getConnection();
                const phoneId = req.params.id;
                
                const [phone] = await conn.query('SELECT * FROM specs_db WHERE product_id = ?', [phoneId]);
                
                if (!phone) {
                    req.flash('error', 'Phone not found');
                    return res.redirect('/');
                }

                // Get recent inventory logs for this phone
                const inventoryLogs = await conn.query(`
                    SELECT *, DATE_FORMAT(transaction_date, '%M %d, %Y at %h:%i %p') as formatted_date
                    FROM inventory_log 
                    WHERE phone_id = ? 
                    ORDER BY transaction_date DESC 
                    LIMIT 10
                `, [phoneId]);

                res.render('details', {
                    title: phone.device_name || 'Phone Details',
                    phone: convertBigIntToNumber(phone),
                    inventoryLogs: convertBigIntToNumber(inventoryLogs),
                    formatDeviceInfo, // Pass the helper function
                    csrfToken: req.csrfToken()
                });
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Edit Phone Route
        app.get('/phones/:id/edit', isStaffOrAdmin, async (req, res, next) => {
            let conn;
            try {
                conn = await pool.getConnection();
                const phoneId = req.params.id;
                
                const [phone] = await conn.query('SELECT * FROM specs_db WHERE product_id = ?', [phoneId]);
                
                if (!phone) {
                    req.flash('error', 'Phone not found');
                    return res.redirect('/');
                }

                res.render('phone-form', {
                    phone: convertBigIntToNumber(phone),
                    action: 'edit',
                    title: 'Edit Phone',
                    csrfToken: req.csrfToken()
                });
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Update Phone Route (POST)
        app.post('/phones/:id', isStaffOrAdmin, InputValidator.validatePhoneData, async (req, res, next) => {
            let conn;
            try {
                conn = await pool.getConnection();
                const phoneId = req.params.id;
                const sanitizedData = SanitizationService.sanitizePhoneInput(req.body);
                
                // Build dynamic update query
                const updateFields = [];
                const updateValues = [];
                
                Object.entries(sanitizedData).forEach(([key, value]) => {
                    if (value !== null && value !== undefined && value !== '') {
                        updateFields.push(`${key} = ?`);
                        updateValues.push(value);
                    }
                });
                
                if (updateFields.length === 0) {
                    req.flash('error', 'No valid data to update');
                    return res.redirect(`/phone/${phoneId}`);
                }
                
                updateValues.push(phoneId);
                
                const updateQuery = `UPDATE specs_db SET ${updateFields.join(', ')} WHERE product_id = ?`;
                await conn.query(updateQuery, updateValues);
                
                req.flash('success', 'Phone updated successfully');
                res.redirect(`/phone/${phoneId}`);
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Delete Phone Route
        app.post('/phones/:id/delete', isStaffOrAdmin, async (req, res, next) => {
            let conn;
            try {
                conn = await pool.getConnection();
                const phoneId = req.params.id;
                
                // Check if phone exists
                const [phone] = await conn.query('SELECT device_name FROM specs_db WHERE product_id = ?', [phoneId]);
                if (!phone) {
                    req.flash('error', 'Phone not found');
                    return res.redirect('/');
                }
                
                // Delete related inventory logs first
                await conn.query('DELETE FROM inventory_log WHERE phone_id = ?', [phoneId]);
                
                // Delete the phone
                await conn.query('DELETE FROM specs_db WHERE product_id = ?', [phoneId]);
                
                req.flash('success', `Phone "${phone.device_name}" deleted successfully`);
                res.redirect('/?success=deleted');
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Create Phone Route (POST)
        app.post('/phones', isStaffOrAdmin, InputValidator.validatePhoneData, async (req, res, next) => {
            let conn;
            try {
                conn = await pool.getConnection();
                const sanitizedData = SanitizationService.sanitizePhoneInput(req.body);
                
                // Build dynamic insert query
                const fields = [];
                const placeholders = [];
                const values = [];
                
                Object.entries(sanitizedData).forEach(([key, value]) => {
                    if (value !== null && value !== undefined && value !== '') {
                        fields.push(key);
                        placeholders.push('?');
                        values.push(value);
                    }
                });
                
                // Always include product_type
                if (!fields.includes('product_type')) {
                    fields.push('product_type');
                    placeholders.push('?');
                    values.push('phone');
                }
                
                const insertQuery = `INSERT INTO specs_db (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
                const result = await conn.query(insertQuery, values);
                
                req.flash('success', 'Phone added successfully');
                res.redirect(`/phone/${result.insertId}?success=created`);
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
            }
        });

        // Basic Analytics Route (temporary replacement)
        app.get('/analytics', isAuthenticated, async (req, res, next) => {
            let conn, suppliersConn;
            try {
                conn = await pool.getConnection();
                suppliersConn = await suppliersPool.getConnection();
                
                const period = parseInt(req.query.period) || 30;
                
                // Basic analytics data without complex joins
                const [totalRevenue] = await conn.query(`
                    SELECT COALESCE(SUM(ps.device_price * ABS(il.quantity_changed)), 0) as total_revenue
                    FROM inventory_log il
                    JOIN specs_db ps ON il.phone_id = ps.product_id
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
                
                // Get recent transactions
                const recentTransactions = await conn.query(`
                    SELECT il.*, s.device_name, s.device_maker,
                           DATE_FORMAT(il.transaction_date, '%M %d, %Y at %h:%i %p') as formatted_date
                    FROM inventory_log il
                    LEFT JOIN specs_db s ON il.phone_id = s.product_id
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
                    recentTransactions: convertBigIntToNumber(recentTransactions),
                    selectedPeriod: period,
                    filters: { period },
                    showFilterNotification: req.query.period && req.query.period !== '30',
                    insights: [],
                    csrfToken: req.csrfToken()
                });
            } catch (err) {
                next(err);
            } finally {
                if (conn) conn.release();
                if (suppliersConn) suppliersConn.release();
            }
        });

        // Receipts Analytics Route
        app.get('/receipts/analytics', isAuthenticated, async (req, res, next) => {
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
                    LEFT JOIN specs_db s ON r.phone_id = s.product_id
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
        app.post('/receipts/:receipt_id/delete', isStaffOrAdmin, async (req, res, next) => {
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
        app.post('/receipts/bulk-export', isAuthenticated, async (req, res, next) => {
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
                    LEFT JOIN specs_db s ON r.phone_id = s.product_id
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
        app.post('/receipts/bulk-delete', isStaffOrAdmin, async (req, res, next) => {
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
        app.get('/receipts/export/:format', isAuthenticated, async (req, res, next) => {
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
                    LEFT JOIN specs_db s ON r.phone_id = s.product_id
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

        // ===============================================
        // ERROR HANDLING MIDDLEWARE - Should be last
        // ===============================================
        app.use((err, req, res, next) => {
            console.error(err.stack);

            if (err.code === 'EBADCSRFTOKEN') {
                req.flash('error', 'Invalid form submission. Please try again.');
                return res.redirect(req.get('Referer') || '/');
            }

            // Centralized error rendering
            res.status(err.status || 500).render('error', {
                title: 'Error',
                error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
                details: process.env.NODE_ENV === 'development' ? err.stack : '',
                csrfToken: req.csrfToken ? req.csrfToken() : '' // Ensure token is available on error pages too
            });
        });


        // Start server
        app.listen(PORT, () => {
            console.log(`🌟 Server running on port ${PORT}`);
            console.log(`🔗 Access your application at: http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

async function gracefulShutdown(signal) {
    console.log(`🛑 ${signal} received, shutting down gracefully...`);
    try {
        await dynamicSecretService.shutdown();
        sessionManagementService.shutdown();

        // Properly close all database pools
        if (pool) await pool.end();
        if (suppliersPool) await suppliersPool.end();
        if (authPool) await authPool.end();

        console.log('✅ Graceful shutdown complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

module.exports = app;