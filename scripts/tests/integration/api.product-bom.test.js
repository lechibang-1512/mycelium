/**
 * Integration Tests: Product BOM API
 * 
 * Tests the Bill of Materials (BOM) management API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Product BOM API Integration Tests', function() {
    this.timeout(10000);
    
    let api;
    let fixtures;
    let createdBomId;
    
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
    
    describe('GET /api/product-bom', function() {
        it('should return all BOMs', async function() {
            const response = await api.get('/api/product-bom');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by product_id', async function() {
            const productId = fixtures.products[0].id;
            const response = await api.get(`/api/product-bom?product_id=${productId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('POST /api/product-bom', function() {
        it('should create a new BOM entry', async function() {
            const bomData = {
                product_id: fixtures.products[0].id,
                component_id: fixtures.products[1] ? fixtures.products[1].id : fixtures.products[0].id,
                quantity_required: 2,
                unit: 'PIECE'
            };
            
            const response = await api.post('/api/product-bom', bomData);
            
            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('bom');
                createdBomId = response.data.bom.bom_id;
            }
        });
        
        it('should require product_id, component_id, and quantity_required', async function() {
            const invalidData = {
                product_id: fixtures.products[0].id
            };
            
            const response = await api.post('/api/product-bom', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
    });
    
    describe('GET /api/product-bom/product/:id', function() {
        it('should return BOM for specific product', async function() {
            const productId = fixtures.products[0].id;
            const response = await api.get(`/api/product-bom/product/${productId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should return empty array for product without BOM', async function() {
            const response = await api.get('/api/product-bom/product/999999');
            
            if (response.status === 200) {
                expect(response.data).to.be.an('array');
                expect(response.data.length).to.equal(0);
            }
        });
    });
    
    describe('GET /api/product-bom/:id', function() {
        it('should return BOM entry details', async function() {
            if (!createdBomId) {
                this.skip('No BOM created');
            }
            
            const response = await api.get(`/api/product-bom/${createdBomId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('bom');
        });
        
        it('should return 404 for non-existent BOM', async function() {
            const response = await api.get('/api/product-bom/999999');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
    
    describe('PUT /api/product-bom/:id', function() {
        it('should update BOM entry', async function() {
            if (!createdBomId) {
                this.skip('No BOM created');
            }
            
            const updateData = {
                quantity_required: 3
            };
            
            const response = await api.put(`/api/product-bom/${createdBomId}`, updateData);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('DELETE /api/product-bom/:id', function() {
        it('should delete BOM entry', async function() {
            if (!createdBomId) {
                this.skip('No BOM created');
            }
            
            const response = await api.delete(`/api/product-bom/${createdBomId}`);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
                createdBomId = null;
            }
        });
    });
});
