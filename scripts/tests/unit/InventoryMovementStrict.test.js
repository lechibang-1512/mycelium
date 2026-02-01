const { expect } = require('chai');
const sinon = require('sinon');
const express = require('express');
const request = require('supertest');
const CasbinService = require('../../../backend/services/CasbinService');

// Mock Casbin to bypass permission checks in tests
if (!CasbinService.enforce.restore) {
    sinon.stub(CasbinService, 'enforce').resolves(true);
}

// We need to require the route handler somehow. 
// Since it's a module.exports function taking pool, we can test it by instantiating it.

describe('Inventory Movement - Strict Staging Mode', function () {
    this.timeout(10000);

    let app;
    let mockPool;
    let mockConnection;

    beforeEach(function () {
        mockConnection = {
            query: sinon.stub(),
            release: sinon.stub(),
            beginTransaction: sinon.stub(),
            commit: sinon.stub(),
            rollback: sinon.stub()
        };

        mockPool = {
            getConnection: sinon.stub().resolves(mockConnection),
            query: sinon.stub() // For simple queries
        };

        // Initialize the app with the route
        app = express();
        app.use(express.json());

        // Mock user for RBAC
        app.use((req, res, next) => {
            req.user = { id: 1, username: 'test-admin' };
            next();
        });

        // Load the route
        // We mock convertBigIntToNumber as a simple pass-through
        const inventoryOpsRoutes = require('../../../backend/routes/inventory-ops')(mockPool, (x) => x);
        app.use('/api', inventoryOpsRoutes);
    });

    afterEach(function () {
        sinon.restore();
    });

    it('warehouse-transfer should NOT update specs_db.staging_inventory', async function () {
        // Mock product details
        mockConnection.query.withArgs(sinon.match(/SELECT device_name/))
            .resolves([{ device_name: 'Test Device', device_maker: 'Maker', device_price: 100, staging_inventory: 10 }]);

        // Mock source stock check
        mockConnection.query.withArgs(sinon.match(/SELECT location_id, quantity/))
            .resolves([{ location_id: 1, quantity: 10 }]);

        // Mock update source
        mockConnection.query.withArgs(sinon.match(/UPDATE warehouse_product_locations/))
            .resolves({ affectedRows: 1 });

        // Mock update destination
        mockConnection.query.withArgs(sinon.match(/INSERT INTO warehouse_product_locations/))
            .resolves({ affectedRows: 1 });

        // Mock Total Inventory calculation (Select) - This IS called
        mockConnection.query.withArgs(sinon.match(/SELECT COALESCE\(SUM\(quantity\), 0\) as total/))
            .resolves([{ total: 15 }]);

        // Mock sync inventory UPDATE - THIS is what we want to verify is NOT called
        // If the code was NOT commented out, it would call:
        // SELECT SUM(quantity)...
        // UPDATE specs_db ...

        // Mock Log
        mockConnection.query.withArgs(sinon.match(/INSERT INTO inventory_log/))
            .resolves({ affectedRows: 1 });


        const response = await request(app)
            .post('/api/inventory-movement/warehouse-transfer')
            .send({
                productId: 123,
                fromWarehouseId: 1,
                toWarehouseId: 2,
                toZoneId: 100, // Destination zone is mandatory
                quantity: 5
            });

        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;

        // Verify UPDATE specs_db was NEVER called
        expect(mockConnection.query.neverCalledWith(
            sinon.match(/UPDATE specs_db SET staging_inventory/)
        )).to.be.true;
    });
});
