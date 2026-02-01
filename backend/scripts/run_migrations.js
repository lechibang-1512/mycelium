/**
 * Database Migration Script
 * Adds required columns for inventory rework features:
 * - rma.customer_invoice_id - Links RMAs to customer invoices for warranty tracking
 * - invoice_items.spare_part_id - Enables spare parts in invoice manifests
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mariadb = require('mariadb');

const migrations = [
    {
        name: 'Add customer_invoice_id to rma table',
        check: `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'rma' 
            AND COLUMN_NAME = 'customer_invoice_id'`,
        sql: 'ALTER TABLE rma ADD COLUMN customer_invoice_id INT NULL'
    },
    {
        name: 'Add spare_part_id to invoice_items table',
        check: `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'invoice_items' 
            AND COLUMN_NAME = 'spare_part_id'`,
        sql: 'ALTER TABLE invoice_items ADD COLUMN spare_part_id INT NULL'
    }
];

async function runMigrations() {
    const pool = mariadb.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'mycelium_dev',
        connectionLimit: 1
    });

    let conn;
    try {
        conn = await pool.getConnection();
        console.log('Connected to database\n');

        for (const migration of migrations) {
            console.log(`Checking: ${migration.name}...`);

            // Check if column already exists
            const [checkResult] = await conn.query(migration.check);
            if (checkResult.count > 0) {
                console.log(`  ✓ Already exists, skipping\n`);
                continue;
            }

            // Run migration
            console.log(`  Running: ${migration.sql}`);
            await conn.query(migration.sql);
            console.log(`  ✓ Success\n`);
        }

        console.log('All migrations completed successfully!');
    } catch (err) {
        console.error('Migration error:', err.message);
        process.exit(1);
    } finally {
        if (conn) conn.release();
        pool.end();
    }
}

runMigrations();
