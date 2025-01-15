/**
 * RBAC Middleware
 * Route-level guards for role and permission checks.
 * Requires authMiddleware to have already populated req.user with roles/permissions.
 */

/**
 * Middleware factory: require at least one of the specified roles.
 * Usage: router.get('/admin', requireRole('admin'), handler)
 *        router.get('/manage', requireRole('admin', 'manager'), handler)
 *
 * @param  {...string} roleNames - One or more role names
 * @returns {Function} Express middleware
 */
function requireRole(...roleNames) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        const userRoles = req.user.roles || [];
        const hasRole = roleNames.some(role => userRoles.includes(role));

        if (!hasRole) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient role privileges'
            });
        }

        next();
    };
}

/**
 * Middleware factory: require at least one of the specified permissions.
 * Usage: router.get('/items', requirePermission('inventory:read'), handler)
 *        router.post('/items', requirePermission('inventory:write'), handler)
 *
 * @param  {...string} permissionNames - One or more permission names
 * @returns {Function} Express middleware
 */
function requirePermission(...permissionNames) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        const userPermissions = req.user.permissions || [];
        const hasPermission = permissionNames.some(perm => userPermissions.includes(perm));

        if (!hasPermission) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions'
            });
        }

        next();
    };
}

module.exports = {
    requireRole,
    requirePermission
};
