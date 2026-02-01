/**
 * Integration Test: API Validation Verification
 *
 * Verifies that the backend API correctly validates input parameters,
 * specifically rejecting invalid tax amounts.
 */

const chai = require('chai');
const expect = chai.expect;
const mariadb = require('mariadb');
require('dotenv').config();

const InventoryService = require('../../../backend/services/InventoryService');
const express = require('express');
const request = require('supertest');
const CasbinService = require('../../../backend/services/CasbinService');
const sinon = require('sinon');

// Mock Casbin to bypass permission checks in tests
if (!CasbinService.enforce.restore) {
    sinon.stub(CasbinService, 'enforce').resolves(true);
}

// Mock pool to avoid needing full app setup, or use actual pool and test logic
// Since we are testing a route handler in inventory-ops.js, we need to spin up an express app or mock the req/res
// However, the route file exports a function that takes (pool, converter).
// We can instantiate the route with a real pool and test it via supertest on a temporary app.

describe('API Validation Verification', function () {
    this.timeout(10000);

    let app;
    let pool;
    let server;

    before(async function () {
        // Setup test database connection
        pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: 'master_db',
            connectionLimit: 5
        });

        // Setup simple express app to mount the route
        app = express();
        app.use(express.json());

        // Mock user for RBAC
        app.use((req, res, next) => {
            req.user = { id: 1, username: 'test-admin' };
            next();
        });

        // Import the route handler
        const inventoryOpsRoute = require('../../../backend/routes/inventory-ops');

        // Mock converter function
        const convertBigIntToNumber = (obj) => obj;

        // Mount the route
        const router = inventoryOpsRoute(pool, convertBigIntToNumber);
        app.use('/api', router);
    });

    after(async function () {
        await pool.end();
    });

    it('should reject negative tax_amount in receive stock', async function () {
        const res = await request(app)
            .post('/api/inventory-transactions/receive')
            .send({
                supplier_id: 1,
                items: [], // Validation should fail before processing items if we place checks early, 
                // OR strict check inside route.
                // Our added code is BEFORE items processing.
                tax_amount: -50.00
            });

        expect(res.status).to.equal(400);
        expect(res.body.success).to.be.false;
        expect(res.body.error).to.include('Tax amount must be a non-negative number');
    });

    it('should reject non-numeric tax_amount', async function () {
        const res = await request(app)
            .post('/api/inventory-transactions/receive')
            .send({
                supplier_id: 1,
                tax_amount: "invalid"
            });

        expect(res.status).to.equal(400);
        expect(res.body.success).to.be.false;
        expect(res.body.error).to.include('Tax amount must be a non-negative number');
    });
});
