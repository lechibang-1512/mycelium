require('dotenv').config();
const InvoiceParser = require('../backend/services/InvoiceParser');

async function simpleInvoiceTest() {
    console.log('🧾 Simple Invoice Parser Test...\n');
    
    try {
        const parser = new InvoiceParser();
        
        // Test JSON parsing
        console.log('🔍 Testing JSON parsing...');
        const testJSON = `{
            "invoice_number": "TEST-001",
            "supplier_name": "Test Supplier",
            "invoice_date": "2024-01-30",
            "total_amount": 1000000,
            "currency": "VND",
            "items": [
                {
                    "product_name": "Test Product",
                    "quantity": 1,
                    "unit_price": 1000000,
                    "line_total": 1000000
                }
            ]
        }`;
        
        const result = await parser.parse(testJSON, 'json');
        console.log('✅ JSON parsing successful');
        console.log('Parsed data:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

simpleInvoiceTest();