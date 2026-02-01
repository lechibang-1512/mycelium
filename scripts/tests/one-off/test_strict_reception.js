const pool = require('../backend/config/database');
const InventoryTransactionService = require('../backend/services/InventoryTransactionService');

async function run() {
    const service = new InventoryTransactionService(pool);
    const invoiceUuid = '051749e4-1b24-4f32-9493-d011b872575d'; // Known existing invoice
    const productUuid = '07238997-ab34-4de6-9c73-c142f44920db'; // Known existing product

    try {
        console.log('--- TEST 1: Receive WITHOUT Invoice (Should Fail) ---');
        try {
            await service.receiveStock({
                supplier_id: 1,
                warehouse_id: 'default-wh', // Placeholder, will fail later if not checked, but validation should catch invoice first
                items: [{ product_id: productUuid, quantity: 1 }]
            });
            console.error('❌ TEST 1 FAILED: Expected error but got success');
        } catch (err) {
            if (err.message.includes('Strict Reception Policy')) {
                console.log('✅ TEST 1 PASSED: Got expected strict policy error');
            } else {
                console.error('❌ TEST 1 FAILED: Got unexpected error:', err.message);
            }
        }

        console.log('\n--- TEST 2: Get Receiving Manifest ---');
        const manifest = await service.getReceivingManifest(invoiceUuid);
        console.log('Manifest Retrieved:', JSON.stringify(manifest.items.length, null, 2) + ' items');
        if (manifest.items.length > 0) {
            console.log('✅ TEST 2 PASSED: Retrieved manifest items');
        } else {
            console.error('❌ TEST 2 FAILED: No items in manifest');
        }

        console.log('\n--- TEST 3: Receive WITH Invoice (Should Succeed) ---');

        // Need valid warehouse ID
        let warehouseId = 'default-wh';
        const [wh] = await pool.query('SELECT warehouse_id FROM warehouses LIMIT 1');
        if (wh) warehouseId = wh.warehouse_id;

        // New IMEI for this test
        const newSerial = 'IMEI-STRICT-TEST-' + Date.now();

        const result = await service.receiveStock({
            supplier_id: manifest.invoice.supplier_id,
            warehouse_id: warehouseId,
            invoice_id: invoiceUuid,
            items: [
                {
                    product_id: productUuid,
                    quantity: 1,
                    unit_cost: 1000, // Intentional WRONG cost, should be overridden by 22500000
                    serial_number: newSerial
                }
            ]
        });

        console.log('Reception Result:', result.success);

        // Verify Cost Override
        // We can check inventory_log for this receipt
        const [log] = await pool.query('SELECT total_value FROM inventory_log WHERE transaction_type="incoming" AND serial_number = ?', [newSerial]);

        if (log) {
            console.log(`Log Value: ${log.total_value} (Expected ~22500000 from Invoice, Input was 1000)`);
            if (log.total_value > 1000) {
                console.log('✅ TEST 3 PASSED: Cost was overridden from Invoice!');
            } else {
                console.warn('⚠️ TEST 3 WARNING: Cost was NOT overridden.');
            }
        } else {
            console.error('❌ TEST 3 FAILED: Log not found');
        }

    } catch (err) {
        console.error('❌ FATAL ERROR:', err);
    } finally {
        await pool.end();
    }
}

run();
