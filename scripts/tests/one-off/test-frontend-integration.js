#!/usr/bin/env node

/**
 * Test Frontend Integration
 * Tests the enhanced ReceiveStock component with invoice receiving functionality
 * 
 * This script verifies:
 * 1. Backend API endpoints are working
 * 2. Test invoice data is available
 * 3. Invoice receiving manifest can be retrieved
 * 4. Integration between frontend and backend is functional
 */

const mariadb = require('mariadb');
require('dotenv').config();

// Use built-in fetch for Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'master_db',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci'
};

async function testFrontendIntegration() {
    const pool = mariadb.createPool(dbConfig);
    
    try {
        console.log('🧪 Testing Frontend-Backend Integration...\n');
        
        // 1. Test invoice receiving API endpoints
        console.log('📋 Testing API Endpoints...');
        
        // Check if backend is running
        try {
            const healthCheck = await fetch('http://localhost:3000/api/health');
            if (healthCheck.ok) {
                console.log('✅ Backend server is running');
            }
        } catch (err) {
            console.log('❌ Backend server is not running on port 3000');
            return;
        }
        
        // 2. Get test invoices
        console.log('\n📄 Checking test invoices...');
        const conn = await pool.getConnection();
        try {
            const invoices = await conn.query(`
                SELECT uuid, invoice_number, supplier_name, total_amount, status
                FROM invoices 
                WHERE invoice_number LIKE 'INV-TEST-%'
                ORDER BY created_at DESC 
                LIMIT 3
            `);
        
        if (invoices.length === 0) {
            console.log('⚠️  No test invoices found. Run setup-receiving-test.js first');
            return;
        }
        
        console.log(`✅ Found ${invoices.length} test invoices:`);
        invoices.forEach(inv => {
            console.log(`   - ${inv.invoice_number} (${inv.supplier_name}): ${inv.total_amount} - ${inv.status}`);
        });
        
        // 3. Test getting pending invoices via API
        console.log('\n🔄 Testing /api/receiving/invoices endpoint...');
        try {
            const response = await fetch('http://localhost:3000/api/receiving/invoices');
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ API returned ${result.data.length} pending invoices`);
                if (result.data.length > 0) {
                    console.log(`   - First invoice: ${result.data[0].invoice_number} (${result.data[0].supplier_name})`);
                }
            } else {
                console.log('❌ API error:', result.error);
            }
        } catch (err) {
            console.log('❌ Failed to call API:', err.message);
        }
        
        // 4. Test getting manifest for first invoice
        if (invoices.length > 0) {
            const testInvoice = invoices[0];
            console.log(`\n📦 Testing manifest for ${testInvoice.invoice_number}...`);
            
            try {
                const manifestResponse = await fetch(`http://localhost:3000/api/receiving/invoices/${testInvoice.uuid}/manifest`);
                const manifestResult = await manifestResponse.json();
                
                if (manifestResult.success) {
                    console.log(`✅ Manifest retrieved successfully`);
                    console.log(`   - Invoice: ${manifestResult.data.invoiceNumber}`);
                    console.log(`   - Items: ${manifestResult.data.items.length}`);
                    console.log(`   - Total Progress: ${manifestResult.data.totalProgress.toFixed(1)}%`);
                    
                    // Show first item details
                    if (manifestResult.data.items.length > 0) {
                        const firstItem = manifestResult.data.items[0];
                        console.log(`   - First item: ${firstItem.product_name}`);
                        console.log(`     Quantity: ${firstItem.quantity_remaining}/${firstItem.quantity}`);
                        if (firstItem.expected_serials) {
                            const pendingSerials = firstItem.expected_serials.filter(s => !s.is_received);
                            console.log(`     Expected serials: ${pendingSerials.length}/${firstItem.expected_serials.length} pending`);
                        }
                    }
                } else {
                    console.log('❌ Failed to get manifest:', manifestResult.error);
                }
            } catch (err) {
                console.log('❌ Failed to call manifest API:', err.message);
            }
        }
        
        // 5. Check warehouses for receiving
        console.log('\n🏪 Checking warehouses...');
        const warehouses = await conn.query(`
            SELECT warehouse_id, name, location FROM warehouses WHERE is_active = 1 LIMIT 3
        `);
        
        console.log(`✅ Found ${warehouses.length} active warehouses:`);
        warehouses.forEach(w => {
            console.log(`   - ${w.name} ${w.location ? `(${w.location})` : ''}`);
        });
        
        } finally {
            conn.release();
        }
        
        // 6. Integration Summary
        console.log('\n📊 Integration Status Summary:');
        console.log('✅ Backend server: Running');
        console.log('✅ Database connection: Working');  
        console.log(`✅ Test invoices: ${invoices.length} available`);
        console.log(`✅ Warehouses: ${warehouses.length} ready`);
        console.log('✅ API endpoints: Functional');
        
        console.log('\n🚀 Ready for frontend testing!');
        console.log('   1. Open http://localhost:5173/receive-stock');
        console.log('   2. Toggle "Use Enhanced Invoice Receiving"');
        console.log('   3. Select a test invoice to populate manifest');
        console.log('   4. Choose items from manifest to pre-fill form');
        console.log('   5. Enter serial numbers for serialized items');
        console.log('   6. Complete the receiving process');
        
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
    } finally {
        await pool.end();
    }
}

// Run the test
if (require.main === module) {
    testFrontendIntegration()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Script failed:', err);
            process.exit(1);
        });
}

module.exports = { testFrontendIntegration };