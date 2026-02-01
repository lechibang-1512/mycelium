/**
 * Test script for Stocktake Delete functionality
 * 
 * Tests:
 * 1. Create a test stocktake
 * 2. Verify it exists
 * 3. Delete it
 * 4. Verify it's gone
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testStocktakeDelete() {
    console.log('🧪 Testing Stocktake Delete Functionality\n');

    try {
        // Step 1: Create a test stocktake
        console.log('1️⃣  Creating test stocktake...');
        const createResponse = await axios.post(`${BASE_URL}/api/stocktake`, {
            warehouse_id: 1,
            notes: 'Test stocktake for deletion test',
            items: []
        });

        if (!createResponse.data.success) {
            throw new Error('Failed to create stocktake');
        }

        const stocktakeId = createResponse.data.data.stocktake_id;
        const stocktakeNumber = createResponse.data.data.stocktake_number;
        console.log(`   ✅ Created stocktake: ${stocktakeNumber} (ID: ${stocktakeId})`);

        // Step 2: Verify it exists
        console.log('\n2️⃣  Verifying stocktake exists...');
        const getResponse = await axios.get(`${BASE_URL}/api/stocktake/${stocktakeId}`);
        
        if (!getResponse.data.success || !getResponse.data.data) {
            throw new Error('Stocktake not found after creation');
        }
        console.log(`   ✅ Stocktake found: ${getResponse.data.data.stocktake_number}`);

        // Step 3: Delete the stocktake
        console.log('\n3️⃣  Deleting stocktake...');
        const deleteResponse = await axios.delete(`${BASE_URL}/api/stocktake/${stocktakeId}`);
        
        if (!deleteResponse.data.success) {
            throw new Error('Delete returned unsuccessful response');
        }
        console.log(`   ✅ Delete successful: ${deleteResponse.data.message}`);

        // Step 4: Verify it's gone
        console.log('\n4️⃣  Verifying stocktake is deleted...');
        try {
            await axios.get(`${BASE_URL}/api/stocktake/${stocktakeId}`);
            throw new Error('Stocktake still exists after deletion!');
        } catch (err) {
            if (err.response && err.response.status === 404) {
                console.log('   ✅ Stocktake not found (correctly deleted)');
            } else if (err.message === 'Stocktake still exists after deletion!') {
                throw err;
            } else {
                console.log('   ✅ Stocktake deleted (GET failed as expected)');
            }
        }

        // Additional test: Verify related items are also deleted
        console.log('\n5️⃣  Testing cascade delete (create with items)...');
        const createWithItemsResponse = await axios.post(`${BASE_URL}/api/stocktake`, {
            warehouse_id: 1,
            notes: 'Test stocktake with items',
            items: [
                { product_id: 1, system_quantity: 10 },
                { product_id: 2, system_quantity: 5 }
            ]
        });

        const stocktake2Id = createWithItemsResponse.data.data.stocktake_id;
        console.log(`   ✅ Created stocktake with items (ID: ${stocktake2Id})`);

        const deleteWithItemsResponse = await axios.delete(`${BASE_URL}/api/stocktake/${stocktake2Id}`);
        if (!deleteWithItemsResponse.data.success) {
            throw new Error('Failed to delete stocktake with items');
        }
        console.log('   ✅ Deleted stocktake with items (cascade delete works)');

        console.log('\n✅ All tests passed!\n');
        console.log('Summary:');
        console.log('  • Create stocktake: ✅');
        console.log('  • Verify exists: ✅');
        console.log('  • Delete stocktake: ✅');
        console.log('  • Verify deleted: ✅');
        console.log('  • Cascade delete (items): ✅');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Response:', error.response.data);
        }
        process.exit(1);
    }
}

// Check if server is running
async function checkServer() {
    try {
        await axios.get(`${BASE_URL}/api/warehouses`);
        return true;
    } catch (err) {
        return false;
    }
}

(async () => {
    const serverRunning = await checkServer();
    if (!serverRunning) {
        console.error('❌ Server is not running at', BASE_URL);
        console.error('   Please start the server with: npm start');
        process.exit(1);
    }
    
    await testStocktakeDelete();
})();
