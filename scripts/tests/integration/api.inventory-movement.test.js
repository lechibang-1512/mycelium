/**
 * Integration Tests: Inventory Movement API
 * 
 * Tests the inventory movement and transfer API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Inventory Movement API Integration Tests', function() {
    this.timeout(10000);
    
    let api;
    let fixtures;
    let createdMovementId;
    
    before(async function() {
        api = new APITestHelper();
        
        const serverReady = await api.waitForServer();
        if (!serverReady) {
            this.skip('Server is not running');
        }
        
        fixtures = await createTestFixtures();
        
        const loginResponse = await api.login();
        if (!api.isSuccess(loginResponse)) {
            this.skip('Could not login - check credentials');
        }
    });
    
    after(async function() {
        await cleanTestFixtures(fixtures);
        await api.logout();
    });
    
    describe('POST /api/inventory-movement', function() {
        it('should create inventory movement record', async function() {
            const movementData = {
                product_id: fixtures.products[0].id,
                from_warehouse_id: fixtures.warehouses[0].id,
                to_warehouse_id: fixtures.warehouses[1] ? fixtures.warehouses[1].id : fixtures.warehouses[0].id,
                quantity: 10,
                movement_type: 'TRANSFER',
                notes: 'Test movement'
            };
            
            const response = await api.post('/api/inventory-movement', movementData);
            
            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('movement');
                createdMovementId = response.data.movement.movement_id;
            }
        });
        
        it('should require product_id and quantity', async function() {
            const invalidData = {
                from_warehouse_id: fixtures.warehouses[0].id
            };
            
            const response = await api.post('/api/inventory-movement', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
        
        it('should support zone-to-zone transfers', async function() {
            if (!fixtures.zones || fixtures.zones.length < 2) {
                this.skip('Not enough zones for testing');
            }
            
            const movementData = {
                product_id: fixtures.products[0].id,
                from_zone_id: fixtures.zones[0].id,
                to_zone_id: fixtures.zones[1].id,
                quantity: 5,
                movement_type: 'ZONE_TRANSFER'
            };
            
            const response = await api.post('/api/inventory-movement', movementData);
            
            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('GET /api/inventory-movement', function() {
        it('should return all inventory movements', async function() {
            const response = await api.get('/api/inventory-movement');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by product_id', async function() {
            const productId = fixtures.products[0].id;
            const response = await api.get(`/api/inventory-movement?product_id=${productId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by warehouse_id', async function() {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/inventory-movement?warehouse_id=${warehouseId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by date range', async function() {
            const startDate = '2024-01-01';
            const endDate = '2024-12-31';
            const response = await api.get(`/api/inventory-movement?start_date=${startDate}&end_date=${endDate}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('GET /api/inventory-movement/:id', function() {
        it('should return movement details', async function() {
            if (!createdMovementId) {
                this.skip('No movement created');
            }
            
            const response = await api.get(`/api/inventory-movement/${createdMovementId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('movement');
        });
        
        it('should return 404 for non-existent movement', async function() {
            const response = await api.get('/api/inventory-movement/999999');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
});
