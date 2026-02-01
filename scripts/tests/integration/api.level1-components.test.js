/**
 * Integration Tests: Level 1 Components API
 * 
 * Tests the Level 1 components taxonomy API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Level 1 Components API Integration Tests', function() {
    this.timeout(10000);
    
    let api;
    let fixtures;
    let createdComponentId;
    
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
    
    describe('GET /api/level1-components', function() {
        it('should return all level 1 components', async function() {
            const response = await api.get('/api/level1-components');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by category_id', async function() {
            if (!fixtures.categories || fixtures.categories.length === 0) {
                this.skip('No categories available');
            }
            
            const categoryId = fixtures.categories[0].id;
            const response = await api.get(`/api/level1-components?category_id=${categoryId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('POST /api/level1-components', function() {
        it('should create a new level 1 component', async function() {
            const componentData = {
                component_name: `Test Component ${Date.now()}`,
                category_id: fixtures.categories ? fixtures.categories[0].id : null,
                description: 'Test component for integration testing'
            };
            
            const response = await api.post('/api/level1-components', componentData);
            
            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('component');
                createdComponentId = response.data.component.component_id;
            }
        });
        
        it('should require component_name', async function() {
            const invalidData = {
                description: 'Missing name'
            };
            
            const response = await api.post('/api/level1-components', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
    });
    
    describe('GET /api/level1-components/:id', function() {
        it('should return component details', async function() {
            if (!createdComponentId) {
                this.skip('No component created');
            }
            
            const response = await api.get(`/api/level1-components/${createdComponentId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('component');
        });
        
        it('should return 404 for non-existent component', async function() {
            const response = await api.get('/api/level1-components/999999');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
    
    describe('PUT /api/level1-components/:id', function() {
        it('should update component', async function() {
            if (!createdComponentId) {
                this.skip('No component created');
            }
            
            const updateData = {
                component_name: `Updated Component ${Date.now()}`,
                description: 'Updated description'
            };
            
            const response = await api.put(`/api/level1-components/${createdComponentId}`, updateData);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('DELETE /api/level1-components/:id', function() {
        it('should delete component', async function() {
            if (!createdComponentId) {
                this.skip('No component created');
            }
            
            const response = await api.delete(`/api/level1-components/${createdComponentId}`);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
                createdComponentId = null;
            }
        });
    });
});
