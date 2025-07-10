// Load environment variables first
require('dotenv').config();

// Safe formatter for device information - add to prevent template literal syntax errors
function formatDeviceInfo(maker, name) {
    // Ensure both inputs are strings
    con        // Set view engine
        app.set('view engine', 'ejs');
        app.set('views', path.join(__dirname, 'views'));

        // Import modular routes
        const authRoutes = require('./routes/auth')(authPool, convertBigIntToNumber);ceMaker = (maker || '').toString();
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

        // Handle favicon and static assets FIRST - before any other middleware
        app.get('/favicon.ico', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'favicon.ico'), {
                headers: {
                    'Content-Type': 'image/x-icon',
                    'Cache-Control': 'public, max-age=86400' // Cache for 1 day
                }
            });
        });
        
        // Serve static files early to avoid session middleware
        app.use('/css', express.static(path.join(__dirname, 'public/css')));
        app.use('/js', express.static(path.join(__dirname, 'public/js')));
        app.use('/img', express.static(path.join(__dirname, 'public/img')));
        app.use('/qrcodes', express.static(path.join(__dirname, 'public/qrcodes')));
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
        
        // Skip expensive middleware for static assets
        app.use((req, res, next) => {
            // Check if this is a static asset request
            if (req.path.startsWith('/css/') || 
                req.path.startsWith('/js/') || 
                req.path.startsWith('/img/') || 
                req.path.startsWith('/qrcodes/') ||
                req.path === '/favicon.ico' ||
                req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/)) {
                // Skip to next middleware - static files are already handled above
                return next();
            }
            next();
        });
        
        // CORRECT MIDDLEWARE ORDER
        app.use(cookieParser());
        app.use(dynamicSessionMiddleware.getMiddleware());
        app.use(flash());

        // CSRF Protection - Import modular CSRF handling
        const { csrfProtection, csrfMiddleware, csrfErrorHandler } = require('./middleware/csrfProtection');
        app.use(csrfProtection);
        app.use(csrfMiddleware);

        // Make helper functions available to all views
        app.use((req, res, next) => {
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

        // Import modular routes
        const authRoutes = require('./routes/auth')(authPool, convertBigIntToNumber);
        const usersRoutes = require('./routes/users')(authPool, convertBigIntToNumber);
        const dashboardRoutes = require('./routes/dashboard')(pool, suppliersPool, convertBigIntToNumber);
        const suppliersRoutes = require('./routes/suppliers')(suppliersPool, convertBigIntToNumber);
        const inventoryRoutes = require('./routes/inventory')(pool, suppliersPool, convertBigIntToNumber);
        const receiptsRoutes = require('./routes/receipts')(pool, suppliersPool, convertBigIntToNumber);
        const phonesRoutes = require('./routes/phones')(pool, convertBigIntToNumber, formatDeviceInfo);
        const reportsRoutes = require('./routes/reports')(pool, convertBigIntToNumber);
        const analyticsRoutes = require('./routes/analytics')(pool, suppliersPool, convertBigIntToNumber);
        const qrcodeRoutes = require('./routes/qrcode')(pool, suppliersPool, convertBigIntToNumber);
        const warehousesRoutes = require('./routes/warehouses')(pool, convertBigIntToNumber);

        // Apply rate limiting to specific routes
        app.use('/login', authLimiter);
        app.use('/forgot-password', passwordResetLimiter);
        app.use('/admin', adminLimiter);
        app.use((req, res, next) => {
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
                return apiWriteLimiter(req, res, next);
            }
            next();
        });
        
        // Use modular routes
        app.use('/', authRoutes);
        app.use('/', usersRoutes);
        app.use('/', dashboardRoutes);
        app.use('/', suppliersRoutes);
        app.use('/', inventoryRoutes);
        app.use('/', receiptsRoutes);
        app.use('/', phonesRoutes);
        app.use('/', reportsRoutes);
        app.use('/', analyticsRoutes);
        app.use('/', qrcodeRoutes);
        app.use('/warehouses', warehousesRoutes);

        // ===============================================
        // ERROR HANDLING MIDDLEWARE - Should be last
        // ===============================================
        
        // Import the modular error handlers from middleware
        const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
        
        // 404 handler for undefined routes - must be after all valid routes
        app.use(notFoundHandler);
        
        // Central error handler - must be the last middleware
        app.use(errorHandler);


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