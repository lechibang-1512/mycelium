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




const express = require('express');
const path = require('path');
const auditRoutes = require('./routes/audit');
const reportRoutes = require('./routes/reports');

const cookieParser = require('cookie-parser');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');


// SQL Pool is loaded by services directly from config/database.js
const { ensureSingleInstance, removePidFile } = require('./utils/singleInstance');
const setupMiddleware = require('./middleware/setupMiddleware');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

let scheduledJobsService = null;

async function startServer() {
    try {
        console.info('🚀 Starting Mycelium ERP Server (SQL Edition)...');
        await ensureSingleInstance(PORT);

        setupMiddleware(app);

        // Request logging middleware - logs to file, not console
        const logFile = path.join(__dirname, '../server.log');
        app.use((req, res, next) => {
            // Skip logging for noisy endpoints
            const skipLogging = ['/favicon.ico', '/api/health', '/api/stocktake/lockdown-status'];
            if (!skipLogging.some(p => req.url.startsWith(p))) {
                const logLine = `[${new Date().toISOString()}] 📡 ${req.method} ${req.url} from ${req.ip || req.connection.remoteAddress}\n`;
                fs.appendFileSync(logFile, logLine);
            }
            next();
        });

        // Static Files
        const distPath = path.join(__dirname, '../dist');
        app.get('/favicon.ico', (req, res) => {
            const faviconPath = path.join(distPath, 'favicon.ico');
            if (fs.existsSync(faviconPath)) {
                res.sendFile(faviconPath);
            } else {
                res.status(204).end();
            }
        });

        app.use(express.static('public'));

        app.use(cookieParser());


        // Routes
        app.use('/api/audit', auditRoutes);
        app.use('/api/reports', reportRoutes);

        // Receipts route before auth (intentionally unauthenticated for internal use)
        const receiptsAPI = require('./routes/receipts')();
        app.use('/api/receipts', receiptsAPI);

        const { createAuthMiddleware } = require('./middleware/authMiddleware');
        const authMiddleware = createAuthMiddleware({
            excludePaths: ['/api/auth/*', '/api/health']
        });
        app.use('/api', authMiddleware);



        // Main routes
        app.use('/api', require('./routes/index')());

        // Swagger API Documentation
        try {
            const swaggerDocument = require('../config/swagger-output.json');
            app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
        } catch (_e) {
            console.warn('⚠️ Swagger documentation not found. Run npm run generate:docs to create it.');
        }

        // Serve SPA
        const distPath2 = path.join(__dirname, '../dist');
        if (fs.existsSync(distPath2)) {
            app.use('/assets', express.static(path.join(distPath2, 'assets'), { maxAge: '1d', immutable: true }));
            app.use(express.static(distPath2));

            // Redirect old .html paths to clean React paths
            app.use((req, res, next) => {
                if (req.path.endsWith('.html') && req.path !== '/index.html') {
                    const cleanPath = req.path.replace(/\.html$/, '');
                    let safePath = '/';
                    try {
                        const parsed = new URL(cleanPath, 'http://localhost');
                        safePath = parsed.pathname;
                    } catch (_e) {
                        safePath = '/';
                    }
                    return res.redirect(301, safePath === '' ? '/' : safePath);
                }
                next();
            });

            // React SPA fallback
            app.use((req, res, next) => {
                if (!req.path.startsWith('/api/') && !req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json)$/)) {
                    return res.sendFile(path.join(distPath2, 'index.html'));
                }
                next();
            });
        }

        app.use(notFoundHandler);
        app.use(errorHandler);

        const _server = app.listen(PORT, '0.0.0.0', () => {
            console.info(`🌟 Server running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

async function gracefulShutdown(signal) {
    console.info(`🛑 ${signal} received, shutting down...`);
    if (scheduledJobsService) scheduledJobsService.stop();
    removePidFile();
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

module.exports = app;