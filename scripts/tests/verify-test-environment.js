#!/usr/bin/env node

/**
 * Test Suite Verification Script
 * 
 * Verifies that the test environment is properly configured
 * and ready to run tests.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mariadb = require('mariadb');
require('dotenv').config();

// Colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkEnvironment() {
    log('\n' + '='.repeat(70), 'cyan');
    log('TEST ENVIRONMENT VERIFICATION', 'bright');
    log('='.repeat(70), 'cyan');
    
    const checks = {
        passed: 0,
        failed: 0,
        warnings: 0
    };
    
    // 1. Check .env file
    log('\n1. Checking .env file...', 'cyan');
    if (fs.existsSync('.env')) {
        log('   ✓ .env file exists', 'green');
        checks.passed++;
    } else {
        log('   ✗ .env file not found', 'red');
        checks.failed++;
    }
    
    // 2. Check required environment variables
    log('\n2. Checking environment variables...', 'cyan');
    const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    let allVarsPresent = true;
    
    requiredVars.forEach(varName => {
        if (process.env[varName]) {
            log(`   ✓ ${varName} is set`, 'green');
        } else {
            log(`   ✗ ${varName} is missing`, 'red');
            allVarsPresent = false;
        }
    });
    
    if (allVarsPresent) {
        checks.passed++;
    } else {
        checks.failed++;
    }
    
    // 3. Check database connection
    log('\n3. Checking database connection...', 'cyan');
    try {
        const pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectionLimit: 1
        });
        
        const conn = await pool.getConnection();
        await conn.query('SELECT 1');
        conn.release();
        await pool.end();
        
        log('   ✓ Database connection successful', 'green');
        checks.passed++;
    } catch (err) {
        log(`   ✗ Database connection failed: ${err.message}`, 'red');
        checks.failed++;
    }
    
    // 4. Check server status
    log('\n4. Checking server status...', 'cyan');
    try {
        const response = await axios.get('http://localhost:3000/api/health', {
            timeout: 3000,
            validateStatus: () => true
        });
        
        if (response.status === 200) {
            log('   ✓ Server is running on port 3000', 'green');
            checks.passed++;
        } else {
            log(`   ⚠ Server responded with status ${response.status}`, 'yellow');
            checks.warnings++;
        }
    } catch {
        log('   ⚠ Server is not running (start with: npm start)', 'yellow');
        log('   Note: Integration tests will be skipped', 'yellow');
        checks.warnings++;
    }
    
    // 5. Check test files exist
    log('\n5. Checking test files...', 'cyan');
    const testFiles = [
        'scripts/tests/setup.js',
        'scripts/tests/run-all-tests.js',
        'scripts/tests/helpers/api-test-helper.js',
        'scripts/tests/unit/WarehouseService.test.js',
        'scripts/tests/unit/SupplierService.test.js',
        'scripts/tests/integration/api.inventory.test.js'
    ];
    
    let allFilesExist = true;
    testFiles.forEach(file => {
        if (fs.existsSync(file)) {
            log(`   ✓ ${file}`, 'green');
        } else {
            log(`   ✗ ${file} missing`, 'red');
            allFilesExist = false;
        }
    });
    
    if (allFilesExist) {
        checks.passed++;
    } else {
        checks.failed++;
    }
    
    // 6. Check node_modules
    log('\n6. Checking dependencies...', 'cyan');
    const requiredPackages = ['mocha', 'chai', 'sinon', 'supertest', 'nyc'];
    let allPackagesInstalled = true;
    
    requiredPackages.forEach(pkg => {
        const pkgPath = path.join('node_modules', pkg);
        if (fs.existsSync(pkgPath)) {
            log(`   ✓ ${pkg}`, 'green');
        } else {
            log(`   ✗ ${pkg} not installed`, 'red');
            allPackagesInstalled = false;
        }
    });
    
    if (allPackagesInstalled) {
        checks.passed++;
    } else {
        checks.failed++;
        log('\n   Run: npm install', 'yellow');
    }
    
    // 7. Check test database tables
    log('\n7. Checking database tables...', 'cyan');
    try {
        const pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectionLimit: 1
        });
        
        const conn = await pool.getConnection();
        const tables = await conn.query('SHOW TABLES');
        conn.release();
        await pool.end();
        
        const requiredTables = [
            'specs_db',
            'warehouses',
            'warehouse_zones',
            'suppliers',
            'inventory_log',
            'receipts'
        ];
        
        const tableNames = tables.map(t => Object.values(t)[0]);
        let allTablesExist = true;
        
        requiredTables.forEach(table => {
            if (tableNames.includes(table)) {
                log(`   ✓ ${table}`, 'green');
            } else {
                log(`   ✗ ${table} missing`, 'red');
                allTablesExist = false;
            }
        });
        
        if (allTablesExist) {
            checks.passed++;
        } else {
            checks.failed++;
        }
    } catch (err) {
        log(`   ⚠ Could not check tables: ${err.message}`, 'yellow');
        checks.warnings++;
    }
    
    // Summary
    log('\n' + '='.repeat(70), 'cyan');
    log('VERIFICATION SUMMARY', 'bright');
    log('='.repeat(70), 'cyan');
    
    log(`\nPassed:   ${checks.passed}`, 'green');
    log(`Failed:   ${checks.failed}`, checks.failed > 0 ? 'red' : 'reset');
    log(`Warnings: ${checks.warnings}`, checks.warnings > 0 ? 'yellow' : 'reset');
    
    if (checks.failed === 0) {
        log('\n✓ Environment is ready for testing!', 'green');
        log('\nRun tests with:', 'cyan');
        log('  npm test                  # All tests', 'reset');
        log('  npm run test:unit         # Unit tests', 'reset');
        log('  npm run test:integration  # Integration tests', 'reset');
        process.exit(0);
    } else {
        log('\n✗ Environment has issues that need to be fixed', 'red');
        log('\nPlease fix the issues above before running tests.', 'yellow');
        process.exit(1);
    }
}

// Run verification
checkEnvironment().catch(err => {
    console.error('Error during verification:', err);
    process.exit(1);
});
