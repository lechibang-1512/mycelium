const fs = require('fs');
const path = require('path');
const InvoiceImportService = require('../backend/services/InvoiceImportService');
const pool = require('../backend/config/database');

async function testInvoiceImport() {
    try {
        console.log('🧪 Testing Invoice Import System...\n');

        const service = new InvoiceImportService(pool);

        // Test XML import
        console.log('1. Testing XML import...');
        const xmlPath = path.join(__dirname, '../tests/fixtures/sample_invoice.xml');
        if (fs.existsSync(xmlPath)) {
            const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
            const xmlResult = await service.importInvoice(xmlContent, 'xml');
            console.log('✅ XML Import Result:', xmlResult);
        } else {
            console.log('⚠️  Sample XML not found, skipping XML test');
        }

        // Test JSON import
        console.log('\n2. Testing JSON import...');
        const jsonPath = path.join(__dirname, '../templates/invoice_template.json');
        if (fs.existsSync(jsonPath)) {
            const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
            const jsonResult = await service.importInvoice(jsonContent, 'json');
            console.log('✅ JSON Import Result:', jsonResult);
        }

        // Test CSV import
        console.log('\n3. Testing CSV import...');
        const csvPath = path.join(__dirname, '../templates/invoice_template.csv');
        if (fs.existsSync(csvPath)) {
            const csvContent = fs.readFileSync(csvPath, 'utf-8');
            const csvResult = await service.importInvoice(csvContent, 'csv');
            console.log('✅ CSV Import Result:', csvResult);
        }

        // Test auto-detection
        console.log('\n4. Testing auto-detection...');
        const autoXmlResult = await service.importInvoice(xmlContent || '<?xml version="1.0"?><Invoice><GeneralInfo><invoiceNumber>AUTO-TEST</invoiceNumber><date>2024-01-01</date></GeneralInfo><Seller><name>Test Supplier</name></Seller><Items><Item><productName>Test Product</productName><quantity>1</quantity><unitPrice>1000</unitPrice></Item></Items></Invoice>', 'auto');
        console.log('✅ Auto-detection Result:', autoXmlResult);

        console.log('\n🎉 All tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    testInvoiceImport();
}

module.exports = { testInvoiceImport };