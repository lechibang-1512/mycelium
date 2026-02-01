/**
 * Integration Tests: Device Search API
 * 
 * Tests the IMEI/serial number device search API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Device Search API Integration Tests', function() {
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
    
    describe('GET /api/device-search/imei/:imei', function() {
        it('should search device by IMEI', async function() {
            // Create a phone with IMEI first
            const imei = TestDataGenerator.generateIMEI();
            const phoneData = {
                imei: imei,
                model: 'Test Phone',
                warehouse_id: fixtures.warehouses[0].id
            };
            
            const createResponse = await api.post('/api/phones', phoneData);
            
            if (createResponse.status === 201) {
                const response = await api.get(`/api/device-search/imei/${imei}`);
                
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('device');
            }
        });
        
        it('should return 404 for non-existent IMEI', async function() {
            const response = await api.get('/api/device-search/imei/999999999999999');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
    
    describe('GET /api/device-search/serial/:serialNumber', function() {
        it('should search device by serial number', async function() {
            // Create a serial first
            const serialNumber = TestDataGenerator.generateSerialNumber();
            const serialData = {
                product_id: fixtures.products[0].id,
                serial_number: serialNumber,
                warehouse_id: fixtures.warehouses[0].id
            };
            
            const createResponse = await api.post('/api/serials', serialData);
            
            if (createResponse.status === 201) {
                const response = await api.get(`/api/device-search/serial/${serialNumber}`);
                
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('device');
            }
        });
        
        it('should return 404 for non-existent serial', async function() {
            const response = await api.get('/api/device-search/serial/NONEXISTENT-SERIAL-999');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
    
    describe('POST /api/device-search/bulk', function() {
        it('should search multiple devices at once', async function() {
            const searchData = {
                imeis: [TestDataGenerator.generateIMEI()],
                serials: [TestDataGenerator.generateSerialNumber()]
            };
            
            const response = await api.post('/api/device-search/bulk', searchData);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('results');
                expect(response.data.results).to.be.an('array');
            }
        });
        
        it('should require at least one search criteria', async function() {
            const invalidData = {};
            
            const response = await api.post('/api/device-search/bulk', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
    });
    
    describe('GET /api/device-search/advanced', function() {
        it('should perform advanced search with multiple criteria', async function() {
            const response = await api.get('/api/device-search/advanced?model=Test&manufacturer=Samsung');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should support condition filtering', async function() {
            const response = await api.get('/api/device-search/advanced?condition=NEW');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should support warehouse filtering', async function() {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/device-search/advanced?warehouse_id=${warehouseId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
});
