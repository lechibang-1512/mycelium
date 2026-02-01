
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

async function describeTables() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('Connected to database');

        const tables = ['smartphone_spare_parts_inventory', 'warehouse_product_locations', 'assets', 'inventory_log'];

        for (const table of tables) {
            console.log(`\n--- Structure of ${table} ---`);
            const rows = await conn.query(`DESCRIBE ${table}`);
            console.table(rows);
        }

    } catch (err) {
        console.error('Error describing tables:', err);
    } finally {
        if (conn) conn.release();
        process.exit();
    }
}

describeTables();
