/**
 * RBAC Middleware
 * Role-Based Access Control middleware functions using Casbin
 * 
 * IMPORTANT: These middleware assume that authentication has already occurred
 * and that req.user is populated with at least { id } property
 */

const CasbinService = require('../services/CasbinService');

// Import shared permissions constants
const {
    PERMISSIONS,
    ROLES,
    PERMISSION_DEFINITIONS,
    PERMISSION_GROUPS
} = require('../utils/permissions.js');
const { ROLE_DEFINITIONS } = require('../utils/role-assignments');

/**
 * Middleware to check if user has a specific permission
 * @param {string} permissionName - Permission name (e.g., 'inventory.write')
 * @returns {Function} Express middleware function
 */
function requirePermission(permissionName) {
    return async (req, res, next) => {
        try {
            // Check if user is authenticated
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required. Please ensure req.user is set by authentication middleware.'
                });
            }

            // Parse permission string into resource and action
            // permissionName format: "resource.action" (e.g. "inventory.read")
            const [resource, action] = permissionName.split('.');

            if (!resource || !action) {
                console.error(`Invalid permission format: ${permissionName}`);
                return res.status(500).json({
                    error: 'Internal Server Error',
                    message: 'Invalid permission configuration'
                });
            }

            // Casbin check
            const hasPermission = await CasbinService.enforce(req.user.id, resource, action);

            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: `You do not have the required permission: ${permissionName}`,
                    required_permission: permissionName
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Error checking permissions'
            });
        }
    };
}

/**
 * Middleware to check if user has ANY of the specified permissions
 * @param {Array<string>} permissionNames - Array of permission names
 * @returns {Function} Express middleware function
 */
function requireAnyPermission(permissionNames) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required.'
                });
            }

            let hasAny = false;
            for (const perm of permissionNames) {
                const [resource, action] = perm.split('.');
                if (resource && action) {
                    if (await CasbinService.enforce(req.user.id, resource, action)) {
                        hasAny = true;
                        break;
                    }
                }
            }

            if (!hasAny) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: `You do not have any of the required permissions: ${permissionNames.join(', ')}`,
                    required_permissions: permissionNames
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Error checking permissions'
            });
        }
    };
}

/**
 * Middleware to check if user has ALL of the specified permissions
 * @param {Array<string>} permissionNames - Array of permission names
 * @returns {Function} Express middleware function
 */
function requireAllPermissions(permissionNames) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required.'
                });
            }

            for (const perm of permissionNames) {
                const [resource, action] = perm.split('.');
                if (resource && action) {
                    const allowed = await CasbinService.enforce(req.user.id, resource, action);
                    if (!allowed) {
                        return res.status(403).json({
                            error: 'Forbidden',
                            message: `You must have all of the following permissions: ${permissionNames.join(', ')}`,
                            required_permissions: permissionNames
                        });
                    }
                }
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Error checking permissions'
            });
        }
    };
}

/**
 * Middleware to check if user has a specific role
 * @param {string} roleName - Role name
 * @returns {Function} Express middleware function
 */
function requireRole(roleName) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required.'
                });
            }

            const hasRole = await CasbinService.hasRole(req.user.id, roleName);

            if (!hasRole) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: `You do not have the required role: ${roleName}`,
                    required_role: roleName
                });
            }

            next();
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Error checking role'
            });
        }
    };
}

/**
 * Middleware to attach user's permissions to req.permissions for use in handlers
 */
async function attachUserPermissions(req, res, next) {
    try {
        if (!req.user || !req.user.id) {
            req.permissions = { roles: [], permissions: [] };
            return next();
        }

        // Get permissions from Casbin
        // getImplicitPermissionsForUser returns [][]string, e.g. [['john', 'data', 'read'], ...]
        const policies = await CasbinService.getImplicitPermissionsForUser(req.user.id);

        // Convert to array of { name: 'resource.action', ... }
        // We match them back to PERMISSION_DEFINITIONS if possible to get description
        const permissionsList = policies.map(p => {
            const resource = p[1];
            const action = p[2];
            const name = `${resource}.${action}`;

            // Find definition for extra metadata
            const def = PERMISSION_DEFINITIONS.find(d => d.name === name);
            if (def) return def;

            return { name, resource, action, description: 'Dynamic Permission' };
        });

        // Get roles
        // We can get implicit roles via getImplicitRolesForUser(name, domain) but simple way:
        // We know we use g for roles
        const e = CasbinService.getEnforcer();
        const roles = await e.getRolesForUser(String(req.user.id));

        const rolesList = roles.map(r => {
            const def = ROLE_DEFINITIONS.find(d => d.name === r);
            return def || { name: r, description: 'Dynamic Role' };
        });

        req.permissions = {
            roles: rolesList,
            permissions: permissionsList
        };

        next();
    } catch (error) {
        console.error('Error attaching permissions:', error);
        req.permissions = { roles: [], permissions: [] };
        next();
    }
}

/**
 * Helper function to manually check permission
 */
async function checkPermission(req, permissionName) {
    try {
        if (!req.user || !req.user.id) {
            return false;
        }

        const [resource, action] = permissionName.split('.');
        if (!resource || !action) return false;

        return await CasbinService.enforce(req.user.id, resource, action);
    } catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
}

/**
 * Helper function to manually check role
 */
async function checkRole(req, roleName) {
    try {
        if (!req.user || !req.user.id) {
            return false;
        }
        return await CasbinService.hasRole(req.user.id, roleName);
    } catch (error) {
        console.error('Error checking role:', error);
        return false;
    }
}

module.exports = {
    requirePermission,
    requireRole,

    // Permission constants (re-exported from shared module)
    PERMISSIONS,
    ROLES,
    PERMISSION_DEFINITIONS,
    ROLE_DEFINITIONS,
    PERMISSION_GROUPS
};
