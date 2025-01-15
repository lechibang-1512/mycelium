const { Sequelize } = require('sequelize');

// Load env vars if they aren't loaded yet (typically loaded in server.cjs first, but good for standalone scripts)
if (!process.env.DB_USER && process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const dbConfigCommon = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mariadb',
    logging: false,
    pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 300000
    },
    dialectOptions: {
        bigIntAsNumber: true,
        connectTimeout: 10000,
        timeout: 60000,
        allowPublicKeyRetrieval: true,
        compress: true,
        ...(process.env.DB_SOCKET ? { socketPath: process.env.DB_SOCKET } : {})
    },
    define: {
        // Prevent sequelize from pluralizing table names globally, since existing DB might have singular/specific names
        freezeTableName: true,
        // Don't add timestamp attributes (updatedAt, createdAt) automatically unless explicitly defined
        timestamps: false
    }
};

// Instance for master_db (Core Business logic)
const sequelizeMaster = new Sequelize(
    process.env.DB_NAME || 'master_db',
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    dbConfigCommon
);

// Instance for security_db (Auth & RBAC)
// Uses AUTH_DB_* env vars, falling back to DB_* for backward compatibility
const sequelizeSecurity = new Sequelize(
    process.env.AUTH_DB_NAME || process.env.DB_SECURITY_NAME || 'security_db',
    process.env.AUTH_DB_USER || process.env.DB_USER,
    process.env.AUTH_DB_PASSWORD || process.env.DB_PASSWORD,
    {
        ...dbConfigCommon,
        host: process.env.AUTH_DB_HOST || dbConfigCommon.host,
        port: process.env.AUTH_DB_PORT || dbConfigCommon.port,
    }
);

module.exports = {
    sequelizeMaster,
    sequelizeSecurity
};
