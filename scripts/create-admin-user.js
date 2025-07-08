#!/usr/bin/env node

/**
 * Create Admin User Script
 * Creates the admin user in the security_db database if it doesn't exist
 */

require('dotenv').config();
const mariadb = require('mariadb');
const bcrypt = require('bcrypt');

async function createAdminUser() {
    console.log('🔧 Creating Admin User...');
    console.log('========================');
    
    const pool = mariadb.createPool({
        host: process.env.AUTH_DB_HOST || '127.0.0.1',
        port: process.env.AUTH_DB_PORT || 3306,
        user: process.env.AUTH_DB_USER,
        password: process.env.AUTH_DB_PASSWORD,
        database: process.env.AUTH_DB_NAME || 'security_db',
        connectionLimit: 1
    });
    
    try {
        const conn = await pool.getConnection();
        
        // Check if admin user already exists
        console.log('🔍 Checking if admin user exists...');
        const existingAdmin = await conn.query('SELECT id, username, fullName, email, role FROM users WHERE username = ?', ['admin']);
        
        if (existingAdmin.length > 0) {
            console.log('✅ Admin user already exists, skipping creation');
            console.log('📊 Existing admin user details:');
            console.table(existingAdmin);
            
            // Show all users
            const allUsers = await conn.query('SELECT id, username, fullName, email, role, created_at FROM users ORDER BY id');
            console.log('\n👥 All users in database:');
            console.table(allUsers);
            
            conn.end();
            await pool.end();
            return true;
        }
        
        // Create admin user
        console.log('➕ Creating admin user...');
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        const result = await conn.query(
            'INSERT INTO users (username, password, fullName, email, role) VALUES (?, ?, ?, ?, ?)',
            ['admin', hashedPassword, 'System Administrator', 'admin@example.com', 'admin']
        );
        
        console.log('✅ Admin user created successfully!');
        console.log('📋 Login credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('   Email: admin@example.com');
        console.log('   Role: admin');
        
        // Verify creation by fetching the user
        const newUser = await conn.query('SELECT id, username, fullName, email, role, created_at FROM users WHERE username = ?', ['admin']);
        console.log('\n📊 Created user details:');
        console.table(newUser);
        
        // Show all users
        const allUsers = await conn.query('SELECT id, username, fullName, email, role, created_at FROM users ORDER BY id');
        console.log('\n👥 All users in database:');
        console.table(allUsers);
        
        conn.end();
        await pool.end();
        return true;
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        
        if (error.code === 'ER_DUP_ENTRY') {
            console.log('ℹ️  Admin user already exists (duplicate entry detected)');
            // Still try to show existing users
            try {
                const conn = await pool.getConnection();
                const allUsers = await conn.query('SELECT id, username, fullName, email, role, created_at FROM users ORDER BY id');
                console.log('\n👥 All users in database:');
                console.table(allUsers);
                conn.end();
            } catch (showError) {
                console.error('Could not show existing users:', showError.message);
            }
        }
        
        await pool.end();
        return false;
    }
}

// Run the script if called directly
if (require.main === module) {
    createAdminUser()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { createAdminUser };
