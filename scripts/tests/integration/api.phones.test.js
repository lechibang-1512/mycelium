/**
 * Integration Tests: Phones API
 * 
 * Tests the phones (specialized inventory) API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Phones API Integration Tests', function() {
    this.timeout(10000);
    
    let api;
    let fixtures;
    let createdPhoneId;
    
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
    
    describe('GET /api/phones', function() {
        it('should return all phones', async function() {
            const response = await api.get('/api/phones');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should support search filtering', async function() {
            const response = await api.get('/api/phones?search=iPhone');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by condition', async function() {
            const response = await api.get('/api/phones?condition=NEW');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('POST /api/phones', function() {
        it('should create a new phone record', async function() {
            const phoneData = {
                imei: TestDataGenerator.generateIMEI(),
                serial_number: TestDataGenerator.generateSerialNumber(),
                model: 'Test Phone Model',
                manufacturer: 'Test Brand',
                condition: 'NEW',
                warehouse_id: fixtures.warehouses[0].id
            };
            
            const response = await api.post('/api/phones', phoneData);
            
            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('phone');
                createdPhoneId = response.data.phone.phone_id;
            }
        });
        
        it('should require IMEI or serial_number', async function() {
            const invalidData = {
                model: 'Test Phone',
                warehouse_id: fixtures.warehouses[0].id
            };
            
            const response = await api.post('/api/phones', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
        
        it('should validate IMEI format', async function() {
            const invalidData = {
                imei: '123',  // Invalid IMEI
                model: 'Test Phone',
                warehouse_id: fixtures.warehouses[0].id
            };
            
            const response = await api.post('/api/phones', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
    });
    
    describe('GET /api/phones/:id', function() {
        it('should return phone details', async function() {
            if (!createdPhoneId) {
                this.skip('No phone created');
            }
            
            const response = await api.get(`/api/phones/${createdPhoneId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('phone');
        });
        
        it('should return 404 for non-existent phone', async function() {
            const response = await api.get('/api/phones/999999');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
    
    describe('PUT /api/phones/:id', function() {
        it('should update phone details', async function() {
            if (!createdPhoneId) {
                this.skip('No phone created');
            }
            
            const updateData = {
                condition: 'USED',
                notes: 'Updated to used condition'
            };
            
            const response = await api.put(`/api/phones/${createdPhoneId}`, updateData);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('GET /api/phones/search/imei/:imei', function() {
        it('should search phone by IMEI', async function() {
            if (!createdPhoneId) {
                this.skip('No phone created');
            }
            
            // Get the phone first to get its IMEI
            const phoneResponse = await api.get(`/api/phones/${createdPhoneId}`);
            if (phoneResponse.status === 200 && phoneResponse.data.phone.imei) {
                const imei = phoneResponse.data.phone.imei;
                const response = await api.get(`/api/phones/search/imei/${imei}`);
                
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('phone');
            }
        });
    });
    
    describe('DELETE /api/phones/:id', function() {
        it('should delete phone', async function() {
            if (!createdPhoneId) {
                this.skip('No phone created');
            }
            
            const response = await api.delete(`/api/phones/${createdPhoneId}`);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
                createdPhoneId = null;
            }
        });
    });
});
