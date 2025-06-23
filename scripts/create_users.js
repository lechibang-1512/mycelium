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

        // Check if users already exist
        const existingUsers = await conn.query('SELECT username FROM users WHERE username IN (?, ?, ?)', ['admin', 'staff', 'user']);
        
        if (existingUsers.length > 0) {
            console.log('Some users already exist. Updating their passwords...');
            
            // Update existing users' passwords
            for (const user of existingUsers) {
                await conn.query('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, user.username]);
                console.log(`Updated password for user: ${user.username}`);
            }
            
            // Check which users need to be created
            const existingUsernames = existingUsers.map(u => u.username);
            const usersToCreate = [
                { username: 'admin', fullName: 'Administrator', email: 'admin@example.com', role: 'admin' },
                { username: 'staff', fullName: 'Staff User', email: 'staff@example.com', role: 'staff' },
                { username: 'user', fullName: 'Regular User', email: 'user@example.com', role: 'user' }
            ].filter(u => !existingUsernames.includes(u.username));
            
            // Create missing users
            for (const user of usersToCreate) {
                await conn.query(
                    'INSERT INTO users (username, password, fullName, email, role) VALUES (?, ?, ?, ?, ?)',
                    [user.username, hashedPassword, user.fullName, user.email, user.role]
                );
                console.log(`Created user: ${user.username}`);
            }
        } else {
            // Create all three users
            const users = [
                { username: 'admin', fullName: 'Administrator', email: 'admin@example.com', role: 'admin' },
                { username: 'staff', fullName: 'Staff User', email: 'staff@example.com', role: 'staff' },
                { username: 'user', fullName: 'Regular User', email: 'user@example.com', role: 'user' }
            ];

            for (const user of users) {
                await conn.query(
                    'INSERT INTO users (username, password, fullName, email, role) VALUES (?, ?, ?, ?, ?)',
                    [user.username, hashedPassword, user.fullName, user.email, user.role]
                );
                console.log(`Created user: ${user.username}`);
            }
        }

        console.log('\nAll users created/updated successfully!');
        console.log('Password for all users: 123456');
        console.log('\nUsers created:');
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
