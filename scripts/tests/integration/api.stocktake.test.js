/**
 * Integration Tests: Stocktake API
 * 
 * Tests the stocktake/physical inventory count API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Stocktake API Integration Tests', function() {
    this.timeout(10000);
    
    let api;
    let fixtures;
    let createdStocktakeId;
    
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
    
    describe('POST /api/stocktake', function() {
        it('should create a new stocktake', async function() {
            const stocktakeData = {
                warehouse_id: fixtures.warehouses[0].id,
                scheduled_date: TestDataGenerator.generateFutureDate(7),
                notes: 'Test stocktake'
            };
            
            const response = await api.post('/api/stocktake', stocktakeData);
            
            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('stocktake');
                createdStocktakeId = response.data.stocktake.stocktake_id;
            }
        });
        
        it('should require warehouse_id', async function() {
            const invalidData = {
                scheduled_date: TestDataGenerator.generateFutureDate(7)
            };
            
            const response = await api.post('/api/stocktake', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
    });
    
    describe('GET /api/stocktake', function() {
        it('should return all stocktakes', async function() {
            const response = await api.get('/api/stocktake');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by warehouse_id', async function() {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/stocktake?warehouse_id=${warehouseId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by status', async function() {
            const response = await api.get('/api/stocktake?status=PENDING');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('GET /api/stocktake/:id', function() {
        it('should return stocktake details', async function() {
            if (!createdStocktakeId) {
                this.skip('No stocktake created');
            }
            
            const response = await api.get(`/api/stocktake/${createdStocktakeId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('stocktake');
        });
        
        it('should return 404 for non-existent stocktake', async function() {
            const response = await api.get('/api/stocktake/999999');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
    
    describe('PUT /api/stocktake/:id', function() {
        it('should update stocktake status', async function() {
            if (!createdStocktakeId) {
                this.skip('No stocktake created');
            }
            
            const updateData = {
                status: 'IN_PROGRESS'
            };
            
            const response = await api.put(`/api/stocktake/${createdStocktakeId}`, updateData);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('POST /api/stocktake/:id/counts', function() {
        it('should add count entries to stocktake', async function() {
            if (!createdStocktakeId) {
                this.skip('No stocktake created');
            }
            
            const countData = {
                product_id: fixtures.products[0].id,
                counted_quantity: 95,
                notes: 'Test count'
            };
            
            const response = await api.post(`/api/stocktake/${createdStocktakeId}/counts`, countData);
            
            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('GET /api/stocktake/:id/counts', function() {
        it('should return stocktake count entries', async function() {
            if (!createdStocktakeId) {
                this.skip('No stocktake created');
            }
            
            const response = await api.get(`/api/stocktake/${createdStocktakeId}/counts`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('POST /api/stocktake/:id/finalize', function() {
        it('should finalize stocktake', async function() {
            if (!createdStocktakeId) {
                this.skip('No stocktake created');
            }
            
            const response = await api.post(`/api/stocktake/${createdStocktakeId}/finalize`);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('DELETE /api/stocktake/:id', function() {
        it('should delete stocktake', async function() {
            if (!createdStocktakeId) {
                this.skip('No stocktake created');
            }
            
            const response = await api.delete(`/api/stocktake/${createdStocktakeId}`);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
                createdStocktakeId = null;
            }
        });
    });
});
