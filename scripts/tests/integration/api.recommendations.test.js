/**
 * Integration Tests: Recommendations API
 * 
 * Tests the inventory recommendations API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Recommendations API Integration Tests', function() {
    this.timeout(10000);
    
    let api;
    let fixtures;
    
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
    
    describe('GET /api/recommendations/reorder', function() {
        it('should return reorder recommendations', async function() {
            const response = await api.get('/api/recommendations/reorder');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter reorder recommendations by warehouse', async function() {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/recommendations/reorder?warehouse_id=${warehouseId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should support threshold parameter', async function() {
            const response = await api.get('/api/recommendations/reorder?threshold=10');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('GET /api/recommendations/overstocked', function() {
        it('should return overstocked items', async function() {
            const response = await api.get('/api/recommendations/overstocked');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter overstocked items by warehouse', async function() {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/recommendations/overstocked?warehouse_id=${warehouseId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('GET /api/recommendations/slow-moving', function() {
        it('should return slow-moving items', async function() {
            const response = await api.get('/api/recommendations/slow-moving');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should support days parameter', async function() {
            const response = await api.get('/api/recommendations/slow-moving?days=90');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter slow-moving items by warehouse', async function() {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/recommendations/slow-moving?warehouse_id=${warehouseId}&days=60`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('GET /api/recommendations/optimal-stock', function() {
        it('should return optimal stock level recommendations', async function() {
            const response = await api.get('/api/recommendations/optimal-stock');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by product_id', async function() {
            const productId = fixtures.products[0].id;
            const response = await api.get(`/api/recommendations/optimal-stock?product_id=${productId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('GET /api/recommendations/transfer-suggestions', function() {
        it('should return inventory transfer suggestions', async function() {
            const response = await api.get('/api/recommendations/transfer-suggestions');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by source warehouse', async function() {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/recommendations/transfer-suggestions?from_warehouse_id=${warehouseId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('GET /api/recommendations/summary', function() {
        it('should return recommendations summary', async function() {
            const response = await api.get('/api/recommendations/summary');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('reorderCount');
            expect(response.data).to.have.property('overstockedCount');
            expect(response.data).to.have.property('slowMovingCount');
        });
    });
});
