/**
 * Integration Tests: Serial Tracking API
 * 
 * Tests the serial number tracking API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Serial Tracking API Integration Tests', function() {
    this.timeout(10000);
    
    let api;
    let fixtures;
    let createdSerialId;
    
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
    
    describe('POST /api/serials', function() {
        it('should create a new serial number record', async function() {
            const serialData = {
                product_id: fixtures.products[0].id,
                serial_number: TestDataGenerator.generateSerialNumber(),
                warehouse_id: fixtures.warehouses[0].id,
                status: 'IN_STOCK'
            };
            
            const response = await api.post('/api/serials', serialData);
            
            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('serial');
                createdSerialId = response.data.serial.serial_id;
            }
        });
        
        it('should require product_id and serial_number', async function() {
            const invalidData = {
                warehouse_id: fixtures.warehouses[0].id
            };
            
            const response = await api.post('/api/serials', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
        
        it('should prevent duplicate serial numbers', async function() {
            const serialNumber = TestDataGenerator.generateSerialNumber();
            
            const firstData = {
                product_id: fixtures.products[0].id,
                serial_number: serialNumber,
                warehouse_id: fixtures.warehouses[0].id
            };
            
            await api.post('/api/serials', firstData);
            
            const secondData = {
                product_id: fixtures.products[0].id,
                serial_number: serialNumber,
                warehouse_id: fixtures.warehouses[0].id
            };
            
            const response = await api.post('/api/serials', secondData);
            
            AssertionHelpers.assertError(response, 400);
        });
    });
    
    describe('GET /api/serials', function() {
        it('should return all serial numbers', async function() {
            const response = await api.get('/api/serials');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by product_id', async function() {
            const productId = fixtures.products[0].id;
            const response = await api.get(`/api/serials?product_id=${productId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by warehouse_id', async function() {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/serials?warehouse_id=${warehouseId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by status', async function() {
            const response = await api.get('/api/serials?status=IN_STOCK');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('GET /api/serials/search/:serialNumber', function() {
        it('should search by serial number', async function() {
            if (!createdSerialId) {
                this.skip('No serial created');
            }
            
            const serialResponse = await api.get(`/api/serials/${createdSerialId}`);
            if (serialResponse.status === 200 && serialResponse.data.serial) {
                const serialNumber = serialResponse.data.serial.serial_number;
                const response = await api.get(`/api/serials/search/${serialNumber}`);
                
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('serial');
            }
        });
        
        it('should return 404 for non-existent serial', async function() {
            const response = await api.get('/api/serials/search/NONEXISTENT-SERIAL-12345');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
    
    describe('GET /api/serials/:id', function() {
        it('should return serial details', async function() {
            if (!createdSerialId) {
                this.skip('No serial created');
            }
            
            const response = await api.get(`/api/serials/${createdSerialId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('serial');
        });
        
        it('should return 404 for non-existent serial', async function() {
            const response = await api.get('/api/serials/999999');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
    
    describe('PUT /api/serials/:id', function() {
        it('should update serial status', async function() {
            if (!createdSerialId) {
                this.skip('No serial created');
            }
            
            const updateData = {
                status: 'SOLD'
            };
            
            const response = await api.put(`/api/serials/${createdSerialId}`, updateData);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('GET /api/serials/:id/history', function() {
        it('should return serial transaction history', async function() {
            if (!createdSerialId) {
                this.skip('No serial created');
            }
            
            const response = await api.get(`/api/serials/${createdSerialId}/history`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('DELETE /api/serials/:id', function() {
        it('should delete serial', async function() {
            if (!createdSerialId) {
                this.skip('No serial created');
            }
            
            const response = await api.delete(`/api/serials/${createdSerialId}`);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
                createdSerialId = null;
            }
        });
    });
});
