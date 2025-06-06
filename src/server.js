const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const errors = require('./utils/errors');
const dbQueries = require('./database/dbqueries');  // Import the query functions
const userAuth = require('./auth/userAuth');  // Import authentication functions
const app = express();
require('dotenv').config();

// --- Configuration ---
const PORT = process.env.PORT || 3001;
const DB_CONFIG = {
    host: process.env.DB_HOST ,
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD ,
    database: process.env.DB_NAME ,
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
};

// Add a warning if the default session secret is used
if (!process.env.SESSION_SECRET) {
    console.warn('WARNING: SESSION_SECRET is not set in environment variables. Using a default, insecure secret. This is NOT safe for production. Please set a strong secret in your .env file.');
}

// --- Middleware Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'inventory-management-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Add user info to all templates
app.use((req, res, next) => {
    res.locals.user = req.session ? req.session.user : null;
    next();
});

// --- Database Connection Pool ---
const pool = mysql.createPool(DB_CONFIG);

// Database Connection Middleware
app.use(async (req, res, next) => {
    try {
        req.db = await pool.getConnection();
        res.on('finish', () => req.db.release());
        next();
    } catch (err) {
        console.error('Database connection error:', err);
        return res.status(500).render('error', { message: errors.DATABASE_CONNECTION_ERROR });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


// --- Route Handlers ---

// Authentication Routes
app.get('/login', (req, res) => {
    // If user is already logged in, redirect to products
    if (req.session && req.session.user) {
        return res.redirect('/products');
    }
    res.render('login', { error: null });
});

app.post('/auth/login', async (req, res) => {
    try {
        const { username, password, remember } = req.body;
        
        if (!username || !password) {
            return res.render('login', { 
                error: 'Please enter both username and password' 
            });
        }

        const authResult = await userAuth.authenticateUser(username, password);
        
        if (authResult.success) {
            // Set session
            req.session.user = authResult.user;
            
            // Extend session if "remember me" is checked
            if (remember) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            }
            
            console.log(`User ${username} logged in successfully with role: ${authResult.user.role}`);
            res.redirect('/products');
        } else {
            res.render('login', { 
                error: authResult.message || 'Invalid username or password' 
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { 
            error: 'An error occurred during login. Please try again.' 
        });
    }
});

app.post('/auth/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
            }
            res.redirect('/login');
        });
    } else {
        res.redirect('/login');
    }
});

// GET logout route for convenience
app.get('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
            }
            res.redirect('/login');
        });
    } else {
        res.redirect('/login');
    }
});

// Redirect root to /products
app.get('/', userAuth.requireAuth, (req, res) => {
    res.redirect('/products');
});

// CPUs Route with Filtering
app.get('/products', userAuth.requireAuth, async (req, res, next) => {
    try {
        const filters = { 
            product_collection: req.query.collection, 
            code_name: req.query.code_name 
        };
        const cpus = await dbQueries.getCPUs(req.db, filters);
        
        // Extract unique values for filters
        const collections = [...new Set(cpus.map(cpu => cpu.product_collection).filter(Boolean))];
        const codeNames = [...new Set(cpus.map(cpu => cpu.code_name).filter(Boolean))];
        
        res.render('products', {
            products: cpus,
            collections,
            codeNames,
            selectedCollection: req.query?.collection || '',
            selectedCodeName: req.query?.code_name || ''
        });
    } catch (error) {
        console.error('Error in /products route:', error);
        next(error);
    }
});

// Single CPU Details Route
app.get('/product/:id', userAuth.requireAuth, async (req, res, next) => {
    try {
        const cpu = await dbQueries.getCPUById(req.db, req.params.id);

        if (!cpu || cpu.length === 0) {
            return res.status(404).render('error', { message: errors.PRODUCT_NOT_FOUND });
        }

        // Get all CPUs with the same product collection for comparison
        const relatedCPUs = await dbQueries.getCPUs(req.db, {
            product_collection: cpu[0].product_collection
        }).then(cpus => cpus.filter(c => c.id !== cpu[0].id));
        
        console.log(`Found ${relatedCPUs.length} related CPUs`);
        
        res.render('productDetails', { 
            product: cpu[0],
            relatedProducts: relatedCPUs,
            currentId: req.params.id,
            modelName: cpu[0].processor_number
        });
    } catch (error) {
        console.error('Error fetching product details:', error);
        next(error);
    }
});

// CPU Inventory Management Route
app.get('/inventory', userAuth.requirePermission('write'), async (req, res, next) => {
    try {
        // Get CPUs
        const cpus = await dbQueries.getCPUs(req.db);
        
        // Calculate basic stats
        const totalProducts = cpus.length;
        
        // For demonstration, we'll use price range as a substitute for "in stock" status
        const lowStock = cpus.filter(cpu => 
            cpu.recommended_customer_price_min && 
            cpu.recommended_customer_price_min < 200
        ).length;
        
        const outOfStock = cpus.filter(cpu => 
            !cpu.recommended_customer_price_min && 
            !cpu.recommended_customer_price_max
        ).length;
        
        // Calculate total value (using max price as an estimate)
        const totalValue = cpus.reduce((sum, cpu) => {
            return sum + (cpu.recommended_customer_price_max || 0);
        }, 0);
        
        const stats = {
            totalProducts,
            lowStock,
            outOfStock,
            totalValue
        };
        
        res.render('inventoryManagement', {
            title: 'CPU Inventory Management',
            stats: stats
        });
    } catch (error) {
        console.error('Error in /inventory route:', error);
        next(error);
    }
});

// API Routes for Inventory Management

// Get CPU inventory data (for AJAX requests)
app.get('/api/inventory', userAuth.requireAuth, async (req, res, next) => {
    try {
        let page = parseInt(req.query.page);
        let limit = parseInt(req.query.limit);

        page = (Number.isInteger(page) && page > 0) ? page : 1;
        limit = (Number.isInteger(limit) && limit > 0) ? limit : 20; // Default limit for inventory

        const filters = {
            search: req.query.search,
            product_collection: req.query.category, // Map category filter to product_collection
            code_name: req.query.code_name
        };
        
        const cpus = await dbQueries.getCPUs(req.db, filters);
        
        // Manual pagination since we don't have a specific inventory data function
        const total = cpus.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedCPUs = cpus.slice(startIndex, endIndex);
        
        const result = {
            data: paginatedCPUs,
            total: total,
            page: page,
            totalPages: Math.ceil(total / limit)
        };
        res.json(result);
    } catch (error) {
        console.error('Error in /api/inventory route:', error);
        res.status(500).json({ error: 'Failed to fetch inventory data' });
    }
});

// Get CPU inventory stats (for dashboard updates)
app.get('/api/inventory/stats', userAuth.requireAuth, async (req, res, next) => {
    try {
        // Since we don't have a separate inventory stats function for CPUs,
        // we'll calculate basic stats from the CPUs we get
        const cpus = await dbQueries.getCPUs(req.db);
        
        // Calculate basic stats
        const totalProducts = cpus.length;
        
        // For demonstration, we'll use price range as a substitute for "in stock" status
        // In a real application, you would have an inventory field
        const lowStock = cpus.filter(cpu => 
            cpu.recommended_customer_price_min && 
            cpu.recommended_customer_price_min < 200
        ).length;
        
        const outOfStock = cpus.filter(cpu => 
            !cpu.recommended_customer_price_min && 
            !cpu.recommended_customer_price_max
        ).length;
        
        // Calculate total value (using max price as an estimate)
        const totalValue = cpus.reduce((sum, cpu) => {
            return sum + (cpu.recommended_customer_price_max || 0);
        }, 0);
        
        const stats = {
            totalProducts,
            lowStock,
            outOfStock,
            totalValue
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error in /api/inventory/stats route:', error);
        res.status(500).json({ error: 'Failed to fetch inventory stats' });
    }
});

// This endpoint would be replaced with edit CPU functionality
// For now, we're removing it as we don't have a direct updateStock function for CPUs

// Add new CPU
app.post('/api/inventory/products', userAuth.requirePermission('write'), async (req, res, next) => {
    try {
        const result = await dbQueries.addNewCPU(req.db, req.body);
        if (result.success) {
            res.json({ success: true, id: result.id, message: 'CPU added successfully' });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error adding CPU:', error);
        res.status(500).json({ error: 'Failed to add CPU' });
    }
});

// Delete CPU
app.delete('/api/inventory/:id', userAuth.requirePermission('delete'), async (req, res, next) => {
    try {
        const cpuId = req.params.id;
        const result = await dbQueries.deleteCPU(req.db, cpuId);
        
        if (result.success) {
            res.json({ success: true, message: 'CPU deleted successfully' });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error deleting CPU:', error);
        res.status(500).json({ error: 'Failed to delete CPU' });
    }
});

// Enhanced API Routes for Products

// Get CPUs with filtering and pagination
app.get('/api/cpus', userAuth.requireAuth, async (req, res, next) => {
    try {
        let page = parseInt(req.query.page);
        let limit = parseInt(req.query.limit);

        page = (Number.isInteger(page) && page > 0) ? page : 1;
        limit = (Number.isInteger(limit) && limit > 0) ? limit : 12;

        const filters = {
            product_collection: req.query.collection,
            code_name: req.query.code_name
        };
        
        // Get all CPUs matching the filters
        const cpus = await dbQueries.getCPUs(req.db, filters);
        
        // Manual pagination
        const total = cpus.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedCPUs = cpus.slice(startIndex, endIndex);
        
        res.json({
            cpus: paginatedCPUs,
            total: total,
            currentPage: page,
            totalPages: totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        });
    } catch (error) {
        console.error('Error in /api/cpus route:', error);
        res.status(500).json({ error: 'Failed to fetch CPUs' });
    }
});

// Get CPU quick view data
app.get('/api/product/:id/quick', userAuth.requireAuth, async (req, res, next) => {
    try {
        const cpu = await dbQueries.getCPUById(req.db, req.params.id);
        
        if (!cpu || cpu.length === 0) {
            return res.status(404).json({ error: 'CPU not found' });
        }
        
        res.json(cpu[0]);
    } catch (error) {
        console.error('Error in /api/product/:id/quick route:', error);
        res.status(500).json({ error: 'Failed to fetch CPU details' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).render('error', { message: errors.INTERNAL_SERVER_ERROR || 'An unexpected error occurred' });
});

