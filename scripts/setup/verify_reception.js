const pool = require('../backend/config/database');
const InventoryTransactionService = require('../backend/services/InventoryTransactionService');

async function run() {
    try {
        // 1. Get the invoice we just imported
        // (Assuming we just ran import and it has invoice_number '12345' or similar from XML)
        // Wait, import creates new Invoice every time unless deleted? 
        // We need to fetch the invoice ID and product UUID from DB.

        // Find latest invoice
        const [invoice] = await pool.query('SELECT id, invoice_number, supplier_id, uuid FROM invoices ORDER BY id DESC LIMIT 1');
        if (!invoice) throw new Error('No invoice found');
        console.log('Using Invoice:', invoice);

        // Find items for this invoice
        const items = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoice.id]);
        if (items.length === 0) throw new Error('No items found for invoice');

        const item = items[0];
        console.log('Using Item:', item); // should have product_uuid

        // 2. Prepare Inbound Data
        const service = new InventoryTransactionService(pool);

        const inboundData = {
            supplier_id: invoice.supplier_id,
            warehouse_id: 'WH-001-UUID-OR-ID', // Need a valid Warehouse ID. Check DB.
            items: [
                {
                    product_id: item.product_uuid || item.product_id, // ensure UUID
                    quantity: 1, // Receive 1 unit
                    unit_cost: 20000000,
                    serial_number: 'IMEI-TEST-REC-001', // Explicit serial
                    invoice_id: invoice.uuid // Link to invoice UUID? Service expects ID or UUID? _resolveDocumentIds checks UUID string.
                }
            ],
            invoice_id: invoice.uuid
        };

        // Find a valid Warehouse ID first
        let warehouseId = 'default-wh';

        // Try warehouse_id column
        const [wh] = await pool.query('SELECT warehouse_id FROM warehouses LIMIT 1');
        if (wh) warehouseId = wh.warehouse_id;
        // If no warehouse, we might need to mock one?
        // Let's just try to query one.


        const [zones] = await pool.query('SELECT warehouse_id FROM warehouse_zones LIMIT 1');
        if (zones) warehouseId = zones.warehouse_id;

        // Just use a placeholder if testing, but foreign key might fail.
        // Let's try to fetch from assets if any exist?
        const [existingAsset] = await pool.query('SELECT warehouse_id FROM assets LIMIT 1');
        if (existingAsset) warehouseId = existingAsset.warehouse_id;

        inboundData.warehouse_id = warehouseId;
        console.log('Using Warehouse:', warehouseId);

        // 3. Receive Stock
        console.log('Receiving Stock...');
        const result = await service.receiveStock(inboundData);
        console.log('Reception Result:', JSON.stringify(result, null, 2));

        // 4. Verify serialized_inventory
        const [inv] = await pool.query('SELECT * FROM serialized_inventory WHERE imei_1 = ?', ['IMEI-TEST-REC-001']);
        console.log('Serialized Inventory Record:', inv);

        if (inv) {
            console.log('✅ SUCCESS: Serialized Inventory populated!');
        } else {
            console.error('❌ FAILURE: Record not found in serialized_inventory');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

run();
