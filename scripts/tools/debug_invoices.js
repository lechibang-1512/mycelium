require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('../backend/config/database');

async function check() {
    try {
        console.log('Checking invoices table schema and data...');

        const columns = await pool.query("SHOW COLUMNS FROM master_db.invoices");
        console.log('Columns:', columns.map(c => `${c.Field} (${c.Type})`));

        const nullUuidCount = await pool.query("SELECT COUNT(*) as count FROM master_db.invoices WHERE uuid IS NULL OR uuid = ''");
        console.log('Invoices with NULL/Empty UUID:', nullUuidCount[0].count);

        if (Number(nullUuidCount[0].count) > 0) {
            console.log('⚠️  FOUND RECORDS WITH MISSING UUID!');
            const badInvoices = await pool.query("SELECT id, invoice_number, created_at FROM master_db.invoices WHERE uuid IS NULL OR uuid = '' LIMIT 5");
            console.log('Sample bad invoices:', badInvoices);
        } else {
            console.log('✅ All invoices have valid UUIDs.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
