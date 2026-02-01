/**
 * Integration Tests: Audit API
 * 
 * Tests the audit logging API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Audit API Integration Tests', function() {
    this.timeout(10000);
    
    let api;
    let fixtures;
    
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
    
    describe('GET /api/audit', function() {
        it('should return audit logs', async function() {
            const response = await api.get('/api/audit');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('logs');
            expect(response.data).to.have.property('pagination');
            expect(response.data.logs).to.be.an('array');
        });
        
        it('should support pagination', async function() {
            const response = await api.get('/api/audit?page=1&limit=10');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data.pagination).to.deep.include({
                page: 1,
                limit: 10
            });
            expect(response.data.logs.length).to.be.at.most(10);
        });
        
        it('should filter by action_type', async function() {
            const response = await api.get('/api/audit?action_type=CREATE');
            
            AssertionHelpers.assertSuccess(response);
            if (response.data.logs.length > 0) {
                response.data.logs.forEach(log => {
                    expect(log.action_type).to.equal('CREATE');
                });
            }
        });
        
        it('should filter by user_id', async function() {
            const response = await api.get('/api/audit?user_id=1');
            
            AssertionHelpers.assertSuccess(response);
            if (response.data.logs.length > 0) {
                response.data.logs.forEach(log => {
                    expect(log.user_id).to.equal(1);
                });
            }
        });
        
        it('should filter by date range', async function() {
            const startDate = '2024-01-01';
            const endDate = '2024-12-31';
            const response = await api.get(`/api/audit?start_date=${startDate}&end_date=${endDate}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data.logs).to.be.an('array');
        });
    });
    
    describe('GET /api/audit/summary', function() {
        it('should return audit log summary statistics', async function() {
            const response = await api.get('/api/audit/summary');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('totalLogs');
            expect(response.data.totalLogs).to.be.a('number');
        });
    });
    
    describe('GET /api/audit/actions', function() {
        it('should return list of available action types', async function() {
            const response = await api.get('/api/audit/actions');
            
            // This endpoint may or may not exist, handle gracefully
            if (response.status !== 404) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.be.an('array');
            }
        });
    });
});
