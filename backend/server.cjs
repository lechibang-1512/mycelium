// Load environment variables first
require('dotenv').config();

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Promise Rejection:', reason);
    console.error('   Promise:', promise);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
}

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const SanitizationService = require('./services/SanitizationService');
// Replace MariaDB pool with MongoDB connection
const { connectMongoDB } = require('./config/mongodb');
const { ensureSingleInstance, removePidFile } = require('./utils/singleInstance');
const setupMiddleware = require('./middleware/setupMiddleware');
const { detectMobile } = require('./middleware/userAgent');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const ScheduledJobsService = require('./services/ScheduledJobsService');

const app = express();
const PORT = process.env.PORT || 3000;

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;
let scheduledJobsService = null;
let dbConnection = null;

// MongoDB migration complete - no SQL pool needed

async function startServer() {
    try {
        console.log('🚀 Starting Mycelium ERP Server...');
        await ensureSingleInstance(PORT);

        // Connect to MongoDB
        dbConnection = await connectMongoDB();
        console.log('✅ MongoDB connected');

        // Initialize Casbin Service (needs update for Mongoose adapter if not already compatible)
        // const CasbinService = require('./services/CasbinService');
        // await CasbinService.init(dbConnection); 
        // console.log('✅ Casbin Service initialized');

        // Populate Casbin policies from code definitions
        // await CasbinService.syncLegacyPolicies(dbConnection);

        // Scheduled Jobs
        // scheduledJobsService = new ScheduledJobsService(dbConnection); // Need to update service to work with Mongoose
        // scheduledJobsService.start();

        // Request logging middleware - logs to file, not console
        const logFile = path.join(__dirname, '../server.log');
        app.use((req, res, next) => {
            // Skip logging for noisy endpoints
            const skipLogging = ['/api/ua-test', '/favicon.ico', '/api/health', '/api/stocktake/lockdown-status'];
            if (!skipLogging.some(p => req.url.startsWith(p))) {
                const logLine = `[${new Date().toISOString()}] 📡 ${req.method} ${req.url} from ${req.ip || req.connection.remoteAddress}\n`;
                fs.appendFileSync(logFile, logLine);
            }
            next();
        });

        const { authLimiter, apiLimiter } = setupMiddleware(app);

        // Static Files
        app.get('/favicon.ico', (req, res) => {
            res.sendFile(path.join(__dirname, '../public', 'favicon.ico'));
        });
        app.use('/css', express.static(path.join(__dirname, '../public/css')));
        app.use('/js', express.static(path.join(__dirname, '../public/js')));
        app.use('/img', express.static(path.join(__dirname, '../public/img')));
        app.use('/qrcodes', express.static(path.join(__dirname, '../public/qrcodes')));
        app.use('/mobile', express.static(path.join(__dirname, '../public/mobile'), { maxAge: 0 }));
        app.use(express.static('public'));

        app.use(cookieParser());
        app.use(detectMobile);

        // Mobile Direct Serve
        app.use((req, res, next) => {
            if (!req.path.startsWith('/api/') && !req.path.startsWith('/mobile/') && !req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json)$/) && req.isMobile) {
                return res.sendFile(path.join(__dirname, '../public/mobile/index.html'));
            }
            next();
        });

        // Routes
        app.use('/api/auth/login', authLimiter);
        app.use('/api', apiLimiter);

        // Receipts route before auth (intentionally unauthenticated for internal use)
        const receiptsAPI = require('./routes/receipts')();
        app.use('/api/receipts', receiptsAPI);

        const { createAuthMiddleware } = require('./middleware/authMiddleware');
        const authMiddleware = createAuthMiddleware({
            excludePaths: ['/api/auth/*', '/api/health', '/api/ua-test']
        });
        app.use('/api', authMiddleware);

        // Main routes - MongoDB version
        app.use('/api', require('./routes/index')());

        // Serve React build
        const reactBuildPath = path.join(__dirname, '../dist');
        if (fs.existsSync(reactBuildPath)) {
            app.use('/assets', express.static(path.join(reactBuildPath, 'assets'), { maxAge: '1d', immutable: true }));
            app.use(express.static(reactBuildPath));
            app.use((req, res, next) => {
                if (!req.path.startsWith('/api/') && !req.path.startsWith('/mobile/') && !req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json)$/)) {
                    return res.sendFile(path.join(reactBuildPath, 'index.html'));
                }
                next();
            });
        }

        app.use(notFoundHandler);
        app.use(errorHandler);

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🌟 Server running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

async function gracefulShutdown(signal) {
    console.log(`🛑 ${signal} received, shutting down...`);
    if (scheduledJobsService) scheduledJobsService.stop();
    // if (dbConnection) await dbConnection.close(); // Mongoose connection is global, could close here
    removePidFile();
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

module.exports = app;