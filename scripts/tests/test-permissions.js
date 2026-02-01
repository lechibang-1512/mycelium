#!/usr/bin/env node
/**
 * Test Permissions Integration
 * 
 * Tests the permission hierarchy integration with:
 * - 1 Device (product)
 * - 1 Warehouse
 * - 2 Zones
 * 
 * Run: node scripts/tests/test-permissions.js
 * Requires: Server running at localhost:3000
 */

/* eslint-disable no-console */

const mariadb = require('mariadb');
require('dotenv').config();

// Import permission utilities
const {
    PERMISSIONS,
    ROLES,
    PERMISSION_DEFINITIONS,
    ROLE_DEFINITIONS,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getEffectivePermissions,
    PERMISSION_HIERARCHY
} = require('../../backend/utils/permissions');

const RBACService = require('../../backend/services/RBACService');

// Test colors
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

const pass = (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`);
const fail = (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`);
const info = (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`);
const header = (msg) => console.log(`\n${colors.yellow}=== ${msg} ===${colors.reset}`);

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'master_db',
    bigIntAsNumber: true
};

async function runTests() {
    let pool;
    let testUserId;
    let testRoleId;
    let testWarehouseId;
    let testZone1Id;
    let testZone2Id;
    let testProductId;
    let passed = 0;
    let failed = 0;

    try {
        header('Permission Hierarchy Tests');
        info('Testing code-defined permission hierarchy...\n');

        // ================================
        // Unit Tests (No DB Required)
        // ================================
        header('Unit Tests: Permission Hierarchy');

        // Test 1: Direct permission match
        {
            const userPerms = [PERMISSIONS.INVENTORY_READ];
            const result = hasPermission(userPerms, PERMISSIONS.INVENTORY_READ);
            if (result) {
                pass('Direct permission match works');
                passed++;
            } else {
                fail('Direct permission match failed');
                failed++;
            }
        }

        // Test 2: Manage implies read
        {
            const userPerms = [PERMISSIONS.INVENTORY_MANAGE];
            const result = hasPermission(userPerms, PERMISSIONS.INVENTORY_READ);
            if (result) {
                pass('MANAGE implies READ');
                passed++;
            } else {
                fail('MANAGE should imply READ');
                failed++;
            }
        }

        // Test 3: Manage implies write
        {
            const userPerms = [PERMISSIONS.INVENTORY_MANAGE];
            const result = hasPermission(userPerms, PERMISSIONS.INVENTORY_WRITE);
            if (result) {
                pass('MANAGE implies WRITE');
                passed++;
            } else {
                fail('MANAGE should imply WRITE');
                failed++;
            }
        }

        // Test 4: Manage implies delete
        {
            const userPerms = [PERMISSIONS.INVENTORY_MANAGE];
            const result = hasPermission(userPerms, PERMISSIONS.INVENTORY_DELETE);
            if (result) {
                pass('MANAGE implies DELETE');
                passed++;
            } else {
                fail('MANAGE should imply DELETE');
                failed++;
            }
        }

        // Test 5: Write implies read
        {
            const userPerms = [PERMISSIONS.WAREHOUSE_WRITE];
            const result = hasPermission(userPerms, PERMISSIONS.WAREHOUSE_READ);
            if (result) {
                pass('WRITE implies READ');
                passed++;
            } else {
                fail('WRITE should imply READ');
                failed++;
            }
        }

        // Test 6: System admin has all permissions
        {
            const userPerms = [PERMISSIONS.SYSTEM_ADMIN];
            const result = hasPermission(userPerms, PERMISSIONS.INVENTORY_MANAGE);
            if (result) {
                pass('SYSTEM_ADMIN has all permissions');
                passed++;
            } else {
                fail('SYSTEM_ADMIN should have all permissions');
                failed++;
            }
        }

        // Test 7: Different resource permissions don't affect each other
        {
            const userPerms = [PERMISSIONS.INVENTORY_MANAGE];
            const result = hasPermission(userPerms, PERMISSIONS.WAREHOUSE_READ);
            if (!result) {
                pass('Cross-resource permissions are isolated');
                passed++;
            } else {
                fail('inventory.manage should NOT grant warehouse.read');
                failed++;
            }
        }

        // Test 8: Get effective permissions
        {
            const userPerms = [PERMISSIONS.INVENTORY_MANAGE];
            const effective = getEffectivePermissions(userPerms);
            const hasAll = effective.includes('inventory.read') &&
                effective.includes('inventory.write') &&
                effective.includes('inventory.delete');
            if (hasAll) {
                pass(`Effective permissions expand correctly (${effective.length} permissions)`);
                passed++;
            } else {
                fail('Effective permissions should include all implied permissions');
                failed++;
            }
        }

        // Test 9: hasAnyPermission
        {
            const userPerms = [PERMISSIONS.INVENTORY_READ];
            const result = hasAnyPermission(userPerms, [PERMISSIONS.INVENTORY_READ, PERMISSIONS.WAREHOUSE_READ]);
            if (result) {
                pass('hasAnyPermission works correctly');
                passed++;
            } else {
                fail('hasAnyPermission should return true when user has at least one');
                failed++;
            }
        }

        // Test 10: hasAllPermissions
        {
            const userPerms = [PERMISSIONS.INVENTORY_MANAGE, PERMISSIONS.WAREHOUSE_MANAGE];
            const result = hasAllPermissions(userPerms, [PERMISSIONS.INVENTORY_READ, PERMISSIONS.WAREHOUSE_READ]);
            if (result) {
                pass('hasAllPermissions works with hierarchy');
                passed++;
            } else {
                fail('hasAllPermissions should work with permission hierarchy');
                failed++;
            }
        }

        // ================================
        // Integration Tests (DB Required)
        // ================================
        header('Integration Tests: DB + 1 Device, 1 Warehouse, 2 Zones');
        info('Connecting to database...');

        pool = mariadb.createPool(dbConfig);
        const rbacService = new RBACService(pool);

        // Create test data
        info('Creating test data...');

        let conn = await pool.getConnection();
        try {
            // Create test warehouse
            testWarehouseId = require('crypto').randomUUID();
            await conn.query(`
                INSERT INTO warehouses (warehouse_id, name, location, is_active)
                VALUES (?, 'Test Permission Warehouse', 'Test Location', 1)
            `, [testWarehouseId]);
            pass(`Created warehouse (ID: ${testWarehouseId})`);
            passed++;

            // Create 2 zones
            const zone1Result = await conn.query(`
                INSERT INTO warehouse_zones (warehouse_id, name, zone_type, is_active)
                VALUES (?, 'Zone A', 'storage', 1)
            `, [testWarehouseId]);
            testZone1Id = Number(zone1Result.insertId);

            const zone2Result = await conn.query(`
                INSERT INTO warehouse_zones (warehouse_id, name, zone_type, is_active)
                VALUES (?, 'Zone B', 'storage', 1)
            `, [testWarehouseId]);
            testZone2Id = Number(zone2Result.insertId);
            pass(`Created 2 zones (IDs: ${testZone1Id}, ${testZone2Id})`);
            passed++;

            // Create test device/product
            testProductId = require('crypto').randomUUID();
            await conn.query(`
                INSERT INTO specs_db (product_id, device_name, device_maker, device_price)
                VALUES (?, 'Test Permission Device', 'Test Maker', 499.99)
            `, [testProductId]);
            pass(`Created device (ID: ${testProductId})`);
            passed++;

            // Create test role with only manage permission
            const roleResult = await conn.query(`
                INSERT INTO security_db.roles (name, description)
                VALUES ('test_perm_role', 'Test role with inventory.manage only')
            `);
            testRoleId = Number(roleResult.insertId);

            // Get inventory.manage permission ID
            const permRows = await conn.query(`
                SELECT id FROM security_db.permissions WHERE name = 'inventory.manage'
            `);
            if (permRows.length > 0) {
                await conn.query(`
                    INSERT INTO security_db.role_permissions (role_id, permission_id)
                    VALUES (?, ?)
                `, [testRoleId, permRows[0].id]);
            }
            pass(`Created test role with inventory.manage (ID: ${testRoleId})`);
            passed++;

            // Create test user
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('testpass123', 10);
            const userResult = await conn.query(`
                INSERT INTO security_db.users (username, password, fullName, email, is_active, role)
                VALUES ('test_perm_user', ?, 'Test Permission User', 'testperm@test.com', 1, 'test_perm_role')
            `, [hashedPassword]);
            testUserId = Number(userResult.insertId);

            // Assign role to user
            await conn.query(`
                INSERT INTO security_db.user_roles (user_id, role_id)
                VALUES (?, ?)
            `, [testUserId, testRoleId]);
            pass(`Created test user and assigned role (ID: ${testUserId})`);
            passed++;

        } finally {
            conn.release();
        }

        // Test RBACService hierarchy-aware permission checking
        header('Testing RBACService Hierarchy-Aware Checking');

        // Test: User with inventory.manage should have inventory.read via hierarchy
        {
            const hasRead = await rbacService.userHasPermission(testUserId, 'inventory.read');
            if (hasRead) {
                pass('RBACService: inventory.manage grants inventory.read');
                passed++;
            } else {
                fail('RBACService: inventory.manage should grant inventory.read');
                failed++;
            }
        }

        // Test: User with inventory.manage should have inventory.write via hierarchy
        {
            const hasWrite = await rbacService.userHasPermission(testUserId, 'inventory.write');
            if (hasWrite) {
                pass('RBACService: inventory.manage grants inventory.write');
                passed++;
            } else {
                fail('RBACService: inventory.manage should grant inventory.write');
                failed++;
            }
        }

        // Test: User with inventory.manage should have inventory.delete via hierarchy
        {
            const hasDelete = await rbacService.userHasPermission(testUserId, 'inventory.delete');
            if (hasDelete) {
                pass('RBACService: inventory.manage grants inventory.delete');
                passed++;
            } else {
                fail('RBACService: inventory.manage should grant inventory.delete');
                failed++;
            }
        }

        // Test: User should NOT have warehouse.read (different resource)
        {
            const hasWarehouse = await rbacService.userHasPermission(testUserId, 'warehouse.read');
            if (!hasWarehouse) {
                pass('RBACService: inventory.manage does NOT grant warehouse.read');
                passed++;
            } else {
                fail('RBACService: inventory.manage should NOT grant warehouse.read');
                failed++;
            }
        }

        // Test userHasAnyPermission
        {
            const hasAny = await rbacService.userHasAnyPermission(testUserId, ['inventory.read', 'warehouse.read']);
            if (hasAny) {
                pass('RBACService: userHasAnyPermission works with hierarchy');
                passed++;
            } else {
                fail('RBACService: userHasAnyPermission should find inventory.read via hierarchy');
                failed++;
            }
        }

        // Cleanup
        header('Cleanup');
        conn = await pool.getConnection();
        try {
            await conn.query('DELETE FROM security_db.user_roles WHERE user_id = ?', [testUserId]);
            await conn.query('DELETE FROM security_db.users WHERE id = ?', [testUserId]);
            await conn.query('DELETE FROM security_db.role_permissions WHERE role_id = ?', [testRoleId]);
            await conn.query('DELETE FROM security_db.roles WHERE id = ?', [testRoleId]);
            await conn.query('DELETE FROM specs_db WHERE product_id = ?', [testProductId]);
            await conn.query('DELETE FROM warehouse_zones WHERE zone_id IN (?, ?)', [testZone1Id, testZone2Id]);
            await conn.query('DELETE FROM warehouses WHERE warehouse_id = ?', [testWarehouseId]);
            pass('Cleaned up test data');
        } finally {
            conn.release();
        }

    } catch (error) {
        fail(`Test error: ${error.message}`);
        console.error(error.stack);
        failed++;
    } finally {
        if (pool) {
            await pool.end();
        }
    }

    // Summary
    header('Test Results');
    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
    console.log(`Total: ${passed + failed}`);

    process.exit(failed > 0 ? 1 : 0);
}

runTests();
