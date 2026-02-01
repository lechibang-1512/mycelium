const mariadb = require('mariadb');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
};

async function generateReport() {
    let pool;
    try {
        pool = mariadb.createPool(config);
        const conn = await pool.getConnection();

        console.log('\n=== Unallocated Inventory (Staging) Report ===\n');
        console.log('Timestamp:', new Date().toLocaleString());
        console.log('----------------------------------------------------');

        // Query: Get products with differences between Total Owned (staging_inventory) vs Allocated
        // Wait, under new logic:
        // staging_inventory = Staging (Unallocated)
        // SUM(locations) = Allocated
        // Total = Staging + Allocated

        // So we just want to list products where staging_inventory > 0 (Meaning items are in Staging)
        // And maybe show allocated count for context.

        const rows = await conn.query(`
            SELECT 
                s.product_id,
                s.device_name,
                s.device_maker,
                s.staging_inventory as staging_qty,
                COALESCE(loc.allocated_qty, 0) as allocated_qty,
                (s.staging_inventory + COALESCE(loc.allocated_qty, 0)) as total_owned
            FROM specs_db s
            LEFT JOIN (
                SELECT product_id, SUM(quantity) as allocated_qty
                FROM warehouse_product_locations
                GROUP BY product_id
            ) loc ON s.product_id = loc.product_id
            WHERE s.staging_inventory > 0
            ORDER BY s.staging_inventory DESC
        `);

        if (rows.length === 0) {
            console.log('No unallocated inventory (Staging is empty).');
        } else {
            console.log(String('ID').padEnd(6) + String('Product').padEnd(40) + String('Staging').padStart(10) + String('Allocated').padStart(12) + String('Total').padStart(10));
            console.log('-'.repeat(80));

            rows.forEach(row => {
                console.log(
                    String(row.product_id).padEnd(6) +
                    String((row.device_maker + ' ' + row.device_name).substring(0, 38)).padEnd(40) +
                    String(row.staging_qty).padStart(10) +
                    String(row.allocated_qty).padStart(12) +
                    String(row.total_owned).padStart(10)
                );
            });

            const totalStaging = rows.reduce((sum, r) => sum + r.staging_qty, 0);
            console.log('-'.repeat(80));
            console.log(`TOTAL ITEMS IN STAGING: ${totalStaging}`);
        }

        conn.release();

    } catch (err) {
        console.error('Error generating report:', err);
    } finally {
        if (pool) await pool.end();
    }
}

generateReport();
