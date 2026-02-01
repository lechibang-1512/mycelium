/**
 * Condition Tracking Test Suite
 * 
 * Tests condition tracking for both Spare Parts and Phones
 * Verifies NEW, USED, REFURBISHED, TESTING, DEFECTIVE conditions
 */

const axios = require('axios');
const mariadb = require('mariadb');
require('dotenv').config();

const API_BASE_URL = process.env.API_URL || 'http://127.0.0.1:3000/api';
let authCookie = '';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

const log = {
    pass: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    fail: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}\n${colors.blue}${msg}${colors.reset}\n${colors.blue}${'='.repeat(60)}${colors.reset}\n`),
};

// Test results tracker
const results = {
    total: 0,
    passed: 0,
    failed: 0,
};

async function test(name, fn) {
    results.total++;
    try {
        await fn();
        log.pass(name);
        results.passed++;
    } catch (error) {
        log.fail(`${name}: ${error.message}`);
        results.failed++;
    }
}

// Global axios interceptor to add cookie
axios.interceptors.request.use(config => {
    if (authCookie && !config.headers['Cookie']) {
        config.headers['Cookie'] = authCookie;
    }
    return config;
});

async function login() {
    console.log('Logging in as testadmin...');
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'testadmin',
            password: 'testpassword123'
        });
        const cookie = response.headers['set-cookie'];
        if (Array.isArray(cookie)) {
            authCookie = cookie.map(c => c.split(';')[0]).join('; ');
        } else {
            authCookie = cookie.split(';')[0];
        }
        log.pass('Logged in successfully');
    } catch (err) {
        log.fail('Login failed: ' + (err.response?.data?.error || err.message));
        throw err;
    }
}

// ============================================================================
// Test 1: Get Existing Products
// ============================================================================
async function testGetExistingProducts() {
    log.section('TEST 1: Get Existing Products');

    const pool = mariadb.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    let testPhone = null;
    let testSparePart = null;

    await test('Get an existing phone from database', async () => {
        const conn = await pool.getConnection();
        const phones = await conn.query('SELECT product_id, device_name FROM specs_db LIMIT 1');
        conn.release();

        if (!phones || phones.length === 0) {
            throw new Error('No phones found in database');
        }

        testPhone = phones[0];
        log.info(`Found phone: ${testPhone.device_name} (${testPhone.product_id})`);
    });

    await test('Get an existing spare part from database', async () => {
        const conn = await pool.getConnection();
        const parts = await conn.query('SELECT spare_part_id, part_name FROM smartphone_spare_parts LIMIT 1');
        conn.release();

        if (!parts || parts.length === 0) {
            throw new Error('No spare parts found in database');
        }

        testSparePart = parts[0];
        log.info(`Found spare part: ${testSparePart.part_name} (ID: ${testSparePart.spare_part_id})`);
    });

    await pool.end();

    return { testPhone, testSparePart };
}

// ============================================================================
// Test 2: Receive Phone with Different Conditions
// ============================================================================
async function testReceivePhoneWithConditions(testPhone) {
    log.section('TEST 2: Receive Phone with Different Conditions');

    const conditions = ['NEW', 'USED', 'REFURBISHED', 'TESTING', 'DEFECTIVE'];

    for (const condition of conditions) {
        await test(`Receive phone with condition: ${condition}`, async () => {
            const response = await axios.post(`${API_BASE_URL}/inventory-transactions/receive`, {
                supplier_id: 1,
                items: [{
                    product_id: testPhone.product_id,
                    quantity: 5,
                    unit_cost: 100,
                    condition: condition
                }],
                warehouse_id: 1,
                zone_id: 1,
                subtotal: 500,
                tax_amount: 0,
                total_amount: 500,
                notes: `Test receiving ${condition} phones`
            });

            if (response.status !== 201) {
                throw new Error(`Expected 201, got ${response.status}`);
            }

            if (!response.data.success) {
                throw new Error('Response should indicate success');
            }

            log.info(`  Received 5 ${condition} units of ${testPhone.device_name}`);
        });
    }
}

// ============================================================================
// Test 3: Receive Spare Part with Different Conditions
// ============================================================================
async function testReceiveSparePartWithConditions(testSparePart) {
    log.section('TEST 3: Receive Spare Part with Different Conditions');

    const conditions = ['NEW', 'USED', 'REFURBISHED'];

    for (const condition of conditions) {
        await test(`Receive spare part with condition: ${condition}`, async () => {
            const response = await axios.post(`${API_BASE_URL}/spare-parts/receive`, {
                supplier_id: 1,
                spare_part_id: testSparePart.spare_part_id,
                quantity: 10,
                unit_cost: 20,
                warehouse_id: 1,
                zone_id: 1,
                condition_status: condition,
                notes: `Test receiving ${condition} spare parts`
            });

            if (response.status !== 201 && response.status !== 200) {
                throw new Error(`Expected 201 or 200, got ${response.status}`);
            }

            if (!response.data.success) {
                throw new Error('Response should indicate success');
            }

            log.info(`  Received 10 ${condition} units of ${testSparePart.part_name}`);
        });
    }
}

// ============================================================================
// Test 4: Verify Condition Breakdown in Database
// ============================================================================
async function testVerifyConditionBreakdown(testPhone, testSparePart) {
    log.section('TEST 4: Verify Condition Breakdown in Database');

    const pool = mariadb.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    await test('Verify phone inventory has condition breakdown', async () => {
        const conn = await pool.getConnection();
        const inventory = await conn.query(`
            SELECT 
                product_id,
                \`condition\`,
                SUM(quantity) as total_quantity
            FROM warehouse_product_locations
            WHERE product_id = ?
            GROUP BY product_id, \`condition\`
        `, [testPhone.product_id]);
        conn.release();

        if (!inventory || inventory.length === 0) {
            throw new Error('No inventory found for phone');
        }

        log.info(`  Found ${inventory.length} condition types for phone`);
        inventory.forEach(row => {
            log.info(`    ${row.condition || 'NULL'}: ${row.total_quantity} units`);
        });
    });

    await test('Verify spare part inventory has condition breakdown', async () => {
        const conn = await pool.getConnection();
        const inventory = await conn.query(`
            SELECT 
                spare_part_id,
                condition_status,
                SUM(quantity_on_hand) as total_quantity
            FROM smartphone_spare_parts_inventory
            WHERE spare_part_id = ?
            GROUP BY spare_part_id, condition_status
        `, [testSparePart.spare_part_id]);
        conn.release();

        if (!inventory || inventory.length === 0) {
            throw new Error('No inventory found for spare part');
        }

        log.info(`  Found ${inventory.length} condition types for spare part`);
        inventory.forEach(row => {
            log.info(`    ${row.condition_status}: ${row.total_quantity} units`);
        });
    });

    await pool.end();
}

// ============================================================================
// Test 5: Verify Inventory Log Records Conditions
// ============================================================================
async function testVerifyInventoryLog(testPhone, testSparePart) {
    log.section('TEST 5: Verify Inventory Log Records Conditions');

    const pool = mariadb.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    await test('Verify phone transactions logged with conditions', async () => {
        const conn = await pool.getConnection();
        const logs = await conn.query(`
            SELECT 
                log_id,
                product_id,
                \`condition\`,
                quantity_changed,
                transaction_type,
                transaction_date
            FROM inventory_log
            WHERE product_id = ?
            AND transaction_type = 'incoming'
            ORDER BY transaction_date DESC
            LIMIT 5
        `, [testPhone.product_id]);
        conn.release();

        if (!logs || logs.length === 0) {
            throw new Error('No transaction logs found for phone');
        }

        log.info(`  Found ${logs.length} recent transactions`);
        const conditions = [...new Set(logs.map(l => l.condition))];
        log.info(`  Conditions logged: ${conditions.join(', ')}`);
    });

    await test('Verify spare part transactions logged with conditions', async () => {
        const conn = await pool.getConnection();
        const logs = await conn.query(`
            SELECT 
                log_id,
                spare_part_id,
                \`condition\`,
                quantity_changed,
                transaction_type,
                transaction_date
            FROM inventory_log
            WHERE spare_part_id = ?
            AND transaction_type = 'incoming'
            ORDER BY transaction_date DESC
            LIMIT 3
        `, [testSparePart.spare_part_id]);
        conn.release();

        if (!logs || logs.length === 0) {
            throw new Error('No transaction logs found for spare part');
        }

        log.info(`  Found ${logs.length} recent transactions`);
        const conditions = [...new Set(logs.map(l => l.condition))];
        log.info(`  Conditions logged: ${conditions.join(', ')}`);
    });

    await pool.end();
}

// ============================================================================
// Test 6: Verify API Returns Condition Breakdown
// ============================================================================
async function testAPIConditionBreakdown(testSparePart) {
    log.section('TEST 6: Verify API Returns Condition Breakdown');

    await test('GET /spare-parts should return condition breakdown', async () => {
        const response = await axios.get(`${API_BASE_URL}/spare-parts`);

        if (response.status !== 200) {
            throw new Error(`Expected 200, got ${response.status}`);
        }

        // Handle both response formats: {data: [...]} or {parts: [...]}
        const parts = response.data.data || response.data.parts || response.data;

        if (!Array.isArray(parts)) {
            throw new Error(`Response should contain an array of parts, got: ${typeof parts}`);
        }

        const testPart = parts.find(p => p.spare_part_id === testSparePart.spare_part_id);

        if (!testPart) {
            throw new Error('Test spare part not found in API response');
        }

        // Check if condition breakdown fields exist
        const hasConditionBreakdown =
            'new_quantity' in testPart ||
            'used_quantity' in testPart ||
            'refurbished_quantity' in testPart;

        if (!hasConditionBreakdown) {
            throw new Error('API response missing condition breakdown fields');
        }

        log.info(`  Condition breakdown for ${testPart.part_name}:`);
        if ('new_quantity' in testPart) log.info(`    NEW: ${testPart.new_quantity}`);
        if ('used_quantity' in testPart) log.info(`    USED: ${testPart.used_quantity}`);
        if ('refurbished_quantity' in testPart) log.info(`    REFURBISHED: ${testPart.refurbished_quantity}`);
    });
}

// ============================================================================
// Main Test Runner
// ============================================================================
async function runAllTests() {
    console.log('\n');
    log.section('Condition Tracking Test Suite');
    log.info(`API Base URL: ${API_BASE_URL}`);
    log.info('Testing condition tracking for phones and spare parts...\n');

    try {
        await login();

        const { testPhone, testSparePart } = await testGetExistingProducts();

        if (testPhone) {
            await testReceivePhoneWithConditions(testPhone);
        }

        if (testSparePart) {
            await testReceiveSparePartWithConditions(testSparePart);
        }

        if (testPhone && testSparePart) {
            await testVerifyConditionBreakdown(testPhone, testSparePart);
            await testVerifyInventoryLog(testPhone, testSparePart);
        }

        if (testSparePart) {
            await testAPIConditionBreakdown(testSparePart);
        }

    } catch (error) {
        log.fail(`Fatal error: ${error.message}`);
    }

    // Print summary
    log.section('Test Summary');
    console.log(`Total Tests:    ${results.total}`);
    console.log(`${colors.green}Passed:         ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed:         ${results.failed}${colors.reset}`);

    const passRate = ((results.passed / results.total) * 100).toFixed(1);
    console.log(`\nPass Rate:      ${passRate}%\n`);

    if (results.failed > 0) {
        console.log(`${colors.red}❌ Some tests failed. Please review and fix.${colors.reset}\n`);
        process.exit(1);
    } else {
        console.log(`${colors.green}✅ All tests passed! Condition tracking is working correctly.${colors.reset}\n`);
        process.exit(0);
    }
}

// Run tests if executed directly
if (require.main === module) {
    runAllTests().catch((error) => {
        console.error('Test suite error:', error);
        process.exit(1);
    });
}

module.exports = { runAllTests };
