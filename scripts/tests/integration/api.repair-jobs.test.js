const { expect } = require('chai');
const { APITestHelper, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures, TEST_USER_ID } = require('../setup');

describe('Repair Jobs API Integration Tests', function() {
    this.timeout(10000);
    let api;
    let fixtures;
    before(async function() {
        api = new APITestHelper();
        const serverReady = await api.waitForServer();
        if (!serverReady) return this.skip();

        fixtures = await createTestFixtures();
        const loginResponse = await api.login();
        if (!api.isSuccess(loginResponse)) return this.skip();
    });

    after(async function() {
        await cleanTestFixtures(fixtures);
        await api.logout();
    });

    it('should create a repair job with valid priority (case-insensitive)', async function() {
        const productId = fixtures.products[0].id;
        const payload = {
            product_id: productId,
            customer_name: 'Test Customer',
            issue_description: 'Screen does not turn on',
            priority: 'urgent'
        };

        const response = await api.post('/api/repair-jobs', payload);
        AssertionHelpers.assertSuccess(response, 201);
        expect(response.data.data.repair_job_id).to.exist;
        // Clean up the created job
        const jobId = response.data.data.repair_job_id;
        await api.delete(`/api/repair-jobs/${jobId}`);
    });

    it('should reject repair job create with invalid priority', async function() {
        const productId = fixtures.products[0].id;
        const payload = {
            product_id: productId,
            customer_name: 'Test Customer',
            issue_description: 'Battery swelling',
            priority: 'EMERGENCY'
        };

        const response = await api.post('/api/repair-jobs', payload);
        AssertionHelpers.assertError(response, 400);
    });
});
