#!/usr/bin/env node

/**
 * Database Schema Fix Script
 * Fixes missing columns and schema issues in the database
 */

const mariadb = require('mariadb');
require('dotenv').config();

// Database connection
const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'master_specs_db',
  connectionLimit: 5
});

const fixes = [];
const errors = [];

/**
 * Check if column exists
 */
async function columnExists(conn, tableName, columnName) {
  const result = await conn.query(
    `SELECT COUNT(*) as count
     FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = ? 
     AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return result[0].count > 0;
}

/**
 * Check if table exists
 */
async function tableExists(conn, tableName) {
  const result = await conn.query(
    `SELECT COUNT(*) as count
     FROM INFORMATION_SCHEMA.TABLES 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = ?`,
    [tableName]
  );
  return result[0].count > 0;
}

/**
 * Fix inventory_log table - add transaction_date column
 */
async function fixInventoryLogTable(conn) {
  console.log('\n=== Fixing inventory_log Table ===');
  
  try {
    // Add transaction_date column
    if (!(await columnExists(conn, 'inventory_log', 'transaction_date'))) {
      await conn.query(`
        ALTER TABLE inventory_log 
        ADD COLUMN transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP
        AFTER quantity_changed
      `);
      fixes.push('Added transaction_date column to inventory_log');
      console.log('✅ Added transaction_date column to inventory_log');
    } else {
      console.log('⏭️  transaction_date column already exists in inventory_log');
    }
    
    // Add created_at column if missing
    if (!(await columnExists(conn, 'inventory_log', 'created_at'))) {
      await conn.query(`
        ALTER TABLE inventory_log 
        ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      `);
      fixes.push('Added created_at column to inventory_log');
      console.log('✅ Added created_at column to inventory_log');
    }
    
    // Add updated_at column if missing
    if (!(await columnExists(conn, 'inventory_log', 'updated_at'))) {
      await conn.query(`
        ALTER TABLE inventory_log 
        ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      fixes.push('Added updated_at column to inventory_log');
      console.log('✅ Added updated_at column to inventory_log');
    }
    
    // Add notes column if missing
    if (!(await columnExists(conn, 'inventory_log', 'notes'))) {
      await conn.query(`
        ALTER TABLE inventory_log 
        ADD COLUMN notes TEXT DEFAULT NULL
      `);
      fixes.push('Added notes column to inventory_log');
      console.log('✅ Added notes column to inventory_log');
    }
    
    // Add user_id column if missing (for tracking who made the transaction)
    if (!(await columnExists(conn, 'inventory_log', 'user_id'))) {
      await conn.query(`
        ALTER TABLE inventory_log 
        ADD COLUMN user_id INT DEFAULT NULL
      `);
      fixes.push('Added user_id column to inventory_log');
      console.log('✅ Added user_id column to inventory_log');
    }
    
  } catch (error) {
    errors.push(`Failed to fix inventory_log: ${error.message}`);
    console.error('❌ Failed to fix inventory_log:', error.message);
  }
}

/**
 * Fix receipts table - create if not exists
 */
async function fixReceiptsTable(conn) {
  console.log('\n=== Fixing receipts Table ===');
  
  try {
    if (!(await tableExists(conn, 'receipts'))) {
      await conn.query(`
        CREATE TABLE receipts (
          receipt_id VARCHAR(50) NOT NULL,
          receipt_type ENUM('incoming', 'outgoing') NOT NULL,
          receipt_data JSON DEFAULT NULL,
          product_id BIGINT(20) UNSIGNED NOT NULL,
          supplier_id INT DEFAULT NULL,
          transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          subtotal DECIMAL(10,2) DEFAULT 0.00,
          tax_amount DECIMAL(10,2) DEFAULT 0.00,
          total_amount DECIMAL(10,2) DEFAULT 0.00,
          notes TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (receipt_id),
          KEY idx_product_id (product_id),
          KEY idx_supplier_id (supplier_id),
          KEY idx_transaction_date (transaction_date),
          KEY idx_receipt_type (receipt_type),
          CONSTRAINT fk_receipt_to_specs FOREIGN KEY (product_id) REFERENCES specs_db(product_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      fixes.push('Created receipts table');
      console.log('✅ Created receipts table');
    } else {
      console.log('⏭️  receipts table already exists');
      
      // Ensure all required columns exist
      const requiredColumns = {
        'receipt_id': 'VARCHAR(50) NOT NULL',
        'receipt_type': "ENUM('incoming', 'outgoing') NOT NULL",
        'receipt_data': 'JSON DEFAULT NULL',
        'product_id': 'BIGINT(20) UNSIGNED NOT NULL',
        'supplier_id': 'INT DEFAULT NULL',
        'transaction_date': 'DATETIME DEFAULT CURRENT_TIMESTAMP',
        'subtotal': 'DECIMAL(10,2) DEFAULT 0.00',
        'tax_amount': 'DECIMAL(10,2) DEFAULT 0.00',
        'total_amount': 'DECIMAL(10,2) DEFAULT 0.00',
        'notes': 'TEXT DEFAULT NULL',
        'created_at': 'DATETIME DEFAULT CURRENT_TIMESTAMP',
        'updated_at': 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
      };
      
      for (const [col, definition] of Object.entries(requiredColumns)) {
        if (!(await columnExists(conn, 'receipts', col))) {
          await conn.query(`ALTER TABLE receipts ADD COLUMN ${col} ${definition}`);
          fixes.push(`Added ${col} column to receipts`);
          console.log(`✅ Added ${col} column to receipts`);
        }
      }
    }
  } catch (error) {
    errors.push(`Failed to fix receipts table: ${error.message}`);
    console.error('❌ Failed to fix receipts table:', error.message);
  }
}

/**
 * Fix warehouse_product_locations table - add missing columns
 */
async function fixWarehouseProductLocationsTable(conn) {
  console.log('\n=== Fixing warehouse_product_locations Table ===');
  
  try {
    if (!(await tableExists(conn, 'warehouse_product_locations'))) {
      console.log('⏭️  warehouse_product_locations table does not exist, skipping');
      return;
    }
    
    // Add created_at if missing
    if (!(await columnExists(conn, 'warehouse_product_locations', 'created_at'))) {
      await conn.query(`
        ALTER TABLE warehouse_product_locations 
        ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      `);
      fixes.push('Added created_at column to warehouse_product_locations');
      console.log('✅ Added created_at column to warehouse_product_locations');
    }
    
    // Add updated_at if missing
    if (!(await columnExists(conn, 'warehouse_product_locations', 'updated_at'))) {
      await conn.query(`
        ALTER TABLE warehouse_product_locations 
        ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      fixes.push('Added updated_at column to warehouse_product_locations');
      console.log('✅ Added updated_at column to warehouse_product_locations');
    }
    
  } catch (error) {
    errors.push(`Failed to fix warehouse_product_locations: ${error.message}`);
    console.error('❌ Failed to fix warehouse_product_locations:', error.message);
  }
}

/**
 * Fix serialized_inventory table - add missing columns
 */
async function fixSerializedInventoryTable(conn) {
  console.log('\n=== Fixing serialized_inventory Table ===');
  
  try {
    if (!(await tableExists(conn, 'serialized_inventory'))) {
      console.log('⏭️  serialized_inventory table does not exist, skipping');
      return;
    }
    
    // Add created_at if missing
    if (!(await columnExists(conn, 'serialized_inventory', 'created_at'))) {
      await conn.query(`
        ALTER TABLE serialized_inventory 
        ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      `);
      fixes.push('Added created_at column to serialized_inventory');
      console.log('✅ Added created_at column to serialized_inventory');
    }
    
    // Add updated_at if missing
    if (!(await columnExists(conn, 'serialized_inventory', 'updated_at'))) {
      await conn.query(`
        ALTER TABLE serialized_inventory 
        ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      fixes.push('Added updated_at column to serialized_inventory');
      console.log('✅ Added updated_at column to serialized_inventory');
    }
    
  } catch (error) {
    errors.push(`Failed to fix serialized_inventory: ${error.message}`);
    console.error('❌ Failed to fix serialized_inventory:', error.message);
  }
}

/**
 * Fix batch_tracking table - add missing columns
 */
async function fixBatchTrackingTable(conn) {
  console.log('\n=== Fixing batch_tracking Table ===');
  
  try {
    if (!(await tableExists(conn, 'batch_tracking'))) {
      console.log('⏭️  batch_tracking table does not exist, skipping');
      return;
    }
    
    // Add created_at if missing
    if (!(await columnExists(conn, 'batch_tracking', 'created_at'))) {
      await conn.query(`
        ALTER TABLE batch_tracking 
        ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      `);
      fixes.push('Added created_at column to batch_tracking');
      console.log('✅ Added created_at column to batch_tracking');
    }
    
    // Add updated_at if missing
    if (!(await columnExists(conn, 'batch_tracking', 'updated_at'))) {
      await conn.query(`
        ALTER TABLE batch_tracking 
        ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      fixes.push('Added updated_at column to batch_tracking');
      console.log('✅ Added updated_at column to batch_tracking');
    }
    
  } catch (error) {
    errors.push(`Failed to fix batch_tracking: ${error.message}`);
    console.error('❌ Failed to fix batch_tracking:', error.message);
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('DATABASE SCHEMA FIX SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n✅ Applied ${fixes.length} fixes`);
  console.log(`❌ Encountered ${errors.length} errors`);
  
  if (fixes.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('FIXES APPLIED:');
    console.log('='.repeat(60));
    fixes.forEach(fix => console.log(`  ✅ ${fix}`));
  }
  
  if (errors.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('ERRORS:');
    console.log('='.repeat(60));
    errors.forEach(error => console.log(`  ❌ ${error}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (errors.length === 0) {
    console.log('✅ All database schema fixes applied successfully!');
    console.log('\nRun the test script to verify:');
    console.log('  node scripts/test-db-schema-issues.js');
    return 0;
  } else {
    console.log('❌ Some fixes failed!');
    return 1;
  }
}

/**
 * Main function
 */
async function main() {
  let conn;
  try {
    console.log('Starting Database Schema Fixes...\n');
    console.log('Connecting to database...');
    
    conn = await pool.getConnection();
    console.log('✅ Connected to master_specs_db\n');
    
    // Apply fixes
    await fixInventoryLogTable(conn);
    await fixReceiptsTable(conn);
    await fixWarehouseProductLocationsTable(conn);
    await fixSerializedInventoryTable(conn);
    await fixBatchTrackingTable(conn);
    
    const exitCode = printSummary();
    process.exit(exitCode);
    
  } catch (error) {
    console.error('\n❌ Fix execution failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

// Run fixes
main();
