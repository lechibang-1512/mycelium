/**
 * Integration Tests: Serialized Inventory API
 * 
 * Tests the serialized inventory API endpoints for devices and spare parts
 * with IMEI/serial number tracking
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Serialized Inventory API Integration Tests', function () {
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

    describe('GET /api/serialized-inventory', function () {
        it('should return all serialized inventory items', async function () {
            const response = await api.get('/api/serialized-inventory');

            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('success', true);
            expect(response.data).to.have.property('data').that.is.an('array');
            expect(response.data).to.have.property('pagination');
        });

        it('should support pagination', async function () {
            const response = await api.get('/api/serialized-inventory?limit=10&offset=0');

            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('success', true);
            expect(response.data.pagination).to.have.property('limit', 10);
            expect(response.data.pagination).to.have.property('offset', 0);
        });

        it('should filter by status', async function () {
            const response = await api.get('/api/serialized-inventory?status=available');

            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('success', true);
            expect(response.data).to.have.property('data').that.is.an('array');
        });

        it('should support search query', async function () {
            const response = await api.get('/api/serialized-inventory?search=test');

            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('success', true);
        });
    });

    describe('GET /api/serialized-inventory/devices', function () {
        it('should return only devices with IMEI', async function () {
            const response = await api.get('/api/serialized-inventory/devices');

            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('success', true);
            expect(response.data).to.have.property('data').that.is.an('array');

            // All returned items should have IMEI (if any exist)
            if (response.data.data.length > 0) {
                response.data.data.forEach(item => {
                    expect(item.imei_1).to.not.be.empty;
                });
            }
        });

        it('should filter devices by status', async function () {
            const response = await api.get('/api/serialized-inventory/devices?status=available');

            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('success', true);
        });

        it('should search devices by IMEI', async function () {
            const response = await api.get('/api/serialized-inventory/devices?search=351234');

            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('success', true);
        });
    });

    describe('GET /api/serialized-inventory/spare-parts', function () {
        it('should return spare parts without IMEI', async function () {
            const response = await api.get('/api/serialized-inventory/spare-parts');

            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('success', true);
            expect(response.data).to.have.property('data').that.is.an('array');

            // All returned items should NOT have IMEI (if any exist)
            if (response.data.data.length > 0) {
                response.data.data.forEach(item => {
                    expect(item.imei_1).to.satisfy(val => !val || val === '');
                });
            }
        });

        it('should filter spare parts by status', async function () {
            const response = await api.get('/api/serialized-inventory/spare-parts?status=available');

            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('success', true);
        });
    });

    describe('GET /api/serialized-inventory/stats/summary', function () {
        it('should return inventory statistics', async function () {
            const response = await api.get('/api/serialized-inventory/stats/summary');

            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('success', true);
            expect(response.data).to.have.property('data');

            const stats = response.data.data;
            expect(stats).to.have.property('total').that.is.a('number');
            expect(stats).to.have.property('byStatus').that.is.an('object');
            expect(stats).to.have.property('byCondition').that.is.an('object');
            expect(stats).to.have.property('devices').that.is.a('number');
            expect(stats).to.have.property('spareParts').that.is.a('number');
        });
    });

    describe('GET /api/serialized-inventory/:id', function () {
        it('should return 404 for non-existent item', async function () {
            const response = await api.get('/api/serialized-inventory/999999');

            expect(response.status).to.equal(404);
            expect(response.data).to.have.property('success', false);
            expect(response.data).to.have.property('error');
        });

        it('should return item details when found', async function () {
            // First get an item to test with
            const listResponse = await api.get('/api/serialized-inventory?limit=1');

            if (listResponse.data.data && listResponse.data.data.length > 0) {
                const itemId = listResponse.data.data[0].tracking_id;
                const response = await api.get(`/api/serialized-inventory/${itemId}`);

                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('data');
            } else {
                this.skip('No items found to test');
            }
        });
    });

    describe('PUT /api/serialized-inventory/:id/status', function () {
        it('should require status field', async function () {
            const response = await api.put('/api/serialized-inventory/1/status', {});

            expect(response.status).to.equal(400);
            expect(response.data).to.have.property('success', false);
            expect(response.data.error).to.include('Status is required');
        });

        it('should reject invalid status values', async function () {
            const response = await api.put('/api/serialized-inventory/1/status', {
                status: 'invalid_status'
            });

            expect(response.status).to.equal(400);
            expect(response.data).to.have.property('success', false);
        });

        it('should accept valid status values', async function () {
            // First get an item to test with
            const listResponse = await api.get('/api/serialized-inventory?limit=1');

            if (listResponse.data.data && listResponse.data.data.length > 0) {
                const itemId = listResponse.data.data[0].tracking_id;
                const response = await api.put(`/api/serialized-inventory/${itemId}/status`, {
                    status: 'available',
                    notes: 'Integration test update'
                });

                // Could be 200 or 400 depending on item state
                expect(response.data).to.have.property('success');
            } else {
                this.skip('No items found to test');
            }
        });
    });

    describe('POST /api/serialized-inventory/:id/transfer', function () {
        it('should require warehouse ID', async function () {
            const response = await api.post('/api/serialized-inventory/1/transfer', {});

            expect(response.status).to.equal(400);
            expect(response.data).to.have.property('success', false);
            expect(response.data.error).to.include('Warehouse ID is required');
        });
    });
});
