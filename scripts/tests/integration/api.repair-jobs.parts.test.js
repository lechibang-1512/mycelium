
const { expect } = require('chai');
const mariadb = require('mariadb');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { APITestHelper, AssertionHelpers } = require('../helpers/api-test-helper');

describe('Repair Job Parts Consumption API', function () {
    this.timeout(20000); // Increase timeout

    let api;
    let pool;
    let repairJobId;
    let sparePartId;
    let inventoryId;
    let warehouseId;
    let usageId;
    const initialQty = 100;
    const qtyUsed = 5;

    before(async () => {
        if (!process.env.ADMIN_PASSWORD) process.env.ADMIN_PASSWORD = 'admin';

        // Reset admin password
        const hash = await bcrypt.hash('admin', 10);
        // Create temp pool to update security_db (assuming root user has access)
        const securityPool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            connectionLimit: 1
        });
        await securityPool.query('UPDATE security_db.users SET password = ? WHERE username = "admin"', [hash]);
        await securityPool.end();

        api = new APITestHelper();
        const serverReady = await api.waitForServer();
        if (!serverReady) throw new Error('Server not ready');

        await api.login();

        // Setup test database connection
        pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: 'master_db',
            connectionLimit: 5
        });

        // Clean up
        await pool.query('DELETE FROM repair_job_parts_usage');
        await pool.query('DELETE FROM smartphone_repair_jobs WHERE job_number LIKE "TEST-RPR-%"');
        await pool.query('DELETE FROM smartphone_spare_parts WHERE part_code = "PART-CONS-001"');
        await pool.query('DELETE FROM warehouses WHERE name = "Test Repair WH"');

        // Create Test Warehouse
        const whRes = await pool.query("INSERT INTO warehouses (name, location, is_active) VALUES ('Test Repair WH', 'Test Loc', 1)");
        warehouseId = whRes.insertId;

        // 1. Create Test Spare Part
        const partRes = await pool.query(`
      INSERT INTO smartphone_spare_parts (part_name, part_code, part_category, unit_cost) 
      VALUES ('Test Part Consumption', 'PART-CONS-001', 'DISPLAY', 50.00)
    `);
        sparePartId = partRes.insertId;

        // 2. Create Inventory
        const invRes = await pool.query(`
      INSERT INTO smartphone_spare_parts_inventory (spare_part_id, warehouse_id, quantity_on_hand, quantity_reserved)
      VALUES (?, ?, ?, 0)
    `, [sparePartId, warehouseId, initialQty]);
        inventoryId = invRes.insertId;

        // 3. Create Test Repair Job
        const jobRes = await pool.query(`
      INSERT INTO smartphone_repair_jobs (
        job_number, customer_name, issue_description, status, priority, received_date
      ) VALUES ('TEST-RPR-001', 'Test Customer', 'Broken Screen', 'IN_PROGRESS', 'NORMAL', NOW())
    `);
        repairJobId = jobRes.insertId;
    });

    after(async () => {
        if (api) await api.logout();
        if (pool) {
            await pool.query('DELETE FROM smartphone_spare_parts WHERE spare_part_id = ?', [sparePartId]);
            await pool.query('DELETE FROM smartphone_repair_jobs WHERE repair_job_id = ?', [repairJobId]);
            if (warehouseId) await pool.query('DELETE FROM warehouses WHERE warehouse_id = ?', [warehouseId]);
            await pool.end();
        }
    });

    it('should successfully add part usage and subtract inventory', async () => {
        const payload = {
            spare_part_id: Number(sparePartId),
            inventory_id: Number(inventoryId),
            quantity_used: qtyUsed,
            notes: 'Test usage'
        };

        const res = await api.post(`/api/repair-jobs/${repairJobId}/parts`, payload);

        if (res.status !== 201) {
            console.log('Error Response:', JSON.stringify(res.data, null, 2));
        } else {
            console.log('Success Response:', JSON.stringify(res.data, null, 2));
        }
        AssertionHelpers.assertSuccess(res, 201);
        expect(res.data.usage_id).to.exist;
        usageId = res.data.usage_id;

        // Verify Inventory Subtraction
        const [invMsg] = await pool.query('SELECT quantity_on_hand FROM smartphone_spare_parts_inventory WHERE inventory_id = ?', [inventoryId]);
        expect(invMsg.quantity_on_hand).to.equal(initialQty - qtyUsed);
    });

    it('should create an inventory log entry for usage', async () => {
        const [logs] = await pool.query(`
      SELECT * FROM inventory_log 
      WHERE transaction_type = 'outgoing' 
      AND reference_id = ? 
    `, [repairJobId]);

        expect(logs).to.exist;
        expect(logs.quantity_changed).to.equal(-qtyUsed);
    });

    it('should fail to add part if inventory is insufficient', async () => {
        const hugeQty = 1000;
        const payload = {
            spare_part_id: Number(sparePartId),
            inventory_id: Number(inventoryId),
            quantity_used: hugeQty
        };

        const res = await api.post(`/api/repair-jobs/${repairJobId}/parts`, payload);
        AssertionHelpers.assertError(res, 400);
        expect(api.getErrorMessage(res)).to.include('Insufficient inventory');
    });

    it('should verify total cost calculation in repair job', async () => {
        // Check if parts_cost updated (via trigger or logic)
        const [job] = await pool.query('SELECT parts_cost FROM smartphone_repair_jobs WHERE repair_job_id = ?', [repairJobId]);
        // 5 units * 50.00 cost = 250.00
        expect(Number(job.parts_cost)).to.equal(250.00);
    });

    it('should restore inventory when part usage is removed', async () => {
        const res = await api.delete(`/api/repair-jobs/${repairJobId}/parts/${usageId}`);

        AssertionHelpers.assertSuccess(res, 200);

        // Verify Inventory Restoration
        const [invMsg] = await pool.query('SELECT quantity_on_hand FROM smartphone_spare_parts_inventory WHERE inventory_id = ?', [inventoryId]);
        expect(invMsg.quantity_on_hand).to.equal(initialQty); // Should be back to 100
    });

    it('should create an inventory log entry for restoration', async () => {
        const [logs] = await pool.query(`
      SELECT * FROM inventory_log 
      WHERE transaction_type = 'incoming' 
      AND reference_id = ? 
      AND notes LIKE '%Restored Part%'
    `, [repairJobId]);

        expect(logs).to.exist;
        expect(logs.quantity_changed).to.equal(qtyUsed);
    });
});
