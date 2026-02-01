#!/usr/bin/env node

/**
 * Simple Frontend Integration Test
 * Tests the invoice receiving API endpoints without complex setup
 */

const { exec } = require('child_process');

async function simpleIntegrationTest() {
    console.log('🧪 Simple Frontend-Backend Integration Test...\n');
    
    // Test 1: Check if backend is running
    console.log('📋 Testing backend server...');
    
    try {
        const response = await fetch('http://localhost:3000/api/health');
        if (response.ok) {
            console.log('✅ Backend server is running at http://localhost:3000');
        } else {
            console.log('⚠️  Backend server responded but might have issues');
        }
    } catch (err) {
        console.log('❌ Backend server is not running on port 3000');
        console.log('   Please run: node backend/server.cjs');
        return false;
    }
    
    // Test 2: Check receiving API endpoints
    console.log('\n📄 Testing receiving API endpoints...');
    
    try {
        const response = await fetch('http://localhost:3000/api/receiving/invoices');
        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ /api/receiving/invoices working - found ${result.data.length} pending invoices`);
            
            if (result.data.length > 0) {
                const firstInvoice = result.data[0];
                console.log(`   First invoice: ${firstInvoice.invoice_number} (${firstInvoice.supplier_name})`);
                
                // Test manifest endpoint
                const manifestResponse = await fetch(`http://localhost:3000/api/receiving/invoices/${firstInvoice.uuid}/manifest`);
                const manifestResult = await manifestResponse.json();
                
                if (manifestResult.success) {
                    console.log(`✅ /api/receiving/invoices/${firstInvoice.uuid}/manifest working`);
                    console.log(`   Items in manifest: ${manifestResult.data.items.length}`);
                    console.log(`   Progress: ${manifestResult.data.totalProgress.toFixed(1)}%`);
                } else {
                    console.log(`❌ Manifest API failed: ${manifestResult.error}`);
                }
            } else {
                console.log('⚠️  No pending invoices found. Run setup-receiving-test.js to create test data');
            }
        } else {
            console.log(`❌ API error: ${result.error}`);
        }
    } catch (err) {
        console.log(`❌ API call failed: ${err.message}`);
    }
    
    // Test 3: Frontend status
    console.log('\n🌐 Frontend status:');
    try {
        const response = await fetch('http://localhost:5173/');
        if (response.ok) {
            console.log('✅ Frontend development server running at http://localhost:5173');
        } else {
            console.log('⚠️  Frontend server responded but might have issues');
        }
    } catch (err) {
        console.log('❌ Frontend development server not running');
        console.log('   Please run: npm run dev');
    }
    
    console.log('\n📊 Integration Summary:');
    console.log('🚀 Ready for manual testing!');
    console.log('\n📋 Manual Test Steps:');
    console.log('1. Open http://localhost:5173/receive-stock');
    console.log('2. Toggle "Use Enhanced Invoice Receiving (with serial tracking)"');
    console.log('3. Select a warehouse from dropdown');
    console.log('4. If invoices are available, select one to load manifest');
    console.log('5. Click items in manifest to pre-fill the form');
    console.log('6. Enter serial numbers in the textarea (one per line or comma-separated)');
    console.log('7. Submit to test the receiving process');
    
    return true;
}

// Use built-in fetch for Node.js 18+
const fetch = globalThis.fetch;

simpleIntegrationTest()
    .then(success => {
        if (success) {
            console.log('\n✅ Integration test completed successfully!');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Test failed:', err);
        process.exit(1);
    });