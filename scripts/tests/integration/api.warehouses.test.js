/**
 * Integration Tests: Warehouses API
 * 
 * Tests warehouse management and zone-based operations
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');
const { Warehouse } = require('../../../backend/models');

describe('Warehouses API Integration Tests', function () {
    this.timeout(10000);

    let api;
    let fixtures;

    before(async function () {
        api = new APITestHelper();

        const serverReady = await api.waitForServer();
        if (!serverReady) this.skip('Server is not running');

        fixtures = await createTestFixtures();

        const loginResponse = await api.login();
        if (!api.isSuccess(loginResponse)) {
            this.skip('Could not login');
        }
    });

    after(async function () {
        await cleanTestFixtures(fixtures);
        await api.logout();
    });

    describe('GET /api/warehouses', function () {
        it('should return all warehouses', async function () {
            const response = await api.get('/api/warehouses');

            AssertionHelpers.assertSuccess(response);
            const warehouses = response.data.warehouses || response.data;
            expect(warehouses).to.be.an('array');
            AssertionHelpers.assertNotEmpty(warehouses);
        });

        it('should include warehouse details', async function () {
            const response = await api.get('/api/warehouses');

            const warehouses = response.data.warehouses || response.data;
            if (warehouses.length > 0) {
                const warehouse = warehouses[0];
                AssertionHelpers.assertFields(warehouse, [
                    'warehouse_id',
                    'name',
                    'location'
                ]);
            }
        });
    });

    describe('GET /api/warehouses/:id', function () {
        it('should return specific warehouse details', async function () {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/warehouses/${warehouseId}`);

            AssertionHelpers.assertSuccess(response);
            const warehouse = response.data.warehouse || response.data;
            AssertionHelpers.assertFields(warehouse, [
                'warehouse_id',
                'name',
                'location'
            ]);
            expect(warehouse.warehouse_id).to.equal(warehouseId);
        });

        it('should return 404 for non-existent warehouse', async function () {
            const response = await api.get('/api/warehouses/999999');

            expect(response.status).to.be.oneOf([404, 400]);
        });
    });

    describe('POST /api/warehouses', function () {
        let createdWarehouseId;

        after(async function () {
            // Clean up created warehouse using MongoDB
            if (createdWarehouseId) {
                await Warehouse.deleteOne({ warehouse_id: createdWarehouseId });
            }
        });

        it('should create new warehouse', async function () {
            const warehouseData = TestDataGenerator.warehouse();
            const response = await api.post('/api/warehouses', warehouseData);

            AssertionHelpers.assertSuccess(response);
            const result = response.data.result || response.data;
            expect(result.warehouse_id || result.warehouseId || result.id).to.exist;
            const warehouseId = result.warehouse_id || result.warehouseId || result.id;
            expect(warehouseId).to.exist;

            createdWarehouseId = warehouseId;
        });

        it('should validate required fields', async function () {
            const response = await api.post('/api/warehouses', {});

            AssertionHelpers.assertError(response, 400);
        });
    });

    describe.skip('GET /api/warehouses/:id/zones', function () {
        it('should return all zones for a warehouse', async function () {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/warehouses/${warehouseId}/zones`);

            AssertionHelpers.assertSuccess(response);
            const zones = response.data.zones || response.data;
            expect(zones).to.be.an('array');
        });

        it('should include zone details', async function () {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/warehouses/${warehouseId}/zones`);

            const zones = response.data.zones || response.data;
            if (zones.length > 0) {
                const zone = zones[0];
                AssertionHelpers.assertFields(zone, [
                    'zone_id',
                    'warehouse_id',
                    'name',
                    'zone_type'
                ]);
            }
        });
    });

    describe.skip('GET /api/zones/warehouse/:warehouseId', function () {
        it('should return zones for specific warehouse', async function () {
            const warehouseId = fixtures.warehouses[0].id;
            const response = await api.get(`/api/zones/warehouse/${warehouseId}`);

            AssertionHelpers.assertSuccess(response);
            const zones = response.data.zones || response.data;
            expect(zones).to.be.an('array');

            // Verify all zones belong to the warehouse
            zones.forEach(zone => {
                expect(zone.warehouse_id).to.equal(warehouseId);
            });
        });
    });

    describe('GET /api/warehouses/distribution/overview', function () {
        it('should return distribution overview', async function () {
            const response = await api.get('/api/warehouses/distribution/overview');

            AssertionHelpers.assertSuccess(response);
            const overview = response.data.overview || response.data;
            expect(overview).to.be.an('array');
        });
    });

    describe('GET /api/warehouses/low-stock-alerts', function () {
        it('should return low stock alerts', async function () {
            const response = await api.get('/api/warehouses/low-stock-alerts');

            AssertionHelpers.assertSuccess(response);
            const alerts = response.data.alerts || response.data;
            expect(alerts).to.be.an('array');
        });

        it('should support threshold parameter', async function () {
            const response = await api.get('/api/warehouses/low-stock-alerts?threshold=20');

            AssertionHelpers.assertSuccess(response);
            const alerts = response.data.alerts || response.data;
            expect(alerts).to.be.an('array');
        });
    });
});
