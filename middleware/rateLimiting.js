/**
 * Rate Limiting Middleware for Security Protection
 * 
 * Implements various rate limiting strategies to prevent brute force attacks
 * and other security threats.
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

/**
 * General rate limiter for all requests
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(15 * 60) // seconds
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: Math.ceil(15 * 60)
        });
    }
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
        error: 'Too many login attempts, please try again in 15 minutes.',
        retryAfter: Math.ceil(15 * 60)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res) => {
        console.error(`🚨 Multiple failed login attempts from IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many login attempts, please try again in 15 minutes.',
            retryAfter: Math.ceil(15 * 60)
        });
    }
});

/**
 * Rate limiter for password reset requests
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset attempts per hour
    message: {
        error: 'Too many password reset attempts, please try again in 1 hour.',
        retryAfter: Math.ceil(60 * 60)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`Password reset rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many password reset attempts, please try again in 1 hour.',
            retryAfter: Math.ceil(60 * 60)
        });
    }
});

/**
 * Slow down middleware for suspicious activity
 */
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 100, // Allow 100 requests per windowMs without delay
    delayMs: () => 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // Maximum delay of 20 seconds
    validate: {
        delayMs: false // Disable the delayMs validation warning
    }
});

/**
 * Admin panel rate limiter
 */
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit admin actions
    message: {
        error: 'Too many admin requests, please try again later.',
        retryAfter: Math.ceil(15 * 60)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`Admin rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
            error: 'Too many admin requests, please try again later.',
            retryAfter: Math.ceil(15 * 60)
        });
    }
});

/**
 * API rate limiter for data modification
 */
const apiWriteLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 write operations per minute
    message: {
        error: 'Too many API write requests, please slow down.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'GET' || req.method === 'HEAD',
    handler: (req, res) => {
        console.warn(`API write rate limit exceeded for IP: ${req.ip}, Method: ${req.method}, Path: ${req.path}`);
        res.status(429).json({
            error: 'Too many API write requests, please slow down.',
            retryAfter: 60
        });
    }
});

module.exports = {
    generalLimiter,
    authLimiter,
    passwordResetLimiter,
    speedLimiter,
    adminLimiter,
    apiWriteLimiter
};
