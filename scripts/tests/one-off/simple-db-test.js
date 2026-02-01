require('dotenv').config();
const pool = require('../backend/config/database');

async function simpleProductTest() {
    console.log('🔍 Testing direct database connection...\n');
    
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('✅ Database connection successful');
        
        // Test products query
        console.log('\n📋 Querying products...');
        const products = await conn.query('SELECT product_id, name, product_type, category FROM products LIMIT 5');
        console.log(`Found ${products.length} products:`);
        
        products.forEach(product => {
            console.log(`- ${product.name} (${product.product_type}): ${product.category || 'No category'}`);
        });
        
        // Test inventory query
        console.log('\n📦 Querying inventory...');
        const inventory = await conn.query('SELECT COUNT(*) as count FROM product_inventory');
        console.log(`Total inventory records: ${inventory[0].count}`);
        
        // Test invoice import basic functionality
        console.log('\n🧾 Testing invoice structure...');
        const existingInvoices = await conn.query('SELECT COUNT(*) as count FROM expected_serials');
        console.log(`Expected serials records: ${existingInvoices[0].count}`);
        
        console.log('\n🎉 Direct database test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (conn) conn.release();
        await pool.end();
    }
}

simpleProductTest();