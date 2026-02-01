require('dotenv').config();
const pool = require('../backend/config/database');
const InvoiceParser = require('../backend/services/InvoiceParser');
const InvoiceImportService = require('../backend/services/InvoiceImportService');
const fs = require('fs');
const path = require('path');

async function setupInvoiceReceivingTest() {
    console.log('🔧 Setting up Invoice Receiving Test Data...\n');
    
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('✅ Database connection successful');
        
        // 1. Import a test invoice with serial tracking
        console.log('\n📄 Importing test invoice...');
        
        const testInvoice = {
            invoice_number: 'TEST-RECV-2024-001',
            supplier_name: 'Test Electronics Supplier',
            invoice_date: '2024-01-30',
            total_amount: 35000000,
            currency: 'VND',
            items: [
                {
                    product_name: 'iPhone 14 Pro 256GB Space Black',
                    quantity: 2,
                    unit_price: 25000000,
                    line_total: 50000000,
                    tax_rate: 10,
                    tax_amount: 5000000,
                    serial_numbers: ['IP14PRO-TEST-001', 'IP14PRO-TEST-002']
                },
                {
                    product_name: 'Samsung Galaxy S24 Screen LCD OEM',
                    quantity: 5,
                    unit_price: 1500000,
                    line_total: 7500000,
                    tax_rate: 10,
                    tax_amount: 750000,
                    serial_numbers: ['SGS24-LCD-TEST-001', 'SGS24-LCD-TEST-002', 'SGS24-LCD-TEST-003', 'SGS24-LCD-TEST-004', 'SGS24-LCD-TEST-005']
                },
                {
                    product_name: 'USB-C Cable 3M Premium Quality',
                    quantity: 10,
                    unit_price: 150000,
                    line_total: 1500000,
                    tax_rate: 10,
                    tax_amount: 150000,
                    serial_numbers: []  // No serial tracking for cables
                }
            ]
        };
        
        // Use the import service
        const parser = new InvoiceParser();
        const importService = new InvoiceImportService(pool);
        
        // Convert to JSON string first
        const testInvoiceJSON = JSON.stringify(testInvoice);
        const result = await importService.importInvoice(testInvoiceJSON, 'json');
        
        if (result.success) {
            console.log('✅ Test invoice imported successfully');
            console.log(`   Invoice ID: ${result.invoiceUuid}`);
            console.log(`   Items: ${result.itemCount}`);
            
            // 2. Verify the invoice was created properly
            console.log('\n📋 Verifying invoice details...');
            
            const [invoice] = await conn.query(`
                SELECT uuid, invoice_number, supplier_id, status, verification_status, total_amount
                FROM invoices 
                WHERE uuid = ?
            `, [result.invoiceUuid]);
            
            if (invoice) {
                console.log(`   Invoice: ${invoice.invoice_number} (${invoice.status})`);
                console.log(`   Verification: ${invoice.verification_status}`);
                
                // Get items
                const items = await conn.query(`
                    SELECT product_name, quantity, unit_price, product_uuid
                    FROM invoice_items 
                    WHERE invoice_id = (SELECT id FROM invoices WHERE uuid = ?)
                `, [result.invoiceUuid]);
                
                console.log(`   Items: ${items.length}`);
                items.forEach(item => {
                    console.log(`     - ${item.product_name}: ${item.quantity} x ${item.unit_price?.toLocaleString('vi-VN')}`);
                });
                
                // Get expected serials
                const serials = await conn.query(`
                    SELECT es.expected_serial, p.name as product_name
                    FROM expected_serials es
                    JOIN products p ON es.product_id = p.product_id
                    WHERE es.invoice_id = (SELECT id FROM invoices WHERE uuid = ?)
                    ORDER BY p.name
                `, [result.invoiceUuid]);
                
                console.log(`   Expected Serials: ${serials.length}`);
                const serialsByProduct = serials.reduce((acc, s) => {
                    if (!acc[s.product_name]) acc[s.product_name] = [];
                    acc[s.product_name].push(s.expected_serial);
                    return acc;
                }, {});
                
                Object.entries(serialsByProduct).forEach(([productName, serialList]) => {
                    console.log(`     - ${productName}: ${serialList.length} serials`);
                    console.log(`       ${serialList.join(', ')}`);
                });
                
                // 3. Check if we have warehouses
                console.log('\n🏪 Checking warehouse setup...');
                const warehouses = await conn.query(`
                    SELECT warehouse_id, name FROM warehouses WHERE is_active = 1 LIMIT 1
                `);
                
                if (warehouses.length === 0) {
                    console.log('⚠️  No warehouses found. Creating test warehouse...');
                    
                    await conn.query(`
                        INSERT INTO warehouses (warehouse_id, name, location, description, is_active, created_at)
                        VALUES (UUID(), 'Main Test Warehouse', 'Test Location', 'Test warehouse for receiving', 1, NOW())
                    `);
                    
                    const [newWarehouse] = await conn.query(`
                        SELECT warehouse_id, name FROM warehouses WHERE name = 'Main Test Warehouse'
                    `);
                    console.log(`✅ Created warehouse: ${newWarehouse.name} (${newWarehouse.warehouse_id})`);
                } else {
                    console.log(`✅ Using existing warehouse: ${warehouses[0].name}`);
                }
                
                console.log('\n🎯 Test Setup Complete!');
                console.log('\n📋 Test Invoice Details:');
                console.log(`   UUID: ${result.invoiceUuid}`);
                console.log(`   Number: ${invoice.invoice_number}`);
                console.log(`   Items: ${items.length} products`);
                console.log(`   Serial tracking: ${serials.length} expected serials`);
                console.log('\n💡 Ready to test receiving endpoints:');
                console.log(`   GET /api/receiving/invoices - Should show this invoice`);
                console.log(`   GET /api/receiving/invoices/${result.invoiceUuid}/manifest - Get details`);
                console.log(`   POST /api/receiving/invoices/${result.invoiceUuid}/receive - Receive stock`);
                
            } else {
                console.log('❌ Invoice verification failed');
            }
            
        } else {
            console.log('❌ Invoice import failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (conn) conn.release();
        await pool.end();
    }
}

setupInvoiceReceivingTest();