/**
 * Integration Tests: Bins API
 * 
 * Tests the bin location management API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Bins API Integration Tests', function() {
    this.timeout(10000);
    
    let api;
    let fixtures;
    let createdBinId;
    
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
    
    describe('POST /api/bins', function() {
        it('should create a new bin', async function() {
            const binData = {
                warehouse_id: fixtures.warehouses[0].id,
                zone_id: fixtures.zones ? fixtures.zones[0].id : null,
                bin_code: TestDataGenerator.generateRandomString('BIN'),
                capacity: 100,
                bin_type: 'SHELF'
            };
            
            const response = await api.post('/api/bins', binData);
            
            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('bin');
                createdBinId = response.data.bin.bin_id;
            }
        });
        
        it('should require warehouse_id and bin_code', async function() {
            const invalidData = {
                capacity: 50
            };
            
            const response = await api.post('/api/bins', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
    });
    
    describe('GET /api/bins', function() {
        it('should return all bins', async function() {
            const response = await api.get('/api/bins');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by warehouse_id', async function() {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/bins?warehouse_id=${warehouseId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by zone_id', async function() {
            if (!fixtures.zones || fixtures.zones.length === 0) {
                this.skip('No zones available');
            }
            
            const zoneId = fixtures.zones[0].id;
            const response = await api.get(`/api/bins?zone_id=${zoneId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('GET /api/bins/:id', function() {
        it('should return bin details', async function() {
            if (!createdBinId) {
                this.skip('No bin created');
            }
            
            const response = await api.get(`/api/bins/${createdBinId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('bin');
        });
        
        it('should return 404 for non-existent bin', async function() {
            const response = await api.get('/api/bins/999999');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
    
    describe('PUT /api/bins/:id', function() {
        it('should update bin details', async function() {
            if (!createdBinId) {
                this.skip('No bin created');
            }
            
            const updateData = {
                capacity: 150,
                bin_type: 'PALLET'
            };
            
            const response = await api.put(`/api/bins/${createdBinId}`, updateData);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('GET /api/bins/:id/inventory', function() {
        it('should return inventory in bin', async function() {
            if (!createdBinId) {
                this.skip('No bin created');
            }
            
            const response = await api.get(`/api/bins/${createdBinId}/inventory`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('DELETE /api/bins/:id', function() {
        it('should delete bin', async function() {
            if (!createdBinId) {
                this.skip('No bin created');
            }
            
            const response = await api.delete(`/api/bins/${createdBinId}`);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
                createdBinId = null;
            }
        });
    });
});
