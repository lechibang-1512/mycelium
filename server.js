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
    host: process.env.DB_HOST ,
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD ,
    database: process.env.DB_NAME ,
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
};


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

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
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

// Products Route with Filtering
app.get('/products', userAuth.requireAuth, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const filters = { 
            brand: req.query.brand,
            search: req.query.search,
            sort: req.query.sort,
            price: req.query.price,
            stock: req.query.stock
        };
        const result = await dbQueries.getProductsAdvanced(req.db, filters, page);
        const brands = await dbQueries.getBrands(req.db);
        
        // No longer need to get variants count separately as it's included in the product data

        res.render('products', {
            products: result.products,
            brands,
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            selectedBrand: req.query?.brand || '',
        });
    } catch (error) {
        console.error('Error in /products route:', error);
        next(error);
    }
});

// Single Product Details Route
app.get('/product/:id', userAuth.requireAuth, async (req, res, next) => {
    try {
        const product = await dbQueries.getProductById(req.db, req.params.id);

        if (!product || product.length === 0) {
            return res.status(404).render('error', { message: errors.PRODUCT_NOT_FOUND });
        }

        try {
            console.log(`Fetching variants for product ID: ${req.params.id}`);
            
            // Get all variants of this product model
            const variants = await dbQueries.getProductVariants(req.db, req.params.id) || [];
            
            console.log(`Successfully retrieved ${variants.length} variants`);
            
            // Group variants by their properties
            const colorVariants = [...new Set(variants.map(v => v.color))]
                .filter(color => color !== null && color !== undefined);
                
            const storageVariants = [...new Set(variants.map(v => 
                `${v.ram || 'N/A'} RAM | ${v.rom || 'N/A'} Storage`
            ))];
            
            res.render('productDetails', { 
                product: product[0],
                variants: variants,
                colorVariants: colorVariants,
                storageVariants: storageVariants,
                currentId: req.params.id,
                modelName: product[0].sm_name
            });
        } catch (variantError) {
            console.error('Error fetching variants:', variantError);
            // If there's an error with variants, continue with the base product
            res.render('productDetails', { 
                product: product[0],
                variants: [],
                colorVariants: [],
                storageVariants: [],
                currentId: req.params.id,
                modelName: product[0].sm_name
            });
        }
    } catch (error) {
        console.error('Error fetching product details:', error);
        next(error);
    }
});

// Inventory Management Route
app.get('/inventory', userAuth.requirePermission('write'), async (req, res, next) => {
    try {
        // Get inventory statistics for the dashboard
        const stats = await dbQueries.getInventoryStats(req.db);
        
        res.render('inventoryManagement', {
            title: 'Inventory Management',
            stats: stats
        });
    } catch (error) {
        console.error('Error in /inventory route:', error);
        next(error);
    }
});

// API Routes for Inventory Management

// Get inventory data (for AJAX requests)
app.get('/api/inventory', userAuth.requireAuth, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const filters = {
            search: req.query.search,
            category: req.query.category,
            stockLevel: req.query.stockLevel
        };
        
        const result = await dbQueries.getInventoryData(req.db, filters, page, limit);
        res.json(result);
    } catch (error) {
        console.error('Error in /api/inventory route:', error);
        res.status(500).json({ error: 'Failed to fetch inventory data' });
    }
});

// Get inventory stats (for dashboard updates)
app.get('/api/inventory/stats', userAuth.requireAuth, async (req, res, next) => {
    try {
        const stats = await dbQueries.getInventoryStats(req.db);
        res.json(stats);
    } catch (error) {
        console.error('Error in /api/inventory/stats route:', error);
        res.status(500).json({ error: 'Failed to fetch inventory stats' });
    }
});

// Update product stock
app.put('/api/inventory/:id/stock', userAuth.requirePermission('write'), async (req, res, next) => {
    try {
        const productId = req.params.id;
        const { stock } = req.body;
        
        if (stock === undefined || stock < 0) {
            return res.status(400).json({ error: 'Invalid stock value' });
        }
        
        const result = await dbQueries.updateProductStock(req.db, productId, stock);
        if (result.success) {
            res.json({ success: true, message: 'Stock updated successfully' });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// Add new product
app.post('/api/inventory/products', userAuth.requirePermission('write'), async (req, res, next) => {
    try {
        const result = await dbQueries.addNewProduct(req.db, req.body);
        if (result.success) {
            res.json({ success: true, id: result.id, message: 'Product added successfully' });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Failed to add product' });
    }
});

// Delete product
app.delete('/api/inventory/:id', userAuth.requirePermission('delete'), async (req, res, next) => {
    try {
        const productId = req.params.id;
        const result = await dbQueries.deleteProduct(req.db, productId);
        
        if (result.success) {
            res.json({ success: true, message: 'Product deleted successfully' });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Enhanced API Routes for Products

// Get products with advanced filtering and pagination
app.get('/api/products', userAuth.requireAuth, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const filters = {
            search: req.query.search,
            brand: req.query.brand,
            price: req.query.price,
            stock: req.query.stock,
            sort: req.query.sort || 'name'
        };
        
        const result = await dbQueries.getProductsAdvanced(req.db, filters, page, limit);
        res.json(result);
    } catch (error) {
        console.error('Error in /api/products route:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get product quick view data
app.get('/api/product/:id/quick', userAuth.requireAuth, async (req, res, next) => {
    try {
        const product = await dbQueries.getProductById(req.db, req.params.id);
        
        if (!product || product.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(product[0]);
    } catch (error) {
        console.error('Error in /api/product/:id/quick route:', error);
        res.status(500).json({ error: 'Failed to fetch product details' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).render('error', { message: errors.INTERNAL_SERVER_ERROR || 'An unexpected error occurred' });
});

