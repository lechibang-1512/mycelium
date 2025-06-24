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

async function createUsers() {
    let conn;
    try {
        // Create connection pool
        const authPool = mariadb.createPool(authDbConfig);
        conn = await authPool.getConnection();

        // Hash password for all users
        const hashedPassword = await bcrypt.hash('123456', 10);

        // Define users to create/update
        const users = [
            { username: 'admin', fullName: 'Administrator', email: 'admin@example.com', role: 'admin' },
            { username: 'staff', fullName: 'Staff User', email: 'staff@example.com', role: 'staff' },
            { username: 'user', fullName: 'Regular User', email: 'user@example.com', role: 'user' }
        ];

        // Process each user - update if exists, create if not
        for (const user of users) {
            // Check if user exists
            const existingUser = await conn.query('SELECT username FROM users WHERE username = ?', [user.username]);
            
            if (existingUser.length > 0) {
                // User exists - update password hash and other details
                await conn.query(
                    'UPDATE users SET password = ?, fullName = ?, email = ?, role = ? WHERE username = ?',
                    [hashedPassword, user.fullName, user.email, user.role, user.username]
                );
                console.log(`Updated user: ${user.username} with new password hash`);
            } else {
                // User doesn't exist - create new user
                await conn.query(
                    'INSERT INTO users (username, password, fullName, email, role) VALUES (?, ?, ?, ?, ?)',
                    [user.username, hashedPassword, user.fullName, user.email, user.role]
                );
                console.log(`Created user: ${user.username}`);
            }
        }

        console.log('\nAll users processed successfully!');
        console.log('Password hash updated for all users with password: 123456');
        console.log('\nUsers processed:');
        console.log('- admin (Administrator role)');
        console.log('- staff (Staff role)');
        console.log('- user (User role)');

    } catch (error) {
        console.error('Error creating users:', error);
    } finally {
        if (conn) {
            conn.end();
        }
        process.exit(0);
    }
}

// Run the script
createUsers();
