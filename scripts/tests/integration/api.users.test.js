/**
 * Integration Tests: Users API
 * 
 * Tests the user management API endpoints
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Users API Integration Tests', function() {
    this.timeout(10000);
    
    let api;
    let fixtures;
    let createdUserId;
    
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
    
    describe('GET /api/users', function() {
        it('should return all users', async function() {
            const response = await api.get('/api/users');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should support pagination', async function() {
            const response = await api.get('/api/users?page=1&limit=20');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
        
        it('should filter by role', async function() {
            const response = await api.get('/api/users?role=admin');
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');
        });
    });
    
    describe('POST /api/users', function() {
        it('should create a new user', async function() {
            const userData = {
                username: `testuser_${Date.now()}`,
                email: `test_${Date.now()}@example.com`,
                password: 'TestPassword123!',
                role: 'user',
                full_name: 'Test User'
            };
            
            const response = await api.post('/api/users', userData);
            
            if (response.status === 201) {
                AssertionHelpers.assertSuccess(response);
                expect(response.data).to.have.property('user');
                createdUserId = response.data.user.user_id;
            }
        });
        
        it('should require username, email, and password', async function() {
            const invalidData = {
                full_name: 'Test User'
            };
            
            const response = await api.post('/api/users', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
        
        it('should validate email format', async function() {
            const invalidData = {
                username: `testuser_${Date.now()}`,
                email: 'invalid-email',
                password: 'TestPassword123!'
            };
            
            const response = await api.post('/api/users', invalidData);
            
            AssertionHelpers.assertError(response, 400);
        });
        
        it('should prevent duplicate usernames', async function() {
            const username = `testuser_${Date.now()}`;
            
            const firstData = {
                username: username,
                email: `test1_${Date.now()}@example.com`,
                password: 'TestPassword123!'
            };
            
            await api.post('/api/users', firstData);
            
            const secondData = {
                username: username,
                email: `test2_${Date.now()}@example.com`,
                password: 'TestPassword123!'
            };
            
            const response = await api.post('/api/users', secondData);
            
            AssertionHelpers.assertError(response, 400);
        });
    });
    
    describe('GET /api/users/:id', function() {
        it('should return user details', async function() {
            if (!createdUserId) {
                this.skip('No user created');
            }
            
            const response = await api.get(`/api/users/${createdUserId}`);
            
            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('user');
            expect(response.data.user).to.not.have.property('password');
        });
        
        it('should return 404 for non-existent user', async function() {
            const response = await api.get('/api/users/999999');
            
            AssertionHelpers.assertError(response, 404);
        });
    });
    
    describe('PUT /api/users/:id', function() {
        it('should update user details', async function() {
            if (!createdUserId) {
                this.skip('No user created');
            }
            
            const updateData = {
                full_name: 'Updated Test User',
                role: 'manager'
            };
            
            const response = await api.put(`/api/users/${createdUserId}`, updateData);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('PUT /api/users/:id/password', function() {
        it('should update user password', async function() {
            if (!createdUserId) {
                this.skip('No user created');
            }
            
            const passwordData = {
                current_password: 'TestPassword123!',
                new_password: 'NewTestPassword123!'
            };
            
            const response = await api.put(`/api/users/${createdUserId}/password`, passwordData);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('PUT /api/users/:id/deactivate', function() {
        it('should deactivate user', async function() {
            if (!createdUserId) {
                this.skip('No user created');
            }
            
            const response = await api.put(`/api/users/${createdUserId}/deactivate`);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('PUT /api/users/:id/activate', function() {
        it('should reactivate user', async function() {
            if (!createdUserId) {
                this.skip('No user created');
            }
            
            const response = await api.put(`/api/users/${createdUserId}/activate`);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
            }
        });
    });
    
    describe('DELETE /api/users/:id', function() {
        it('should delete user', async function() {
            if (!createdUserId) {
                this.skip('No user created');
            }
            
            const response = await api.delete(`/api/users/${createdUserId}`);
            
            if (response.status === 200) {
                AssertionHelpers.assertSuccess(response);
                createdUserId = null;
            }
        });
    });
});
