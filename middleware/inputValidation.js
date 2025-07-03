/**
 * Enhanced Input Validation Middleware
 * 
 * Provides comprehensive input validation and sanitization
 * to prevent various types of attacks including XSS, SQL injection,
 * and other malicious input.
 */

const validator = require('validator');
const xss = require('xss');

class InputValidator {
    /**
     * Validate and sanitize user registration data
     */
    static validateUserRegistration(req, res, next) {
        const errors = [];
        const { username, password, fullName, email, role } = req.body;

        // Username validation
        if (!username || !validator.isLength(username, { min: 3, max: 30 })) {
            errors.push('Username must be between 3 and 30 characters');
        }
        if (username && !validator.isAlphanumeric(username, 'en-US', { ignore: '_-' })) {
            errors.push('Username can only contain letters, numbers, hyphens, and underscores');
        }

        // Full name validation
        if (!fullName || !validator.isLength(fullName, { min: 2, max: 100 })) {
            errors.push('Full name must be between 2 and 100 characters');
        }
        if (fullName && !validator.matches(fullName, /^[a-zA-Z\s\-'.]+$/)) {
            errors.push('Full name contains invalid characters');
        }

        // Email validation
        if (!email || !validator.isEmail(email)) {
            errors.push('Please provide a valid email address');
        }
        if (email && !validator.isLength(email, { max: 100 })) {
            errors.push('Email address is too long');
        }

        // Role validation
        const validRoles = ['admin', 'staff'];
        if (!role || !validRoles.includes(role)) {
            errors.push('Invalid role specified');
        }

        // Sanitize inputs
        if (username) req.body.username = validator.escape(username.trim());
        if (fullName) req.body.fullName = xss(fullName.trim());
        if (email) req.body.email = validator.normalizeEmail(email.trim());

        if (errors.length > 0) {
            req.flash('error', errors.join('. '));
            return res.redirect('back');
        }

        next();
    }

    /**
     * Validate phone/product data
     */
    static validatePhoneData(req, res, next) {
        const errors = [];
        const {
            sm_name, sm_maker, sm_price, sm_inventory, color,
            processor, memory_type, ram, storage_type, storage_capacity
        } = req.body;

        // Required fields validation
        if (!sm_name || !validator.isLength(sm_name, { min: 1, max: 200 })) {
            errors.push('Product name is required and must not exceed 200 characters');
        }

        if (!sm_maker || !validator.isLength(sm_maker, { min: 1, max: 100 })) {
            errors.push('Manufacturer is required and must not exceed 100 characters');
        }

        // Price validation
        if (sm_price && !validator.isFloat(sm_price.toString(), { min: 0 })) {
            errors.push('Price must be a valid positive number');
        }

        // Inventory validation
        if (sm_inventory && !validator.isInt(sm_inventory.toString(), { min: 0 })) {
            errors.push('Inventory must be a valid non-negative integer');
        }

        // Sanitize text inputs
        if (sm_name) req.body.sm_name = xss(sm_name.trim());
        if (sm_maker) req.body.sm_maker = xss(sm_maker.trim());
        if (color) req.body.color = xss(color.trim());
        if (processor) req.body.processor = xss(processor.trim());
        if (memory_type) req.body.memory_type = xss(memory_type.trim());
        if (ram) req.body.ram = xss(ram.trim());
        if (storage_type) req.body.storage_type = xss(storage_type.trim());
        if (storage_capacity) req.body.storage_capacity = xss(storage_capacity.trim());

        if (errors.length > 0) {
            req.flash('error', errors.join('. '));
            return res.redirect('back');
        }

        next();
    }

    /**
     * Validate supplier data
     */
    static validateSupplierData(req, res, next) {
        const errors = [];
        const {
            name, category, contact_person, contact_email, email,
            phone, website, supplier_id
        } = req.body;

        // Required fields
        if (!name || !validator.isLength(name, { min: 1, max: 200 })) {
            errors.push('Supplier name is required and must not exceed 200 characters');
        }

        if (!supplier_id || !validator.isLength(supplier_id, { min: 1, max: 50 })) {
            errors.push('Supplier ID is required and must not exceed 50 characters');
        }

        // Email validation
        if (contact_email && !validator.isEmail(contact_email)) {
            errors.push('Contact email must be a valid email address');
        }

        if (email && !validator.isEmail(email)) {
            errors.push('Email must be a valid email address');
        }

        // Phone validation
        if (phone && !validator.matches(phone, /^[\+\-\(\)\s\d]+$/)) {
            errors.push('Phone number contains invalid characters');
        }

        // Website validation
        if (website && !validator.isURL(website, { require_protocol: true })) {
            errors.push('Website must be a valid URL with protocol (http:// or https://)');
        }

        // Sanitize inputs
        if (name) req.body.name = xss(name.trim());
        if (category) req.body.category = xss(category.trim());
        if (contact_person) req.body.contact_person = xss(contact_person.trim());
        if (contact_email) req.body.contact_email = validator.normalizeEmail(contact_email.trim());
        if (email) req.body.email = validator.normalizeEmail(email.trim());
        if (supplier_id) req.body.supplier_id = validator.escape(supplier_id.trim());

        if (errors.length > 0) {
            req.flash('error', errors.join('. '));
            return res.redirect('back');
        }

        next();
    }

    /**
     * Validate transaction data (buy/sell)
     */
    static validateTransactionData(req, res, next) {
        const errors = [];
        const {
            phone_id, quantity, unit_cost, vat_rate, tax_rate,
            customer_name, customer_email, customer_phone, supplier_id
        } = req.body;

        // Required fields
        if (!phone_id || !validator.isInt(phone_id.toString(), { min: 1 })) {
            errors.push('Valid product ID is required');
        }

        if (!quantity || !validator.isInt(quantity.toString(), { min: 1, max: 10000 })) {
            errors.push('Quantity must be a valid integer between 1 and 10,000');
        }

        // Cost validation
        if (unit_cost && !validator.isFloat(unit_cost.toString(), { min: 0 })) {
            errors.push('Unit cost must be a valid positive number');
        }

        // Rate validation
        if (vat_rate && !validator.isFloat(vat_rate.toString(), { min: 0, max: 100 })) {
            errors.push('VAT rate must be between 0 and 100');
        }

        if (tax_rate && !validator.isFloat(tax_rate.toString(), { min: 0, max: 100 })) {
            errors.push('Tax rate must be between 0 and 100');
        }

        // Customer info validation
        if (customer_email && !validator.isEmail(customer_email)) {
            errors.push('Customer email must be a valid email address');
        }

        if (customer_phone && !validator.matches(customer_phone, /^[\+\-\(\)\s\d]+$/)) {
            errors.push('Customer phone number contains invalid characters');
        }

        // Sanitize inputs
        if (customer_name) req.body.customer_name = xss(customer_name.trim());
        if (customer_email) req.body.customer_email = validator.normalizeEmail(customer_email.trim());

        if (errors.length > 0) {
            req.flash('error', errors.join('. '));
            return res.redirect('back');
        }

        next();
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
