const fs = require('fs');
const InvoiceImportService = require('../../backend/services/InvoiceImportService');
const pool = require('../../backend/config/database');

const filePath = process.argv[2];

if (!filePath) {
    console.error('Usage: node scripts/import_xml_invoice.js <path_to_xml>');
    process.exit(1);
}

async function run() {
    try {
        const xmlContent = fs.readFileSync(filePath, 'utf-8');
        const service = new InvoiceImportService(pool);

        console.log(`Processing ${filePath}...`);
        const result = await service.importInvoice(xmlContent);

        console.log('✅ Import Successful!');
        console.log(JSON.stringify(result, (_, v) => typeof v === 'bigint' ? Number(v) : v, 2));
    } catch (err) {
        console.error('❌ Import Failed:', err);
    } finally {
        await pool.end();
    }
}

run();
