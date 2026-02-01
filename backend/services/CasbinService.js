const casbin = require('casbin');
const CasbinAdapter = require('./CasbinAdapter');
const path = require('path');
const { PERMISSIONS, ROLES, getEffectivePermissions } = require('../utils/permissions.js');
const { ROLE_DEFINITIONS } = require('../utils/role-assignments');

let enforcerInstance = null;

class CasbinService {
    /**
     * Initialize Casbin Enforcer
     * @param {Object} pool - Database pool
     */
    static async init(pool) {
        if (!enforcerInstance) {
            console.log('Initializing Casbin Enforcer...');
            const adapter = await CasbinAdapter.newAdapter(pool);
            const modelPath = path.resolve(__dirname, '../config/casbin_model.conf');

            enforcerInstance = await casbin.newEnforcer(modelPath, adapter);
            await enforcerInstance.loadPolicy();
            console.log('Casbin Enforcer initialized');
        }
        return enforcerInstance;
    }

    /**
     * Get the initialized enforcer instance
     * @returns {Object} Casbin Enforcer
     */
    static getEnforcer() {
        if (!enforcerInstance) {
            throw new Error('Casbin Enforcer not initialized');
        }
        return enforcerInstance;
    }

    /**
     * Check permission
     * @param {string} sub - Subject (User ID or Role)
     * @param {string} obj - Object (Resource)
     * @param {string} act - Action
     * @returns {Promise<boolean>}
     */
    static async enforce(sub, obj, act) {
        // Casbin expects strings. Ensure sub is string.
        return await this.getEnforcer().enforce(String(sub), obj, act);
    }

    /**
     * Check if user has role
     * @param {string} user - User ID
     * @param {string} role - Role Name
     */
    static async hasRole(user, role) {
        return await this.getEnforcer().hasRoleForUser(String(user), role);
    }

    /**
     * Add role for user
     * @param {string} user 
     * @param {string} role 
     */
    static async addRoleForUser(user, role) {
        return await this.getEnforcer().addGroupingPolicy(String(user), role);
    }

    /**
     * Remove role for user
     */
    static async deleteRoleForUser(user, role) {
        return await this.getEnforcer().removeGroupingPolicy(String(user), role);
    }

    /**
     * Add permission policy
     * @param {string} sub - Subject (Role)
     * @param {string} obj - Object (Resource)
     * @param {string} act - Action
     */
    static async addPolicy(sub, obj, act) {
        return await this.getEnforcer().addPolicy(sub, obj, act);
    }

    /**
     * Remove permission policy
     * @param {string} sub - Subject (Role)
     * @param {string} obj - Object (Resource)
     * @param {string} act - Action
     */
    static async removePolicy(sub, obj, act) {
        return await this.getEnforcer().removePolicy(sub, obj, act);
    }

    /**
     * Get implicit permissions for a user (includes role permissions)
     */
    static async getImplicitPermissionsForUser(user) {
        return await this.getEnforcer().getImplicitPermissionsForUser(String(user));
    }

    /**
     * Sync legacy policies to Casbin
     * Reads from permissions.js and populates Casbin rules
     * Also migrates existing user roles if needed (custom logic required for DB tables)
     */
    static async syncLegacyPolicies(pool) {
        const e = this.getEnforcer();

        console.log('[Casbin Sync] Starting migration of legacy policies...');

        try {
            // 1. Sync Roles and Permissions (P rules)
            for (const roleDef of ROLE_DEFINITIONS) {
                const roleName = roleDef.name;

                // Remove existing policies for this role to prevent duplication
                // removeFilteredPolicy(fieldIndex, ...fieldValues)
                // Field 0 is v0 which contains the subject (role name)
                await e.removeFilteredPolicy(0, roleName);

                // Expand permissions to include implied ones (e.g. manage -> read, write, delete)
                const effectivePermissions = getEffectivePermissions(roleDef.permissions);

                for (const permString of effectivePermissions) {
                    const [resource, action] = permString.split('.');
                    if (resource && action) {
                        await e.addPolicy(roleName, resource, action);
                    }
                }
                console.log(`[Casbin Sync] Role '${roleName}': Synced ${effectivePermissions.length} permissions`);
            }

            // 2. Sync User-Role assignments (G rules)
            // We clear existing grouping policies before re-syncing from DB
            // WARNING: This assumes the SQL security_db.user_roles is the source of truth for assignments
            await e.removeFilteredGroupingPolicy(1); // remove all grouping policies (v1 is role)

            const rows = await pool.query(`
                SELECT user_id, r.name as role_name 
                FROM security_db.user_roles ur 
                JOIN security_db.roles r ON ur.role_id = r.id
            `);

            for (const row of rows) {
                await e.addGroupingPolicy(String(row.user_id), row.role_name);
            }
            console.log(`[Casbin Sync] Users: Synced ${rows.length} role assignments`);

            await e.savePolicy();
            console.log('[Casbin Sync] Migration complete');
        } catch (err) {
            console.error('[Casbin Sync] Error during migration:', err.message);
            throw err;
        }
    }
}

module.exports = CasbinService;
