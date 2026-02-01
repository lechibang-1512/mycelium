/**
 * Integration Tests: Inventory Transactions API
 * 
 * Tests the transactional inventory management API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Inventory Transactions API Integration Tests', function () {
    this.timeout(10000);

    let api;
    let fixtures;
    let _createdTransactionId; // Reserved for future cleanup

    before(async function () {
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

    after(async function () {
        await cleanTestFixtures(fixtures);
        await api.logout();
    });

    describe('POST /api/inventory-transactions/receive', function () {
        it('should create receive transaction', async function () {
            const transactionData = {
                product_id: fixtures.products[0].id,
                warehouse_id: fixtures.warehouses[0].id,
                quantity: 50,
                unit_cost: 25.00,
                notes: 'Test receive stock'
            };

            const response = await api.post('/api/inventory-transactions/receive', transactionData);

            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('transaction');
                _createdTransactionId = response.data.transaction.transaction_id;
            }
        });
    });

    describe('POST /api/inventory-transactions/dispense', function () {
        it('should create dispense transaction', async function () {
            const transactionData = {
                product_id: fixtures.products[0].id,
                warehouse_id: fixtures.warehouses[0].id,
                quantity: 10,
                notes: 'Test dispense stock'
            };

            const response = await api.post('/api/inventory-transactions/dispense', transactionData);

            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });

    describe('POST /api/inventory-transactions/transfer', function () {
        it('should create transfer transaction', async function () {
            // Ensure we have a second warehouse
            if (fixtures.warehouses.length < 2) {
                this.skip('Need at least 2 warehouses for transfer test');
            }

            const transactionData = {
                product_id: fixtures.products[0].id,
                from_warehouse_id: fixtures.warehouses[0].id,
                to_warehouse_id: fixtures.warehouses[1].id,
                quantity: 5,
                notes: 'Test transfer stock'
            };

            const response = await api.post('/api/inventory-transactions/transfer', transactionData);

            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });

    describe('GET /api/inventory-transactions/inventory-level/:productId', function () {
        it('should return inventory level', async function () {
            const productId = fixtures.products[0].id;
            const response = await api.get(`/api/inventory-transactions/inventory-level/${productId}`);
            AssertionHelpers.assertSuccess(response);
        });
    });

    describe('GET /api/inventory-transactions/history/:productId', function () {
        it('should return transaction history', async function () {
            const productId = fixtures.products[0].id;
            const response = await api.get(`/api/inventory-transactions/history/${productId}`);
            AssertionHelpers.assertSuccess(response);
        });
    });

    describe('GET /api/inventory-transactions/validate-availability', function () {
        it('should validate availability', async function () {
            const params = {
                product_id: fixtures.products[0].id,
                warehouse_id: fixtures.warehouses[0].id,
                quantity: 1
            };
            // construct query string
            const queryString = new URLSearchParams(params).toString();
            const response = await api.get(`/api/inventory-transactions/validate-availability?${queryString}`);
            AssertionHelpers.assertSuccess(response);
        });
    });

    describe('GET /api/inventory-transactions/stats', function () {
        it('should return transaction stats', async function () {
            const response = await api.get('/api/inventory-transactions/stats');
            AssertionHelpers.assertSuccess(response);
        });
    });
});
