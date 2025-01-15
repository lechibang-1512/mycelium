const mariadb = require('mariadb');
require('dotenv').config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'lechibang',
    password: process.env.DB_PASSWORD || '1212',
    database: 'master_db',
    connectionLimit: 5
});

async function cleanupTestPhones() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('Connected to database...');

        // 1. Find Test Phones
        const products = await conn.query("SELECT product_id, device_name FROM specs_db WHERE device_name LIKE '%Test Phone%'");
        console.log(`Found ${products.length} 'Test Phone' products.`);

        if (products.length === 0) {
            console.log('No test phones found.');
            return;
        }

        const productIds = products.map(p => p.product_id);

        // 2. Delete from serialized_inventory
        // Using IN clause for efficiency
        const deleteInventoryResult = await conn.query(`DELETE FROM serialized_inventory WHERE product_id IN (?)`, [productIds]);
        console.log(`Deleted ${deleteInventoryResult.affectedRows} items from serialized_inventory.`);

        // 3. Delete from specs_db
        const deleteSpecsResult = await conn.query(`DELETE FROM specs_db WHERE product_id IN (?)`, [productIds]);
        console.log(`Deleted ${deleteSpecsResult.affectedRows} products from specs_db.`);

        console.log('Cleanup complete.');

    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        if (conn) conn.release();
        pool.end();
    }
}

cleanupTestPhones();
