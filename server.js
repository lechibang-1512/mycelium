const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bodyParser = require('body-parser');
const { performance } = require('perf_hooks');
const auth = require('./auth');
const app = express();

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '1212',
    database: 'master_specs_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// --- Middleware Setup ---
app.set('view engine', 'ejs');
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
        return res.status(500).render('error', { message: 'Database connection error' });
    }
});

// --- Route Handlers ---

// Error handling Middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('error', {
        message: 'An error occurred. Please try again later.',
        errorDetails: err.message
    });
});

// Helper function for database queries and performance measuring
async function queryDatabase(db, sql, params = []) {
    const startTime = performance.now();
    try {
        const [rows] = await db.execute(sql, params);
        const endTime = performance.now();
        console.log(`Query Time: ${endTime - startTime} ms`);
        return rows;
    } catch (error) {
        console.error("Database Query Failed:", error);
        throw error;
    }
}

// Authentication Middleware
function ensureAuthenticated(req, res, next) {
    if (!auth.isAuthenticated(req)) {
        return res.redirect('/admin/login');
    }
    next();
}

// Admin login route
app.get('/admin/login', (req, res) => {
    if (auth.isAuthenticated(req)) {
        return res.redirect('/products');
    }
    res.render('adminLogin', { error: null });
});

// Admin login POST route
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (auth.loginAdmin(req, username, password)) {
        return res.redirect('/products');
    } else {
        return res.render('adminLogin', { error: 'Invalid username or password' });
    }
});

// Admin logout route
app.get('/admin/logout', (req, res) => {
    auth.logoutAdmin(req);
    res.redirect('/admin/login');
});

// Homepage Route
app.get(['/', '/homepage'], ensureAuthenticated, (req, res) => {
    res.render('homepage');
});

// Products Route with Filtering
app.get('/products', ensureAuthenticated, async (req, res, next) => {
    try {
        let query = `
            SELECT id, sm_name, sm_maker, sm_price, sm_inventory,
                   color, water_and_dust_rating, processor, process_node,
                   cpu_cores, cpu_frequency, gpu, memory_type, ram, rom,
                   expandable_memory, length_mm, width_mm, thickness_mm,
                   weight_g, display_size, resolution, pixel_density,
                   refresh_rate, brightness, display_features,
                   rear_camera_main, rear_camera_macro, rear_camera_features,
                   rear_video_resolution, front_camera, front_camera_features,
                   front_video_resolution, battery_capacity, fast_charging,
                   connector, security_features, sim_card, nfc, network_bands,
                   wireless_connectivity, navigation, audio_jack,
                   audio_playback, video_playback, sensors, operating_system,
                   package_contents
            FROM phone_specs
            WHERE 1=1
        `;

        const params = [];

        if (req.query.brand) {
            query += ' AND sm_maker = ?';
            params.push(req.query.brand);
        }
        if (req.query.model) {
            query += ' AND sm_name = ?';
            params.push(req.query.model);
        }

        query += ' ORDER BY sm_maker, sm_name';

        const products = await queryDatabase(req.db, query, params);

        // Fetch brands and models for filtering
        const brandsQuery = 'SELECT DISTINCT sm_maker FROM phone_specs ORDER BY sm_maker';
        const modelsQuery = 'SELECT DISTINCT sm_name FROM phone_specs ORDER BY sm_name';

        const brands = await queryDatabase(req.db, brandsQuery);
        const models = await queryDatabase(req.db, modelsQuery);

        res.render('products', {
            products,
            brands,
            models,
            selectedBrand: req.query.brand || '',
            selectedModel: req.query.model || ''
        });
    } catch (error) {
        console.error('Error in /products route:', error);
        next(error);
    }
});

// Single Product Details Route
app.get('/product/:id', ensureAuthenticated, async (req, res, next) => {
    try {
        const product = await queryDatabase(req.db, `
            SELECT id, sm_name, sm_maker, sm_price, sm_inventory,
                   color, water_and_dust_rating, processor, process_node,
                   cpu_cores, cpu_frequency, gpu, memory_type, ram, rom,
                   expandable_memory, length_mm, width_mm, thickness_mm,
                   weight_g, display_size, resolution, pixel_density,
                   refresh_rate, brightness, display_features,
                   rear_camera_main, rear_camera_macro, rear_camera_features,
                   rear_video_resolution, front_camera, front_camera_features,
                   front_video_resolution, battery_capacity, fast_charging,
                   connector, security_features, sim_card, nfc, network_bands,
                   wireless_connectivity, navigation, audio_jack,
                   audio_playback, video_playback, sensors, operating_system,
                   package_contents
            FROM phone_specs WHERE id = ?`, [req.params.id]);

        if (!product || product.length === 0) {
            return res.status(404).render('error', { message: 'Product not found' });
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
        const orders = await queryDatabase(req.db, `
            SELECT
                c.first_name,
                c.last_name,
                c.email,
                c.phone_number,
                c.street_address,
                ps.sm_name,
                ps.sm_maker,
                ps.sm_price,
                ps.color,
                ps.ram,
                ps.rom,
                od.order_date
            FROM customer_data.order_details od
            JOIN master_specs_db.phone_specs ps ON od.phone_id = ps.id
            JOIN customer_data.customer_info c ON od.customer_id = c.customer_id
            ORDER BY od.order_date DESC
        `);

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
                    console.warn(`Invalid price encountered: ${order.sm_price}`);
                }
            });

            let topCustomer = Object.keys(customerSales).reduce((a, b) => customerSales[a] > customerSales[b] ? a : b, 'N/A');
            let topDevice = Object.keys(deviceSales).reduce((a, b) => deviceSales[a] > deviceSales[b] ? a : b, 'N/A');
            const avgSalesPerCustomer = Object.keys(customerSales).length > 0 ? totalSales / Object.keys(customerSales).length : 0;
            const topCustomers = Object.entries(customerSales)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, sales]) => ({ name, sales }));
            const topDevices = Object.entries(deviceSales)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, sales]) => ({ name, sales }));

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
        } else {
            res.render('purchaseHistory', { orders });
        }
    } catch (error) {
        console.error('Error fetching purchase history:', error);
        next(error);
    }
});

// Customer Info Route
app.get('/customerInfo', ensureAuthenticated, async (req, res, next) => {
    try {
        const { customerId } = req.query;
        let query = 'SELECT * FROM customer_data.customer_info';
        let params = [];

        if (customerId) {
            query += ' WHERE customer_id = ?';
            params.push(customerId);
        }

        query += ' ORDER BY customer_id';

        const customers = await queryDatabase(req.db, query, params);

        res.render('customerInfo', { customers });
    } catch (error) {
        console.error('Error fetching customer info:', error);
        next(error);
    }
});

// Product Management Route (CRUD)
app.post('/products/manage', ensureAuthenticated, async (req, res) => {
    try {
        console.log('Received Data:', req.body);

        if (!req.body.action) {
            return res.status(400).json({ error: 'Action is required' });
        }

        const { action, id } = req.body;

        if (action === 'delete') {
            if (!id) {
                return res.status(400).json({ error: 'Product ID is required for deletion' });
            }

            const result = await queryDatabase(req.db, 'DELETE FROM phone_specs WHERE id = ?', [id]);
            if (result.affectedRows !== 1) {
                return res.status(404).json({ error: 'Product not found' });
            }

            return res.redirect('/products');
        }

        if (!req.body.sm_name || !req.body.sm_maker) {
            return res.status(400).json({ error: 'Product name and maker are required' });
        }

        const productData = {
            sm_name: req.body.sm_name.trim(),
            sm_maker: req.body.sm_maker.trim(),
            sm_price: req.body.sm_price ? parseFloat(parseFloat(req.body.sm_price).toFixed(2)) : null,
            sm_inventory: req.body.sm_inventory ? parseFloat(parseFloat(req.body.sm_inventory).toFixed(2)) : null,
            length_mm: req.body.length_mm ? parseFloat(parseFloat(req.body.length_mm).toFixed(2)) : null,
            width_mm: req.body.width_mm ? parseFloat(parseFloat(req.body.width_mm).toFixed(2)) : null,
            thickness_mm: req.body.thickness_mm ? parseFloat(parseFloat(req.body.thickness_mm).toFixed(2)) : null,
            weight_g: req.body.weight_g ? parseFloat(parseFloat(req.body.weight_g).toFixed(2)) : null,
            display_size: req.body.display_size ? parseFloat(parseFloat(req.body.display_size).toFixed(2)) : null,
            battery_capacity: req.body.battery_capacity ? parseFloat(parseFloat(req.body.battery_capacity).toFixed(2)) : null,
            pixel_density: req.body.pixel_density ? parseInt(req.body.pixel_density, 10) : null,
            color: req.body.color?.trim() || null,
            water_and_dust_rating: req.body.water_and_dust_rating?.trim() || null,
            processor: req.body.processor?.trim() || null,
            process_node: req.body.process_node?.trim() || null,
            cpu_cores: req.body.cpu_cores?.trim() || null,
            cpu_frequency: req.body.cpu_frequency?.trim() || null,
            gpu: req.body.gpu?.trim() || null,
            memory_type: req.body.memory_type?.trim() || null,
            ram: req.body.ram?.trim() || null,
            rom: req.body.rom?.trim() || null,
            expandable_memory: req.body.expandable_memory?.trim() || null,
            resolution: req.body.resolution?.trim() || null,
            refresh_rate: req.body.refresh_rate?.trim() || null,
            brightness: req.body.brightness?.trim() || null,
            rear_camera_main: req.body.rear_camera_main?.trim() || null,
            rear_camera_macro: req.body.rear_camera_macro?.trim() || null,
            front_camera: req.body.front_camera?.trim() || null,
            front_video_resolution: req.body.front_video_resolution?.trim() || null,
            fast_charging: req.body.fast_charging?.trim() || null,
            connector: req.body.connector?.trim() || null,
            sim_card: req.body.sim_card?.trim() || null,
            nfc: req.body.nfc?.trim() || null,
            audio_jack: req.body.audio_jack?.trim() || null,
            operating_system: req.body.operating_system?.trim() || null,
            display_features: req.body.display_features?.trim() || null,
            rear_camera_features: req.body.rear_camera_features?.trim() || null,
            front_camera_features: req.body.front_camera_features?.trim() || null,
            security_features: req.body.security_features?.trim() || null,
            network_bands: req.body.network_bands?.trim() || null,
            wireless_connectivity: req.body.wireless_connectivity?.trim() || null,
            navigation: req.body.navigation?.trim() || null,
            audio_playback: req.body.audio_playback?.trim() || null,
            video_playback: req.body.video_playback?.trim() || null,
            sensors: req.body.sensors?.trim() || null,
            package_contents: req.body.package_contents?.trim() || null
        };

        const decimalFields = ['sm_price', 'sm_inventory', 'length_mm', 'width_mm',
            'thickness_mm', 'weight_g', 'display_size', 'battery_capacity'];

        for (const field of decimalFields) {
            if (productData[field] !== null && (isNaN(productData[field]) || !isFinite(productData[field]))) {
                return res.status(400).json({ error: `Invalid numeric value for ${field}` });
            }
        }

        if (productData.pixel_density !== null &&
            (isNaN(productData.pixel_density) || !Number.isInteger(productData.pixel_density))) {
            return res.status(400).json({ error: 'Invalid pixel density value' });
        }

        Object.keys(productData).forEach(key =>
            productData[key] === undefined && delete productData[key]
        );

        if (action === 'add') {
            const fields = Object.keys(productData);
            const placeholders = fields.map(() => '?').join(', ');
            const values = fields.map(field => productData[field]);

            const result = await queryDatabase(
                req.db,
                `INSERT INTO phone_specs (${fields.join(', ')}) VALUES (${placeholders})`,
                values
            );

            if (result.affectedRows !== 1) {
                throw new Error('Failed to add product');
            }
        } else if (action === 'update') {
            if (!id) {
                return res.status(400).json({ error: 'Product ID is required for update' });
            }

            const setClause = Object.keys(productData)
                .map(field => `${field} = ?`)
                .join(', ');
            const values = [...Object.values(productData), id];

            const result = await queryDatabase(
                req.db,
                `UPDATE phone_specs SET ${setClause} WHERE id = ?`,
                values
            );

            if (result.affectedRows !== 1) {
                return res.status(404).json({ error: 'Product not found' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid action specified' });
        }

        res.redirect('/products');
    } catch (error) {
        console.error('Error during product management:', error);
        res.status(500).json({
            error: 'Database operation failed',
            details: error.message
        });
    }
});

// Graceful Shutdown
process.on('SIGINT', async () => {
    try {
        if (pool && !pool._closed) {
            console.log('Closing database connection pool...');
            await pool.end();
            console.log('Database connection pool closed successfully');
        }

        server.close(() => {
            console.log('Server closed successfully');
            process.exit(0);
        });
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Start Server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
