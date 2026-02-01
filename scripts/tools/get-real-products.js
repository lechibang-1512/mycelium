#!/usr/bin/env node

/**
 * Get Real Products from specs_db
 * Queries the database to get actual product information for invoice creation
 */

const mariadb = require('mariadb');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'master_db',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci'
};

async function getRealProducts() {
    const pool = mariadb.createPool(dbConfig);
    
    try {
        console.log('🔍 Querying specs_db for real products...\n');
        
        const conn = await pool.getConnection();
        
        try {
            // Get real products from specs_db
            const products = await conn.query(`
                SELECT 
                    product_id,
                    device_name,
                    device_maker,
                    device_price,
                    color,
                    ram,
                    rom,
                    processor
                FROM specs_db 
                WHERE device_price IS NOT NULL 
                AND device_price > 0
                ORDER BY device_maker, device_name
                LIMIT 20
            `);
            
            // Also get any products without price for reference
            const allProducts = await conn.query(`
                SELECT 
                    product_id,
                    device_name,
                    device_maker,
                    COALESCE(device_price, 0) as device_price,
                    color,
                    ram,
                    rom
                FROM specs_db 
                ORDER BY device_maker, device_name
                LIMIT 10
            `);
            
            console.log(`Found ${products.length} real products:\n`);
            
            products.forEach((product, index) => {
                console.log(`${index + 1}. ${product.device_maker} ${product.device_name}`);
                console.log(`   UUID: ${product.product_id}`);
                console.log(`   Price: ${product.device_price?.toLocaleString('vi-VN')} VND`);
                if (product.color) console.log(`   Color: ${product.color}`);
                if (product.ram) console.log(`   RAM: ${product.ram}`);
                if (product.rom) console.log(`   Storage: ${product.rom}`);
                console.log('');
            });
            
            console.log(`\nAll products in database (${allProducts.length} total):\n`);
            allProducts.forEach((product, index) => {
                console.log(`${index + 1}. ${product.device_maker} ${product.device_name} - UUID: ${product.product_id}`);
            });
            
            // Output JSON structure for invoice
            console.log('📋 JSON Structure for Invoice:\n');
            console.log(JSON.stringify(products.slice(0, 8).map((product, index) => ({
                product_name: `${product.device_maker} ${product.device_name}`,
                product_id: product.product_id,
                product_uuid: product.product_id,
                unit: product.device_maker.toLowerCase().includes('repair') || product.device_name.toLowerCase().includes('tool') ? 'Bộ' : 
                      product.device_name.toLowerCase().includes('cable') || product.device_name.toLowerCase().includes('charger') ? 'Sợi' :
                      product.device_name.toLowerCase().includes('screen') || product.device_name.toLowerCase().includes('battery') ? 'Cái' : 'Chiếc',
                quantity: Math.floor(Math.random() * 10) + 1,
                unit_price: product.device_price,
                specifications: {
                    color: product.color || '',
                    ram: product.ram || '',
                    rom: product.rom || '',
                    processor: product.processor || ''
                }
            })), null, 2));
            
        } finally {
            conn.release();
        }
        
    } catch (error) {
        console.error('❌ Query failed:', error.message);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    getRealProducts()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Script failed:', err);
            process.exit(1);
        });
}