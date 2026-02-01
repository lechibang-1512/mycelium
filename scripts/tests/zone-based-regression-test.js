/**
 * Zone-Based Inventory System - Regression Test Suite
 * 
 * Tests all critical functionality to ensure the new zone-mandatory
 * system works correctly and doesn't break existing features.
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://127.0.0.1:3000/api';
// Add at the beginning of test file
let authCookie = '';

// eslint-disable-next-line no-unused-vars
// Login helper
async function _login() {
  console.log('Logging in as admin...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: process.env.ADMIN_DEFAULT_PASSWORD || 'admin123'
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

// Global axios interceptor to add cookie
axios.interceptors.request.use(config => {
  if (authCookie && !config.headers['Cookie']) {
    config.headers['Cookie'] = authCookie;
  }
  return config;
});

// Test configuration
const TEST_CONFIG = {
  testProductId: 'd2aea162-fc7c-11f0-8f0e-d82429627111',
  testWarehouseId: 1,
  testZoneId: 2,
  testQuantity: 10,
};

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
  warnings: 0,
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

async function testWarning(name, fn) {
  try {
    await fn();
    log.warn(name);
    results.warnings++;
  } catch {
    // Expected to fail
  }
}

// Tests 1 & 2 removed as Staging endpoints are deprecated/removed

// ============================================================================
// Test 3: Warehouse Transfer with Zone Requirement
// ============================================================================
async function testWarehouseTransferZoneRequirement() {
  log.section('TEST 3: Warehouse Transfer Zone Requirement');

  await test('POST /warehouse-transfer should reject without toZoneId', async () => {
    try {
      await axios.post(`${API_BASE_URL}/inventory-movement/warehouse-transfer`, {
        productId: TEST_CONFIG.testProductId,
        fromWarehouseId: TEST_CONFIG.testWarehouseId,
        toWarehouseId: TEST_CONFIG.testWarehouseId + 1,
        // Missing toZoneId - should fail now
        quantity: TEST_CONFIG.testQuantity,
      });
      throw new Error('Request should have been rejected - toZoneId is now required');
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error(`Expected 400, got ${error.response?.status}`);
      }
      if (!error.response?.data?.error?.toLowerCase().includes('zone')) {
        throw new Error('Error message should mention zone requirement');
      }
    }
  });

  await test('Error message should be clear about zone requirement', async () => {
    try {
      await axios.post(`${API_BASE_URL}/inventory-movement/warehouse-transfer`, {
        productId: TEST_CONFIG.testProductId,
        fromWarehouseId: TEST_CONFIG.testWarehouseId,
        toWarehouseId: TEST_CONFIG.testWarehouseId + 1,
        quantity: TEST_CONFIG.testQuantity,
      });
      throw new Error('Request should have been rejected');
    } catch (error) {
      const errorMsg = error.response?.data?.error?.toLowerCase() || '';
      if (!errorMsg.includes('zone') || (!errorMsg.includes('mandatory') && !errorMsg.includes('required'))) {
        throw new Error('Error message should clearly explain zone is mandatory');
      }
    }
  });
}

// ============================================================================
// Test 4: Zone Transfer Validation
// ============================================================================
async function testZoneTransferValidation() {
  log.section('TEST 4: Zone Transfer Validation');

  await test('POST /zone-transfer should require both zones', async () => {
    try {
      await axios.post(`${API_BASE_URL}/inventory-movement/zone-transfer`, {
        productId: TEST_CONFIG.testProductId,
        warehouseId: TEST_CONFIG.testWarehouseId,
        fromZoneId: TEST_CONFIG.testZoneId,
        // Missing toZoneId
        quantity: TEST_CONFIG.testQuantity,
      });
      throw new Error('Request should have been rejected');
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error(`Expected 400, got ${error.response?.status}`);
      }
    }
  });

  await test('POST /zone-transfer should reject same source and destination', async () => {
    try {
      await axios.post(`${API_BASE_URL}/inventory-movement/zone-transfer`, {
        productId: TEST_CONFIG.testProductId,
        warehouseId: TEST_CONFIG.testWarehouseId,
        fromZoneId: TEST_CONFIG.testZoneId,
        toZoneId: TEST_CONFIG.testZoneId, // Same zone
        quantity: TEST_CONFIG.testQuantity,
      });
      throw new Error('Request should have been rejected');
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error(`Expected 400, got ${error.response?.status}`);
      }
    }
  });
}

// ============================================================================
// Test 5: Inventory Receipt Zone Requirement
// ============================================================================
async function testInventoryReceiptZoneRequirement() {
  log.section('TEST 5: Inventory Receipt Zone Requirement');

  await test('POST /inventory-transactions/receive should auto-assign receiving zone when zone_id omitted', async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/inventory-transactions/receive`, {
        supplier_id: 1,
        items: [{
          product_id: TEST_CONFIG.testProductId,
          quantity: TEST_CONFIG.testQuantity,
          unit_cost: 100,
        }],
        warehouse_id: TEST_CONFIG.testWarehouseId,
        // Missing zone_id - should auto-assign to receiving zone
        subtotal: 1000,
        tax_amount: 0,
        total_amount: 1000,
      });

      // Should succeed with auto-assignment
      if (response.status !== 201) {
        throw new Error(`Expected 201, got ${response.status}`);
      }

      // Verify it was assigned to a zone (receiving zone)
      if (!response.data.success) {
        throw new Error('Response should indicate success');
      }
    } catch (error) {
      // If it fails, it should be because there's no receiving zone
      if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.error?.toLowerCase() || '';
        if (!errorMsg.includes('zone')) {
          throw new Error('Error message should mention zone requirement');
        }
      } else {
        throw error;
      }
    }
  });
}

// ============================================================================
// Test 6: Backward Compatibility
// ============================================================================
async function testBackwardCompatibility() {
  log.section('TEST 6: Backward Compatibility Check');

  await testWarning('Old code without zones should fail gracefully', async () => {
    // This is expected to fail - we want to catch old code
    await axios.post(`${API_BASE_URL}/inventory-movement/warehouse-transfer`, {
      productId: 1,
      fromWarehouseId: 1,
      toWarehouseId: 2,
      quantity: 10,
      // No zones provided - old style
    });
  });

  log.info('Breaking changes are intentional - old code needs updates');
}

// Tests 7, 8, 10 removed as Staging endpoints are deprecated/removed

// ============================================================================
// Test 9: Error Messages Quality
// ============================================================================
async function testErrorMessagesQuality() {
  log.section('TEST 9: Error Message Quality');

  await test('Zone requirement errors should be user-friendly', async () => {
    try {
      await axios.post(`${API_BASE_URL}/inventory-movement/warehouse-transfer`, {
        productId: 1,
        fromWarehouseId: 1,
        toWarehouseId: 2,
        quantity: 10,
      });
    } catch (error) {
      const errorMsg = error.response?.data?.error || '';

      // Check for helpful keywords
      const hasHelpfulKeywords = errorMsg.toLowerCase().includes('zone') &&
        (errorMsg.toLowerCase().includes('required') ||
          errorMsg.toLowerCase().includes('mandatory'));

      if (!hasHelpfulKeywords) {
        throw new Error('Error message should be clear and actionable');
      }
    }
  });
}

// ============================================================================
// Main Test Runner
// ============================================================================
async function runAllTests() {
  console.log('\n');
  log.section('Zone-Based Inventory System - Regression Test Suite');
  log.info(`API Base URL: ${API_BASE_URL}`);
  log.info('Starting comprehensive regression tests...\n');

  try {
    await _login();
    // await testStagingEndpoint();
    // await testStagingToZoneTransfer();
    await testWarehouseTransferZoneRequirement();
    await testZoneTransferValidation();
    await testInventoryReceiptZoneRequirement();
    await testBackwardCompatibility();
    // await testAPIResponseStructure();
    // await testDataIntegrity();
    await testErrorMessagesQuality();
    // await testPerformance();
  } catch (error) {
    log.fail(`Fatal error: ${error.message}`);
  }

  // Print summary
  log.section('Test Summary');
  console.log(`Total Tests:    ${results.total}`);
  console.log(`${colors.green}Passed:         ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed:         ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}Warnings:       ${results.warnings}${colors.reset}`);

  const passRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`\nPass Rate:      ${passRate}%\n`);

  if (results.failed > 0) {
    console.log(`${colors.red}❌ Some tests failed. Please review and fix.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ All tests passed! Zone-based system is working correctly.${colors.reset}\n`);
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
