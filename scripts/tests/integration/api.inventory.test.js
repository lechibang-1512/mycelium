/**
 * Integration Tests: Inventory API
 * 
 * Tests the inventory management API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures, TEST_USER_ID } = require('../setup');

describe('Inventory API Integration Tests', function() {
    this.timeout(10000);
    
    let api;
    let fixtures;
    
    before(async function() {
        api = new APITestHelper();
        
        // Wait for server to be ready
        const serverReady = await api.waitForServer();
        if (!serverReady) {
            this.skip('Server is not running');
        }
        
        // Create test fixtures
        fixtures = await createTestFixtures();
        
        // Login
        const loginResponse = await api.login();
        if (!api.isSuccess(loginResponse)) {
            this.skip('Could not login - check credentials');
        }
    });
    
    after(async function() {
        await cleanTestFixtures(fixtures);
        await api.logout();
    });
    
    describe('GET /api/inventory', function() {
        it('should return all inventory items', async function() {
            const response = await api.get('/api/inventory');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should support pagination', async function() {
            const response = await api.get('/api/inventory?page=1&limit=10');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
            expect(response.data.length).to.be.at.most(10);
        });
        
        it('should support search filtering', async function() {
            const response = await api.get('/api/inventory?search=Test');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('GET /api/inventory/:id', function() {
        it('should return specific product details', async function() {
            const productId = fixtures.products[0].id;
            const response = await api.get(`/api/inventory/${productId}`);
            
            AssertionHelpers.assertSuccess(response);
            AssertionHelpers.assertFields(response.data, [
                'product_id',
                'device_name',
                'device_maker'
            ]);
            expect(response.data.product_id).to.equal(productId);
        });
        
        it('should return 404 for non-existent product', async function() {
            const response = await api.get('/api/inventory/999999');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
    
    describe('GET /api/inventory/product/:id/logs', function() {
        it('should return transaction logs for product', async function() {
            const productId = fixtures.products[0].id;
            const response = await api.get(`/api/inventory/product/${productId}/logs`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should support date range filtering', async function() {
            const productId = fixtures.products[0].id;
            const startDate = '2024-01-01';
            const endDate = '2024-12-31';
            const response = await api.get(
                `/api/inventory/product/${productId}/logs?start_date=${startDate}&end_date=${endDate}`
            );
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('POST /api/inventory/receive', function() {
        it('should receive stock successfully', async function() {
            const receiptData = {
                supplier_id: fixtures.suppliers[0].id,
                items: [{
                    product_id: fixtures.products[0].id,
                    quantity: 50,
                    unit_cost: 25.00
                }],
                warehouse_id: fixtures.warehouses[0].id,
                zone_id: fixtures.zones[0].id,
                user_id: TEST_USER_ID,
                subtotal: 1250.00,
                tax_amount: 0,
                total_amount: 1250.00
            };
            
            const response = await api.post('/api/inventory-transactions/receive', receiptData);
            
            AssertionHelpers.assertSuccess(response);
            const result = response.data.data || response.data.result || response.data;
            expect(result.receipt_id || result.receiptId).to.exist;
        });
        
        it('should reject invalid quantity', async function() {
            const receiptData = {
                supplier_id: fixtures.suppliers[0].id,
                items: [{
                    product_id: fixtures.products[0].id,
                    quantity: -5, // Invalid negative quantity
                    unit_cost: 25.00
                }],
                warehouse_id: fixtures.warehouses[0].id,
                zone_id: fixtures.zones[0].id,
                user_id: TEST_USER_ID,
                subtotal: -125.00,
                tax_amount: 0,
                total_amount: -125.00
            };
            
            const response = await api.post('/api/inventory-transactions/receive', receiptData);
            
            AssertionHelpers.assertError(response, 400);
        });
        
        it('should require zone_id', async function() {
            const receiptData = {
                supplier_id: fixtures.suppliers[0].id,
                items: [{
                    product_id: fixtures.products[0].id,
                    quantity: 10,
                    unit_cost: 25.00
                }],
                warehouse_id: fixtures.warehouses[0].id,
                // Missing zone_id
                user_id: TEST_USER_ID,
                subtotal: 250.00,
                tax_amount: 0,
                total_amount: 250.00
            };
            
            const response = await api.post('/api/inventory-transactions/receive', receiptData);
            
            AssertionHelpers.assertError(response, 400);
            expect(response.data.error.toLowerCase()).to.include('zone');
        });
    });
    
    describe('POST /api/inventory/calculate-receive-cost', function() {
        it('should calculate receipt costs correctly', async function() {
            const items = [{
                product_id: fixtures.products[0].id,
                quantity: 10,
                unit_cost: 50.00
            }];
            
            const response = await api.post('/api/inventory/calculate-receive-cost', { items });
            
            AssertionHelpers.assertSuccess(response);
            const result = response.data.calculation || response.data;
            AssertionHelpers.assertFields(result, ['subtotal', 'tax_amount', 'total_amount']);
            expect(result.subtotal).to.equal(500.00);
        });
        
        it('should handle multiple items', async function() {
            const items = [
                { product_id: fixtures.products[0].id, quantity: 10, unit_cost: 50.00 },
                { product_id: fixtures.products[0].id, quantity: 5, unit_cost: 30.00 }
            ];
            
            const response = await api.post('/api/inventory/calculate-receive-cost', { items });
            
            AssertionHelpers.assertSuccess(response);
            const result = response.data.calculation || response.data;
            expect(result.subtotal).to.equal(650.00);
        });
    });
    
    describe('GET /api/inventory/:id/history', function() {
        it('should return inventory movement history', async function() {
            const productId = fixtures.products[0].id;
            const response = await api.get(`/api/inventory/${productId}/history`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should support pagination for history', async function() {
            const productId = fixtures.products[0].id;
            const response = await api.get(`/api/inventory/${productId}/history?page=1&limit=5`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
            expect(response.data.length).to.be.at.most(5);
        });
    });
    
    describe('Data Integrity', function() {
        it('should maintain consistent inventory levels after transactions', async function() {
            const productId = fixtures.products[0].id;
            const warehouseId = fixtures.warehouses[0].id;
            const zoneId = fixtures.zones[0].id;
            
            // Get initial level
            const initialResponse = await api.get(
                `/api/inventory-transactions/inventory-level/${productId}?warehouse_id=${warehouseId}&zone_id=${zoneId}`
            );
            const initialResult = initialResponse.data.data || initialResponse.data.level || initialResponse.data;
            const initialLevel = Number(initialResult.current_level || initialResult.quantity || initialResult || 0);
            
            // Receive stock
            await api.post('/api/inventory-transactions/receive', {
                supplier_id: fixtures.suppliers[0].id,
                items: [{ product_id: productId, quantity: 20, unit_cost: 25.00 }],
                warehouse_id: warehouseId,
                zone_id: zoneId,
                user_id: TEST_USER_ID,
                subtotal: 500.00,
                tax_amount: 0,
                total_amount: 500.00
            });
            
            // Get new level
            const finalResponse = await api.get(
                `/api/inventory-transactions/inventory-level/${productId}?warehouse_id=${warehouseId}&zone_id=${zoneId}`
            );
            const finalResult = finalResponse.data.data || finalResponse.data.level || finalResponse.data;
            const finalLevel = Number(finalResult.current_level || finalResult.quantity || finalResult || 0);
            
            expect(finalLevel).to.equal(initialLevel + 20);
        });
    });
});
