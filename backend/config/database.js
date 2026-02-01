const mariadb = require('mariadb');

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'master_db',
    connectionLimit: 20,
    acquireTimeout: 30000,
    connectTimeout: 10000,
    timeout: 60000,
    bigIntAsNumber: true,
    idleTimeout: 300000,
    minimumIdle: 5,
    leakDetectionTimeout: 30000,
    allowPublicKeyRetrieval: true,
    compress: true
};

const pool = mariadb.createPool(dbConfig);

module.exports = pool;
