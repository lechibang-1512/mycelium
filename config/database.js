module.exports = {
    development: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'master_specs_db',
        connectionLimit: 5,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
    },
    production: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        ssl: process.env.DB_SSL === 'true' ? {
            rejectUnauthorized: false
        } : false
    }
};
