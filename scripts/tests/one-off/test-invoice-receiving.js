require('dotenv').config();
const pool = require('../backend/config/database');

async function testInvoiceReceivingIntegration() {
    console.log('🔄 Testing Invoice Receiving Integration...\n');
    
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('✅ Database connection successful');
        
        // 1. Check if we have any invoices to work with
        console.log('\n📋 Checking available invoices...');
        const invoices = await conn.query(`
            SELECT 
                uuid, invoice_number, supplier_id, status, verification_status,
                total_amount, currency
            FROM invoices 
            WHERE status = 'draft'
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        console.log(`Found ${invoices.length} draft invoices:`);
        invoices.forEach(inv => {
            console.log(`  - ${inv.invoice_number}: ${inv.total_amount?.toLocaleString('vi-VN')} ${inv.currency} (${inv.verification_status})`);
        });
        
        if (invoices.length === 0) {
            console.log('\n⚠️  No draft invoices found. Import a test invoice first.');
            return;
        }
        
        // 2. Test getting receiving manifest
        console.log('\n📦 Testing receiving manifest...');
        const testInvoice = invoices[0];
        
        const manifestQuery = `
            SELECT 
                i.id, i.uuid, i.invoice_number, i.supplier_id,
                s.name as supplier_name,
                i.status, i.verification_status, i.total_amount
            FROM invoices i
            JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.uuid = ?
        `;
        
        const [invoiceDetails] = await conn.query(manifestQuery, [testInvoice.uuid]);
        console.log(`✅ Invoice: ${invoiceDetails.invoice_number} from ${invoiceDetails.supplier_name}`);
        
        // Get items
        const items = await conn.query(`
            SELECT 
                ii.id as item_id,
                ii.product_uuid,
                ii.product_name,
                ii.quantity,
                ii.unit_price,
                ii.total_amount,
                p.requires_serial_tracking,
                COALESCE(
                    (SELECT SUM(quantity_changed) 
                     FROM inventory_log 
                     WHERE product_id = ii.product_uuid COLLATE utf8mb4_unicode_ci
                       AND invoice_id = i.id 
                       AND transaction_type = 'incoming'), 0
                ) as quantity_received
            FROM invoice_items ii
            JOIN invoices i ON ii.invoice_id = i.id
            LEFT JOIN products p ON ii.product_uuid COLLATE utf8mb4_unicode_ci = p.product_id COLLATE utf8mb4_unicode_ci
            WHERE i.uuid = ?
        `, [testInvoice.uuid]);
        
        console.log(`   Items: ${items.length} products`);
        items.forEach(item => {
            console.log(`     - ${item.product_name}: ${item.quantity} units @ ${item.unit_price?.toLocaleString('vi-VN')}`);
            console.log(`       Received: ${item.quantity_received}/${item.quantity}, Serial tracking: ${item.requires_serial_tracking ? 'Yes' : 'No'}`);
        });
        
        // Get expected serials
        const expectedSerials = await conn.query(`
            SELECT 
                es.product_id,
                es.expected_serial,
                es.is_received,
                p.name as product_name
            FROM expected_serials es
            JOIN products p ON es.product_id COLLATE utf8mb4_unicode_ci = p.product_id COLLATE utf8mb4_unicode_ci
            WHERE es.invoice_id = ?
            ORDER BY es.product_id
        `, [invoiceDetails.id]);
        
        console.log(`   Expected Serials: ${expectedSerials.length}`);
        if (expectedSerials.length > 0) {
            const serialsByProduct = expectedSerials.reduce((acc, s) => {
                if (!acc[s.product_name]) acc[s.product_name] = { total: 0, received: 0 };
                acc[s.product_name].total++;
                if (s.is_received) acc[s.product_name].received++;
                return acc;
            }, {});
            
            Object.entries(serialsByProduct).forEach(([productName, counts]) => {
                console.log(`     - ${productName}: ${counts.received}/${counts.total} serials received`);
            });
        }
        
        // 3. Check warehouse availability
        console.log('\n🏪 Checking warehouse setup...');
        const warehouses = await conn.query(`
            SELECT warehouse_id, name FROM warehouses WHERE is_active = 1 LIMIT 3
        `);
        
        console.log(`Available warehouses: ${warehouses.length}`);
        warehouses.forEach(wh => {
            console.log(`  - ${wh.name} (${wh.warehouse_id})`);
        });
        
        if (warehouses.length === 0) {
            console.log('⚠️  No active warehouses found. Cannot test receiving.');
            return;
        }
        
        // 4. Test the receiving process structure (simulation)
        console.log('\n🔄 Testing receiving process structure...');
        
        const testWarehouse = warehouses[0];
        const receivableItems = items.filter(item => item.quantity_received < item.quantity);
        
        if (receivableItems.length > 0) {
            console.log('✅ Receiving simulation ready:');
            console.log(`   Warehouse: ${testWarehouse.name}`);
            console.log(`   Items to receive: ${receivableItems.length}`);
            
            receivableItems.forEach(item => {
                const remainingQty = item.quantity - item.quantity_received;
                console.log(`     - ${item.product_name}: ${remainingQty} units remaining`);
                
                // Check for expected serials for this item
                const itemSerials = expectedSerials.filter(s => s.product_id === item.product_uuid && !s.is_received);
                if (itemSerials.length > 0) {
                    console.log(`       Expected serials: ${itemSerials.map(s => s.expected_serial).join(', ')}`);
                }
            });
            
            // Simulate a receiving transaction structure
            console.log('\n📝 Example receiving payload:');
            const exampleReceiving = {
                warehouseId: testWarehouse.warehouse_id,
                zoneId: null,
                binId: null,
                userId: 1,
                notes: 'Test receiving integration',
                items: receivableItems.slice(0, 2).map(item => {
                    const itemSerials = expectedSerials
                        .filter(s => s.product_id === item.product_uuid && !s.is_received)
                        .slice(0, Math.min(2, item.quantity - item.quantity_received))
                        .map(s => s.expected_serial);
                    
                    return {
                        itemId: item.item_id,
                        productUuid: item.product_uuid,
                        quantityReceived: Math.min(2, item.quantity - item.quantity_received),
                        serialNumbers: itemSerials.length > 0 ? itemSerials : null,
                        unitCost: item.unit_price,
                        notes: `Receiving ${item.product_name}`
                    };
                })
            };
            
            console.log(JSON.stringify(exampleReceiving, null, 2));
            
        } else {
            console.log('ℹ️  All items in this invoice have been fully received.');
        }
        
        // Check existing inventory log integration
        console.log('\n📊 Checking inventory log integration...');
        const recentLogs = await conn.query(`
            SELECT 
                il.transaction_date,
                il.transaction_type,
                il.product_id,
                p.name as product_name,
                il.quantity_changed,
                il.serial_number,
                i.invoice_number,
                w.name as warehouse_name
            FROM inventory_log il
            LEFT JOIN products p ON il.product_id COLLATE utf8mb4_unicode_ci = p.product_id COLLATE utf8mb4_unicode_ci
            LEFT JOIN invoices i ON il.invoice_id = i.id
            LEFT JOIN warehouses w ON il.warehouse_id COLLATE utf8mb4_unicode_ci = w.warehouse_id COLLATE utf8mb4_unicode_ci
            WHERE il.transaction_type = 'incoming' 
              AND il.invoice_id IS NOT NULL
            ORDER BY il.transaction_date DESC
            LIMIT 5
        `);
        
        console.log(`Recent invoice-based receiving logs: ${recentLogs.length}`);
        recentLogs.forEach(log => {
            console.log(`  - ${log.transaction_date}: ${log.product_name} x${log.quantity_changed} from ${log.invoice_number}`);
            if (log.serial_number) {
                console.log(`    Serial: ${log.serial_number}`);
            }
        });
        
        console.log('\n🎉 Invoice Receiving Integration Test Complete!');
        console.log('\n💡 Ready to test:');
        console.log('   1. GET /api/receiving/invoices - List pending invoices');
        console.log('   2. GET /api/receiving/invoices/:uuid/manifest - Get receiving details');
        console.log('   3. POST /api/receiving/invoices/:uuid/receive - Receive stock');
        console.log('   4. GET /api/receiving/invoices/:uuid/history - View receiving history');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (conn) conn.release();
        await pool.end();
    }
}

testInvoiceReceivingIntegration();