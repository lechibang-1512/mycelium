const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bodyParser = require('body-parser');
const errors = require('./utils/errors');
const dbQueries = require('./database/dbqueries');  // Import the query functions
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
// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


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

// Redirect root to /products
app.get('/', (req, res) => {
    res.redirect('/products');
});

// Products Route with Filtering
app.get('/products', async (req, res, next) => {
    try {
        const filters = { brand: req.query.brand, model: req.query.model };
        const products = await dbQueries.getProducts(req.db, filters);
        const brands = await dbQueries.getBrands(req.db);
        const models = await dbQueries.getModels(req.db);
        
        // Get variants count for the first product if available
        let variantsCount = 0;
        if (products && products.length > 0) {
            variantsCount = await dbQueries.getVariantsCount(req.db, products[0].id);
        }

        res.render('products', {
            products,
            brands,
            models,
            variantsCount,
            selectedBrand: req.query?.brand || '',
            selectedModel: req.query?.model || ''
        });
    } catch (error) {
        console.error('Error in /products route:', error);
        next(error);
    }
});

// Single Product Details Route
app.get('/product/:id', async (req, res, next) => {
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

