/**
 * RBAC Initialization Script
 * Seeds the database with default roles and permissions for the warehouse management system
 * 
 * Run this script to set up initial RBAC data:
 * node scripts/init-rbac.js
 */

/* eslint-disable no-console */

const mariadb = require('mariadb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Use the centralized database pool
const pool = require('../backend/config/database');

// Import shared permissions definitions
const {
    PERMISSION_DEFINITIONS,
    getEffectivePermissions
} = require('../backend/utils/permissions.js');

const {
    ROLE_DEFINITIONS: DEFAULT_ROLES,
    DEFAULT_USERS
} = require('../backend/utils/role-assignments');

const DEFAULT_PERMISSIONS = PERMISSION_DEFINITIONS;

async function initializeRBAC() {
    let connection;

    try {
        console.log('Connecting to database...');
        // Use pool to get a connection
        connection = await pool.getConnection();
        // Switch to security_db
        await connection.query('USE security_db');
        console.log('Connected to security_db');

        // Start transaction
        await connection.beginTransaction();

        // 1. Insert permissions
        console.log('\n=== Creating Permissions ===');
        const permissionMap = new Map(); // To map permission names to IDs

        for (const permission of DEFAULT_PERMISSIONS) {
            try {
                await connection.execute(
                    `INSERT INTO permissions (name, description, resource, action) 
                     VALUES (?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE 
                        description = VALUES(description),
                        resource = VALUES(resource),
                        action = VALUES(action)`,
                    [permission.name, permission.description, permission.resource, permission.action]
                );

                // Get the permission ID (either inserted or existing)
                const rows = await connection.query(
                    'SELECT id FROM permissions WHERE name = ?',
                    [permission.name]
                );

                permissionMap.set(permission.name, rows[0].id);
                console.log(`✓ ${permission.name} (ID: ${rows[0].id})`);
            } catch (error) {
                console.error(`✗ Error creating permission ${permission.name}:`, error.message);
            }
        }

        // 2. Insert roles and assign permissions
        console.log('\n=== Creating Roles ===');

        for (const role of DEFAULT_ROLES) {
            try {
                // Insert or update role
                await connection.execute(
                    `INSERT INTO roles (name, description) 
                     VALUES (?, ?)
                     ON DUPLICATE KEY UPDATE description = VALUES(description)`,
                    [role.name, role.description]
                );

                // Get the role ID
                const rows = await connection.query(
                    'SELECT id FROM roles WHERE name = ?',
                    [role.name]
                );
                const roleId = rows[0].id;

                console.log(`✓ ${role.name} (ID: ${roleId})`);

                // Clear existing permissions for this role (for clean re-initialization)
                await connection.execute(
                    'DELETE FROM role_permissions WHERE role_id = ?',
                    [roleId]
                );

                // Assign permissions to role
                console.log(`  Assigning ${role.permissions.length} permissions...`);
                for (const permissionName of role.permissions) {
                    const permissionId = permissionMap.get(permissionName);
                    if (permissionId) {
                        await connection.execute(
                            'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
                            [roleId, permissionId]
                        );
                        console.log(`    ✓ ${permissionName}`);
                    } else {
                        console.warn(`    ⚠ Permission not found: ${permissionName}`);
                    }
                }
            } catch (error) {
                console.error(`✗ Error creating role ${role.name}:`, error.message);
            }
        }

        // 3. Create default users
        console.log('\n=== Creating Default Users ===');
        const roleMap = new Map();
        for (const role of DEFAULT_ROLES) {
            const rows = await connection.query('SELECT id FROM roles WHERE name = ?', [role.name]);
            if (rows.length > 0) {
                roleMap.set(role.name, rows[0].id);
            }
        }

        for (const user of DEFAULT_USERS) {
            try {
                // Hash password
                const hashedPassword = await bcrypt.hash(user.password, 10);

                // Insert user
                await connection.execute(
                    `INSERT INTO users (username, password, fullName, email, is_active, role) 
                     VALUES (?, ?, ?, ?, 1, ?)
                     ON DUPLICATE KEY UPDATE 
                        password = VALUES(password),
                        fullName = VALUES(fullName),
                        email = VALUES(email),
                        role = VALUES(role),
                        is_active = 1`,
                    [user.username, hashedPassword, user.fullName, user.email, user.role]
                );

                // Get user ID
                const userRows = await connection.query('SELECT id FROM users WHERE username = ?', [user.username]);
                const userId = userRows[0].id;

                // Assign role to user
                const roleId = roleMap.get(user.role);
                if (roleId) {
                    await connection.execute(
                        `INSERT INTO user_roles (user_id, role_id) 
                         VALUES (?, ?)
                         ON DUPLICATE KEY UPDATE user_id = user_id`,
                        [userId, roleId]
                    );
                }

                console.log(`✓ ${user.username} (${user.role})`);
            } catch (error) {
                console.error(`✗ Error creating user ${user.username}:`, error.message);
            }
        }

        // Commit transaction
        await connection.commit();

        console.log('\n=== Summary ===');
        console.log(`✓ Created ${DEFAULT_PERMISSIONS.length} permissions`);
        console.log(`✓ Created ${DEFAULT_ROLES.length} roles`);
        console.log(`✓ Created ${DEFAULT_USERS.length} default users`);
        console.log('✓ RBAC initialization completed successfully');

        // Display role summary
        console.log('\n=== Role Permissions Summary ===');
        for (const role of DEFAULT_ROLES) {
            const rows = await connection.query(`
                SELECT COUNT(*) as count 
                FROM role_permissions rp
                JOIN roles r ON rp.role_id = r.id
                WHERE r.name = ?
            `, [role.name]);
            console.log(`${role.name}: ${rows[0].count} permissions`);
        }

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('\n✗ Error initializing RBAC:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release(); // Release back to pool
            console.log('\nDatabase connection released');
        }
    }
}

/**
 * Sync permissions from code to database
 * This is a lightweight function that can be called at server startup
 * to ensure all code-defined permissions exist in the database
 * @param {Object} pool - Database connection pool
 */
async function syncPermissions(pool) {
    const RBACService = require('../backend/services/RBACService');
    const rbacService = new RBACService(pool);

    try {
        const permResult = await rbacService.syncPermissionsFromCode();
        console.log(`[RBAC Sync] Permissions: ${permResult.created} created, ${permResult.updated} updated`);

        const roleResult = await rbacService.syncRolesFromCode();
        console.log(`[RBAC Sync] Roles: ${roleResult.created} created, ${roleResult.updated} updated`);

        return { permissions: permResult, roles: roleResult };
    } catch (error) {
        console.error('[RBAC Sync] Error syncing permissions:', error.message);
        throw error;
    }
}

// Run the initialization
if (require.main === module) {
    initializeRBAC()
        .then(async () => {
            console.log('\n✓ Script completed successfully');
            await pool.end(); // Close the pool when script is done
            process.exit(0);
        })
        .catch(async (error) => {
            console.error('\n✗ Script failed:', error);
            await pool.end();
            process.exit(1);
        });
}

module.exports = {
    initializeRBAC,
    syncPermissions,
    ...require('../shared/permissions.cjs')
};
