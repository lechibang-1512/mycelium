/**
 * Enhanced Session Middleware with Dynamic Secret Support
 * 
 * Provides middleware for Express.js that supports dynamic session secrets,
 * graceful secret rotation, and enhanced session security.
 */

const session = require('express-session');

class DynamicSessionMiddleware {
    constructor(dynamicSecretService, options = {}) {
        this.secretService = dynamicSecretService;
        this.sessionStore = options.store || null;
        this.defaultOptions = {
            resave: false,
            saveUninitialized: false,
            cookie: {
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production' || process.env.FORCE_HTTPS === 'true', // Force HTTPS in production or when explicitly set
                sameSite: 'strict'
            },
            // Merge any additional options
            ...options,
            // Ensure cookie security is not overridden unless explicitly set
            cookie: {
                maxAge: 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production' || process.env.FORCE_HTTPS === 'true',
                sameSite: 'strict',
                ...(options.cookie || {})
            }
        };
        
        this.currentMiddleware = null;
        this.initializeMiddleware();
        
        // Listen for secret rotation events
        process.on('sessionSecretRotated', () => {
            this.handleSecretRotation();
        });
    }

    /**
     * Initialize the session middleware with current secret
     */
    initializeMiddleware() {
        const currentSecret = this.secretService.getCurrentSecret();
        
        this.currentMiddleware = session({
            ...this.defaultOptions,
            secret: currentSecret,
            store: this.sessionStore
        });
        
        console.log('🔐 Session middleware initialized with current secret');
    }

    /**
     * Handle secret rotation - recreate middleware with new secret
     */
    handleSecretRotation() {
        console.log('🔄 Updating session middleware for secret rotation...');
        
        // Create new middleware with updated secret
        this.initializeMiddleware();
        
        console.log('✅ Session middleware updated for new secret');
    }

    /**
     * Enhanced middleware that supports multiple valid secrets during rotation
     */
    getMiddleware() {
        return (req, res, next) => {
            // Use current middleware
            this.currentMiddleware(req, res, (err) => {
                if (err) {
                    // If session fails with current secret, try with historical secrets
                    this.tryHistoricalSecrets(req, res, next, err);
                } else {
                    next();
                }
            });
        };
    }

    /**
     * Try to validate session with historical secrets during rotation period
     */
    tryHistoricalSecrets(req, res, next, originalError) {
        const validSecrets = this.secretService.getValidSecrets();
        const currentSecret = this.secretService.getCurrentSecret();
        
        // Try each valid secret
        let secretIndex = 0;
        
        const tryNextSecret = () => {
            if (secretIndex >= validSecrets.length) {
                // All secrets failed, pass original error
                return next(originalError);
            }
            
            const secretToTry = validSecrets[secretIndex];
            secretIndex++;
            
            // Skip current secret (already tried)
            if (secretToTry === currentSecret) {
                return tryNextSecret();
            }
            
            // Create temporary middleware with historical secret
            const tempMiddleware = session({
                ...this.defaultOptions,
                secret: secretToTry,
                store: this.sessionStore
            });
            
            tempMiddleware(req, res, (err) => {
                if (err) {
                    // Try next secret
                    tryNextSecret();
                } else {
                    // Success with historical secret - session is valid
                    console.log('🔑 Session validated with historical secret');
                    
                    // Update session to use current secret for future requests
                    this.migrateSessionToCurrentSecret(req);
                    
                    next();
                }
            });
        };
        
        tryNextSecret();
    }

    /**
     * Migrate session data to use current secret
     */
    migrateSessionToCurrentSecret(req) {
        if (req.session && req.session.user) {
            // Force session save with current secret on next request
            req.session.regenerate((err) => {
                if (!err) {
                    console.log('🔄 Session migrated to current secret');
                }
            });
        }
    }

    /**
     * Force refresh middleware with current secret
     */
    refreshMiddleware() {
        this.initializeMiddleware();
        console.log('🔄 Session middleware forcefully refreshed');
    }

    /**
     * Get middleware statistics (secure version - no actual secrets exposed)
     */
    getStatistics() {
        return {
            middlewareInitialized: !!this.currentMiddleware,
            currentSecretInUse: this.secretService.getSecureSecretPreview(),
            validSecretsCount: this.secretService.getValidSecrets().length,
            sessionStore: this.sessionStore ? this.sessionStore.constructor.name : 'MemoryStore'
        };
    }
}

/**
 * Factory function to create dynamic session middleware
 */
function createDynamicSessionMiddleware(secretService, options = {}) {
    return new DynamicSessionMiddleware(secretService, options);
}

module.exports = {
    DynamicSessionMiddleware,
    createDynamicSessionMiddleware
};
