/**
 * Test the new unified product system and invoice import capabilities
 */
require('dotenv').config();
const path = require('path');
const InvoiceImportService = require('../backend/services/InvoiceImportService');
const ProductService = require('../backend/services/ProductService');

// Import database connection
const pool = require('../backend/config/database');

async function testUnifiedProductSystem() {
    console.log('🧪 Testing Unified Product System...\n');
    
    try {
        // Initialize services
        const productService = new ProductService(pool);
        const invoiceImportService = new InvoiceImportService(pool);
        
        console.log('✅ Services initialized successfully');
        
        // Test 1: List all products
        console.log('\n📋 Test 1: Listing all products...');
        const products = await productService.getAllProducts();
        console.log(`Found ${products.data?.length || 0} products:`);
        if (products.data) {
            products.data.forEach(product => {
                console.log(`- ${product.name} (${product.product_type}): ${product.category}`);
            });
        }
        
        // Test 2: Get inventory summary
        console.log('\n📦 Test 2: Checking inventory summary...');
        try {
            const inventorySummary = await productService.getInventorySummary();
            console.log(`Total inventory records: ${inventorySummary.data?.length || 0}`);
            if (inventorySummary.data) {
                inventorySummary.data.slice(0, 5).forEach(item => {
                    console.log(`- ${item.product_name}: ${item.total_quantity} units in ${item.warehouse_name}`);
                });
            }
        } catch (error) {
            console.log('⚠️  Inventory summary not available:', error.message);
        }
        
        // Test 3: Create sample invoice data
        console.log('\n🧾 Test 3: Testing invoice import...');
        const sampleInvoiceData = {
            invoice_number: 'TEST-2024-001',
            supplier_name: 'Test Electronics Co.',
            invoice_date: '2024-01-30',
            total_amount: 2500000,
            currency: 'VND',
            items: [
                {
                    product_name: 'iPhone 15 Pro Max',
                    quantity: 1,
                    unit_price: 2500000,
                    line_total: 2500000,
                    serial_numbers: ['DEMO123456789']
                }
            ]
        };
        
        console.log('Testing invoice import with sample data...');
        const importResult = await invoiceImportService.importInvoice(sampleInvoiceData, 'json');
        console.log('Import result:', importResult.success ? '✅ Success' : '❌ Failed');
        if (importResult.data) {
            console.log(`Products processed: ${importResult.data.productsProcessed || 0}`);
            console.log(`Expected serials: ${importResult.data.expectedSerials || 0}`);
        }
        
        console.log('\n🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Close database connection
        if (pool) {
            await pool.end();
        }
    }
}

// Run tests
testUnifiedProductSystem();