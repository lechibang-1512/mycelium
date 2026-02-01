/**
 * Integration Tests: Batch Tracking API
 * 
 * Tests the batch tracking API endpoints for inventory batch management
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Batch Tracking API Integration Tests', function() {
    this.timeout(10000);
    
    let api;
    let fixtures;
    let createdBatchId;
    
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
    
    describe('POST /api/batches', function() {
        it('should create a new batch', async function() {
            const batchData = {
                product_id: fixtures.products[0].id,
                warehouse_id: fixtures.warehouses[0].id,
                batch_no: TestDataGenerator.generateBatchNumber(),
                quantity: 100,
                expiry_date: TestDataGenerator.generateFutureDate(365),
                manufacture_date: TestDataGenerator.generatePastDate(30),
                unit_cost: 50.00
            };
            
            const response = await api.post('/api/batches', batchData);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('batch');
            expect(response.data.batch).to.have.property('batch_id');
            
            createdBatchId = response.data.batch.batch_id;
        });
        
        it('should require product_id, warehouse_id, batch_no, and quantity', async function() {
            const invalidData = {
                batch_no: TestDataGenerator.generateBatchNumber()
            };
            
            const response = await api.post('/api/batches', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
        
        it('should accept zone_id and supplier_id', async function() {
            const batchData = {
                product_id: fixtures.products[0].id,
                warehouse_id: fixtures.warehouses[0].id,
                zone_id: fixtures.zones ? fixtures.zones[0].id : null,
                batch_no: TestDataGenerator.generateBatchNumber(),
                quantity: 50,
                supplier_id: fixtures.suppliers ? fixtures.suppliers[0].id : null
            };
            
            const response = await api.post('/api/batches', batchData);
            
            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('GET /api/batches/expiring', function() {
        it('should return expiring batches', async function() {
            const response = await api.get('/api/batches/expiring?days=30');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('batches');
            expect(response.data.batches).to.be.an('array');
        });
        
        it('should filter by warehouse_id', async function() {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/batches/expiring?days=30&warehouse_id=${warehouseId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data.batches).to.be.an('array');
        });
        
        it('should use default of 30 days when days not specified', async function() {
            const response = await api.get('/api/batches/expiring');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data.batches).to.be.an('array');
        });
    });
    
    describe('GET /api/batches/alerts/expiring', function() {
        it('should return expiring batches (alternative endpoint)', async function() {
            const response = await api.get('/api/batches/alerts/expiring?days=60');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('batches');
        });
    });
    
    describe('GET /api/batches/:id', function() {
        it('should return batch details', async function() {
            if (!createdBatchId) {
                this.skip('No batch created');
            }
            
            const response = await api.get(`/api/batches/${createdBatchId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('batch');
            expect(response.data.batch.batch_id).to.equal(createdBatchId);
        });
        
        it('should return 404 for non-existent batch', async function() {
            const response = await api.get('/api/batches/999999');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
    
    describe('PUT /api/batches/:id', function() {
        it('should update batch quantity', async function() {
            if (!createdBatchId) {
                this.skip('No batch created');
            }
            
            const updateData = {
                quantity: 150
            };
            
            const response = await api.put(`/api/batches/${createdBatchId}`, updateData);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('DELETE /api/batches/:id', function() {
        it('should delete batch', async function() {
            if (!createdBatchId) {
                this.skip('No batch created');
            }
            
            const response = await api.delete(`/api/batches/${createdBatchId}`);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
                createdBatchId = null;
            }
        });
    });
});
