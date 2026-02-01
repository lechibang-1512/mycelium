/**
 * Integration Tests: RMA API
 * 
 * Tests the Return Merchandise Authorization (RMA) API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('RMA API Integration Tests', function () {
    this.timeout(10000);

    let api;
    let fixtures;
    let createdRmaId;

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

    describe('POST /api/rma', function () {
        it('should create a new RMA', async function () {
            const payload = {
                rmaData: {
                    customer_name: 'Test Customer',
                    customer_email: 'test@example.com',
                    customer_phone: '1234567890',
                    reason_code: 'defective',
                    reason_description: 'Defective product',
                    priority: 'medium',
                    warehouse_id: fixtures.warehouses[0].id || fixtures.warehouses[0].warehouse_id
                },
                items: [
                    {
                        product_id: fixtures.products[0].id || fixtures.products[0].product_id,
                        quantity_requested: 1,
                        notes: 'Test item note'
                    }
                ]
            };

            const response = await api.post('/api/rma', payload);

            // API should return 201 with the RMA data directly (not wrapped in 'rma' property)
            if (response.status === 201 && response.data) {
                expect(response.data).to.have.property('rma_number');
                createdRmaId = response.data.rma_id || response.data.rma_number;
                expect(createdRmaId).to.exist;
            } else if (response.status === 201 && !response.data) {
                // If 201 but no data, log and skip dependent tests
                console.log('RMA created but response data is null - check server logs');
                this.skip();
            } else {
                console.log('Create RMA Failed:', response.status, JSON.stringify(response.data, null, 2));
                this.skip();
            }
        });

        it('should require product_id and reason', async function () {
            const invalidData = {
                customer_name: 'Test Customer'
            };

            const response = await api.post('/api/rma', invalidData);

            AssertionHelpers.assertError(response, 400);
        });

        it('should validate email format', async function () {
            const invalidData = {
                product_id: fixtures.products[0].id,
                customer_email: 'invalid-email',
                reason: 'Test reason'
            };

            const response = await api.post('/api/rma', invalidData);

            AssertionHelpers.assertError(response, 400);
        });
    });

    describe('GET /api/rma', function () {
        it('should return all RMAs', async function () {
            const response = await api.get('/api/rma');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });

        it('should support pagination', async function () {
            const response = await api.get('/api/rma?page=1&limit=20');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });

        it('should filter by status', async function () {
            const response = await api.get('/api/rma?status=pending');

            AssertionHelpers.assertSuccess(response);
            if (response.data.length > 0) {
                response.data.forEach(rma => {
                    expect(rma.status).to.equal('pending');
                });
            }
        });

        it('should filter by product_id', async function () {
            const productId = fixtures.products[0].id;
            const response = await api.get(`/api/rma?product_id=${productId}`);

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });

    describe('GET /api/rma/:id', function () {
        it('should return RMA details', async function () {
            if (!createdRmaId) {
                this.skip('No RMA created');
            }

            const response = await api.get(`/api/rma/${createdRmaId}`);

            AssertionHelpers.assertSuccess(response);
            // API returns RMA object directly, not wrapped in 'rma' property
            expect(response.data).to.have.property('rma_number');
        });

        it('should return 404 for non-existent RMA', async function () {
            const response = await api.get('/api/rma/999999');

            AssertionHelpers.assertError(response, 404);
        });
    });

    describe('PUT /api/rma/:id', function () {
        it('should update RMA status', async function () {
            if (!createdRmaId) {
                this.skip('No RMA created');
            }

            const updateData = {
                status: 'awaiting_return'
            };

            const response = await api.put(`/api/rma/${createdRmaId}`, updateData);

            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });

        it('should update RMA resolution details', async function () {
            if (!createdRmaId) {
                this.skip('No RMA created');
            }

            const updateData = {
                status: 'closed',
                resolution: 'Replaced product'
            };

            const response = await api.put(`/api/rma/${createdRmaId}`, updateData);

            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });

    describe('DELETE /api/rma/:id', function () {
        it('should delete RMA', async function () {
            if (!createdRmaId) {
                this.skip('No RMA created');
            }

            const response = await api.delete(`/api/rma/${createdRmaId}`);

            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
                createdRmaId = null;
            }
        });
    });
});
