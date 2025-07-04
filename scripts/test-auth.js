// Script to test authentication against security_db
require('dotenv').config();
const bcrypt = require('bcrypt');
const mariadb = require('mariadb');

async function testAuthentication() {
    console.log('🔍 Testing authentication system...');
    
    try {
        // Connect to database using the same config as the app
        const conn = await mariadb.createConnection({
            host: process.env.AUTH_DB_HOST || '127.0.0.1',
            port: process.env.AUTH_DB_PORT || 3306,
            user: process.env.AUTH_DB_USER,
            password: process.env.AUTH_DB_PASSWORD,
            database: process.env.AUTH_DB_NAME
        });

        console.log('✅ Connected to database:', process.env.AUTH_DB_NAME);

        // Test finding user by username
        const result = await conn.query('SELECT * FROM users WHERE username = ?', ['admin']);
        
        if (result.length === 0) {
            console.log('❌ Admin user not found');
            await conn.end();
            return;
        }

        const user = result[0];
        console.log('✅ User found:', {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            is_active: user.is_active
        });

        // Test password verification
        const testPassword = '123123';
        const passwordMatch = await bcrypt.compare(testPassword, user.password);
        
        if (passwordMatch) {
            console.log('✅ Password verification successful');
            console.log('🎉 Authentication system is working correctly!');
        } else {
            console.log('❌ Password verification failed');
        }

        await conn.end();
        
    } catch (error) {
        console.error('❌ Authentication test failed:', error.message);
    }
}

// Run the test
testAuthentication().then(() => {
    console.log('🏁 Authentication test completed');
}).catch(error => {
    console.error('💥 Test execution failed:', error);
});
