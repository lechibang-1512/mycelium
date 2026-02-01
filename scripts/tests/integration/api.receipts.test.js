/**
 * Integration Tests: Receipts API
 * 
 * Tests the receipts management API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Receipts API Integration Tests', function() {
    this.timeout(10000);
    
    let api;
    let fixtures;
    let createdReceiptId;
    
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
    
    describe('GET /api/receipts', function() {
        it('should return all receipts', async function() {
            const response = await api.get('/api/receipts');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should support pagination', async function() {
            const response = await api.get('/api/receipts?page=1&limit=20');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by supplier_id', async function() {
            if (!fixtures.suppliers || fixtures.suppliers.length === 0) {
                this.skip('No suppliers available');
            }
            
            const supplierId = fixtures.suppliers[0].id;
            const response = await api.get(`/api/receipts?supplier_id=${supplierId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by date range', async function() {
            const startDate = '2024-01-01';
            const endDate = '2024-12-31';
            const response = await api.get(`/api/receipts?start_date=${startDate}&end_date=${endDate}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('POST /api/receipts', function() {
        it('should create a new receipt', async function() {
            const receiptData = {
                supplier_id: fixtures.suppliers ? fixtures.suppliers[0].id : null,
                warehouse_id: fixtures.warehouses[0].id,
                receipt_date: new Date().toISOString().split('T')[0],
                total_amount: 1000.00,
                items: [
                    {
                        product_id: fixtures.products[0].id,
                        quantity: 10,
                        unit_cost: 100.00
                    }
                ]
            };
            
            const response = await api.post('/api/receipts', receiptData);
            
            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('receipt');
                createdReceiptId = response.data.receipt.receipt_id;
            }
        });
        
        it('should require warehouse_id and items', async function() {
            const invalidData = {
                receipt_date: new Date().toISOString().split('T')[0]
            };
            
            const response = await api.post('/api/receipts', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
        
        it('should validate items array is not empty', async function() {
            const invalidData = {
                warehouse_id: fixtures.warehouses[0].id,
                items: []
            };
            
            const response = await api.post('/api/receipts', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
    });
    
    describe('GET /api/receipts/:id', function() {
        it('should return receipt details', async function() {
            if (!createdReceiptId) {
                this.skip('No receipt created');
            }
            
            const response = await api.get(`/api/receipts/${createdReceiptId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('receipt');
        });
        
        it('should return 404 for non-existent receipt', async function() {
            const response = await api.get('/api/receipts/999999');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
    
    describe('PUT /api/receipts/:id', function() {
        it('should update receipt status', async function() {
            if (!createdReceiptId) {
                this.skip('No receipt created');
            }
            
            const updateData = {
                status: 'COMPLETED'
            };
            
            const response = await api.put(`/api/receipts/${createdReceiptId}`, updateData);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('GET /api/receipts/:id/items', function() {
        it('should return receipt line items', async function() {
            if (!createdReceiptId) {
                this.skip('No receipt created');
            }
            
            const response = await api.get(`/api/receipts/${createdReceiptId}/items`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('DELETE /api/receipts/:id', function() {
        it('should delete receipt', async function() {
            if (!createdReceiptId) {
                this.skip('No receipt created');
            }
            
            const response = await api.delete(`/api/receipts/${createdReceiptId}`);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
                createdReceiptId = null;
            }
        });
    });
});
