#!/usr/bin/env node

require('dotenv').config();
const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');

async function setupDatabases() {
    console.log('🔧 Setting up databases...');
    
    // Connection without specific database to create them
    const rootConfig = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectionLimit: 1
    };
    
    let pool;
    
    try {
        pool = mariadb.createPool(rootConfig);
        const conn = await pool.getConnection();
        
        // Create databases if they don't exist
        const databases = [
            { name: process.env.DB_NAME || 'master_specs_db', schema: 'master_specs_db-schema.sql' },
            { name: process.env.SUPPLIERS_DB_NAME || 'suppliers_db', schema: 'suppliers_db-schema.sql' },
            { name: process.env.AUTH_DB_NAME || 'security_db', schema: 'users_db-schema.sql' }
        ];
        
        for (const db of databases) {
            console.log(`Creating database: ${db.name}`);
            await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db.name}\``);
            
            // Use the database
            await conn.query(`USE \`${db.name}\``);
            
            // Check if tables exist
            const [tables] = await conn.query(`SHOW TABLES FROM \`${db.name}\``);
            
            if (tables.length === 0) {
                console.log(`  📄 Loading schema from ${db.schema}`);
                const schemaPath = path.join(__dirname, '../sql', db.schema);
                
                if (fs.existsSync(schemaPath)) {
                    const schema = fs.readFileSync(schemaPath, 'utf8');
                    
                    // Split by semicolons and execute each statement
                    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
                    
                    for (const statement of statements) {
                        const cleanStmt = statement.trim();
                        if (cleanStmt && !cleanStmt.startsWith('--')) {
                            try {
                                await conn.query(cleanStmt);
                            } catch (err) {
                                console.warn(`    ⚠️  Warning executing statement: ${err.message}`);
                            }
                        }
                    }
                    
                    console.log(`  ✅ Schema loaded for ${db.name}`);
                } else {
                    console.warn(`  ⚠️  Schema file not found: ${schemaPath}`);
                }
            } else {
                console.log(`  ✅ Database ${db.name} already has tables`);
            }
        }
        
        // Add some sample data if needed
        await addSampleData(conn);
        
        await conn.release();
        console.log('✅ Database setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        if (pool) await pool.end();
    }
}

async function addSampleData(conn) {
    console.log('📦 Adding sample data...');
    
    // Add sample suppliers
    await conn.query(`USE \`${process.env.SUPPLIERS_DB_NAME || 'suppliers_db'}\``);
    
    const [existingSuppliers] = await conn.query('SELECT COUNT(*) as count FROM suppliers');
    
    if (existingSuppliers.count === 0) {
        console.log('  Adding sample suppliers...');
        await conn.query(`
            INSERT INTO suppliers (name, category, contact_person, contact_email, phone, is_active, supplier_id) VALUES
            ('TechSource Inc.', 'Electronics', 'John Smith', 'john@techsource.com', '+1-555-0101', 1, 'TECH001'),
            ('Global Mobile Supply', 'Mobile Devices', 'Sarah Johnson', 'sarah@globalmobile.com', '+1-555-0102', 1, 'GMS002'),
            ('Prime Electronics', 'Consumer Electronics', 'Mike Chen', 'mike@primeelec.com', '+1-555-0103', 1, 'PRIME003')
        `);
        console.log('  ✅ Sample suppliers added');
    }
    
    // Add sample phones if master_specs_db is empty
    await conn.query(`USE \`${process.env.DB_NAME || 'master_specs_db'}\``);
    
    const [existingPhones] = await conn.query('SELECT COUNT(*) as count FROM specs_db');
    
    if (existingPhones.count === 0) {
        console.log('  Adding sample phones...');
        await conn.query(`
            INSERT INTO specs_db (device_name, device_maker, device_price, device_inventory, color, ram, rom, product_type) VALUES
            ('iPhone 14 Pro', 'Apple', 999.99, 25, 'Space Black', '6GB', '128GB', 'smartphone'),
            ('Galaxy S23 Ultra', 'Samsung', 1199.99, 15, 'Phantom Black', '8GB', '256GB', 'smartphone'),
            ('Pixel 7 Pro', 'Google', 899.99, 20, 'Obsidian', '12GB', '128GB', 'smartphone'),
            ('OnePlus 11', 'OnePlus', 699.99, 30, 'Titan Black', '8GB', '128GB', 'smartphone'),
            ('iPhone 14', 'Apple', 799.99, 18, 'Blue', '6GB', '128GB', 'smartphone')
        `);
        console.log('  ✅ Sample phones added');
    }
    
    // Create users table and add admin user
    await conn.query(`USE \`${process.env.AUTH_DB_NAME || 'security_db'}\``);
    
    // Create admin user using dedicated script
    try {
        const { createAdminUser } = require('./create-admin-user');
        console.log('  Setting up admin user...');
        await createAdminUser();
    } catch (err) {
        console.warn('  ⚠️  Warning with admin user setup:', err.message);
    }
}

// Run the setup
if (require.main === module) {
    setupDatabases();
}

module.exports = { setupDatabases };
