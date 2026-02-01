#!/usr/bin/env node

/**
 * Database Schema Inspector
 * Check table schemas for invoice-related tables
 */

const mariadb = require('mariadb');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'master_db',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci'
};

async function inspectTables() {
    const pool = mariadb.createPool(dbConfig);
    
    try {
        console.log('📋 Database Schema Inspector\n');
        
        const conn = await pool.getConnection();
        
        try {
            // Check if tables exist and their structures
            const tables = ['invoices', 'invoice_items', 'expected_serials'];
            
            for (const tableName of tables) {
                console.log(`🔍 Table: ${tableName}`);
                
                try {
                    const structure = await conn.query(`DESCRIBE ${tableName}`);
                    console.log('   Columns:');
                    structure.forEach(col => {
                        console.log(`     - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? col.Key : ''}`);
                    });
                    console.log();
                } catch (error) {
                    console.log(`   ❌ Table not found: ${error.message}\n`);
                }
            }
            
            // Check what invoice-related tables actually exist
            console.log('🗂️  All invoice-related tables in database:');
            const allTables = await conn.query("SHOW TABLES LIKE '%invoice%'");
            if (allTables.length > 0) {
                allTables.forEach(row => {
                    const tableName = Object.values(row)[0];
                    console.log(`   - ${tableName}`);
                });
            } else {
                console.log('   No invoice-related tables found');
            }
            
            console.log();
            
            // Check for any serial-related tables
            console.log('📱 All serial-related tables in database:');
            const serialTables = await conn.query("SHOW TABLES LIKE '%serial%'");
            if (serialTables.length > 0) {
                serialTables.forEach(row => {
                    const tableName = Object.values(row)[0];
                    console.log(`   - ${tableName}`);
                });
            } else {
                console.log('   No serial-related tables found');
            }
            
        } finally {
            conn.release();
        }
        
    } catch (error) {
        console.error('❌ Schema inspection failed:', error.message);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    inspectTables()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Script failed:', err);
            process.exit(1);
        });
}