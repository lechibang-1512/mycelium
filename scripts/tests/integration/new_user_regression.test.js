/**
 * Regression Test: New User Lifecycle
 * 
 * Verifies that a newly created user can:
 * 1. Be created via API
 * 2. Login successfully (verifying password hashing)
 * 3. Be updated
 * 4. Be deleted
 */

const { expect } = require('chai');
const { APITestHelper, AssertionHelpers } = require('../helpers/api-test-helper');

describe('Regression Test: New User Implementation', function () {
    this.timeout(15000);

    let api;
    let newUser = {
        username: `reg_user_${Date.now()}`,
        password: 'RegressionPass123!',
        email: `reg_user_${Date.now()}@test.com`,
        role: 'user',
        fullName: 'Regression Test User'
    };
    let createdUserId;

    before(async function () {
        api = new APITestHelper();

        // Wait for server to be ready (custom check since /api/health might be missing)
        let serverReady = false;
        for (let i = 0; i < 5; i++) {
            try {
                const res = await api.get('/api/ua-test');
                if (res.status === 200) {
                    serverReady = true;
                    break;
                }
            } catch (e) {
                // Server not ready yet, will retry
                console.log(`Server connection attempt ${i + 1} failed:`, e.code || e.message);
            }
            await new Promise(r => setTimeout(r, 500));
        }

        if (!serverReady) {
            this.skip('Server is not running');
        }

        // Login as admin to perform operations
        const loginResponse = await api.login();
        if (!api.isSuccess(loginResponse)) {
            this.skip('Could not login as admin');
        }
    });

    it('1. Should create a new user successfully', async function () {
        const response = await api.post('/api/users', newUser);

        AssertionHelpers.assertSuccess(response);
        expect(response.data).to.have.property('user');
        expect(response.data.user).to.have.property('id');
        expect(response.data.user.username).to.equal(newUser.username);
        expect(response.data.user.email).to.equal(newUser.email);
        expect(response.data.user).to.not.have.property('password');

        createdUserId = response.data.user.id;
        console.log(`   Created user ID: ${createdUserId}`);
    });

    it('2. Should allow the new user to login', async function () {
        if (!createdUserId) this.skip();

        // Create a separate API instance for the new user
        const userApi = new APITestHelper();

        const loginResponse = await userApi.login(newUser.username, newUser.password);

        if (loginResponse.status === 401) {
            throw new Error('Login failed: Invalid credentials (password hashing might be broken)');
        }

        AssertionHelpers.assertSuccess(loginResponse, 'New user login failed');
        expect(loginResponse.data.user.username).to.equal(newUser.username);
        console.log('   New user logged in successfully');

        // Logout new user
        await userApi.logout();
    });

    it('3. Should update the new user', async function () {
        if (!createdUserId) this.skip();

        const updateData = {
            fullName: 'Updated Regression User',
            role: 'manager'
        };

        const response = await api.put(`/api/users/${createdUserId}`, updateData);
        AssertionHelpers.assertSuccess(response);

        // Verify update
        const getResponse = await api.get(`/api/users/${createdUserId}`);
        console.log('Update Verify Response:', JSON.stringify(getResponse.data, null, 2));

        if (!getResponse.data.user) {
            throw new Error(`User object missing in response. Status: ${getResponse.status}`);
        }

        expect(getResponse.data.user.fullName).to.equal(updateData.fullName);
        expect(getResponse.data.user.role).to.equal(updateData.role);
    });

    it('4. Should delete the new user', async function () {
        if (!createdUserId) this.skip();

        const response = await api.delete(`/api/users/${createdUserId}`);
        AssertionHelpers.assertSuccess(response);

        // Verify deletion
        const getResponse = await api.get(`/api/users/${createdUserId}`);
        AssertionHelpers.assertError(getResponse, 404);
    });

    // Cleanup: Ensure user is deleted if test fails (best effort)
    after(async function () {
        if (createdUserId) {
            // Try to delete if it still exists (ignore 404)
            try {
                await api.delete(`/api/users/${createdUserId}`);
            } catch (e) {
                // Cleanup failed - log but don't fail the test suite
                if (e.response?.status !== 404) {
                    console.log(`Cleanup: Could not delete test user ${createdUserId}:`, e.message);
                }
            }
        }
    });
});
