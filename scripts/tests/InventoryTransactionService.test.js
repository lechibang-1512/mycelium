/**
 * Unit Tests: InventoryTransactionService
 * 
 * Tests the transactional inventory management system
 * 
 * @version 1.0.0
 * @date 2025-11-09
 */

const chai = require('chai');
const expect = chai.expect;
const mariadb = require('mariadb');
require('dotenv').config();

const InventoryService = require('../../backend/services/InventoryService');

describe('InventoryService', function () {
    this.timeout(10000);

    let pool;
    let service;
    let testSupplierId;
    let testWarehouseId;
    let testZoneId;
    let testProductId;
    // let testSpecialtyId; // Not currently used

    before(async function () {
        // Setup test database connection
        pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: 'master_db',
            connectionLimit: 5
        });

        service = new InventoryService(pool);

        // Setup test data
        const conn = await pool.getConnection();
        try {
            // Create test supplier
            const supplierResult = await conn.query(`
                INSERT INTO suppliers (name, category, is_active)
                VALUES ('Test Supplier', 'electronics', 1)
            `);
            testSupplierId = supplierResult.insertId;

            // Create test warehouse
            const warehouseResult = await conn.query(`
                INSERT INTO warehouses (name, location, is_active)
                VALUES ('Test Warehouse', 'Test Location', 1)
            `);
            testWarehouseId = warehouseResult.insertId;

            // Create test zone
            const zoneResult = await conn.query(`
                INSERT INTO warehouse_zones (warehouse_id, name, zone_type, is_active)
                VALUES (?, 'Test Zone', 'storage', 1)
            `, [testWarehouseId]);
            testZoneId = zoneResult.insertId;

            // Create test product
            const productResult = await conn.query(`
                INSERT INTO specs_db (device_name, device_maker, device_price)
                VALUES ('Test Phone', 'Test Maker', 999.99)
            `);
            testProductId = productResult.insertId;

            // Specialty inventory creation removed for this test run (feature disabled)

        } finally {
            conn.release();
        }
    });

    after(async function () {
        // Cleanup test data
        const conn = await pool.getConnection();
        try {
            await conn.query('DELETE FROM inventory_log WHERE user_id = 999');
            // receipt_items and receipts tables no longer exist
            // await conn.query('DELETE FROM receipt_items WHERE receipt_id LIKE "TEST-%"');
            // await conn.query('DELETE FROM receipts WHERE receipt_id LIKE "TEST-%"');
            await conn.query('DELETE FROM warehouse_product_locations WHERE warehouse_id = ?', [testWarehouseId]);
            await conn.query('DELETE FROM assets WHERE warehouse_id = ?', [testWarehouseId]);
            await conn.query('DELETE FROM batch_tracking WHERE warehouse_id = ?', [testWarehouseId]);
            await conn.query('DELETE FROM warehouse_zones WHERE zone_id = ?', [testZoneId]);
            await conn.query('DELETE FROM warehouses WHERE warehouse_id = ?', [testWarehouseId]);
            await conn.query('DELETE FROM specs_db WHERE product_id = ?', [testProductId]);
            // specialty_inventory cleanup removed - feature disabled
            await conn.query('DELETE FROM suppliers WHERE id = ?', [testSupplierId]);
        } finally {
            conn.release();
        }

        await pool.end();
    });

    describe('receiveStock()', function () {

        it('should receive bulk goods successfully', async function () {
            const result = await service.receiveStock({
                supplier_id: testSupplierId,
                items: [{
                    product_id: testProductId,
                    quantity: 100,
                    unit_cost: 50.00
                }],
                warehouse_id: testWarehouseId,
                zone_id: testZoneId,
                user_id: 999,
                subtotal: 5000.00,
                tax_amount: 500.00,
                total_amount: 5500.00
            });

            expect(result.success).to.be.true;
            expect(result.receipt_id).to.exist;
            expect(result.items).to.have.lengthOf(1);
            expect(result.items[0].type).to.equal('bulk');
            expect(result.items[0].quantity).to.equal(100);
        });

        it('should receive serialized goods with unique serial numbers', async function () {
            const result = await service.receiveStock({
                supplier_id: testSupplierId,
                items: [{
                    product_id: testProductId,
                    quantity: 3,
                    unit_cost: 800.00,
                    serial_number: `TEST-SERIAL-${Date.now()}`
                }],
                warehouse_id: testWarehouseId,
                zone_id: testZoneId,
                user_id: 999,
                subtotal: 2400.00,
                tax_amount: 0,
                total_amount: 2400.00
            });

            expect(result.success).to.be.true;
            expect(result.items[0].type).to.equal('serialized');
            expect(result.items[0].assets).to.have.lengthOf(3);
            expect(result.items[0].assets[0].serial_number).to.include('TEST-SERIAL');
        });

        it('should receive batched goods with expiry dates', async function () {
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 2);

            const result = await service.receiveStock({
                supplier_id: testSupplierId,
                items: [{
                    product_id: testProductId,
                    quantity: 50,
                    unit_cost: 10.00,
                    batch_no: 'TEST-BATCH-001',
                    expiry_date: expiryDate.toISOString().split('T')[0]
                }],
                warehouse_id: testWarehouseId,
                zone_id: testZoneId,
                user_id: 999,
                subtotal: 500.00,
                tax_amount: 0,
                total_amount: 500.00
            });

            expect(result.success).to.be.true;
            expect(result.items[0].type).to.equal('batched');
            expect(result.items[0].batch_no).to.equal('TEST-BATCH-001');
            expect(result.items[0].quantity).to.equal(50);
        });

        // Test for specialized assets removed because specialty inventory feature is disabled

        it('should reject invalid supplier_id', async function () {
            try {
                await service.receiveStock({
                    supplier_id: null,
                    items: [{ product_id: testProductId, quantity: 1, unit_cost: 10 }],
                    warehouse_id: testWarehouseId,
                    user_id: 999,
                    subtotal: 10,
                    tax_amount: 0,
                    total_amount: 10
                });
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err.message).to.include('Supplier ID is required');
            }
        });

        it('should reject empty items array', async function () {
            try {
                await service.receiveStock({
                    supplier_id: testSupplierId,
                    items: [],
                    warehouse_id: testWarehouseId,
                    user_id: 999,
                    subtotal: 0,
                    tax_amount: 0,
                    total_amount: 0
                });
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err.message).to.include('At least one item is required');
            }
        });
    });

    describe('dispenseStock()', function () {

        let bulkProductId;

        beforeEach(async function () {
            // Setup: Receive some stock first
            await service.receiveStock({
                supplier_id: testSupplierId,
                items: [{
                    product_id: testProductId,
                    quantity: 50,
                    unit_cost: 25.00
                }],
                warehouse_id: testWarehouseId,
                zone_id: testZoneId,
                user_id: 999,
                subtotal: 1250.00,
                tax_amount: 0,
                total_amount: 1250.00
            });

            bulkProductId = testProductId;
        });

        it('should dispense bulk goods with availability check', async function () {
            const result = await service.dispenseStock({
                items: [{
                    product_id: bulkProductId,
                    quantity: 10,
                    unit_price: 30.00
                }],
                warehouse_id: testWarehouseId,
                zone_id: testZoneId,
                user_id: 999,
                customer_name: 'Test Customer'
            });

            expect(result.success).to.be.true;
            expect(result.items[0].type).to.equal('bulk');
            expect(result.items[0].quantity_dispensed).to.equal(10);
        });

        it('should reject dispensing more than available', async function () {
            try {
                await service.dispenseStock({
                    items: [{
                        product_id: bulkProductId,
                        quantity: 1000,  // More than available
                        unit_price: 30.00
                    }],
                    warehouse_id: testWarehouseId,
                    zone_id: testZoneId,
                    user_id: 999
                });
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err.message).to.include('Insufficient stock');
            }
        });
    });

    describe('transferStock()', function () {

        let secondWarehouseId;

        before(async function () {
            // Create second warehouse for transfer tests
            const conn = await pool.getConnection();
            try {
                const result = await conn.query(`
                    INSERT INTO warehouses (name, location, is_active)
                    VALUES ('Test Warehouse 2', 'Test Location 2', 1)
                `);
                secondWarehouseId = result.insertId;
            } finally {
                conn.release();
            }
        });

        after(async function () {
            const conn = await pool.getConnection();
            try {
                await conn.query('DELETE FROM warehouse_product_locations WHERE warehouse_id = ?', [secondWarehouseId]);
                await conn.query('DELETE FROM warehouses WHERE warehouse_id = ?', [secondWarehouseId]);
            } finally {
                conn.release();
            }
        });

        it('should transfer bulk goods between warehouses', async function () {
            // First, receive some stock
            await service.receiveStock({
                supplier_id: testSupplierId,
                items: [{
                    product_id: testProductId,
                    quantity: 100,
                    unit_cost: 25.00
                }],
                warehouse_id: testWarehouseId,
                zone_id: testZoneId,
                user_id: 999,
                subtotal: 2500.00,
                tax_amount: 0,
                total_amount: 2500.00
            });

            // Transfer
            const result = await service.transferStock({
                product_id: testProductId,
                quantity: 30,
                from_warehouse_id: testWarehouseId,
                from_zone_id: testZoneId,
                to_warehouse_id: secondWarehouseId,
                to_zone_id: null,
                user_id: 999,
                notes: 'Test transfer'
            });

            expect(result.success).to.be.true;
            expect(result.type).to.equal('bulk_transfer');
            expect(result.quantity_transferred).to.equal(30);
        });
    });

    describe('getInventoryLevel()', function () {

        it('should derive inventory level from transaction log', async function () {
            // Receive stock
            await service.receiveStock({
                supplier_id: testSupplierId,
                items: [{
                    product_id: testProductId,
                    quantity: 75,
                    unit_cost: 20.00
                }],
                warehouse_id: testWarehouseId,
                zone_id: testZoneId,
                user_id: 999,
                subtotal: 1500.00,
                tax_amount: 0,
                total_amount: 1500.00
            });

            // Get level
            const level = await service.getInventoryLevel(
                testProductId,
                testWarehouseId,
                testZoneId
            );

            expect(level).to.be.a('number');
            expect(level).to.be.at.least(75);
        });
    });

    describe('getTransactionHistory()', function () {

        it('should return complete transaction history', async function () {
            const history = await service.getTransactionHistory(testProductId, {
                limit: 10
            });

            expect(history).to.be.an('array');
            expect(history.length).to.be.at.least(0);

            if (history.length > 0) {
                expect(history[0]).to.have.property('log_id');
                expect(history[0]).to.have.property('transaction_type');
                expect(history[0]).to.have.property('quantity_changed');
            }
        });
    });
});
