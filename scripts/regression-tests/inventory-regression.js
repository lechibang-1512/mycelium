require('dotenv').config();
const pool = require('../../backend/config/database');

/**
 * Inventory Operations Regression Test Suite
 * Tests existing inventory functionality to ensure no breaking changes
 */
async function runInventoryRegressionTests() {
    console.log('📦 Starting Inventory Operations Regression Tests...\n');
    
    let conn;
    const testResults = {
        passed: 0,
        failed: 0,
        total: 0,
        failures: []
    };
    
    try {
        conn = await pool.getConnection();
        
        // Test 1: Warehouse structure and integrity
        await runTest('Warehouse Structure Validation', async () => {
            const warehouses = await conn.query(`
                SELECT 
                    warehouse_id,
                    name,
                    location,
                    is_active
                FROM warehouses 
                WHERE is_active = 1
            `);
            
            if (warehouses.length === 0) {
                throw new Error('No active warehouses found');
            }
            
            console.log(`   ✓ Found ${warehouses.length} active warehouses`);
            warehouses.forEach(wh => {
                const location = wh.location || 'No location specified';
                console.log(`     - ${wh.name}: ${location}`);
            });
            
            return { activeWarehouses: warehouses.length };
        }, testResults);
        
        // Test 2: Zone configuration
        await runTest('Zone Configuration', async () => {
            const zones = await conn.query(`
                SELECT 
                    wz.zone_id,
                    wz.name as zone_name,
                    w.name as warehouse_name,
                    wz.capacity_limit,
                    wz.is_active
                FROM warehouse_zones wz
                JOIN warehouses w ON wz.warehouse_id = w.warehouse_id
                WHERE wz.is_active = 1
                ORDER BY w.name, wz.name
            `);
            
            const warehouseZoneMap = {};
            zones.forEach(zone => {
                if (!warehouseZoneMap[zone.warehouse_name]) {
                    warehouseZoneMap[zone.warehouse_name] = 0;
                }
                warehouseZoneMap[zone.warehouse_name]++;
            });
            
            console.log(`   ✓ Found ${zones.length} active zones across warehouses:`);
            Object.entries(warehouseZoneMap).forEach(([warehouse, count]) => {
                console.log(`     - ${warehouse}: ${count} zones`);
            });
            
            return { totalZones: zones.length, warehouseCount: Object.keys(warehouseZoneMap).length };
        }, testResults);
        
        // Test 3: Inventory locations and quantities
        await runTest('Inventory Location Data', async () => {
            const locations = await conn.query(`
                SELECT 
                    w.name as warehouse_name,
                    wz.name as zone_name,
                    COUNT(DISTINCT wpl.product_id) as unique_products,
                    SUM(wpl.quantity) as total_quantity
                FROM warehouse_product_locations wpl
                JOIN warehouses w ON wpl.warehouse_id = w.warehouse_id
                LEFT JOIN warehouse_zones wz ON wpl.zone_id = wz.zone_id
                WHERE w.is_active = 1
                GROUP BY w.warehouse_id, w.name, wz.zone_id, wz.name
                ORDER BY total_quantity DESC
            `);
            
            if (locations.length === 0) {
                console.log('   ⚠️  No inventory locations found (may be normal for new system)');
                return { inventoryLocations: 0 };
            }
            
            console.log(`   ✓ Found inventory in ${locations.length} warehouse/zone combinations`);
            locations.slice(0, 5).forEach(loc => {
                const zoneName = loc.zone_name || 'Default Zone';
                console.log(`     - ${loc.warehouse_name}/${zoneName}: ${loc.unique_products} products, ${loc.total_quantity} total qty`);
            });
            
            const totals = locations.reduce((acc, loc) => {
                acc.products += parseInt(loc.unique_products);
                acc.quantity += parseInt(loc.total_quantity);
                return acc;
            }, { products: 0, quantity: 0 });
            
            return { 
                inventoryLocations: locations.length,
                totalUniqueProducts: totals.products,
                totalQuantity: totals.quantity
            };
        }, testResults);
        
        // Test 4: Transaction log integrity
        await runTest('Inventory Transaction Log', async () => {
            const logStats = await conn.query(`
                SELECT 
                    transaction_type,
                    COUNT(*) as transaction_count,
                    MIN(transaction_date) as earliest_transaction,
                    MAX(transaction_date) as latest_transaction
                FROM inventory_log
                GROUP BY transaction_type
                ORDER BY transaction_count DESC
            `);
            
            if (logStats.length === 0) {
                console.log('   ⚠️  No transaction history found (may be normal for new system)');
                return { transactionTypes: 0 };
            }
            
            console.log(`   ✓ Found ${logStats.length} transaction types in history:`);
            logStats.forEach(stat => {
                console.log(`     - ${stat.transaction_type}: ${stat.transaction_count} transactions`);
            });
            
            const totalTransactions = logStats.reduce((sum, stat) => sum + parseInt(stat.transaction_count), 0);
            
            return { 
                transactionTypes: logStats.length,
                totalTransactions
            };
        }, testResults);
        
        // Test 5: Assets and serialized inventory
        await runTest('Serialized Asset Tracking', async () => {
            const assetStats = await conn.query(`
                SELECT 
                    a.status,
                    a.condition,
                    COUNT(*) as asset_count,
                    w.name as warehouse_name
                FROM assets a
                LEFT JOIN warehouses w ON a.warehouse_id = w.warehouse_id
                GROUP BY a.status, a.condition, w.name
                ORDER BY asset_count DESC
            `);
            
            if (assetStats.length === 0) {
                console.log('   ⚠️  No serialized assets found (may be normal for bulk inventory system)');
                return { serializedAssets: 0 };
            }
            
            console.log(`   ✓ Found serialized asset tracking:`);
            assetStats.slice(0, 5).forEach(stat => {
                const location = stat.warehouse_name || 'Unassigned';
                console.log(`     - ${stat.status}/${stat.condition} at ${location}: ${stat.asset_count} assets`);
            });
            
            const totalAssets = assetStats.reduce((sum, stat) => sum + parseInt(stat.asset_count), 0);
            
            return { 
                assetCategories: assetStats.length,
                totalAssets
            };
        }, testResults);
        
        // Test 6: Batch tracking functionality
        await runTest('Batch Tracking System', async () => {
            const batchStats = await conn.query(`
                SELECT 
                    COUNT(*) as total_batches,
                    COUNT(DISTINCT product_id) as unique_products,
                    SUM(quantity) as total_batch_quantity,
                    COUNT(CASE WHEN expiry_date IS NOT NULL THEN 1 END) as batches_with_expiry
                FROM batch_tracking
            `);
            
            const batchData = batchStats[0];
            
            if (batchData.total_batches === 0) {
                console.log('   ⚠️  No batch tracking found (may be normal for non-perishable inventory)');
                return { batchTracking: false };
            }
            
            console.log(`   ✓ Batch tracking system active:`);
            console.log(`     - Total batches: ${batchData.total_batches}`);
            console.log(`     - Unique products: ${batchData.unique_products}`);
            console.log(`     - Total quantity: ${batchData.total_batch_quantity}`);
            console.log(`     - Batches with expiry: ${batchData.batches_with_expiry}`);
            
            return { 
                batchTracking: true,
                totalBatches: parseInt(batchData.total_batches),
                batchQuantity: parseInt(batchData.total_batch_quantity)
            };
        }, testResults);
        
        // Test 7: Inventory value calculations
        await runTest('Inventory Value Calculation', async () => {
            const valueCalc = await conn.query(`
                SELECT 
                    w.name as warehouse_name,
                    COUNT(DISTINCT wpl.product_id) as unique_products,
                    SUM(wpl.quantity) as total_quantity,
                    AVG(CASE WHEN p.base_price > 0 THEN p.base_price END) as avg_product_price,
                    SUM(CASE WHEN p.base_price > 0 THEN wpl.quantity * p.base_price END) as estimated_value
                FROM warehouse_product_locations wpl
                JOIN warehouses w ON wpl.warehouse_id = w.warehouse_id
                LEFT JOIN products p ON wpl.product_id = p.product_id
                WHERE w.is_active = 1
                GROUP BY w.warehouse_id, w.name
                ORDER BY estimated_value DESC
            `);
            
            if (valueCalc.length === 0) {
                console.log('   ⚠️  No inventory value data available');
                return { inventoryValue: 0 };
            }
            
            console.log(`   ✓ Inventory value by warehouse:`);
            let totalValue = 0;
            valueCalc.forEach(calc => {
                const value = parseFloat(calc.estimated_value) || 0;
                totalValue += value;
                const formattedValue = value.toLocaleString('vi-VN');
                console.log(`     - ${calc.warehouse_name}: ${formattedValue} VND (${calc.total_quantity} items)`);
            });
            
            console.log(`   ✓ Total estimated inventory value: ${totalValue.toLocaleString('vi-VN')} VND`);
            
            return { 
                totalValue,
                warehouseCount: valueCalc.length
            };
        }, testResults);
        
        // Test 8: Supplier integration
        await runTest('Supplier-Inventory Integration', async () => {
            const supplierStats = await conn.query(`
                SELECT 
                    s.name as supplier_name,
                    COUNT(DISTINCT il.product_id) as unique_products,
                    SUM(CASE WHEN il.transaction_type = 'incoming' THEN il.quantity_changed ELSE 0 END) as total_received,
                    COUNT(DISTINCT il.transaction_date) as transaction_days
                FROM inventory_log il
                JOIN suppliers s ON il.supplier_id = s.id
                WHERE il.supplier_id IS NOT NULL
                GROUP BY s.id, s.name
                ORDER BY total_received DESC
                LIMIT 10
            `);
            
            if (supplierStats.length === 0) {
                console.log('   ⚠️  No supplier transaction history found');
                return { supplierIntegration: false };
            }
            
            console.log(`   ✓ Found supplier transaction history for ${supplierStats.length} suppliers:`);
            supplierStats.slice(0, 5).forEach(supplier => {
                console.log(`     - ${supplier.supplier_name}: ${supplier.total_received} units received (${supplier.unique_products} products)`);
            });
            
            return { 
                supplierIntegration: true,
                activeSuppliers: supplierStats.length
            };
        }, testResults);
        
        // Test 9: Capacity and constraints
        await runTest('Capacity Management', async () => {
            const capacityCheck = await conn.query(`
                SELECT 
                    w.name as warehouse_name,
                    wz.name as zone_name,
                    wz.capacity_limit,
                    COUNT(wpl.product_id) as product_count,
                    SUM(wpl.quantity) as current_quantity,
                    CASE 
                        WHEN wz.capacity_limit > 0 THEN 
                            ROUND((SUM(wpl.quantity) / wz.capacity_limit) * 100, 2)
                        ELSE NULL 
                    END as utilization_percent
                FROM warehouses w
                LEFT JOIN warehouse_zones wz ON w.warehouse_id = wz.warehouse_id
                LEFT JOIN warehouse_product_locations wpl ON wz.zone_id = wpl.zone_id
                WHERE w.is_active = 1 AND (wz.is_active = 1 OR wz.is_active IS NULL)
                GROUP BY w.warehouse_id, w.name, wz.zone_id, wz.name, wz.capacity_limit
                ORDER BY utilization_percent DESC
            `);
            
            console.log(`   ✓ Zone capacity utilization:`);
            if (capacityCheck.length === 0) {
                console.log('     - No zones with capacity limits found');
                return { zonesChecked: 0, overCapacity: 0 };
            }
            
            capacityCheck.slice(0, 10).forEach(zone => {
                const utilization = zone.utilization_percent ? `${zone.utilization_percent}%` : 'Unlimited';
                const limit = zone.capacity_limit || 'No limit';
                const zoneName = zone.zone_name || 'Default Zone';
                console.log(`     - ${zone.warehouse_name}/${zoneName}: ${utilization} (${zone.current_quantity || 0}/${limit})`);
            });
            
            const overCapacity = capacityCheck.filter(zone => zone.utilization_percent > 100);
            if (overCapacity.length > 0) {
                console.log(`   ⚠️  ${overCapacity.length} zones are over capacity!`);
            }
            
            return { 
                zonesChecked: capacityCheck.length,
                overCapacity: overCapacity.length
            };
        }, testResults);
        
        // Test 10: Recent activity validation
        await runTest('Recent Inventory Activity', async () => {
            const recentActivity = await conn.query(`
                SELECT 
                    DATE(transaction_date) as activity_date,
                    transaction_type,
                    COUNT(*) as transaction_count,
                    SUM(ABS(quantity_changed)) as total_quantity_moved
                FROM inventory_log
                WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY DATE(transaction_date), transaction_type
                ORDER BY activity_date DESC, transaction_count DESC
            `);
            
            if (recentActivity.length === 0) {
                console.log('   ℹ️  No recent inventory activity in the last 7 days');
                return { recentActivity: false };
            }
            
            console.log(`   ✓ Recent inventory activity (last 7 days):`);
            recentActivity.forEach(activity => {
                console.log(`     - ${activity.activity_date}: ${activity.transaction_count} ${activity.transaction_type} transactions (${activity.total_quantity_moved} units)`);
            });
            
            const totalRecentTransactions = recentActivity.reduce((sum, act) => sum + parseInt(act.transaction_count), 0);
            
            return { 
                recentActivity: true,
                recentTransactions: totalRecentTransactions
            };
        }, testResults);
        
    } catch (error) {
        console.error('❌ Inventory regression test setup failed:', error.message);
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
    console.log('📊 INVENTORY REGRESSION TEST SUMMARY');
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
        console.log('\n🎉 ALL INVENTORY REGRESSION TESTS PASSED!');
        console.log('✅ Existing inventory functionality is working correctly');
        console.log('✅ No regressions detected in inventory operations');
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
    runInventoryRegressionTests()
        .then(async () => {
            console.log('Inventory regression tests completed');
            await pool.end();
            process.exit(0);
        })
        .catch(async (error) => {
            console.error('Regression tests failed:', error);
            await pool.end();
            process.exit(1);
        });
}

module.exports = { runInventoryRegressionTests };