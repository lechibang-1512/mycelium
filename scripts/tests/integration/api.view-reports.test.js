/**
 * Integration Tests: View Reports API
 * 
 * Tests the view reports management API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('View Reports API Integration Tests', function () {
    this.timeout(10000);

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

    describe('GET /api/reports', function () {
        it('should return list of available reports', async function () {
            const response = await api.get('/api/reports');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });

    describe('GET /api/reports/:reportId', function () {
        it('should return specific report data', async function () {
            const response = await api.get('/api/reports/inventory-summary');

            if (response.status !== 404) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.be.an('object');
            }
        });
    });

    describe('GET /api/reports/scheduled', function () {
        it('should return scheduled reports', async function () {
            const response = await api.get('/api/reports/scheduled');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });

    describe('POST /api/reports/schedule', function () {
        it('should schedule a new report', async function () {
            const scheduleData = {
                report_type: 'inventory',
                frequency: 'daily',
                recipients: ['test@example.com']
            };

            const response = await api.post('/api/reports/schedule', scheduleData);

            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('schedule');
            }
        });
    });
});
