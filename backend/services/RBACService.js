/**
 * RBAC Service
 * Handles role-based access control operations including roles, permissions, and authorization checks
 * 
 * Uses code-defined permission hierarchy from backend/utils/permissions.js as source of truth.
 * MongoDB version - permissions are embedded in roles as string arrays.
 */

const User = require('../models/User');
const Role = require('../models/Role');
const {
    hasPermission: checkPermissionWithHierarchy,
    hasAnyPermission: checkAnyPermissionWithHierarchy,
    hasAllPermissions: checkAllPermissionsWithHierarchy,
    PERMISSION_DEFINITIONS,
    PERMISSIONS
} = require('../utils/permissions');
const { ROLE_DEFINITIONS } = require('../utils/role-assignments');
const CasbinService = require('./CasbinService');

class RBACService {
    constructor(_pool) {
        // Pool parameter kept for backward compatibility but not used
    }

    /**
     * Get all roles with their permissions
     * @returns {Array} List of roles with associated permissions
     */
    async getAllRoles() {
        const roles = await Role.find()
            .sort({ name: 1 })
            .lean();

        // Transform permissions from strings to objects for API compatibility
        return roles.map(role => ({
            id: role.role_id,
            name: role.name,
            description: role.description,
            created_at: role.created_at,
            updated_at: role.updated_at,
            permissions: role.permissions.map(permName => {
                // Find matching permission definition
                const def = PERMISSION_DEFINITIONS.find(p => p.name === permName);
                if (def) {
                    return {
                        id: def.name, // Use name as ID for MongoDB
                        name: def.name,
                        description: def.description,
                        resource: def.resource,
                        action: def.action
                    };
                }
                // Parse permission name if no definition found
                const [resource, action] = permName.split('.');
                return {
                    id: permName,
                    name: permName,
                    description: '',
                    resource: resource || '',
                    action: action || ''
                };
            })
        }));
    }

    /**
     * Get role by ID
     * @param {number} roleId - Role ID (legacy integer ID)
     * @returns {Object|null} Role object with permissions or null if not found
     */
    async getRoleById(roleId) {
        const role = await Role.findOne({ role_id: roleId }).lean();

        if (!role) {
            return null;
        }

        return {
            id: role.role_id,
            name: role.name,
            description: role.description,
            created_at: role.created_at,
            updated_at: role.updated_at,
            permissions: role.permissions.map(permName => {
                const def = PERMISSION_DEFINITIONS.find(p => p.name === permName);
                if (def) {
                    return {
                        id: def.name,
                        name: def.name,
                        description: def.description,
                        resource: def.resource,
                        action: def.action
                    };
                }
                const [resource, action] = permName.split('.');
                return {
                    id: permName,
                    name: permName,
                    description: '',
                    resource: resource || '',
                    action: action || ''
                };
            })
        };
    }

    /**
     * Get all permissions
     * @returns {Array} List of all permissions from code definitions
     */
    async getAllPermissions() {
        // Return permissions from code definitions (source of truth)
        return PERMISSION_DEFINITIONS.map((perm, index) => ({
            id: index + 1, // synthetic ID for API compatibility
            name: perm.name,
            description: perm.description,
            resource: perm.resource,
            action: perm.action,
            created_at: new Date()
        }));
    }

    /**
     * Get user's roles and permissions
     * @param {number} userId - User ID
     * @returns {Object} User's roles and flattened permissions
     */
    async getUserPermissions(userId) {
        const user = await User.findOne({ user_id: userId })
            .populate('roles')
            .lean();

        if (!user) {
            return { roles: [], permissions: [] };
        }

        const roles = (user.roles || []).map(role => ({
            id: role.role_id,
            name: role.name,
            description: role.description
        }));

        // Flatten and deduplicate permissions from all roles
        const permissionSet = new Set();
        for (const role of (user.roles || [])) {
            for (const perm of (role.permissions || [])) {
                permissionSet.add(perm);
            }
        }

        const permissions = Array.from(permissionSet).map(permName => {
            const def = PERMISSION_DEFINITIONS.find(p => p.name === permName);
            if (def) {
                return {
                    id: def.name,
                    name: def.name,
                    description: def.description,
                    resource: def.resource,
                    action: def.action
                };
            }
            const [resource, action] = permName.split('.');
            return {
                id: permName,
                name: permName,
                description: '',
                resource: resource || '',
                action: action || ''
            };
        });

        return { roles, permissions };
    }

    /**
     * Check if user has a specific permission (hierarchy-aware)
     * @param {number} userId - User ID
     * @param {string} permissionName - Permission name (e.g., 'inventory.write')
     * @returns {boolean} True if user has the permission
     */
    async userHasPermission(userId, permissionName) {
        const userPermissions = await this.getUserPermissionNames(userId);
        return checkPermissionWithHierarchy(userPermissions, permissionName);
    }

    /**
     * Get list of permission names for a user
     * @param {number} userId - User ID
     * @returns {Array<string>} List of permission names
     */
    async getUserPermissionNames(userId) {
        const user = await User.findOne({ user_id: userId })
            .populate('roles')
            .lean();

        if (!user) return [];

        const permissionSet = new Set();
        for (const role of (user.roles || [])) {
            for (const perm of (role.permissions || [])) {
                permissionSet.add(perm);
            }
        }

        return Array.from(permissionSet);
    }

    /**
     * Check if user has a specific role
     * @param {number} userId - User ID
     * @param {string} roleName - Role name
     * @returns {boolean} True if user has the role
     */
    async userHasRole(userId, roleName) {
        const user = await User.findOne({ user_id: userId })
            .populate('roles')
            .lean();

        if (!user || !user.roles) return false;

        return user.roles.some(role => role.name === roleName);
    }

    /**
     * Check if user has any of the specified permissions (hierarchy-aware)
     * @param {number} userId - User ID
     * @param {Array<string>} permissionNames - Array of permission names
     * @returns {boolean} True if user has at least one of the permissions
     */
    async userHasAnyPermission(userId, permissionNames) {
        if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
            return false;
        }
        const userPermissions = await this.getUserPermissionNames(userId);
        return checkAnyPermissionWithHierarchy(userPermissions, permissionNames);
    }

    /**
     * Check if user has all of the specified permissions (hierarchy-aware)
     * @param {number} userId - User ID
     * @param {Array<string>} permissionNames - Array of permission names
     * @returns {boolean} True if user has all permissions
     */
    async userHasAllPermissions(userId, permissionNames) {
        if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
            return false;
        }
        const userPermissions = await this.getUserPermissionNames(userId);
        return checkAllPermissionsWithHierarchy(userPermissions, permissionNames);
    }

    /**
     * Create a new role
     * @param {Object} roleData - Role data {name, description}
     * @returns {Object} Created role
     */
    async createRole(roleData) {
        const { name, description } = roleData;

        const role = await Role.create({
            name,
            description,
            permissions: []
        });

        return {
            id: role.role_id,
            name: role.name,
            description: role.description
        };
    }

    /**
     * Update a role
     * @param {number} roleId - Role ID
     * @param {Object} roleData - Role data {name, description}
     * @returns {Object} Updated role
     */
    async updateRole(roleId, roleData) {
        const { name, description } = roleData;

        await Role.updateOne(
            { role_id: roleId },
            { $set: { name, description } }
        );

        return await this.getRoleById(roleId);
    }

    /**
     * Delete a role
     * @param {number} roleId - Role ID
     * @returns {boolean} True if deleted
     */
    async deleteRole(roleId) {
        const role = await Role.findOne({ role_id: roleId });

        if (role) {
            // Remove role reference from all users
            await User.updateMany(
                { roles: role._id },
                { $pull: { roles: role._id } }
            );
            await role.deleteOne();
        }

        return true;
    }

    /**
     * Create a new permission (no-op for MongoDB - permissions defined in code)
     * @param {Object} permissionData - Permission data
     * @returns {Object} Permission object
     */
    async createPermission(permissionData) {
        // Permissions are defined in code, not database
        return {
            id: permissionData.name,
            name: permissionData.name,
            description: permissionData.description,
            resource: permissionData.resource,
            action: permissionData.action
        };
    }

    /**
     * Assign permission to role
     * @param {number} roleId - Role ID
     * @param {number|string} permissionId - Permission ID or name
     * @returns {boolean} True if assigned
     */
    async assignPermissionToRole(roleId, permissionId) {
        // Find permission name (either from ID lookup or direct string)
        let permName = permissionId;
        if (typeof permissionId === 'number') {
            const perm = PERMISSION_DEFINITIONS[permissionId - 1];
            permName = perm?.name || permissionId;
        }

        const role = await Role.findOne({ role_id: roleId });
        if (!role) return false;

        // Add permission if not already present
        if (!role.permissions.includes(permName)) {
            role.permissions.push(permName);
            await role.save();
        }

        // Sync to Casbin
        try {
            const [resource, action] = permName.split('.');
            await CasbinService.addPolicy(role.name, resource, action);
        } catch (err) {
            console.error('Failed to sync permission assignment to Casbin:', err);
        }

        return true;
    }

    /**
     * Remove permission from role
     * @param {number} roleId - Role ID
     * @param {number|string} permissionId - Permission ID or name
     * @returns {boolean} True if removed
     */
    async removePermissionFromRole(roleId, permissionId) {
        let permName = permissionId;
        if (typeof permissionId === 'number') {
            const perm = PERMISSION_DEFINITIONS[permissionId - 1];
            permName = perm?.name || permissionId;
        }

        await Role.updateOne(
            { role_id: roleId },
            { $pull: { permissions: permName } }
        );

        // Sync to Casbin
        try {
            const role = await Role.findOne({ role_id: roleId }).lean();
            if (role) {
                const [resource, action] = permName.split('.');
                await CasbinService.removePolicy(role.name, resource, action);
            }
        } catch (err) {
            console.error('Failed to sync permission removal to Casbin:', err);
        }

        return true;
    }

    /**
     * Assign role to user
     * @param {number} userId - User ID
     * @param {number} roleId - Role ID
     * @param {number} assignedBy - ID of admin who assigned the role
     * @returns {boolean} True if assigned
     */
    async assignRoleToUser(userId, roleId, _assignedBy = null) {
        const role = await Role.findOne({ role_id: roleId });
        if (!role) return false;

        await User.updateOne(
            { user_id: userId },
            { $addToSet: { roles: role._id } }
        );

        // Sync to Casbin
        try {
            await CasbinService.addRoleForUser(userId, role.name);
        } catch (err) {
            console.error('Failed to sync user role assignment to Casbin:', err);
        }

        return true;
    }

    /**
     * Remove role from user
     * @param {number} userId - User ID
     * @param {number} roleId - Role ID
     * @returns {boolean} True if removed
     */
    async removeRoleFromUser(userId, roleId) {
        const role = await Role.findOne({ role_id: roleId });
        if (!role) return false;

        await User.updateOne(
            { user_id: userId },
            { $pull: { roles: role._id } }
        );

        // Sync to Casbin
        try {
            await CasbinService.deleteRoleForUser(userId, role.name);
        } catch (err) {
            console.error('Failed to sync user role removal to Casbin:', err);
        }

        return true;
    }

    /**
     * Get users by role
     * @param {number} roleId - Role ID
     * @returns {Array} List of users with this role
     */
    async getUsersByRole(roleId) {
        const role = await Role.findOne({ role_id: roleId });
        if (!role) return [];

        const users = await User.find({ roles: role._id })
            .select('-password')
            .sort({ username: 1 })
            .lean();

        return users.map(u => ({
            id: u.user_id,
            username: u.username,
            email: u.email,
            fullName: u.fullName,
            assigned_at: u.updated_at, // Approximate - MongoDB doesn't track array element add dates
            assigned_by: null
        }));
    }

    /**
     * Sync permissions from code definitions to database (no-op for MongoDB)
     * Permissions are stored as strings in roles, definitions come from code
     * @returns {Object} { created: number, updated: number }
     */
    async syncPermissionsFromCode() {
        // No-op: MongoDB stores permission strings, not separate documents
        return { created: 0, updated: PERMISSION_DEFINITIONS.length };
    }

    /**
     * Sync roles from code definitions to database
     * @returns {Object} { created: number, updated: number }
     */
    async syncRolesFromCode() {
        let created = 0;
        let updated = 0;

        for (const roleDef of ROLE_DEFINITIONS) {
            const existing = await Role.findOne({ name: roleDef.name });

            if (!existing) {
                await Role.create({
                    name: roleDef.name,
                    description: roleDef.description,
                    permissions: roleDef.permissions || []
                });
                created++;
            } else {
                existing.description = roleDef.description;
                existing.permissions = roleDef.permissions || [];
                await existing.save();
                updated++;
            }
        }

        return { created, updated };
    }
}

module.exports = RBACService;
