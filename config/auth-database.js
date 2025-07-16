// Load environment variables
require('dotenv').config();

module.exports = {
    development: {
        host: process.env.AUTH_DB_HOST || 'localhost',
        port: process.env.AUTH_DB_PORT || 3306,
        user: process.env.AUTH_DB_USER,
        // Do NOT log or expose the password in any logs
        password: process.env.AUTH_DB_PASSWORD,
        database: process.env.AUTH_DB_NAME || 'users_db',
        connectionLimit: 5,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        bigIntAsNumber: true // Convert BigInt to Number
    },
    production: {
        host: process.env.AUTH_DB_HOST,
        port: process.env.AUTH_DB_PORT || 3306,
        user: process.env.AUTH_DB_USER,
        password: process.env.AUTH_DB_PASSWORD,
        database: process.env.AUTH_DB_NAME,
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        ssl: process.env.AUTH_DB_SSL === 'true' ? {
            rejectUnauthorized: false
        } : false
    }
};
