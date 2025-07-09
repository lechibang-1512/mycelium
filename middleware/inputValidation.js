/**
 * Input validation middleware for request data - Refactored to use validation services
 * 
 * Provides comprehensive input validation and sanitization using composition pattern
 * to reduce code duplication and improve maintainability.
 */

const validator = require('validator');
const xss = require('xss');
const UserValidationService = require('../services/UserValidationService');

class InputValidator {
    static userValidationService = new UserValidationService();

    /**
     * Validate and sanitize user registration data
     */
    static validateUserRegistration(req, res, next) {
        return InputValidator.userValidationService.createUserRegistrationMiddleware()(req, res, next);
    }

    /**
     * Validate phone/product data
     */
    static validatePhoneData(req, res, next) {
        return InputValidator.userValidationService.createProductValidationMiddleware()(req, res, next);
    }

    /**
     * Validate supplier data
     */
    static validateSupplierData(req, res, next) {
        return InputValidator.userValidationService.createSupplierValidationMiddleware()(req, res, next);
    }

    /**
     * Validate transaction data (buy/sell)
     */
    static validateTransactionData(req, res, next) {
        return InputValidator.userValidationService.createTransactionValidationMiddleware()(req, res, next);
    }

    /**
     * General text sanitization middleware
     */
    static sanitizeText(req, res, next) {
        // Recursively sanitize all string inputs
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    // Apply XSS protection but preserve some formatting
                    obj[key] = xss(obj[key], {
                        whiteList: {}, // No HTML tags allowed
                        stripIgnoreTag: true,
                        stripIgnoreTagBody: ['script', 'style']
                    });
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
            }
        };

        if (req.body) sanitizeObject(req.body);
        if (req.query) sanitizeObject(req.query);
        if (req.params) sanitizeObject(req.params);

        next();
    }

    /**
     * Validate search parameters
     */
    static validateSearchParams(req, res, next) {
        const { query, page, limit, sort } = req.query;

        // Search query validation
        if (query && !validator.isLength(query, { max: 200 })) {
            req.flash('error', 'Search query is too long');
            return res.redirect('back');
        }

        // Pagination validation
        if (page && !validator.isInt(page.toString(), { min: 1, max: 10000 })) {
            req.query.page = '1';
        }

        if (limit && !validator.isInt(limit.toString(), { min: 1, max: 1000 })) {
            req.query.limit = '50';
        }

        // Sort validation
        const validSortFields = ['name', 'date', 'price', 'inventory', 'created_at', 'updated_at'];
        if (sort && !validSortFields.includes(sort)) {
            delete req.query.sort;
        }

        next();
    }

    /**
     * Validate file upload parameters
     */
    static validateFileUpload(req, res, next) {
        // This would be used if file uploads are implemented
        if (req.files) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
            const maxSize = 5 * 1024 * 1024; // 5MB

            for (const file of Object.values(req.files)) {
                if (!allowedTypes.includes(file.mimetype)) {
                    req.flash('error', 'Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.');
                    return res.redirect('back');
                }

                if (file.size > maxSize) {
                    req.flash('error', 'File size too large. Maximum size is 5MB.');
                    return res.redirect('back');
                }
            }
        }

        next();
    }

    /**
     * Validate API parameters
     */
    static validateApiParams(req, res, next) {
        // Check for potential API abuse
        const suspiciousPatterns = [
            /union\s+select/i,
            /drop\s+table/i,
            /delete\s+from/i,
            /insert\s+into/i,
            /update\s+set/i,
            /<script/i,
            /javascript:/i,
            /data:/i
        ];

        const checkValue = (value) => {
            if (typeof value === 'string') {
                return suspiciousPatterns.some(pattern => pattern.test(value));
            }
            return false;
        };

        const checkObject = (obj) => {
            for (const key in obj) {
                if (checkValue(obj[key]) || checkValue(key)) {
                    return true;
                }
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    if (checkObject(obj[key])) return true;
                }
            }
            return false;
        };

        if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
            console.error(`🚨 Suspicious input detected from IP: ${req.ip}, Path: ${req.path}`);
            return res.status(400).json({
                error: 'Invalid input detected',
                message: 'Your request contains potentially harmful content'
            });
        }

        next();
    }
}

module.exports = InputValidator;
