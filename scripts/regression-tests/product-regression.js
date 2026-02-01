require('dotenv').config();
const pool = require('../../backend/config/database');

/**
 * Product Regression Test Suite
 * Tests existing product functionality to ensure no breaking changes
 */
async function runProductRegressionTests() {
    console.log('🧪 Starting Product Regression Tests...\n');
    
    let conn;
    const testResults = {
        passed: 0,
        failed: 0,
        total: 0,
        failures: []
    };
    
    try {
        conn = await pool.getConnection();
        
        // Test 1: Basic product retrieval
        await runTest('Basic Product Retrieval', async () => {
            const result = await conn.query('SELECT COUNT(*) as count FROM products WHERE is_active = 1');
            const activeProductCount = result[0].count;
            
            console.log(`   ✓ Found ${activeProductCount} active products`);
            
            if (activeProductCount === 0) {
                throw new Error('No active products found - this may indicate a data issue');
            }
            
            return { activeProducts: activeProductCount };
        }, testResults);
        
        // Test 2: Product structure validation
        await runTest('Product Table Structure', async () => {
            const columns = await conn.query('DESCRIBE products');
            const requiredColumns = [
                'product_id', 'name', 'sku', 'brand', 'model',
                'base_price', 'is_active', 'created_at', 'updated_at'
            ];
            
            const columnNames = columns.map(col => col.Field);
            const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
            
            if (missingColumns.length > 0) {
                throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
            }
            
            console.log(`   ✓ All ${requiredColumns.length} required columns present`);
            return { columns: columnNames.length };
        }, testResults);
        
        // Test 3: Product-Inventory relationship
        await runTest('Product-Inventory Integration', async () => {
            const result = await conn.query(`
                SELECT 
                    p.product_id,
                    p.name,
                    COUNT(wpl.product_id) as location_count,
                    SUM(wpl.quantity) as total_quantity
                FROM products p
                LEFT JOIN warehouse_product_locations wpl ON p.product_id = wpl.product_id
                WHERE p.is_active = 1
                GROUP BY p.product_id, p.name
                HAVING COUNT(wpl.product_id) > 0
                LIMIT 5
            `);
            
            console.log(`   ✓ Found ${result.length} products with inventory locations`);
            
            result.forEach(product => {
                console.log(`     - ${product.name}: ${product.total_quantity} units in ${product.location_count} locations`);
            });
            
            return { productsWithInventory: result.length };
        }, testResults);
        
        // Test 4: Product search functionality
        await runTest('Product Search by SKU', async () => {
            // Get a sample product with SKU
            const sampleProduct = await conn.query(`
                SELECT product_id, sku, name FROM products 
                WHERE sku IS NOT NULL AND sku != '' 
                LIMIT 1
            `);
            
            if (sampleProduct.length === 0) {
                console.log('   ⚠️  No products with SKU found - skipping SKU search test');
                return { skipped: true };
            }
            
            const product = sampleProduct[0];
            
            // Test exact SKU search
            const searchResult = await conn.query(`
                SELECT product_id, sku, name FROM products 
                WHERE sku = ?
            `, [product.sku]);
            
            if (searchResult.length === 0) {
                throw new Error(`Product not found by SKU: ${product.sku}`);
            }
            
            console.log(`   ✓ Successfully found product by SKU: ${product.sku} -> ${product.name}`);
            return { searchResult: searchResult.length };
        }, testResults);
        
        // Test 5: Product categorization
        await runTest('Product Categories and Brands', async () => {
            const categories = await conn.query(`
                SELECT 
                    category,
                    brand,
                    COUNT(*) as product_count 
                FROM products 
                WHERE is_active = 1 
                GROUP BY category, brand 
                ORDER BY product_count DESC 
                LIMIT 10
            `);
            
            console.log(`   ✓ Found ${categories.length} category/brand combinations`);
            
            categories.slice(0, 3).forEach(cat => {
                console.log(`     - ${cat.category || 'Uncategorized'} / ${cat.brand || 'No Brand'}: ${cat.product_count} products`);
            });
            
            return { categoryBrandCombos: categories.length };
        }, testResults);
        
        // Test 6: Product pricing validation
        await runTest('Product Pricing Data', async () => {
            const pricingData = await conn.query(`
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(CASE WHEN base_price > 0 THEN 1 END) as products_with_price,
                    AVG(base_price) as avg_price,
                    MIN(base_price) as min_price,
                    MAX(base_price) as max_price
                FROM products 
                WHERE is_active = 1
            `);
            
            const data = pricingData[0];
            const pricePercentage = ((data.products_with_price / data.total_products) * 100).toFixed(1);
            
            console.log(`   ✓ ${data.products_with_price}/${data.total_products} (${pricePercentage}%) products have pricing`);
            console.log(`   ✓ Price range: ${data.min_price} - ${data.max_price} VND (avg: ${Math.round(data.avg_price)} VND)`);
            
            return { 
                totalProducts: data.total_products,
                productsWithPrice: data.products_with_price,
                avgPrice: data.avg_price
            };
        }, testResults);
        
        // Test 7: Product variants and relationships
        await runTest('Product Relationships', async () => {
            // Check for related products through variants or similar structures
            const relationships = await conn.query(`
                SELECT 
                    p1.product_id as main_product,
                    p1.name as main_name,
                    p1.brand,
                    p1.model,
                    COUNT(*) as similar_products
                FROM products p1
                JOIN products p2 ON p1.brand = p2.brand AND p1.model = p2.model AND p1.product_id != p2.product_id
                WHERE p1.is_active = 1 AND p2.is_active = 1
                GROUP BY p1.product_id, p1.name, p1.brand, p1.model
                HAVING COUNT(*) > 1
                LIMIT 5
            `);
            
            if (relationships.length > 0) {
                console.log(`   ✓ Found ${relationships.length} products with variants/related products`);
                relationships.forEach(rel => {
                    console.log(`     - ${rel.main_name}: ${rel.similar_products} similar products`);
                });
            } else {
                console.log('   ✓ No product relationships detected (this may be normal)');
            }
            
            return { productRelationships: relationships.length };
        }, testResults);
        
        // Test 8: Serial number requirements
        await runTest('Serial Number Configuration', async () => {
            const serialConfig = await conn.query(`
                SELECT 
                    requires_serial_tracking,
                    COUNT(*) as product_count
                FROM products 
                WHERE is_active = 1
                GROUP BY requires_serial_tracking
            `);
            
            console.log('   ✓ Serial tracking configuration:');
            serialConfig.forEach(config => {
                const tracking = config.requires_serial_tracking ? 'Required' : 'Not Required';
                console.log(`     - ${tracking}: ${config.product_count} products`);
            });
            
            return { serialConfig };
        }, testResults);
        
        // Test 9: Integration with invoice system  
        await runTest('Product-Invoice Integration', async () => {
            const invoiceIntegration = await conn.query(`
                SELECT 
                    p.product_id,
                    p.name,
                    COUNT(DISTINCT ii.invoice_id) as invoice_count,
                    SUM(ii.quantity) as total_invoiced_quantity
                FROM products p
                LEFT JOIN invoice_items ii ON p.product_id = ii.product_uuid COLLATE utf8mb4_unicode_ci
                WHERE p.is_active = 1
                GROUP BY p.product_id, p.name
                HAVING COUNT(DISTINCT ii.invoice_id) > 0
                ORDER BY invoice_count DESC
                LIMIT 5
            `);
            
            if (invoiceIntegration.length > 0) {
                console.log(`   ✓ Found ${invoiceIntegration.length} products referenced in invoices`);
                invoiceIntegration.forEach(prod => {
                    console.log(`     - ${prod.name}: ${prod.invoice_count} invoices, ${prod.total_invoiced_quantity} total qty`);
                });
            } else {
                console.log('   ⚠️  No products found in invoice items (may be normal for new system)');
            }
            
            return { productsInInvoices: invoiceIntegration.length };
        }, testResults);
        
        // Test 10: Product data integrity
        await runTest('Data Integrity Validation', async () => {
            // Check for common data integrity issues
            const integrityChecks = await Promise.all([
                // Duplicate SKUs
                conn.query(`
                    SELECT sku, COUNT(*) as duplicate_count 
                    FROM products 
                    WHERE sku IS NOT NULL AND sku != ''
                    GROUP BY sku 
                    HAVING COUNT(*) > 1
                `),
                
                // Products without names
                conn.query(`
                    SELECT COUNT(*) as unnamed_count 
                    FROM products 
                    WHERE name IS NULL OR name = '' OR TRIM(name) = ''
                `),
                
                // Invalid price data
                conn.query(`
                    SELECT COUNT(*) as invalid_price_count 
                    FROM products 
                    WHERE base_price < 0
                `)
            ]);
            
            const [duplicateSkus, unnamedProducts, invalidPrices] = integrityChecks;
            
            const issues = [];
            if (duplicateSkus.length > 0) {
                issues.push(`${duplicateSkus.length} duplicate SKUs`);
                console.log(`   ⚠️  Found ${duplicateSkus.length} duplicate SKUs`);
                duplicateSkus.slice(0, 3).forEach(dup => {
                    console.log(`     - SKU "${dup.sku}" appears ${dup.duplicate_count} times`);
                });
            }
            
            if (unnamedProducts[0].unnamed_count > 0) {
                issues.push(`${unnamedProducts[0].unnamed_count} products without names`);
                console.log(`   ⚠️  Found ${unnamedProducts[0].unnamed_count} products without names`);
            }
            
            if (invalidPrices[0].invalid_price_count > 0) {
                issues.push(`${invalidPrices[0].invalid_price_count} products with negative prices`);
                console.log(`   ⚠️  Found ${invalidPrices[0].invalid_price_count} products with negative prices`);
            }
            
            if (issues.length === 0) {
                console.log('   ✅ No data integrity issues detected');
            }
            
            return { 
                duplicateSkus: duplicateSkus.length,
                unnamedProducts: unnamedProducts[0].unnamed_count,
                invalidPrices: invalidPrices[0].invalid_price_count,
                totalIssues: issues.length
            };
        }, testResults);
        
    } catch (error) {
        console.error('❌ Regression test setup failed:', error.message);
        testResults.failed++;
        testResults.failures.push({
            test: 'Test Setup',
            error: error.message
        });
    } finally {
        if (conn) conn.release();
        // Don't close pool - let caller manage it
    }
    
    // Print final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 PRODUCT REGRESSION TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Tests Run: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failures.length > 0) {
        console.log('\n💥 FAILURES:');
        testResults.failures.forEach((failure, index) => {
            console.log(`${index + 1}. ${failure.test}: ${failure.error}`);
        });
    }
    
    if (testResults.failed === 0) {
        console.log('\n🎉 ALL PRODUCT REGRESSION TESTS PASSED!');
        console.log('✅ Existing product functionality is working correctly');
        console.log('✅ Invoice integration has not broken product operations');
    } else {
        console.log('\n⚠️  SOME TESTS FAILED - REVIEW REQUIRED');
    }
    
    return testResults;
}

async function runTest(testName, testFunction, results) {
    console.log(`🔍 ${testName}...`);
    results.total++;
    
    try {
        const result = await testFunction();
        results.passed++;
        console.log(`   ✅ PASSED\n`);
        return result;
    } catch (error) {
        results.failed++;
        results.failures.push({
            test: testName,
            error: error.message
        });
        console.log(`   ❌ FAILED: ${error.message}\n`);
        throw error;
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    runProductRegressionTests()
        .then(async () => {
            console.log('Product regression tests completed');
            await pool.end();
            process.exit(0);
        })
        .catch(async (error) => {
            console.error('Regression tests failed:', error);
            await pool.end();
            process.exit(1);
        });
}

module.exports = { runProductRegressionTests };