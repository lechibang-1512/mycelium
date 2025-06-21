const express = require('express');
const mariadb = require('mariadb');
const path = require('path');

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

// Create connection pools
const pool = mariadb.createPool(dbConfig);
const suppliersPool = mariadb.createPool(suppliersDbConfig);

// Helper function to convert BigInt values to numbers
function convertBigIntToNumber(obj) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'bigint') {
        return Number(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(convertBigIntToNumber);
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

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===============================================
// ROUTES
// ===============================================

// Home page - display all phone specs
app.get('/', async (req, res) => {
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
app.get('/phone/:id', async (req, res) => {
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

        res.render('details', {
            phone: phones[0]
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
app.get('/suppliers', async (req, res) => {
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
app.get('/supplier/:id', async (req, res) => {
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
app.get('/suppliers/add', (req, res) => {
    res.render('supplier-form', {
        supplier: null,
        action: 'add',
        title: 'Add New Supplier'
    });
});

// Edit supplier form page
app.get('/suppliers/edit/:id', async (req, res) => {
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
app.post('/suppliers', async (req, res) => {
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
app.get('/inventory/receive', async (req, res) => {
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
app.post('/inventory/receive', async (req, res) => {
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
app.get('/inventory/sell', async (req, res) => {
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
app.post('/inventory/sell', async (req, res) => {
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
app.get('/reports', async (req, res) => {
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
            SELECT il.*, ps.sm_name, ps.sm_maker
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
        reports = reports.map(report => ({
            ...report,
            supplier_name: report.supplier_id ? supplierMap[report.supplier_id] : null
        }));

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
// AUTHENTICATION ROUTES
// ===============================================

// Logout route
app.get('/logout', (req, res) => {
    // For now, just redirect to home with a logout message
    // In a real app, you would destroy the session here
    res.redirect('/?logout=true');
});


// ===============================================
// ERROR HANDLING
// ===============================================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        error: 'Something went wrong!'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        error: 'Page not found'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await pool.end();
    await suppliersPool.end();
    process.exit(0);
});