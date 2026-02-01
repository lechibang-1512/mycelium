#!/usr/bin/env node

/**
 * Test Invoice Details API Endpoint
 * Test the fixed invoice details endpoint
 */

const axios = require('axios');

async function testInvoiceDetails() {
    try {
        console.log('🧪 Testing Invoice Details API Endpoint\n');
        
        // First, let's get the list of invoices to find a valid ID
        console.log('📋 Fetching invoice list...');
        const listResponse = await axios.get('http://localhost:3000/api/invoices');
        
        if (listResponse.data.success && listResponse.data.data.length > 0) {
            const invoices = listResponse.data.data;
            console.log(`✅ Found ${invoices.length} invoices`);
            
            // Get details for the first few invoices
            for (let i = 0; i < Math.min(3, invoices.length); i++) {
                const invoice = invoices[i];
                console.log(`\n🔍 Testing invoice: ${invoice.invoice_number} (${invoice.uuid})`);
                
                try {
                    const detailResponse = await axios.get(`http://localhost:3000/api/invoices/${invoice.uuid}`);
                    
                    if (detailResponse.data.success) {
                        const details = detailResponse.data.data;
                        console.log('✅ Invoice details fetched successfully');
                        console.log(`   Number: ${details.invoice_number}`);
                        console.log(`   Supplier: ${details.supplier_name || 'N/A'}`);
                        console.log(`   Status: ${details.status}`);
                        console.log(`   Total: ${details.total_amount}`);
                        console.log(`   Items: ${details.items ? details.items.length : 0}`);
                        
                        if (details.items && details.items.length > 0) {
                            console.log('   Sample item:');
                            const item = details.items[0];
                            console.log(`     - Product: ${item.product_name || 'N/A'}`);
                            console.log(`     - Quantity: ${item.quantity}`);
                            console.log(`     - Unit Price: ${item.unit_price}`);
                            console.log(`     - Spare Part: ${item.spare_part_name || 'N/A'}`);
                        }
                    } else {
                        console.log('❌ Failed to fetch details:', detailResponse.data.error);
                    }
                } catch (error) {
                    console.log('❌ Error fetching details:', error.message);
                    if (error.response && error.response.data) {
                        console.log('   API Error:', error.response.data);
                    }
                }
            }
        } else {
            console.log('❌ No invoices found or failed to fetch list');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response && error.response.data) {
            console.error('API Error:', error.response.data);
        }
    }
}

if (require.main === module) {
    testInvoiceDetails()
        .then(() => {
            console.log('\n🏁 Test completed');
            process.exit(0);
        })
        .catch(err => {
            console.error('Script failed:', err);
            process.exit(1);
        });
}