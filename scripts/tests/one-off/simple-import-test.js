require('dotenv').config();
const fs = require('fs');
const path = require('path');
const InvoiceParser = require('../backend/services/InvoiceParser');
const InvoiceImportService = require('../backend/services/InvoiceImportService');
const pool = require('../backend/config/database');

async function simpleImportTest() {
    console.log('🧾 Simple Invoice Import Test...\n');
    
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('✅ Database connection successful');
        
        const parser = new InvoiceParser();
        
        // Test simple JSON invoice
        console.log('\n📄 Testing JSON Invoice Parsing...');
        const testInvoiceJSON = {
            invoice_number: 'TEST-SIMPLE-001',
            supplier_name: 'Test Supplier',
            invoice_date: '2024-01-30',
            total_amount: 1500000,
            currency: 'VND',
            items: [
                {
                    product_name: 'iPhone 14 Pro Max 256GB Space Black',
                    quantity: 1,
                    unit_price: 25000000,
                    line_total: 25000000,
                    tax_rate: 10,
                    tax_amount: 2500000,
                    serial_numbers: ['TEST-IP14PM-001']
                },
                {
                    product_name: 'Samsung Galaxy S24 Screen LCD', 
                    quantity: 3,
                    unit_price: 1500000,
                    line_total: 4500000,
                    tax_rate: 10,
                    tax_amount: 450000,
                    serial_numbers: ['TEST-SGS24-LCD-001', 'TEST-SGS24-LCD-002', 'TEST-SGS24-LCD-003']
                }
            ]
        };
        
        const parsed = await parser.parse(JSON.stringify(testInvoiceJSON), 'json');
        
        console.log('✅ Parsed Invoice:');
        console.log(`   Invoice: ${parsed.invoiceNumber}`);
        console.log(`   Total: ${parsed.totalAmount?.toLocaleString('vi-VN')} ${parsed.currency}`);
        console.log(`   Items: ${parsed.items?.length || 0}`);
        
        if (parsed.items && parsed.items.length > 0) {
            console.log('\n📦 Items parsed:');
            parsed.items.forEach((item, index) => {
                const serialCount = item.serials ? item.serials.split(',').filter(s => s.trim()).length : 0;
                console.log(`   ${index + 1}. ${item.name}`);
                console.log(`      Qty: ${item.quantity} | Price: ${item.unitPrice?.toLocaleString('vi-VN')} | Serials: ${serialCount}`);
                if (item.serials) {
                    console.log(`      Serial Numbers: ${item.serials}`);
                }
            });
        }
        
        // Check current product count
        console.log('\n📋 Current database state:');
        const productCount = await conn.query('SELECT COUNT(*) as count FROM products');
        const inventoryCount = await conn.query('SELECT COUNT(*) as count FROM product_inventory');
        const expectedCount = await conn.query('SELECT COUNT(*) as count FROM expected_serials');
        
        console.log(`   Products: ${productCount[0].count}`);
        console.log(`   Inventory records: ${inventoryCount[0].count}`);  
        console.log(`   Expected serials: ${expectedCount[0].count}`);
        
        console.log('\n🎯 Test completed successfully!');
        console.log('\n💡 To test actual import:');
        console.log('   1. POST /api/invoices/import with invoice data');
        console.log('   2. Or save invoice as file and use file upload API');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (conn) conn.release();
        await pool.end();
    }
}

simpleImportTest();