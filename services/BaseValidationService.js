/**
 * Base Validation Service
 * Implements common validation patterns to reduce code duplication
 * Follows Single Responsibility Principle and Open/Closed Principle
 */

const validator = require('validator');
const xss = require('xss');

class BaseValidationService {
    constructor() {
        this.validationRules = new Map();
        this.sanitizationRules = new Map();
        this.setupDefaultRules();
    }

    /**
     * Setup default validation rules
     */
    setupDefaultRules() {
        // Email validation rule
        this.addValidationRule('email', {
            required: false,
            validator: (value) => validator.isEmail(value),
            message: 'Please provide a valid email address'
        });

        // Text length validation rule
        this.addValidationRule('textLength', {
            required: false,
            validator: (value, options = {}) => {
                const { min = 0, max = 255 } = options;
                return validator.isLength(value, { min, max });
            },
            message: (options = {}) => {
                const { min = 0, max = 255 } = options;
                return `Must be between ${min} and ${max} characters`;
            }
        });

        // Numeric validation rule
        this.addValidationRule('numeric', {
            required: false,
            validator: (value, options = {}) => {
                const { min, max } = options;
                return validator.isFloat(value.toString(), { min, max });
            },
            message: (options = {}) => {
                const { min, max } = options;
                let message = 'Must be a valid number';
                if (min !== undefined && max !== undefined) {
                    message += ` between ${min} and ${max}`;
                } else if (min !== undefined) {
                    message += ` greater than or equal to ${min}`;
                } else if (max !== undefined) {
                    message += ` less than or equal to ${max}`;
                }
                return message;
            }
        });

        // Integer validation rule
        this.addValidationRule('integer', {
            required: false,
            validator: (value, options = {}) => {
                const { min, max } = options;
                return validator.isInt(value.toString(), { min, max });
            },
            message: (options = {}) => {
                const { min, max } = options;
                let message = 'Must be a valid integer';
                if (min !== undefined && max !== undefined) {
                    message += ` between ${min} and ${max}`;
                } else if (min !== undefined) {
                    message += ` greater than or equal to ${min}`;
                } else if (max !== undefined) {
                    message += ` less than or equal to ${max}`;
                }
                return message;
            }
        });

        // URL validation rule
        this.addValidationRule('url', {
            required: false,
            validator: (value, options = {}) => {
                const { requireProtocol = true } = options;
                return validator.isURL(value, { require_protocol: requireProtocol });
            },
            message: 'Must be a valid URL'
        });

        // Phone validation rule
        this.addValidationRule('phone', {
            required: false,
            validator: (value) => validator.matches(value, /^[\+\-\(\)\s\d]+$/),
            message: 'Phone number contains invalid characters'
        });

        // Alphanumeric validation rule
        this.addValidationRule('alphanumeric', {
            required: false,
            validator: (value, options = {}) => {
                const { ignore = '_-' } = options;
                return validator.isAlphanumeric(value, 'en-US', { ignore });
            },
            message: 'Can only contain letters, numbers, hyphens, and underscores'
        });

        // Name validation rule
        this.addValidationRule('name', {
            required: false,
            validator: (value) => validator.matches(value, /^[a-zA-Z\s\-'.]+$/),
            message: 'Contains invalid characters'
        });
    }

    /**
     * Add a new validation rule
     * @param {string} name - Rule name
     * @param {Object} rule - Rule configuration
     */
    addValidationRule(name, rule) {
        this.validationRules.set(name, rule);
    }

    /**
     * Get validation rule by name
     * @param {string} name - Rule name
     * @returns {Object|null} Rule configuration
     */
    getValidationRule(name) {
        return this.validationRules.get(name);
    }

    /**
     * Validate a single field using a specific rule
     * @param {string} value - Value to validate
     * @param {string} ruleName - Name of validation rule
     * @param {Object} options - Options for the rule
     * @param {boolean} required - Whether field is required
     * @returns {Object} Validation result
     */
    validateField(value, ruleName, options = {}, required = false) {
        const rule = this.getValidationRule(ruleName);
        
        if (!rule) {
            throw new Error(`Validation rule '${ruleName}' not found`);
        }

        // Check if required
        if (required && (!value || value.trim() === '')) {
            return {
                isValid: false,
                message: 'This field is required'
            };
        }

        // Skip validation if field is empty and not required
        if (!value || value.trim() === '') {
            return { isValid: true, message: '' };
        }

        // Run validation
        const isValid = rule.validator(value, options);
        const message = isValid ? '' : (
            typeof rule.message === 'function' 
                ? rule.message(options) 
                : rule.message
        );

        return { isValid, message };
    }

    /**
     * Validate multiple fields against their rules
     * @param {Object} data - Data object to validate
     * @param {Object} fieldRules - Field validation rules configuration
     * @returns {Object} Validation result with all errors
     */
    validateFields(data, fieldRules) {
        const errors = [];
        const warnings = [];

        for (const [fieldName, fieldRule] of Object.entries(fieldRules)) {
            const value = data[fieldName];
            const {
                rules = [],
                required = false,
                custom = null
            } = fieldRule;

            // Check required first
            if (required && (!value || value.toString().trim() === '')) {
                errors.push(`${fieldName} is required`);
                continue;
            }

            // Skip other validations if field is empty and not required
            if (!value || value.toString().trim() === '') {
                continue;
            }

            // Run validation rules
            for (const rule of rules) {
                const { name, options = {}, warning = false } = rule;
                const result = this.validateField(value, name, options, false);
                
                if (!result.isValid) {
                    const message = `${fieldName}: ${result.message}`;
                    if (warning) {
                        warnings.push(message);
                    } else {
                        errors.push(message);
                    }
                }
            }

            // Run custom validation if provided
            if (custom && typeof custom === 'function') {
                try {
                    const customResult = custom(value, data);
                    if (!customResult.isValid) {
                        errors.push(`${fieldName}: ${customResult.message}`);
                    }
                } catch (error) {
                    errors.push(`${fieldName}: Custom validation error - ${error.message}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Sanitize data according to sanitization rules
     * @param {Object} data - Data to sanitize
     * @param {Object} sanitizationRules - Sanitization configuration
     * @returns {Object} Sanitized data
     */
    sanitizeData(data, sanitizationRules) {
        const sanitized = {};

        for (const [key, value] of Object.entries(data)) {
            const rule = sanitizationRules[key];
            
            if (!rule) {
                // No specific rule, just trim if string
                sanitized[key] = typeof value === 'string' ? value.trim() : value;
                continue;
            }

            let sanitizedValue = value;

            // Apply transformations
            if (rule.trim && typeof sanitizedValue === 'string') {
                sanitizedValue = sanitizedValue.trim();
            }

            if (rule.xss && typeof sanitizedValue === 'string') {
                sanitizedValue = xss(sanitizedValue, rule.xssOptions || {});
            }

            if (rule.escape && typeof sanitizedValue === 'string') {
                sanitizedValue = validator.escape(sanitizedValue);
            }

            if (rule.normalizeEmail && typeof sanitizedValue === 'string') {
                sanitizedValue = validator.normalizeEmail(sanitizedValue);
            }

            if (rule.toLowerCase && typeof sanitizedValue === 'string') {
                sanitizedValue = sanitizedValue.toLowerCase();
            }

            if (rule.toUpperCase && typeof sanitizedValue === 'string') {
                sanitizedValue = sanitizedValue.toUpperCase();
            }

            // Apply custom transformation
            if (rule.transform && typeof rule.transform === 'function') {
                sanitizedValue = rule.transform(sanitizedValue);
            }

            sanitized[key] = sanitizedValue;
        }

        return sanitized;
    }

    /**
     * Create a reusable middleware for specific validation schemas
     * @param {Object} validationSchema - Schema defining validation rules
     * @param {Object} sanitizationSchema - Schema defining sanitization rules
     * @returns {Function} Express middleware function
     */
    createValidationMiddleware(validationSchema, sanitizationSchema = {}) {
        return (req, res, next) => {
            // Sanitize data first
            req.body = this.sanitizeData(req.body, sanitizationSchema);

            // Validate data
            const validation = this.validateFields(req.body, validationSchema);

            if (!validation.isValid) {
                req.flash('error', validation.errors.join('. '));
                return res.redirect('back');
            }

            // Add warnings to flash if any
            if (validation.warnings.length > 0) {
                req.flash('warning', validation.warnings.join('. '));
            }

            next();
        };
    }
}

module.exports = BaseValidationService;
