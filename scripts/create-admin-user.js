// Script to create admin user with proper bcrypt hashing
require('dotenv').config();
const bcrypt = require('bcrypt');
const mariadb = require('mariadb');

async function createAdminUser() {
    console.log('🔐 Creating admin user with bcrypt password hashing...');
    
    try {
        // Hash the password with 12 rounds (same as in the application)
        const hashedPassword = await bcrypt.hash('123123', 12);
        console.log('✅ Password hashed successfully');

        // Connect to database using the same config as the app
        const conn = await mariadb.createConnection({
            host: process.env.AUTH_DB_HOST || '127.0.0.1',
            port: process.env.AUTH_DB_PORT || 3306,
            user: process.env.AUTH_DB_USER,
            password: process.env.AUTH_DB_PASSWORD,
            database: process.env.AUTH_DB_NAME
        });

        console.log('✅ Connected to database:', process.env.AUTH_DB_NAME);

        try {
            // Insert admin user
            await conn.query(
                'INSERT INTO users (username, password, fullName, email, role) VALUES (?, ?, ?, ?, ?)',
                ['admin', hashedPassword, 'System Administrator', 'admin@localhost', 'admin']
            );
            console.log('✅ Admin user created successfully!');
            
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                console.log('⚠️ Admin user already exists, updating password...');
                await conn.query('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, 'admin']);
                console.log('✅ Admin password updated successfully!');
            } else {
                throw error;
            }
        }
        
        // Verify the user was created
        const result = await conn.query('SELECT id, username, fullName, email, role FROM users WHERE username = ?', ['admin']);
        console.log('✅ Admin user details:', result[0]);
        
        await conn.end();
        console.log('🎉 Admin user setup completed!');
        console.log('🔑 Login credentials:');
        console.log('   Username: admin');
        console.log('   Password: 123123');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    }
}

createAdminUser();
