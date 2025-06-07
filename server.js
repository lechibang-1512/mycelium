const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const errors = require('./src/utils/errors');
const dbQueries = require('./src/database/dbqueries');  // Import the query functions
const userAuth = require('./src/auth/userAuth');  // Import authentication functions
const app = express();
require('dotenv').config();

// --- Configuration ---
const PORT = process.env.PORT || 3001;
const DB_CONFIG = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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
app.set('views', path.join(__dirname, 'src/views'));
app.use(express.static(path.join(__dirname, 'public')));
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
        // Make sure connection is released after the response is sent
        res.on('finish', () => {
            if (req.db) req.db.release();
        });
        next();
    } catch (err) {
        console.error('Database connection error:', err);
        return res.status(500).render('error', { message: errors.DATABASE_CONNECTION_ERROR });
    }
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const filters = { 
            product_collection: req.query.collection, 
            code_name: req.query.code_name,
            manufacturer: req.query.brand
        };
        
        // Get CPUs with filters applied
        const cpus = await dbQueries.getCPUs(req.db, filters);
        
        // Extract unique manufacturers for the filter dropdown
        const manufacturers = [...new Set(cpus.map(cpu => cpu.manufacturer).filter(Boolean))];
        
        // Extract unique collections for the filter dropdown
        const collections = [...new Set(cpus.map(cpu => cpu.product_collection).filter(Boolean))];
        
        // Manual pagination for server-side rendering
        const total = cpus.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedCPUs = cpus.slice(startIndex, endIndex);

        console.log(`Showing CPUs ${startIndex+1}-${Math.min(endIndex, total)} of ${total} (page ${page}/${totalPages})`);

        res.render('products', {
            products: cpus, // Send all CPUs for client-side filtering in the template
            brands: manufacturers.map(m => ({ sm_maker: m })), // Format for compatibility with existing template
            collections: collections,
            currentPage: page,
            totalPages: totalPages,
            selectedBrand: req.query.brand || '',
            selectedCollection: req.query.collection || ''
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
        });
        
        // Remove the current CPU from related CPUs
        const filteredRelatedCPUs = relatedCPUs.filter(c => c.id !== parseInt(req.params.id));
        
        console.log(`Found ${filteredRelatedCPUs.length} related CPUs for ${cpu[0].processor_number}`);
        
        res.render('productDetails', { 
            product: cpu[0],
            relatedProducts: filteredRelatedCPUs,
            currentId: parseInt(req.params.id),
            modelName: cpu[0].processor_number || 'CPU'
        });
    } catch (error) {
        console.error('Error fetching CPU details:', error);
        next(error);
    }
});

// CPU Inventory Management Route
app.get('/inventory', userAuth.requirePermission('write'), async (req, res, next) => {
    try {
        // Get all CPUs
        const cpus = await dbQueries.getCPUs(req.db);
        
        // Calculate inventory statistics using actual inventory field
        const totalProducts = cpus.length;
        
        // Use actual inventory field for stock status
        const lowStock = cpus.filter(cpu => 
            cpu.inventory !== null && cpu.inventory !== undefined && 
            cpu.inventory > 0 && cpu.inventory <= 10
        ).length;
        
        // Define criteria for out of stock (CPUs with 0 or null inventory)
        const outOfStock = cpus.filter(cpu => 
            cpu.inventory === null || cpu.inventory === undefined || cpu.inventory === 0
        ).length;
        
        // Calculate total inventory value (using max price or average of min/max)
        const totalValue = cpus.reduce((sum, cpu) => {
            const maxPrice = parseFloat(cpu.recommended_customer_price_max) || 0;
            const minPrice = parseFloat(cpu.recommended_customer_price_min) || 0;
            
            if (maxPrice > 0) {
                return sum + maxPrice;
            } else if (minPrice > 0) {
                return sum + minPrice;
            }
            return sum;
        }, 0);
        
        const stats = {
            totalProducts,
            lowStock,
            outOfStock,
            totalValue: totalValue || 0 // Ensure totalValue is always a number
        };
        
        console.log(`Inventory stats: ${totalProducts} total CPUs, ${lowStock} low stock, ${outOfStock} out of stock, $${(totalValue || 0).toFixed(2)} total value`);
        
        res.render('inventoryManagement', {
            title: 'CPU Inventory Management',
            stats: stats
        });
    } catch (error) {
        console.error('Error in /inventory route:', error);
        next(error);
    }
});

// API Routes for CPU Inventory Management

// Get CPU inventory data (for AJAX requests)
app.get('/api/inventory', userAuth.requireAuth, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const filters = {};
        
        // Add filters if they exist
        if (req.query.search) {
            // Search in processor_number, code_name, and manufacturer
            const searchTerm = req.query.search.toLowerCase();
            filters.search = searchTerm;
        }
        
        if (req.query.category) {
            filters.product_collection = req.query.category;
        }
        
        if (req.query.code_name) {
            filters.code_name = req.query.code_name;
        }
        
        if (req.query.manufacturer) {
            filters.manufacturer = req.query.manufacturer;
        }
        
        console.log('Fetching inventory with filters:', filters);
        
        // Use CPU-specific query function
        const cpus = await dbQueries.getCPUs(req.db, filters);
        
        // Apply search filter manually if needed
        let filteredCPUs = cpus;
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredCPUs = cpus.filter(cpu => 
                (cpu.processor_number && cpu.processor_number.toLowerCase().includes(searchTerm)) ||
                (cpu.code_name && cpu.code_name.toLowerCase().includes(searchTerm)) ||
                (cpu.manufacturer && cpu.manufacturer.toLowerCase().includes(searchTerm))
            );
        }
        
        // Add status field based on inventory levels
        const data = filteredCPUs.map(cpu => {
            let status = 'in-stock';
            
            // Use actual inventory field for status determination
            const inventory = cpu.inventory;
            if (inventory === null || inventory === undefined || inventory === 0) {
                status = 'out-of-stock';
            } else if (inventory <= 10) { // Low stock threshold
                status = 'low-stock';
            }
            
            return { ...cpu, status };
        });
        
        // Simple pagination
        const total = data.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedData = data.slice(offset, offset + limit);
        
        res.json({
            data: paginatedData,
            total,
            page,
            totalPages
        });
    } catch (error) {
        console.error('Error in /api/inventory route:', error);
        res.status(500).json({ error: 'Failed to fetch inventory data' });
    }
});

// Get CPU inventory stats (for dashboard updates)
app.get('/api/inventory/stats', userAuth.requireAuth, async (req, res, next) => {
    try {
        // Get all CPUs first
        const cpus = await dbQueries.getCPUs(req.db, {});
        
        // Calculate stats using actual inventory field
        const totalProducts = cpus.length;
        
        // Use actual inventory field for stock status
        const lowStock = cpus.filter(cpu => 
            cpu.inventory !== null && cpu.inventory !== undefined && 
            cpu.inventory > 0 && cpu.inventory <= 10
        ).length;
        
        const outOfStock = cpus.filter(cpu => 
            cpu.inventory === null || cpu.inventory === undefined || cpu.inventory === 0
        ).length;
        
        // Calculate total value based on average of min/max prices
        let totalValue = 0;
        cpus.forEach(cpu => {
            const minPrice = parseFloat(cpu.recommended_customer_price_min) || 0;
            const maxPrice = parseFloat(cpu.recommended_customer_price_max) || 0;
            
            if (maxPrice > 0 && minPrice > 0) {
                totalValue += (minPrice + maxPrice) / 2;
            } else if (maxPrice > 0) {
                totalValue += maxPrice;
            } else if (minPrice > 0) {
                totalValue += minPrice;
            }
        });
        
        const stats = {
            totalProducts,
            lowStock,
            outOfStock,
            totalValue: totalValue || 0 // Ensure it's always a number
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error in /api/inventory/stats route:', error);
        res.status(500).json({ error: 'Failed to fetch inventory stats' });
    }
});

// Add new CPU
app.post('/api/inventory/products', userAuth.requirePermission('write'), async (req, res, next) => {
    try {
        // Validate required fields
        if (!req.body.processor_number || !req.body.manufacturer) {
            return res.status(400).json({ 
                error: 'Required fields missing', 
                required: ['processor_number', 'manufacturer'] 
            });
        }
        
        const result = await dbQueries.addNewCPU(req.db, req.body);
        if (result.success) {
            res.json({ 
                success: true, 
                id: result.id, 
                message: `CPU ${req.body.processor_number} added successfully` 
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error adding CPU:', error);
        res.status(500).json({ error: 'Failed to add CPU: ' + error.message });
    }
});

// Delete CPU
app.delete('/api/inventory/:id', userAuth.requirePermission('delete'), async (req, res, next) => {
    try {
        const cpuId = req.params.id;
        
        // Check if CPU exists before deleting
        const cpu = await dbQueries.getCPUById(req.db, cpuId);
        if (!cpu || cpu.length === 0) {
            return res.status(404).json({ error: 'CPU not found' });
        }
        
        const result = await dbQueries.deleteCPU(req.db, cpuId);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: `CPU #${cpuId} (${cpu[0].processor_number}) deleted successfully` 
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error deleting CPU:', error);
        res.status(500).json({ error: 'Failed to delete CPU: ' + error.message });
    }
});

// Enhanced API Routes for CPU Products

// Get CPUs with advanced filtering and pagination
app.get('/api/cpus', userAuth.requireAuth, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const filters = {
            manufacturer: req.query.manufacturer || req.query.brand,  // Support both field names
            product_collection: req.query.collection,
            code_name: req.query.code_name
        };
        
        // Add price filter if provided
        if (req.query.price) {
            const priceRange = req.query.price.split('-');
            if (priceRange.length === 2) {
                filters.min_price = parseFloat(priceRange[0]);
                filters.max_price = parseFloat(priceRange[1]);
            }
        }
        
        // Add core count filter if provided
        if (req.query.cores) {
            filters.total_cores = parseInt(req.query.cores);
        }
        
        console.log('Fetching CPUs with filters:', filters);
        
        // Get all CPUs that match the filters
        const cpus = await dbQueries.getCPUs(req.db, filters);
        
        // Apply manual filtering for price if needed
        let filteredCPUs = cpus;
        if (filters.min_price || filters.max_price) {
            filteredCPUs = filteredCPUs.filter(cpu => {
                const price = cpu.recommended_customer_price_min || cpu.recommended_customer_price_max || 0;
                
                if (filters.min_price && filters.max_price) {
                    return price >= filters.min_price && price <= filters.max_price;
                } else if (filters.min_price) {
                    return price >= filters.min_price;
                } else if (filters.max_price) {
                    return price <= filters.max_price;
                }
                
                return true;
            });
        }
        
        // Apply sorting
        const sortField = req.query.sort || 'processor_number';
        const sortDirection = req.query.dir === 'desc' ? -1 : 1;
        
        filteredCPUs.sort((a, b) => {
            let valueA, valueB;
            
            // Handle different sort fields
            switch (sortField) {
                case 'price':
                    valueA = a.recommended_customer_price_min || a.recommended_customer_price_max || 0;
                    valueB = b.recommended_customer_price_min || b.recommended_customer_price_max || 0;
                    break;
                case 'cores':
                    valueA = a.total_cores || 0;
                    valueB = b.total_cores || 0;
                    break;
                case 'frequency':
                    valueA = a.max_turbo_frequency_ghz || 0;
                    valueB = b.max_turbo_frequency_ghz || 0;
                    break;
                case 'manufacturer':
                    valueA = a.manufacturer || '';
                    valueB = b.manufacturer || '';
                    break;
                default:
                    valueA = a.processor_number || '';
                    valueB = b.processor_number || '';
                    break;
            }
            
            // Compare values based on type
            if (typeof valueA === 'string') {
                return valueA.localeCompare(valueB) * sortDirection;
            } else {
                return (valueA - valueB) * sortDirection;
            }
        });
        
        // Apply pagination
        const total = filteredCPUs.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedCPUs = filteredCPUs.slice(offset, offset + limit);
        
        res.json({
            cpus: paginatedCPUs,
            total,
            currentPage: page,
            totalPages,
            filters: Object.keys(filters).length > 0 ? filters : null
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
    
    // Check if it's an API request or a web page request
    if (req.path.startsWith('/api') || req.xhr) {
        // API errors return JSON
        res.status(500).json({
            error: error.message || errors.INTERNAL_SERVER_ERROR || 'An unexpected error occurred',
            path: req.path
        });
    } else {
        // Web page errors render the error template
        res.status(500).render('error', { 
            message: errors.INTERNAL_SERVER_ERROR || 'An unexpected error occurred',
            details: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
});

// Add 404 handler
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        // API 404 errors
        res.status(404).json({
            error: 'Not Found',
            path: req.path
        });
    } else {
        // Web page 404 errors
        res.status(404).render('error', { 
            message: 'Page not found',
            details: `The page "${req.path}" does not exist.`
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`CPU Inventory Management Server running on port ${PORT}`);
    console.log(`Server started at: ${new Date().toISOString()}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
});

