/**
 * Integration Test: Serialized Tax Distribution Verification
 *
 * Verifies that receiving serialized items correctly distributes tax
 * without losing pennies (penny-perfect distribution).
 */

const chai = require('chai');
const expect = chai.expect;
const mariadb = require('mariadb');
require('dotenv').config();

const InventoryService = require('../../../backend/services/InventoryService');

describe('Serialized Tax Distribution', function () {
    this.timeout(10000);

    let pool;
    let service;
    let testWarehouseId;
    let testBinId;
    let testProductId;

    before(async function () {
        pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: 'master_db',
            connectionLimit: 5
        });

        service = new InventoryService(pool);

        const conn = await pool.getConnection();
        try {
            // Generate UUIDs for warehouse_id and bin_id
            const crypto = require('crypto');
            const warehouseUuid = crypto.randomUUID();
            const binUuid = crypto.randomUUID();

            await conn.query(`
                INSERT INTO warehouses (warehouse_id, name, location, is_active)
                VALUES (?, 'Test Warehouse Serial', 'Test Location Serial', 1)
            `, [warehouseUuid]);
            testWarehouseId = warehouseUuid;

            await conn.query(`
                INSERT INTO bin_locations (bin_id, warehouse_id, bin_code, bin_type, is_active)
                VALUES (?, ?, 'TEST-BIN-SERIAL', 'standard', 1)
            `, [binUuid, testWarehouseId]);
            testBinId = binUuid;

            const productUuid = crypto.randomUUID();
            await conn.query(`
                INSERT INTO specs_db (product_id, device_name, device_maker, device_price)
                VALUES (?, 'Test Phone Serial', 'Test Maker', 100.00)
            `, [productUuid]);
            testProductId = productUuid;

        } finally {
            conn.release();
        }
    });

    after(async function () {
        const conn = await pool.getConnection();
        try {
            await conn.query('DELETE FROM inventory_log WHERE notes LIKE "%Test Serial Tax%"');
            await conn.query('DELETE FROM bin_locations WHERE bin_id = ?', [testBinId]);
            await conn.query('DELETE FROM warehouses WHERE warehouse_id = ?', [testWarehouseId]);
            await conn.query('DELETE FROM specs_db WHERE product_id = ?', [testProductId]);
        } finally {
            conn.release();
        }
        await pool.end();
    });

    it('should distribute tax exactly (penny-perfect) across 3 items', async function () {
        // Quantity: 3
        // Total Tax: 10.00
        // Expected: 3.34, 3.33, 3.33
        // Sum: 10.00

        await service.receiveStock({
            supplier_id: 1,
            items: [{
                product_id: testProductId,
                quantity: 3,
                unit_cost: 100.00,
                tax_amount: 10.00,
                serial_number: 'SN-TAX'
            }],
            warehouse_id: testWarehouseId,
            bin_id: testBinId,
            notes: 'Test Serial Tax',
            user_id: 1
        });

        const conn = await pool.getConnection();
        try {
            const logs = await conn.query(`
                SELECT tax_amount FROM inventory_log 
                WHERE transaction_type = 'incoming' 
                AND notes = 'Test Serial Tax'
                ORDER BY log_id ASC
            `);

            expect(logs).to.have.lengthOf(3);

            const tax1 = Number(logs[0].tax_amount);
            const tax2 = Number(logs[1].tax_amount);
            const tax3 = Number(logs[2].tax_amount);

            // First item should have the extra penny
            // Logic: 10/3 = 3.3333... -> Floor 3.33. Remainder 0.01.
            // Item 1: 3.34
            // Item 2: 3.33
            // Item 3: 3.33
            expect(tax1).to.equal(3.34);
            expect(tax2).to.equal(3.33);
            expect(tax3).to.equal(3.33);

            const totalTax = tax1 + tax2 + tax3;
            expect(totalTax).to.equal(10.00);

        } finally {
            conn.release();
        }
    });
});
