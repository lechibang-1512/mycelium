/**
 * Casbin Service
 * Role-Based Access Control using Casbin with MongoDB adapter
 * 
 * This is the single source of truth for permission enforcement.
 * Policies are synced from MongoDB roles collection on startup.
 */

const casbin = require('casbin');
const { MongooseAdapter } = require('casbin-mongoose-adapter');
const path = require('path');
const { ROLE_DEFINITIONS } = require('../utils/role-assignments');
const { getEffectivePermissions, PERMISSION_DEFINITIONS } = require('../utils/permissions');
const Role = require('../models/Role');
const User = require('../models/User');

let enforcerInstance = null;

class CasbinService {
    /**
     * Initialize Casbin Enforcer with MongoDB adapter
     */
    static async init() {
        if (!enforcerInstance) {
            console.log('[Casbin] Initializing with MongoDB adapter...');

            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mycelium';
            if (!mongoUri) {
                throw new Error('MongoDB URI is required');
            }

            // Create MongoDB adapter
            const adapter = await MongooseAdapter.newAdapter(mongoUri);

            // Load model configuration
            const modelPath = path.resolve(__dirname, '../config/casbin_model.conf');

            // Create enforcer
            enforcerInstance = await casbin.newEnforcer(modelPath, adapter);
            await enforcerInstance.loadPolicy();

            console.log('[Casbin] Enforcer initialized');
        }
        return enforcerInstance;
    }

    /**
     * Get the initialized enforcer instance
     * @returns {Object} Casbin Enforcer
     * @throws {Error} If enforcer not initialized
     */
    static getEnforcer() {
        if (!enforcerInstance) {
            throw new Error('Casbin Enforcer not initialized. Call CasbinService.init() first.');
        }
        return enforcerInstance;
    }

    /**
     * Check if user has permission
     * @param {string|number} userId - User ID
     * @param {string} resource - Resource name
     * @param {string} action - Action name
     * @returns {Promise<boolean>}
     */
    static async enforce(userId, resource, action) {
        const e = this.getEnforcer();
        return await e.enforce(String(userId), resource, action);
    }

    /**
     * Check if user has role
     * @param {string|number} userId - User ID
     * @param {string} roleName - Role name
     * @returns {Promise<boolean>}
     */
    static async hasRole(userId, roleName) {
        const e = this.getEnforcer();
        return await e.hasRoleForUser(String(userId), roleName);
    }

    /**
     * Get all roles for a user
     * @param {string|number} userId - User ID
     * @returns {Promise<string[]>}
     */
    static async getRolesForUser(userId) {
        const e = this.getEnforcer();
        return await e.getRolesForUser(String(userId));
    }

    /**
     * Get implicit permissions for a user (includes role permissions)
     * @param {string|number} userId - User ID
     * @returns {Promise<string[][]>} Array of [subject, resource, action] tuples
     */
    static async getImplicitPermissionsForUser(userId) {
        const e = this.getEnforcer();
        return await e.getImplicitPermissionsForUser(String(userId));
    }

    /**
     * Add a policy rule
     * @param {string} subject - Subject (role name)
     * @param {string} resource - Resource
     * @param {string} action - Action
     * @returns {Promise<boolean>}
     */
    static async addPolicy(subject, resource, action) {
        const e = this.getEnforcer();
        const added = await e.addPolicy(subject, resource, action);
        if (added) {
            await e.savePolicy();
        }
        return added;
    }

    /**
     * Remove a policy rule
     * @param {string} subject - Subject (role name)
     * @param {string} resource - Resource
     * @param {string} action - Action
     * @returns {Promise<boolean>}
     */
    static async removePolicy(subject, resource, action) {
        const e = this.getEnforcer();
        const removed = await e.removePolicy(subject, resource, action);
        if (removed) {
            await e.savePolicy();
        }
        return removed;
    }

    /**
     * Add role for user (grouping policy)
     * @param {string|number} userId - User ID
     * @param {string} roleName - Role name
     * @returns {Promise<boolean>}
     */
    static async addRoleForUser(userId, roleName) {
        const e = this.getEnforcer();
        const added = await e.addGroupingPolicy(String(userId), roleName);
        if (added) {
            await e.savePolicy();
        }
        return added;
    }

    /**
     * Remove role from user (grouping policy)
     * @param {string|number} userId - User ID
     * @param {string} roleName - Role name
     * @returns {Promise<boolean>}
     */
    static async deleteRoleForUser(userId, roleName) {
        const e = this.getEnforcer();
        const removed = await e.removeGroupingPolicy(String(userId), roleName);
        if (removed) {
            await e.savePolicy();
        }
        return removed;
    }

    /**
     * Remove all policies for a role
     * @param {string} roleName - Role name
     * @returns {Promise<boolean>}
     */
    static async removeFilteredPoliciesForRole(roleName) {
        const e = this.getEnforcer();
        // RemoveFilteredPolicy(fieldIndex, ...fieldValues)
        // Field 0 is v0 (subject) in policy definition
        const removed = await e.removeFilteredPolicy(0, roleName);
        if (removed) {
            await e.savePolicy();
        }
        return removed;
    }

    /**
     * Sync all role policies for a specific role
     * Call this after updating a role's permissions in MongoDB
     * @param {string} roleName - Role name
     * @param {string[]} permissions - Array of permission strings
     */
    static async syncRolePolicies(roleName, permissions) {
        const e = this.getEnforcer();

        // Remove all existing policies for this role
        await e.removeFilteredPolicy(0, roleName);

        // Add new policies with effective permissions (expanded via hierarchy)
        const effectivePermissions = getEffectivePermissions(permissions);
        for (const permString of effectivePermissions) {
            const [resource, action] = permString.split('.');
            if (resource && action) {
                await e.addPolicy(roleName, resource, action);
            }
        }

        await e.savePolicy();
    }

    /**
     * Get user's roles and permissions for frontend/API
     * Replaces RBACService.getUserPermissions()
     * @param {number} userId - User ID
     * @returns {Promise<{roles: Object[], permissions: Object[]}>}
     */
    static async getUserPermissions(userId) {
        const e = this.getEnforcer();

        // Get roles
        const roleNames = await e.getRolesForUser(String(userId));
        const roles = roleNames.map(name => ({ name }));

        // Get implicit permissions
        const policies = await e.getImplicitPermissionsForUser(String(userId));

        // Convert to permission objects
        const permissionSet = new Set();
        const permissions = [];

        for (const policy of policies) {
            const resource = policy[1];
            const action = policy[2];
            const name = `${resource}.${action}`;

            if (!permissionSet.has(name)) {
                permissionSet.add(name);

                // Find matching definition for metadata
                const def = PERMISSION_DEFINITIONS.find(d => d.name === name);
                permissions.push(def || {
                    name,
                    resource,
                    action,
                    description: ''
                });
            }
        }

        return { roles, permissions };
    }

    /**
     * Sync all policies from MongoDB on startup
     * Reads roles and user-role assignments from MongoDB and populates Casbin
     */
    static async syncFromMongoDB() {
        const e = this.getEnforcer();
        console.log('[Casbin] Syncing policies from MongoDB...');

        try {
            // Clear all existing policies
            await e.clearPolicy();

            // 1. Sync role permissions (p rules)
            const roles = await Role.find().lean();
            let policyCount = 0;

            for (const role of roles) {
                // Expand permissions via hierarchy
                const effectivePermissions = getEffectivePermissions(role.permissions || []);

                for (const permString of effectivePermissions) {
                    const [resource, action] = permString.split('.');
                    if (resource && action) {
                        await e.addPolicy(role.name, resource, action);
                        policyCount++;
                    }
                }
            }
            console.log(`[Casbin] Synced ${policyCount} permission policies from ${roles.length} roles`);

            // 2. Sync user-role assignments (g rules)
            const users = await User.find({ is_active: true }).populate('roles').lean();
            let groupingCount = 0;

            for (const user of users) {
                if (user.roles && user.roles.length > 0) {
                    for (const role of user.roles) {
                        await e.addGroupingPolicy(String(user.user_id), role.name);
                        groupingCount++;
                    }
                }
            }
            console.log(`[Casbin] Synced ${groupingCount} user-role assignments`);

            // Save all policies
            await e.savePolicy();
            console.log('[Casbin] Policies saved to MongoDB');

        } catch (err) {
            console.error('[Casbin] Error syncing from MongoDB:', err.message);
            throw err;
        }
    }
}

module.exports = CasbinService;
