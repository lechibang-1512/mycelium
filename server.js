const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bodyParser = require('body-parser');
const auth = require('./auth');
const errors = require('./errors');
const dbQueries = require('./dbQueries');  // Import the query functions
const app = express();
require('dotenv').config();

// --- Configuration ---
const PORT = process.env.PORT || 3000;
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
app.set('viewEngine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(auth.sessionMiddleware);

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

// Products Route with Filtering
app.get('/products', ensureAuthenticated, async (req, res, next) => {
    try {
        const filters = { brand: req.query.brand, model: req.query.model };
        const products = await dbQueries.getProducts(req.db, filters);
        const brands = await dbQueries.getBrands(req.db);
        const models = await dbQueries.getModels(req.db);

        res.render('products', {
            products,
            brands,
            models,
            selectedBrand: req.query?.brand || '',
            selectedModel: req.query?.model || ''
        });
    } catch (error) {
        console.error('Error in /products route:', error);
        next(error);
    }
});

// Single Product Details Route
app.get('/product/:id', ensureAuthenticated, async (req, res, next) => {
    try {
        const product = await dbQueries.getProductById(req.db, req.params.id);

        if (!product || product.length === 0) {
            return res.status(404).render('error', { message: errors.PRODUCT_NOT_FOUND });
        }

        res.render('productDetails', { product: product[0] });
    } catch (error) {
        console.error('Error fetching product details:', error);
        next(error);
    }
});

// Purchase History Route
app.get('/purchaseHistory', ensureAuthenticated, async (req, res, next) => {
    try {
        const orders = await dbQueries.getPurchaseHistory(req.db);

        function getTopItems(salesData, count = 1) {
            const sortedEntries = Object.entries(salesData)
                .sort(([, a], [, b]) => b - a)
                .slice(0, count)
                .map(([name, sales]) => ({ name, sales }));
            return count === 1 ? sortedEntries[0]?.name || 'N/A' : sortedEntries;
        }

        let totalSales = 0;
        let customerSales = {};
        let deviceSales = {};
        let numberOfOrders = 0;

        if (orders && orders.length > 0) {
            numberOfOrders = orders.length;
            orders.forEach(order => {
                const price = parseFloat(order.sm_price);
                if (!isNaN(price)) {
                    totalSales += price;

                    const customerName = `${order.first_name} ${order.last_name}`;
                    customerSales[customerName] = (customerSales[customerName] || 0) + price;

                    deviceSales[order.sm_name] = (deviceSales[order.sm_name] || 0) + price;
                } else {
                    console.warn(`${errors.INVALID_PRICE}: ${order.sm_price}`);
                }
            });
        }
        const topCustomer = getTopItems(customerSales);
        const topDevice = getTopItems(deviceSales);
        const avgSalesPerCustomer = Object.keys(customerSales).length > 0 ? totalSales / Object.keys(customerSales).length : 0;
        const topCustomers = getTopItems(customerSales, 5);
        const topDevices = getTopItems(deviceSales, 5);

        res.render('purchaseHistory', {
            orders: orders,
            totalSales: totalSales,
            topCustomer: topCustomer === 'N/A' ? "No Data Available" : topCustomer,
            topDevice: topDevice === 'N/A' ? "No Data Available" : topDevice,
            avgSalesPerCustomer: avgSalesPerCustomer,
            numberOfOrders: numberOfOrders,
            topCustomers: topCustomers,
            topDevices: topDevices
        });
    } catch (error) {
        console.error('Error fetching purchase history:', error);
        next(error);
    }
});
