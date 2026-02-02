/**
 * MongoDB Connection Configuration
 * Replaces MariaDB pool for document-based operations
 */

const mongoose = require('mongoose');

const mongoConfig = {
    uri: process.env.MONGODB_URI || 'mongodb://lechibang:1212@localhost:27017/mycelium?authSource=admin',
    options: {
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 60000,
        family: 4, // Use IPv4
        retryWrites: true,
        w: 'majority'
    }
};

let isConnected = false;

/**
 * Connect to MongoDB
 */
async function connectMongoDB() {
    if (isConnected) {
        console.log('[MongoDB] Already connected');
        return mongoose.connection;
    }

    try {
        await mongoose.connect(mongoConfig.uri, mongoConfig.options);
        isConnected = true;
        console.log('[MongoDB] Connected successfully');

        mongoose.connection.on('error', (err) => {
            console.error('[MongoDB] Connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('[MongoDB] Disconnected');
            isConnected = false;
        });

        return mongoose.connection;
    } catch (error) {
        console.error('[MongoDB] Failed to connect:', error);
        throw error;
    }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectMongoDB() {
    if (!isConnected) return;

    try {
        await mongoose.disconnect();
        isConnected = false;
        console.log('[MongoDB] Disconnected successfully');
    } catch (error) {
        console.error('[MongoDB] Disconnect error:', error);
        throw error;
    }
}

/**
 * Get connection status
 */
function getConnectionStatus() {
    return {
        isConnected,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name
    };
}

module.exports = {
    connectMongoDB,
    disconnectMongoDB,
    getConnectionStatus,
    mongoose
};
