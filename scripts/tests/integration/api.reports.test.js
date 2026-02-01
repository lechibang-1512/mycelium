/**
 * Integration Tests: Reports API
 * 
 * Tests the reporting API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Reports API Integration Tests', function () {
    this.timeout(15000);

    let api;
    let fixtures;

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

    describe('GET /api/reports/inventory', function () {
        it('should generate inventory report', async function () {
            const response = await api.get('/api/reports/inventory');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });

        it('should filter inventory report by warehouse', async function () {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/reports/inventory?warehouse_id=${warehouseId}`);

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });

        it('should support date range filtering', async function () {
            const startDate = '2024-01-01';
            const endDate = '2024-12-31';
            const response = await api.get(`/api/reports/inventory?start_date=${startDate}&end_date=${endDate}`);

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });

    describe('GET /api/reports/sales', function () {
        it('should generate sales report', async function () {
            const response = await api.get('/api/reports/sales');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('object');
        });

        it('should support period parameter', async function () {
            const response = await api.get('/api/reports/sales?period=7');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('object');
        });
    });

    describe('GET /api/reports/transactions', function () {
        it('should generate transaction report', async function () {
            const response = await api.get('/api/reports/transactions');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });

        it('should filter by transaction type', async function () {
            const response = await api.get('/api/reports/transactions?type=INCOMING');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });

        it('should support pagination', async function () {
            const response = await api.get('/api/reports/transactions?page=1&limit=50');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });

    describe('GET /api/reports/stock-valuation', function () {
        it('should generate stock valuation report', async function () {
            const response = await api.get('/api/reports/stock-valuation');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('total_value');
        });

        it('should filter by warehouse', async function () {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/reports/stock-valuation?warehouse_id=${warehouseId}`);

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('object');
        });
    });

    describe('GET /api/reports/aging', function () {
        it('should generate aging report', async function () {
            const response = await api.get('/api/reports/aging');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });

    describe('GET /api/reports/movement-summary', function () {
        it('should generate movement summary report', async function () {
            const response = await api.get('/api/reports/movement-summary');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('object');
        });

        it('should support date range', async function () {
            const startDate = '2024-01-01';
            const endDate = '2024-12-31';
            const response = await api.get(`/api/reports/movement-summary?start_date=${startDate}&end_date=${endDate}`);

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('object');
        });
    });
});
