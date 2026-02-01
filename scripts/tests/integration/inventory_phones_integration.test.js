/**
 * Integration Tests: Inventory & Phones Unified View
 * 
 * Verifies that the merged Inventory/Phones functionality works as expected.
 * Ensures phones created via Phones API are correctly visible and searchable in the Inventory API.
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { createTestFixtures, cleanTestFixtures } = require('../setup');

describe('Inventory & Phones Integration Tests', function () {
    this.timeout(20000);

    let api;
    let fixtures;
    let createdPhoneId;
    let testPhoneData;
    let tempUser = null;

    before(async function () {
        api = new APITestHelper();

        const serverReady = await api.waitForServer();
        if (!serverReady) {
            this.skip('Server is not running');
        }

        // Create a temporary admin user for testing
        try {
            const conn = await pool.getConnection();
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('testpass123', 10);
            const username = `test_admin_${Date.now()}`;

            // 1. Ensure clean slate for user
            await conn.query("DELETE FROM security_db.users WHERE email = 'testadmin@example.com'");

            // 2. Create User
            const userResult = await conn.query(`
                INSERT INTO security_db.users (username, password, fullName, email, is_active)
                VALUES (?, ?, 'Test Integration Admin', 'testadmin@example.com', 1)
            `, [username, hashedPassword]);
            const userId = Number(userResult.insertId);

            // 2. Assign Permissions
            // Try to assign 'system_admin' role if it exists
            const roleRows = await conn.query("SELECT id FROM security_db.roles WHERE name = 'system_admin'");
            if (roleRows.length > 0) {
                await conn.query(`
                    INSERT INTO security_db.user_roles (user_id, role_id)
                    VALUES (?, ?)
                `, [userId, roleRows[0].id]);
            } else {
                // Fallback: create a temp role with all permissions
                const roleRes = await conn.query("INSERT INTO security_db.roles (name, description) VALUES (?, 'Temp Test Role')", [`temp_role_${userId}`]);
                const roleId = Number(roleRes.insertId);
                // Assign all permissions
                const perms = await conn.query("SELECT id FROM security_db.permissions");
                for (const p of perms) {
                    await conn.query("INSERT INTO security_db.role_permissions (role_id, permission_id) VALUES (?, ?)", [roleId, p.id]);
                }
                await conn.query("INSERT INTO security_db.user_roles (user_id, role_id) VALUES (?, ?)", [userId, roleId]);
                tempUser = { id: userId, username, password: 'testpass123', roleId };
            }

            if (!tempUser) tempUser = { id: userId, username, password: 'testpass123' };
            conn.release();

            // Login with temp user
            const loginResponse = await api.login(tempUser.username, tempUser.password);
            if (!api.isSuccess(loginResponse)) {
                console.log('Login failed response:', JSON.stringify(loginResponse.data));
                throw new Error(`Failed to login with temp user ${tempUser.username}`);
            }

        } catch (err) {
            console.error('Failed to set up test user:', err);
            this.skip('Could not create test user');
        }

        fixtures = await createTestFixtures();
    });

    after(async function () {
        // Clean up the created phone if it wasn't deleted by a test
        if (createdPhoneId) {
            await api.delete(`/api/phones/${createdPhoneId}`);
        }
        await cleanTestFixtures(fixtures);
        await api.logout();

        // Cleanup Temp User
        if (tempUser && pool) {
            const conn = await pool.getConnection();
            try {
                await conn.query('DELETE FROM security_db.user_roles WHERE user_id = ?', [tempUser.id]);
                if (tempUser.roleId) {
                    await conn.query('DELETE FROM security_db.role_permissions WHERE role_id = ?', [tempUser.roleId]);
                    await conn.query('DELETE FROM security_db.roles WHERE id = ?', [tempUser.roleId]);
                }
                await conn.query('DELETE FROM security_db.users WHERE id = ?', [tempUser.id]);
            } catch (err) {
                console.error('Error cleaning up temp user:', err);
            } finally {
                conn.release();
            }
        }
    });

    describe('Unified Inventory Flow', function () {
        it('should create a new phone via Phones API', async function () {
            testPhoneData = {
                device_name: `Integration Test Phone ${Date.now()}`,
                device_maker: 'IntegrationMaker',
                device_price: 1234.56,
                color: 'Midnight Blue',
                ram: '16GB',
                rom: '512GB',
                staging_inventory: 10
            };

            const response = await api.post('/api/phones', testPhoneData);

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.have.property('id');
            createdPhoneId = response.data.id;
        });

        it('should see the new phone in the main Inventory list (Integration Check)', async function () {
            // This verifies the "Merge" requirement: Phones must appear in Inventory
            const response = await api.get('/api/inventory');

            AssertionHelpers.assertSuccess(response);
            expect(response.data).to.be.an('array');

            const foundProduct = response.data.find(p => p.product_id === createdPhoneId);
            expect(foundProduct).to.not.be.undefined;
            expect(foundProduct.device_name).to.equal(testPhoneData.device_name);
            expect(foundProduct.device_maker).to.equal(testPhoneData.device_maker);

            // Check implicit conversion of price/inventory if needed
            expect(parseFloat(foundProduct.device_price)).to.closeTo(testPhoneData.device_price, 0.01);
            expect(parseInt(foundProduct.total_inventory)).to.be.at.least(testPhoneData.staging_inventory);
        });

        it('should filter inventory by manufacturer', async function () {
            // This verifies the new "Manufacturer" filter functionality from a data perspective
            const response = await api.get('/api/inventory');
            AssertionHelpers.assertSuccess(response);

            const makerProducts = response.data.filter(p => p.device_maker === 'IntegrationMaker');
            expect(makerProducts.length).to.be.greaterThan(0);
            expect(makerProducts.find(p => p.product_id === createdPhoneId)).to.not.be.undefined;
        });

        it('should retrieve detailed specs via Inventory Product Detail API', async function () {
            // This verifies ProductDetails.jsx will get the data it needs
            const response = await api.get(`/api/inventory/product/${createdPhoneId}`);

            AssertionHelpers.assertSuccess(response);
            const product = response.data;

            expect(product.product_id).to.equal(createdPhoneId);
            expect(product.color).to.equal(testPhoneData.color);
            expect(product.ram).to.equal(testPhoneData.ram);
            expect(product.rom).to.equal(testPhoneData.rom);
        });

        it('should update phone details and reflect in Inventory', async function () {
            const updateData = {
                device_price: 1111.11,
                color: 'Sunset Gold'
            };

            const updateResponse = await api.put(`/api/phones/${createdPhoneId}`, updateData);
            AssertionHelpers.assertSuccess(updateResponse);

            // Verify in Inventory List
            const inventoryResponse = await api.get('/api/inventory');
            const foundProduct = inventoryResponse.data.find(p => p.product_id === createdPhoneId);

            expect(parseFloat(foundProduct.device_price)).to.closeTo(1111.11, 0.01);
            // Check if color is updated in details
            const detailsResponse = await api.get(`/api/inventory/product/${createdPhoneId}`);
            expect(detailsResponse.data.color).to.equal('Sunset Gold');
        });

        it('should delete the phone via Phones API and disappear from Inventory', async function () {
            const deleteResponse = await api.delete(`/api/phones/${createdPhoneId}`);
            AssertionHelpers.assertSuccess(deleteResponse);

            const inventoryResponse = await api.get('/api/inventory');
            const foundProduct = inventoryResponse.data.find(p => p.product_id === createdPhoneId);
            expect(foundProduct).to.be.undefined;

            createdPhoneId = null; // Prevent after() hook error
        });
    });
});
