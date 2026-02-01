require('dotenv').config();
const pool = require('../backend/config/database');
const InvoiceParser = require('../backend/services/InvoiceParser');
const fs = require('fs');
const path = require('path');

async function testInvoiceSystem() {
    console.log('🧾 Testing Invoice Import System...\n');
    
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('✅ Database connection successful');
        
        // Create a test XML invoice
        console.log('\n📄 Creating test XML invoice...');
        const testInvoiceXML = `<?xml version="1.0" encoding="UTF-8"?>
<invoice>
    <general_info>
        <invoice_number>INV-TEST-2024-001</invoice_number>
        <invoice_date>2024-01-30</invoice_date>
        <currency>VND</currency>
    </general_info>
    <seller>
        <company_name>Test Electronics Supplier</company_name>
        <tax_code>1234567890</tax_code>
    </seller>
    <items>
        <item>
            <product_name>iPhone 15 Pro Max 256GB Natural Titanium</product_name>
            <quantity>2</quantity>
            <unit_price>32000000</unit_price>
            <line_total>64000000</line_total>
            <serial_numbers>
                <serial_number>TEST123456789</serial_number>
                <serial_number>TEST987654321</serial_number>
            </serial_numbers>
        </item>
        <item>
            <product_name>Samsung Galaxy S24 Screen LCD</product_name>
            <quantity>5</quantity>
            <unit_price>850000</unit_price>
            <line_total>4250000</line_total>
        </item>
    </items>
    <summary>
        <total_amount>68250000</total_amount>
        <vat_amount>6825000</vat_amount>
        <final_amount>75075000</final_amount>
    </summary>
</invoice>`;
        
        // Test XML parsing
        console.log('🔍 Testing XML invoice parsing...');
        const parser = new InvoiceParser();
        const parsedInvoice = parser.parse(testInvoiceXML);
        
        if (parsedInvoice.success) {
            console.log('✅ XML parsing successful');
            console.log(`Invoice Number: ${parsedInvoice.data.invoice_number}`);
            console.log(`Items Count: ${parsedInvoice.data.items?.length || 0}`);
            console.log(`Total Amount: ${parsedInvoice.data.total_amount}`);
            
            if (parsedInvoice.data.items && parsedInvoice.data.items.length > 0) {
                console.log('\nItems:');
                parsedInvoice.data.items.forEach((item, index) => {
                    console.log(`  ${index + 1}. ${item.product_name}: ${item.quantity} x ${item.unit_price}`);
                    if (item.serial_numbers && item.serial_numbers.length > 0) {
                        console.log(`     Serials: ${item.serial_numbers.join(', ')}`);
                    }
                });
            }
        } else {
            console.log('❌ XML parsing failed:', parsedInvoice.error);
        }
        
        // Test JSON parsing
        console.log('\n🔍 Testing JSON invoice parsing...');
        const testInvoiceJSON = JSON.stringify({
            invoice_number: 'INV-JSON-2024-001',
            supplier_name: 'JSON Test Supplier',
            invoice_date: '2024-01-30',
            total_amount: 1500000,
            currency: 'VND',
            items: [
                {
                    product_name: 'iPhone 14 Battery',
                    quantity: 3,
                    unit_price: 500000,
                    line_total: 1500000,
                    serial_numbers: ['BAT001', 'BAT002', 'BAT003']
                }
            ]
        });
        
        const parsedJSON = parser.parse(testInvoiceJSON);
        if (parsedJSON.success) {
            console.log('✅ JSON parsing successful');
            console.log(`Invoice Number: ${parsedJSON.data.invoice_number}`);
            console.log(`Items Count: ${parsedJSON.data.items?.length || 0}`);
        } else {
            console.log('❌ JSON parsing failed:', parsedJSON.error);
        }
        
        // Check if we can create products
        console.log('\n📋 Testing product creation capabilities...');
        const productExists = await conn.query(`
            SELECT COUNT(*) as count 
            FROM products 
            WHERE name LIKE '%iPhone%' 
            LIMIT 1
        `);
        
        console.log(`Existing iPhone products: ${productExists[0].count}`);
        
        console.log('\n🎉 Invoice system test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (conn) conn.release();
        await pool.end();
    }
}

testInvoiceSystem();