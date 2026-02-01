const mariadb = require('mariadb');
const InventoryService = require('../../backend/services/InventoryService');
require('dotenv').config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'lechibang',
    password: process.env.DB_PASSWORD || '1212',
    database: 'master_db',
    connectionLimit: 5
});

async function verifyInventoryCounts() {
    let conn;
    try {
        const inventoryService = new InventoryService(pool);
        console.log('Fetching inventory...');

        // Fetch a few items to verify counts
        const items = await inventoryService.getAllInventory({ limit: 5 });

        console.log(`Fetched ${items.length} items.`);
        items.forEach(item => {
            console.log(`Product: ${item.device_maker} ${item.device_name} - Total Inventory: ${item.total_inventory}`);
        });

    } catch (err) {
        console.error('Error verifying inventory:', err);
    } finally {
        pool.end();
    }
}

verifyInventoryCounts();
