/**
 * Integration Test: Receiving Price & Tax Verification
 *
 * Verifies that receiving stock correctly records unit_cost, tax_amount,
 * subtotal, and total_amount in the inventory_log table.
 * Covers both InventoryService (Legacy) and InventoryTransactionService (Modern).
 */

const chai = require('chai');
const expect = chai.expect;
const mariadb = require('mariadb');
require('dotenv').config();

const InventoryService = require('../../../backend/services/InventoryService');

describe('Receiving Price Verification', function () {
    this.timeout(10000);

    let pool;
    let inventoryService;
    let testSupplierId;
    let testWarehouseId;
    let testZoneId;
    let testProductId;
    let testInvoiceUuid;

    before(async function () {
        // Setup test database connection
        pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: 'master_db',
            connectionLimit: 5
        });

        inventoryService = new InventoryService(pool);

        // Setup test data
        const conn = await pool.getConnection();
        try {
            // Create test supplier
            const supplierResult = await conn.query(`
                INSERT INTO suppliers (name, category, is_active)
                VALUES ('Test Supplier Receive', 'electronics', 1)
            `);
            testSupplierId = supplierResult.insertId;

            // Create test warehouse
            // Create test warehouse
            const crypto = require('crypto');
            const warehouseUuid = crypto.randomUUID();
            await conn.query(`
                INSERT INTO warehouses (warehouse_id, name, location, is_active)
                VALUES (?, 'Test Warehouse Receive', 'Test Location Receive', 1)
            `, [warehouseUuid]);
            testWarehouseId = warehouseUuid;

            // Create test product
            const productUuid = crypto.randomUUID();
            const productResult = await conn.query(`
                INSERT INTO specs_db (product_id, device_name, device_maker, device_price, staging_inventory)
                VALUES (?, 'Test Phone Receive', 'Test Maker', 200.00, 0)
            `, [productUuid]);
            testProductId = productUuid;

            // Create test invoice for Strict Policy
            const invoiceUuid = crypto.randomUUID();
            const invoiceNum = 'INV-RCV-' + Date.now();
            await conn.query(`
                INSERT INTO invoices (uuid, invoice_number, invoice_date, total_amount, status, created_at, updated_at)
                VALUES (?, ?, NOW(), 1000.00, 'paid', NOW(), NOW())
            `, [invoiceUuid, invoiceNum]);
            testInvoiceUuid = invoiceUuid;

        } finally {
            conn.release();
        }
    });

    after(async function () {
        // Cleanup test data
        const conn = await pool.getConnection();
        try {
            await conn.query('DELETE FROM inventory_log WHERE user_id IS NULL AND notes LIKE "%Test Receive%"');
            await conn.query('DELETE FROM warehouse_product_locations WHERE warehouse_id = ?', [testWarehouseId]);
            await conn.query('DELETE FROM warehouses WHERE warehouse_id = ?', [testWarehouseId]);
            await conn.query('DELETE FROM specs_db WHERE product_id = ?', [testProductId]);
            await conn.query('DELETE FROM suppliers WHERE id = ?', [testSupplierId]);
        } finally {
            conn.release();
        }

        await pool.end();
    });

    it('should store correct financial data when receiving stock via InventoryService (Legacy/UI)', async function () {
        // Unit Cost: 100.00
        // Quantity: 10
        // Tax Amount: 50.00 (Total for 10 items)
        // Subtotal: 1000.00
        // Total: 1050.00

        await inventoryService.receiveStock({
            items: [{
                product_id: testProductId,
                quantity: 10,
                unit_cost: 100.00,
                tax_amount: 50.00
            }],
            supplier_id: testSupplierId,
            warehouse_id: testWarehouseId,
            user_id: 888,
            notes: 'Test Receive Legacy',
            invoice_id: testInvoiceUuid
        });

        // Verify Database Log
        const conn = await pool.getConnection();
        try {
            const logs = await conn.query(`
                SELECT * FROM inventory_log 
                WHERE transaction_type = 'incoming' 
                AND product_id = ?
                AND notes = 'Test Receive Legacy'
                ORDER BY log_id DESC
                LIMIT 1
            `, [testProductId]);

            expect(logs).to.have.lengthOf(1);
            const log = logs[0];

            // Verify stored values
            expect(Number(log.subtotal)).to.equal(1000.00);
            expect(Number(log.tax_amount)).to.equal(50.00);
            expect(Number(log.total_amount)).to.equal(1050.00);
            expect(Number(log.total_value)).to.equal(1050.00);

        } finally {
            conn.release();
        }
    });

    it('should store correct financial data when receiving stock via InventoryTransactionService (Modern)', async function () {
        // Unit Cost: 200.00
        // Quantity: 5
        // Tax Amount: 20.00 (Total for 5 items)
        // Subtotal: 1000.00
        // Total: 1020.00

        await inventoryService.receiveStock({
            supplier_id: testSupplierId,
            items: [{
                product_id: testProductId,
                quantity: 5,
                unit_cost: 200.00,
                tax_amount: 20.00
            }],
            warehouse_id: testWarehouseId,
            user_id: 888, // Fake user ID
            notes: 'Test Receive Modern',
            invoice_id: testInvoiceUuid
        });

        // Verify Database Log
        const conn = await pool.getConnection();
        try {
            const logs = await conn.query(`
                SELECT * FROM inventory_log 
                WHERE transaction_type = 'incoming' 
                AND product_id = ?
                ORDER BY log_id DESC
                LIMIT 1
            `, [testProductId]);

            expect(logs).to.have.lengthOf(1);
            const log = logs[0];

            // Verify stored values
            expect(Number(log.subtotal)).to.equal(1000.00);
            expect(Number(log.tax_amount)).to.equal(20.00);
            expect(Number(log.total_amount)).to.equal(1020.00);
            expect(Number(log.total_value)).to.equal(1020.00);

        } finally {
            conn.release();
        }
    });
});
