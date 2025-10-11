/**
 * User Validation Service
 * Extends BaseValidationService to provide user-specific validation
 * Follows Open/Closed Principle by extending rather than modifying base class
 */

const BaseValidationService = require('./BaseValidationService');

class UserValidationService extends BaseValidationService {
    constructor() {
        super();
        this.setupUserValidationRules();
    }

    /**
     * Setup user-specific validation rules
     */
    setupUserValidationRules() {
        // Username validation rule
        this.addValidationRule('username', {
            required: true,
            validator: (value) => {
                return value.length >= 3 && 
                       value.length <= 30 && 
                       /^[a-zA-Z0-9_-]+$/.test(value);
            },
            message: 'Username must be 3-30 characters and contain only letters, numbers, hyphens, and underscores'
        });

        // Password validation rule
        this.addValidationRule('password', {
            required: true,
            validator: (value) => {
                return value.length >= 8 && value.length <= 128;
            },
            message: 'Password must be between 8 and 128 characters'
        });

        // Role validation rule
        this.addValidationRule('role', {
            required: true,
            validator: (value) => {
                const validRoles = ['admin', 'staff'];
                return validRoles.includes(value);
            },
            message: 'Invalid role specified'
        });
    }

    /**
     * Get user registration validation schema
     * @returns {Object} Validation schema for user registration
     */
    getUserRegistrationSchema() {
        return {
            username: {
                required: true,
                rules: [
                    { name: 'username' }
                ]
            },
            fullName: {
                required: true,
                rules: [
                    { name: 'textLength', options: { min: 2, max: 100 } },
                    { name: 'name' }
                ]
            },
            email: {
                required: true,
                rules: [
                    { name: 'email' },
                    { name: 'textLength', options: { max: 100 } }
                ]
            },
            password: {
                required: true,
                rules: [
                    { name: 'password' }
                ]
            },
            role: {
                required: true,
                rules: [
                    { name: 'role' }
                ]
            }
        };
    }

    /**
     * Get user registration sanitization schema
     * @returns {Object} Sanitization schema for user registration
     */
    getUserRegistrationSanitizationSchema() {
        return {
            username: {
                trim: true,
                escape: true
            },
            fullName: {
                trim: true,
                xss: true
            },
            email: {
                trim: true,
                normalizeEmail: true
            },
            password: {
                // Don't sanitize password, just trim
                trim: true
            },
            role: {
                trim: true,
                toLowerCase: true
            }
        };
    }

    /**
     * Create user registration validation middleware
     * @returns {Function} Express middleware for user registration validation
     */
    createUserRegistrationMiddleware() {
        return this.createValidationMiddleware(
            this.getUserRegistrationSchema(),
            this.getUserRegistrationSanitizationSchema()
        );
    }

    /**
     * Get supplier validation schema
     * @returns {Object} Validation schema for suppliers
     */
    getSupplierValidationSchema() {
        return {
            name: {
                required: true,
                rules: [
                    { name: 'textLength', options: { min: 1, max: 200 } }
                ]
            },
            supplier_id: {
                required: true,
                rules: [
                    { name: 'textLength', options: { min: 1, max: 50 } }
                ]
            },
            contact_email: {
                required: false,
                rules: [
                    { name: 'email' }
                ]
            },
            email: {
                required: false,
                rules: [
                    { name: 'email' }
                ]
            },
            phone: {
                required: false,
                rules: [
                    { name: 'phone' }
                ]
            },
            website: {
                required: false,
                rules: [
                    { name: 'url', options: { requireProtocol: true } }
                ]
            }
        };
    }

    /**
     * Get supplier sanitization schema
     * @returns {Object} Sanitization schema for suppliers
     */
    getSupplierSanitizationSchema() {
        return {
            name: {
                trim: true,
                xss: true
            },
            category: {
                trim: true,
                xss: true
            },
            contact_person: {
                trim: true,
                xss: true
            },
            contact_email: {
                trim: true,
                normalizeEmail: true
            },
            email: {
                trim: true,
                normalizeEmail: true
            },
            supplier_id: {
                trim: true,
                escape: true
            },
            phone: {
                trim: true
            },
            website: {
                trim: true
            },
            address: {
                trim: true,
                xss: true
            },
            notes: {
                trim: true,
                xss: true
            }
        };
    }

    /**
     * Create supplier validation middleware
     * @returns {Function} Express middleware for supplier validation
     */
    createSupplierValidationMiddleware() {
        return this.createValidationMiddleware(
            this.getSupplierValidationSchema(),
            this.getSupplierSanitizationSchema()
        );
    }

    /**
     * Get product/phone validation schema
     * @returns {Object} Validation schema for products
     */
    getProductValidationSchema() {
        return {
            device_name: {
                required: true,
                rules: [
                    { name: 'textLength', options: { min: 1, max: 200 } }
                ]
            },
            device_maker: {
                required: true,
                rules: [
                    { name: 'textLength', options: { min: 1, max: 100 } }
                ]
            },
            device_price: {
                required: false,
                rules: [
                    { name: 'numeric', options: { min: 0 } }
                ]
            },
            device_inventory: {
                required: false,
                rules: [
                    { name: 'integer', options: { min: 0 } }
                ]
            }
        };
    }

    /**
     * Get product sanitization schema
     * @returns {Object} Sanitization schema for products
     */
    getProductSanitizationSchema() {
        return {
            device_name: {
                trim: true,
                xss: true
            },
            device_maker: {
                trim: true,
                xss: true
            },
            color: {
                trim: true,
                xss: true
            },
            processor: {
                trim: true,
                xss: true
            },
            memory_type: {
                trim: true,
                xss: true
            },
            ram: {
                trim: true,
                xss: true
            },
            storage_type: {
                trim: true,
                xss: true
            },
            storage_capacity: {
                trim: true,
                xss: true
            }
        };
    }

    /**
     * Create product validation middleware
     * @returns {Function} Express middleware for product validation
     */
    createProductValidationMiddleware() {
        return this.createValidationMiddleware(
            this.getProductValidationSchema(),
            this.getProductSanitizationSchema()
        );
    }

    /**
     * Get transaction validation schema
     * @returns {Object} Validation schema for transactions
     */
    getTransactionValidationSchema() {
        return {
            product_id: {
                required: true,
                rules: [
                    { name: 'integer', options: { min: 1 } }
                ]
            },
            quantity: {
                required: true,
                rules: [
                    { name: 'integer', options: { min: 1, max: 10000 } }
                ]
            },
            unit_cost: {
                required: false,
                rules: [
                    { name: 'numeric', options: { min: 0 } }
                ]
            },
            vat_rate: {
                required: false,
                rules: [
                    { name: 'numeric', options: { min: 0, max: 100 } }
                ]
            },
            tax_rate: {
                required: false,
                rules: [
                    { name: 'numeric', options: { min: 0, max: 100 } }
                ]
            },
            customer_email: {
                required: false,
                rules: [
                    { name: 'email' }
                ]
            },
            customer_phone: {
                required: false,
                rules: [
                    { name: 'phone' }
                ]
            }
        };
    }

    /**
     * Get transaction sanitization schema
     * @returns {Object} Sanitization schema for transactions
     */
    getTransactionSanitizationSchema() {
        return {
            customer_name: {
                trim: true,
                xss: true
            },
            customer_email: {
                trim: true,
                normalizeEmail: true
            },
            customer_phone: {
                trim: true
            },
            notes: {
                trim: true,
                xss: true
            }
        };
    }

    /**
     * Create transaction validation middleware
     * @returns {Function} Express middleware for transaction validation
     */
    createTransactionValidationMiddleware() {
        return this.createValidationMiddleware(
            this.getTransactionValidationSchema(),
            this.getTransactionSanitizationSchema()
        );
    }
}

module.exports = UserValidationService;
