const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const os = require('os');

function setupMiddleware(app) {
    // Helmet security headers
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'"]
            }
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "same-origin" }
    }));

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(express.text({ type: ['application/xml', 'text/xml'], limit: '5mb' }));

    // CORS configuration
    const allowedOrigins = [
        process.env.CLIENT_URL || 'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
    ];

    if (process.env.NODE_ENV !== 'production') {
        const networkInterfaces = os.networkInterfaces();
        Object.values(networkInterfaces).forEach(interfaces => {
            interfaces.forEach(iface => {
                if (iface.family === 'IPv4' && !iface.internal) {
                    allowedOrigins.push(`http://${iface.address}:3000`);
                    allowedOrigins.push(`http://${iface.address}:5173`);
                }
            });
        });
    }

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (process.env.NODE_ENV !== 'production' && origin.match(/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|localhost|127\.0\.0\.1)/)) {
                return callback(null, true);
            }
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiters
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10000,
        skipSuccessfulRequests: true,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: 'Too many login attempts.' }
    });

    const apiLimiter = rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 10000,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: 'Too many requests.' }
    });

    return { authLimiter, apiLimiter };
}

module.exports = setupMiddleware;
