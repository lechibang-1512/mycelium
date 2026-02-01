require('dotenv').config();
const mariadb = require('mariadb');
const InventoryService = require('../../backend/services/InventoryService');

// Mock pool
const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'lechibang',
    password: process.env.DB_PASSWORD || '1212',
    database: 'master_db',
    connectionLimit: 10
});

async function testZoneStatus() {
    try {
        const inventoryService = new InventoryService(pool);
        console.log('Fetching zone inventory status...');
        console.log('Result:', JSON.stringify(status, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
            , 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

testZoneStatus();
