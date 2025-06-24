const bcrypt = require('bcrypt');
const mariadb = require('mariadb');

// Database configuration for users_db
const authDbConfig = {
    host: '127.0.0.1',
    user: 'lechibang',
    password: '1212',
    database: 'users_db',
    connectionLimit: 5,
    bigIntAsNumber: true
};

async function debugLogin() {
    let conn;
    try {
        // Create connection pool
        const authPool = mariadb.createPool(authDbConfig);
        conn = await authPool.getConnection();

        // Get all users
        console.log('=== All users in database ===');
        const allUsers = await conn.query('SELECT id, username, password, fullName, email, role FROM users');
        console.log(`Found ${allUsers.length} users:`);
        
        for (const user of allUsers) {
            console.log(`- ${user.username} (${user.role}): ${user.password.substring(0, 20)}...`);
        }

        // Test password verification for each user
        console.log('\n=== Testing password verification ===');
        const testPassword = '123456';
        
        for (const user of allUsers) {
            console.log(`\nTesting ${user.username}:`);
            console.log(`Stored hash: ${user.password}`);
            
            const isMatch = await bcrypt.compare(testPassword, user.password);
            console.log(`Password '${testPassword}' matches: ${isMatch}`);
            
            // Also test creating a new hash to compare
            const newHash = await bcrypt.hash(testPassword, 10);
            console.log(`New hash for comparison: ${newHash}`);
            const newHashMatches = await bcrypt.compare(testPassword, newHash);
            console.log(`New hash matches: ${newHashMatches}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (conn) {
            conn.end();
        }
        process.exit(0);
    }
}

// Run the debug script
debugLogin();
