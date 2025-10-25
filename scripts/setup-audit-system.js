#!/usr/bin/env node

/**
 * Setup script for Inventory Audit System
 * This script will:
 * 1. Create audit-related database tables
 * 2. Add necessary indexes
 * 3. Verify table creation
 */

const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runAuditSetup() {
    console.log('🚀 Setting up Inventory Audit System...\n');
    
    let pool, conn;
    
    try {
        // Create database connection pool
        pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'master_specs_db',
            connectionLimit: 5
        });

        conn = await pool.getConnection();
        console.log('✅ Connected to database\n');

        // Read SQL schema file
        const schemaPath = path.join(__dirname, '..', 'sql', 'audit-schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('📊 Creating audit tables...\n');

        // Remove comments and split by semicolons properly
        const cleanSQL = schemaSQL
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        const statements = cleanSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 10); // Filter out very short fragments

        let successCount = 0;
        let errors = [];

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (!statement) continue;
            
            try {
                await conn.query(statement);
                successCount++;
                
                // Parse table name from CREATE TABLE statement
                const tableMatch = statement.match(/CREATE TABLE.*?`([^`]+)`/i);
                if (tableMatch) {
                    console.log(`   ✅ Created table: ${tableMatch[1]}`);
                } else {
                    // Check for INDEX or ALTER
                    if (statement.match(/CREATE INDEX/i)) {
                        const indexMatch = statement.match(/CREATE INDEX\s+(\w+)/i);
                        if (indexMatch) {
                            console.log(`   ✅ Created index: ${indexMatch[1]}`);
                        }
                    } else if (statement.match(/ALTER TABLE/i)) {
                        console.log(`   ✅ Altered table`);
                    }
                }
            } catch (err) {
                // Ignore specific harmless errors
                if (err.message.includes('already exists')) {
                    console.log(`   ℹ️  Table or index already exists (skipping)`);
                } else if (err.message.includes('Duplicate column')) {
                    console.log(`   ℹ️  Column already exists (skipping)`);
                } else if (err.message.includes("doesn't exist") && statement.includes('ALTER TABLE')) {
                    console.log(`   ℹ️  Skipping ALTER on non-existent table`);
                } else if (err.message.includes('syntax') && statement.includes('WHERE')) {
                    // MariaDB doesn't support WHERE in CREATE INDEX
                    console.log(`   ℹ️  Skipping partial index (not supported)`);
                } else {
                    errors.push({ statement: statement.substring(0, 50) + '...', error: err.message });
                    console.log(`   ⚠️  Warning: ${err.message.substring(0, 80)}...`);
                }
            }
        }

        console.log(`\n✅ Successfully executed ${successCount} SQL statements`);
        
        if (errors.length > 0 && errors.some(e => !e.error.includes('already exists'))) {
            console.log('\n⚠️  Some warnings occurred:');
            errors.forEach(e => {
                console.log(`   - ${e.error}`);
            });
        }

        // Verify tables were created
        console.log('\n📋 Verifying table creation...\n');
        
        const tables = ['inventory_audits', 'audit_worksheet', 'audit_discrepancies'];
        let allTablesExist = true;

        for (const tableName of tables) {
            try {
                const result = await conn.query(`
                    SELECT COUNT(*) as count 
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                `, [process.env.DB_NAME || 'master_specs_db', tableName]);

                if (result[0].count > 0) {
                    // Get column count
                    const columns = await conn.query(`
                        SELECT COUNT(*) as count
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                    `, [process.env.DB_NAME || 'master_specs_db', tableName]);
                    
                    console.log(`   ✅ Table '${tableName}' exists with ${columns[0].count} columns`);
                } else {
                    console.log(`   ❌ Table '${tableName}' NOT FOUND`);
                    allTablesExist = false;
                }
            } catch (err) {
                console.log(`   ❌ Error checking table '${tableName}': ${err.message}`);
                allTablesExist = false;
            }
        }

        // Check if last_audit_date column was added to warehouse_product_locations
        try {
            const columns = await conn.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'warehouse_product_locations' 
                AND COLUMN_NAME = 'last_audit_date'
            `, [process.env.DB_NAME || 'master_specs_db']);

            if (columns.length > 0) {
                console.log(`   ✅ Column 'last_audit_date' added to warehouse_product_locations`);
            }
        } catch (err) {
            console.log(`   ⚠️  Could not verify last_audit_date column`);
        }

        if (allTablesExist) {
            console.log('\n✨ Inventory Audit System setup completed successfully!\n');
            console.log('📋 Next steps:');
            console.log('   1. Navigate to /inventory/audit to create your first audit');
            console.log('   2. Select a warehouse and audit type');
            console.log('   3. Begin counting inventory items');
            console.log('   4. Review and resolve any discrepancies');
            console.log('   5. Submit for admin approval\n');
            console.log('📚 Audit Workflow:');
            console.log('   Create → Count Items → Review Discrepancies → Complete → Approve\n');
            process.exit(0);
        } else {
            console.log('\n❌ Some tables were not created successfully');
            console.log('   Please check the error messages above and try again\n');
            process.exit(1);
        }

    } catch (err) {
        console.error('\n❌ Setup failed:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        if (conn) conn.release();
        if (pool) await pool.end();
    }
}

// Run the setup
runAuditSetup();
