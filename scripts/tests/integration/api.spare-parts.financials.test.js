/**
 * Integration Test: Spare Parts Financials Verification
 *
 * Verifies that receiving spare parts correctly records unit_cost, tax_amount,
 * subtotal, and total_amount in the inventory_log table.
 */

const chai = require('chai');
const expect = chai.expect;
const mariadb = require('mariadb');
require('dotenv').config();

const SparePartsService = require('../../../backend/services/SparePartsService');

describe('Spare Parts Financials Verification', function () {
    this.timeout(10000);

    let pool;
    let service;
    let testWarehouseId;
    let testZoneId;
    let testPartId; // will be UUID

    before(async function () {
        // Setup test database connection
        pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: 'master_db',
            connectionLimit: 5
        });

        service = new SparePartsService(pool);

        // Setup test data
        const conn = await pool.getConnection();
        try {
            // Create test warehouse
            const warehouseResult = await conn.query(`
                INSERT INTO warehouses (name, location, is_active)
                VALUES ('Test Warehouse SP', 'Test Location SP', 1)
            `);
            testWarehouseId = warehouseResult.insertId;

            // Create test zone
            const zoneResult = await conn.query(`
                INSERT INTO warehouse_zones (warehouse_id, name, zone_type, is_active)
                VALUES (?, 'Test Zone SP', 'storage', 1)
            `, [testWarehouseId]);
            testZoneId = zoneResult.insertId;

            // Create test spare part
            const partResult = await service.createSparePart({
                part_code: 'TEST-SP-FIN',
                part_name: 'Test Part Financial',
                part_category: 'Battery',
                description: 'Test Description',
                unit_cost: 50.00
            });
            testPartId = partResult.spare_part_id;

        } finally {
            conn.release();
        }
    });

    after(async function () {
        // Cleanup test data
        const conn = await pool.getConnection();
        try {
            await conn.query('DELETE FROM inventory_log WHERE notes LIKE ?', [`%${testPartId}%`]);
            await conn.query('DELETE FROM smartphone_spare_parts_inventory WHERE spare_part_id = ?', [testPartId]);
            await conn.query('DELETE FROM warehouse_zones WHERE zone_id = ?', [testZoneId]);
            await conn.query('DELETE FROM warehouses WHERE warehouse_id = ?', [testWarehouseId]);
            // Spare parts table cleanup might be complex due to constraints, but we can try deactivating
            await conn.query('DELETE FROM smartphone_spare_parts WHERE spare_part_id = ?', [testPartId]);
        } finally {
            conn.release();
        }

        await pool.end();
    });

    it('should store correct financial data when receiving spare parts', async function () {
        // Unit Cost: 50.00
        // Quantity: 4
        // Tax Rate: 10%
        // Subtotal: 200.00
        // Tax Amount: 20.00
        // Total: 220.00

        const qty = 4;
        const unitCost = 50.00;
        const taxRate = 10;
        const subtotal = qty * unitCost;
        const taxAmount = (subtotal * taxRate) / 100;
        const totalAmount = subtotal + taxAmount;

        await service.addInventory({
            spare_part_id: testPartId,
            warehouse_id: testWarehouseId,
            zone_id: testZoneId,
            quantity_on_hand: qty,
            condition_status: 'NEW',
            unit_cost: unitCost,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            batch_no: 'TEST-BATCH-001'
        });

        // Verify Database Log
        const conn = await pool.getConnection();
        try {
            const logs = await conn.query(`
                SELECT * FROM inventory_log 
                WHERE transaction_type = 'incoming' 
                AND notes LIKE ?
                ORDER BY log_id DESC
                LIMIT 1
            `, [`%${testPartId}%`]);

            expect(logs).to.have.lengthOf(1);
            const log = logs[0];

            // Verify stored values
            expect(Number(log.subtotal)).to.equal(200.00);
            expect(Number(log.tax_amount)).to.equal(20.00);
            expect(Number(log.total_amount)).to.equal(220.00);
            expect(log.user_id).to.equal(1); // System User ID

        } finally {
            conn.release();
        }
    });

    it('should handle zero tax correctly', async function () {
        // Unit Cost: 100.00
        // Quantity: 1
        // Tax: 0

        const qty = 1;
        const unitCost = 100.00;

        await service.addInventory({
            spare_part_id: testPartId,
            warehouse_id: testWarehouseId,
            zone_id: testZoneId,
            quantity_on_hand: qty,
            condition_status: 'NEW',
            unit_cost: unitCost,
            tax_amount: 0,
            total_amount: 100.00,
            batch_no: 'TEST-BATCH-002'
        });

        const conn = await pool.getConnection();
        try {
            const logs = await conn.query(`
                SELECT * FROM inventory_log 
                WHERE transaction_type = 'incoming' 
                AND notes LIKE ?
                AND notes LIKE '%BATCH-002%'
                ORDER BY log_id DESC
                LIMIT 1
            `, [`%${testPartId}%`]);

            expect(logs).to.have.lengthOf(1);
            const log = logs[0];

            expect(Number(log.tax_amount)).to.equal(0);
            expect(Number(log.total_amount)).to.equal(100.00);

        } finally {
            conn.release();
        }
    });
});
