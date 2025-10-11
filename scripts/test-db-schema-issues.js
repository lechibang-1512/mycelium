#!/usr/bin/env node

/**
 * Database Schema Issues Test Script
 * Tests for mismatches between database schema and code usage
 */

const mariadb = require('mariadb');
require('dotenv').config();

// Database connections
const pools = {
  master_specs_db: mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'master_specs_db',
    connectionLimit: 5
  }),
  security_db: mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'security_db',
    connectionLimit: 5
  }),
  suppliers_db: mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'suppliers_db',
    connectionLimit: 5
  })
};

const results = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Get columns for a table
 */
async function getTableColumns(pool, tableName) {
  let conn;
  try {
    conn = await pool.getConnection();
    const columns = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [tableName]
    );
    return columns;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Check if a column exists in a table
 */
async function columnExists(pool, tableName, columnName) {
  const columns = await getTableColumns(pool, tableName);
  return columns.some(col => col.COLUMN_NAME === columnName);
}

/**
 * Test inventory_log table for required columns
 */
async function testInventoryLogTable() {
  console.log('\n=== Testing inventory_log Table ===');
  const requiredColumns = [
    'log_id',
    'product_id',
    'transaction_type',
    'quantity_changed',
    'transaction_date',  // MISSING in schema!
    'warehouse_id',
    'zone_id',
    'serial_id',
    'notes',
    'created_at',
    'updated_at'
  ];

  const columns = await getTableColumns(pools.master_specs_db, 'inventory_log');
  console.log('Current columns:', columns.map(c => c.COLUMN_NAME).join(', '));

  for (const col of requiredColumns) {
    const exists = columns.some(c => c.COLUMN_NAME === col);
    if (exists) {
      results.passed.push(`inventory_log.${col} exists`);
      console.log(`✅ Column ${col} exists`);
    } else {
      results.failed.push(`inventory_log.${col} is missing`);
      console.error(`❌ Column ${col} is MISSING`);
    }
  }
}

/**
 * Test receipts table for required columns
 */
async function testReceiptsTable() {
  console.log('\n=== Testing receipts Table ===');
  
  let conn;
  try {
    conn = await pools.master_specs_db.getConnection();
    
    // Check if table exists
    const tables = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'receipts'`
    );
    
    if (tables.length === 0) {
      results.failed.push('receipts table does not exist');
      console.error('❌ receipts table does NOT exist');
      return;
    }
    
    results.passed.push('receipts table exists');
    console.log('✅ receipts table exists');
    
    const requiredColumns = [
      'receipt_id',
      'receipt_type',
      'receipt_data',
      'product_id',
      'supplier_id',
      'transaction_date',
      'subtotal',
      'tax_amount',
      'total_amount',
      'notes',
      'created_at',
      'updated_at'
    ];

    const columns = await getTableColumns(pools.master_specs_db, 'receipts');
    console.log('Current columns:', columns.map(c => c.COLUMN_NAME).join(', '));

    for (const col of requiredColumns) {
      const exists = columns.some(c => c.COLUMN_NAME === col);
      if (exists) {
        results.passed.push(`receipts.${col} exists`);
        console.log(`✅ Column ${col} exists`);
      } else {
        results.failed.push(`receipts.${col} is missing`);
        console.error(`❌ Column ${col} is MISSING`);
      }
    }
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Test specs_db table for required columns
 */
async function testSpecsDbTable() {
  console.log('\n=== Testing specs_db Table ===');
  
  const requiredColumns = [
    'product_id',
    'device_name',
    'device_maker',
    'device_price',
    'product_type'
  ];

  const columns = await getTableColumns(pools.master_specs_db, 'specs_db');
  console.log('Current columns:', columns.map(c => c.COLUMN_NAME).join(', '));

  for (const col of requiredColumns) {
    const exists = columns.some(c => c.COLUMN_NAME === col);
    if (exists) {
      results.passed.push(`specs_db.${col} exists`);
      console.log(`✅ Column ${col} exists`);
    } else {
      results.failed.push(`specs_db.${col} is missing`);
      console.error(`❌ Column ${col} is MISSING`);
    }
  }
}

/**
 * Test warehouse_product_locations table
 */
async function testWarehouseProductLocationsTable() {
  console.log('\n=== Testing warehouse_product_locations Table ===');
  
  let conn;
  try {
    conn = await pools.master_specs_db.getConnection();
    
    // Check if table exists
    const tables = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'warehouse_product_locations'`
    );
    
    if (tables.length === 0) {
      results.failed.push('warehouse_product_locations table does not exist');
      console.error('❌ warehouse_product_locations table does NOT exist');
      return;
    }
    
    results.passed.push('warehouse_product_locations table exists');
    console.log('✅ warehouse_product_locations table exists');
    
    const requiredColumns = [
      'location_id',
      'warehouse_id',
      'zone_id',
      'product_id',
      'quantity',
      'reserved_quantity',
      'min_stock_level'
    ];

    const columns = await getTableColumns(pools.master_specs_db, 'warehouse_product_locations');
    console.log('Current columns:', columns.map(c => c.COLUMN_NAME).join(', '));

    for (const col of requiredColumns) {
      const exists = columns.some(c => c.COLUMN_NAME === col);
      if (exists) {
        results.passed.push(`warehouse_product_locations.${col} exists`);
        console.log(`✅ Column ${col} exists`);
      } else {
        results.failed.push(`warehouse_product_locations.${col} is missing`);
        console.error(`❌ Column ${col} is MISSING`);
      }
    }
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Test serialized_inventory table
 */
async function testSerializedInventoryTable() {
  console.log('\n=== Testing serialized_inventory Table ===');
  
  const requiredColumns = [
    'serial_id',
    'product_id',
    'serial_number',
    'warehouse_id',
    'zone_id',
    'status'
  ];

  const columns = await getTableColumns(pools.master_specs_db, 'serialized_inventory');
  console.log('Current columns:', columns.map(c => c.COLUMN_NAME).join(', '));

  for (const col of requiredColumns) {
    const exists = columns.some(c => c.COLUMN_NAME === col);
    if (exists) {
      results.passed.push(`serialized_inventory.${col} exists`);
      console.log(`✅ Column ${col} exists`);
    } else {
      results.failed.push(`serialized_inventory.${col} is missing`);
      console.error(`❌ Column ${col} is MISSING`);
    }
  }
}

/**
 * Test batch_tracking table
 */
async function testBatchTrackingTable() {
  console.log('\n=== Testing batch_tracking Table ===');
  
  let conn;
  try {
    conn = await pools.master_specs_db.getConnection();
    
    // Check if table exists
    const tables = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batch_tracking'`
    );
    
    if (tables.length === 0) {
      results.failed.push('batch_tracking table does not exist');
      console.error('❌ batch_tracking table does NOT exist');
      return;
    }
    
    results.passed.push('batch_tracking table exists');
    console.log('✅ batch_tracking table exists');
    
    const requiredColumns = [
      'batch_id',
      'product_id',
      'warehouse_id',
      'zone_id',
      'batch_no'
    ];

    const columns = await getTableColumns(pools.master_specs_db, 'batch_tracking');
    console.log('Current columns:', columns.map(c => c.COLUMN_NAME).join(', '));

    for (const col of requiredColumns) {
      const exists = columns.some(c => c.COLUMN_NAME === col);
      if (exists) {
        results.passed.push(`batch_tracking.${col} exists`);
        console.log(`✅ Column ${col} exists`);
      } else {
        results.failed.push(`batch_tracking.${col} is missing`);
        console.error(`❌ Column ${col} is MISSING`);
      }
    }
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Test users table
 */
async function testUsersTable() {
  console.log('\n=== Testing users Table (security_db) ===');
  
  const requiredColumns = [
    'id',
    'username',
    'password',
    'fullName',
    'email',
    'role',
    'created_at',
    'updated_at',
    'last_login',
    'failed_login_attempts',
    'locked_until',
    'is_active'
  ];

  const columns = await getTableColumns(pools.security_db, 'users');
  console.log('Current columns:', columns.map(c => c.COLUMN_NAME).join(', '));

  for (const col of requiredColumns) {
    const exists = columns.some(c => c.COLUMN_NAME === col);
    if (exists) {
      results.passed.push(`users.${col} exists`);
      console.log(`✅ Column ${col} exists`);
    } else {
      results.failed.push(`users.${col} is missing`);
      console.error(`❌ Column ${col} is MISSING`);
    }
  }
}

/**
 * Test suppliers table
 */
async function testSuppliersTable() {
  console.log('\n=== Testing suppliers Table (suppliers_db) ===');
  
  const requiredColumns = [
    'id',
    'name',
    'category',
    'contact_person',
    'contact_position',
    'contact_email',
    'email',
    'phone',
    'website',
    'address',
    'notes',
    'is_active',
    'created_at',
    'updated_at'
  ];

  const columns = await getTableColumns(pools.suppliers_db, 'suppliers');
  console.log('Current columns:', columns.map(c => c.COLUMN_NAME).join(', '));

  for (const col of requiredColumns) {
    const exists = columns.some(c => c.COLUMN_NAME === col);
    if (exists) {
      results.passed.push(`suppliers.${col} exists`);
      console.log(`✅ Column ${col} exists`);
    } else {
      results.failed.push(`suppliers.${col} is missing`);
      console.error(`❌ Column ${col} is MISSING`);
    }
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('DATABASE SCHEMA TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n✅ PASSED: ${results.passed.length} tests`);
  console.log(`❌ FAILED: ${results.failed.length} tests`);
  console.log(`⚠️  WARNINGS: ${results.warnings.length} items`);
  
  if (results.failed.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('FAILED TESTS:');
    console.log('='.repeat(60));
    results.failed.forEach(fail => console.log(`  ❌ ${fail}`));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('WARNINGS:');
    console.log('='.repeat(60));
    results.warnings.forEach(warn => console.log(`  ⚠️  ${warn}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (results.failed.length === 0) {
    console.log('✅ All database schema tests PASSED!');
    return 0;
  } else {
    console.log('❌ Some database schema tests FAILED!');
    console.log('\nTo fix these issues, update the database schema using:');
    console.log('  node scripts/fix-db-schema-issues.js');
    return 1;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  try {
    console.log('Starting Database Schema Tests...\n');
    
    // Test master_specs_db
    await testSpecsDbTable();
    await testInventoryLogTable();
    await testReceiptsTable();
    await testWarehouseProductLocationsTable();
    await testSerializedInventoryTable();
    await testBatchTrackingTable();
    
    // Test security_db
    await testUsersTable();
    
    // Test suppliers_db
    await testSuppliersTable();
    
    const exitCode = printSummary();
    process.exit(exitCode);
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close all pools
    await Promise.all([
      pools.master_specs_db.end(),
      pools.security_db.end(),
      pools.suppliers_db.end()
    ]);
  }
}

// Run tests
runTests();
