/**
 * Authentication Middleware
 * Validates session and populates req.user for RBAC system
 */

const AuthService = require('../services/AuthService');

/**
 * Create authentication middleware
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
function createAuthMiddleware(options = {}) {
    const authService = new AuthService();
    const { excludePaths = [] } = options;

    // Default paths that don't require authentication
    const defaultExcludePaths = [
        '/api/auth/login',
        '/api/auth/logout',
        '/api/health',
        '/favicon.ico'
    ];

    const allExcludePaths = [...defaultExcludePaths, ...excludePaths];

    return async function authMiddleware(req, res, next) {
        // Use originalUrl for consistent path matching regardless of mount point
        const requestPath = req.originalUrl.split('?')[0]; // Remove query string

        // Skip auth for excluded paths
        const shouldExclude = allExcludePaths.some(path => {
            if (path.endsWith('*')) {
                return requestPath.startsWith(path.slice(0, -1));
            }
            return requestPath === path;
        });

        if (shouldExclude) {
            return next();
        }

        // Skip auth for static files
        if (requestPath.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/)) {
            return next();
        }

        // Get session from cookie
        const sessionId = req.cookies?.session_id;

        if (!sessionId) {
            // For API requests, return 401
            if (requestPath.startsWith('/api/')) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }
            // For non-API requests, continue (frontend handles redirect)
            return next();
        }

        try {
            // Validate session and get user (with IP fingerprinting)
            const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
            const user = await authService.validateSession(sessionId, ipAddress);

            if (!user) {
                // Clear invalid cookie
                res.clearCookie('session_id');

                if (requestPath.startsWith('/api/')) {
                    return res.status(401).json({
                        error: 'Unauthorized',
                        message: 'Session expired or invalid'
                    });
                }
                return next();
            }

            // Set user on request for RBAC middleware
            req.user = user;
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            if (requestPath.startsWith('/api/')) {
                return res.status(500).json({
                    error: 'Authentication error',
                    message: 'Failed to validate session'
                });
            }
            next();
        }
    };
}

/**
 * Middleware to require authentication
 * Use after authMiddleware to enforce auth on specific routes
 */
function requireAuth(req, res, next) {
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required. Please log in.'
        });
    }
    next();
}

module.exports = {
    createAuthMiddleware,
    requireAuth
};
