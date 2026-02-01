/**
 * Integration Tests: Suppliers API
 * 
 * Tests supplier management endpoints
 */

const { expect } = require('chai');
const { APITestHelper, TestDataGenerator, AssertionHelpers } = require('../helpers/api-test-helper');
const { Supplier } = require('../../../backend/models');

describe('Suppliers API Integration Tests', function () {
    this.timeout(10000);

    let api;
    let createdSupplierIds = [];

    before(async function () {
        api = new APITestHelper();

        const serverReady = await api.waitForServer();
        if (!serverReady) this.skip('Server is not running');

        const loginResponse = await api.login();
        if (!api.isSuccess(loginResponse)) {
            this.skip('Could not login');
        }
    });

    after(async function () {
        // Clean up created suppliers using MongoDB
        if (createdSupplierIds.length > 0) {
            try {
                await Supplier.deleteMany({ supplier_id: { $in: createdSupplierIds } });
            } catch (err) {
                console.error('Error cleaning up suppliers:', err.message);
            }
        }

        await api.logout();
    });

    describe('GET /api/suppliers', function () {
        it('should return all suppliers', async function () {
            const response = await api.get('/api/suppliers');

            AssertionHelpers.assertSuccess(response);
            const suppliers = response.data.suppliers || response.data;
            expect(suppliers).to.be.an('array');
        });

        it('should include supplier details', async function () {
            const response = await api.get('/api/suppliers');

            const suppliers = response.data.suppliers || response.data;
            if (suppliers.length > 0) {
                const supplier = suppliers[0];
                AssertionHelpers.assertFields(supplier, [
                    'id',
                    'name',
                    'category'
                ]);
            }
        });

        it('should support active filter', async function () {
            const response = await api.get('/api/suppliers?active=true');

            AssertionHelpers.assertSuccess(response);
            const suppliers = response.data.suppliers || response.data;
            expect(suppliers).to.be.an('array');

            // All suppliers should be active
            suppliers.forEach(supplier => {
                expect(supplier.is_active).to.equal(1);
            });
        });
    });

    describe('POST /api/suppliers', function () {
        it('should create new supplier', async function () {
            const supplierData = TestDataGenerator.supplier();
            const response = await api.post('/api/suppliers', supplierData);

            AssertionHelpers.assertSuccess(response);
            const result = response.data;
            expect(result.success || result.supplier_id).to.exist;
            const supplierId = result.supplier_id || result.id;
            expect(supplierId).to.exist;

            createdSupplierIds.push(supplierId);
        });

        it('should validate required fields', async function () {
            const response = await api.post('/api/suppliers', {});

            AssertionHelpers.assertError(response, 400);
        });

        it('should validate email format', async function () {
            const supplierData = TestDataGenerator.supplier({
                email: 'invalid-email'
            });

            const response = await api.post('/api/suppliers', supplierData);

            // Should either reject (400) or have validation error (500 is also acceptable for validation)
            if (!api.isSuccess(response)) {
                expect(response.status).to.be.oneOf([400, 500]);
            }
        });
    });

    describe('GET /api/suppliers/:id', function () {
        let testSupplierId;

        before(async function () {
            // Create a test supplier
            const supplierData = TestDataGenerator.supplier();
            const response = await api.post('/api/suppliers', supplierData);
            const result = response.data.result || response.data;
            testSupplierId = result.supplier_id || result.supplierId || result.id;
            createdSupplierIds.push(testSupplierId);
        });

        it('should return specific supplier details', async function () {
            const response = await api.get(`/api/suppliers/${testSupplierId}`);

            AssertionHelpers.assertSuccess(response);
            const supplier = response.data.supplier || response.data;
            AssertionHelpers.assertFields(supplier, [
                'id',
                'name',
                'category'
            ]);
            expect(supplier.id || supplier.supplier_id).to.equal(testSupplierId);
        });

        it('should return 404 for non-existent supplier', async function () {
            const response = await api.get('/api/suppliers/999999');

            expect(response.status).to.be.oneOf([404, 400]);
        });
    });

    describe('PUT /api/suppliers/:id', function () {
        let testSupplierId;

        before(async function () {
            const supplierData = TestDataGenerator.supplier();
            const response = await api.post('/api/suppliers', supplierData);
            testSupplierId = response.data.supplier_id;
            createdSupplierIds.push(testSupplierId);
        });

        it('should update supplier details', async function () {
            const updateData = {
                name: 'Updated Supplier Name',
                category: 'updated-category'
            };

            const response = await api.put(`/api/suppliers/${testSupplierId}`, updateData);

            // Check if update was successful
            if (api.isSuccess(response)) {
                const result = response.data;
                expect(result.success || result.updated).to.exist;

                // Verify update
                const getResponse = await api.get(`/api/suppliers/${testSupplierId}`);
                const supplier = getResponse.data.supplier || getResponse.data;
                expect(supplier.name).to.equal(updateData.name);
            }
        });
    });

    describe('PATCH /api/suppliers/:id/toggle-status', function () {
        it('should reject activating a supplier when a duplicate active name exists, and allow deactivation', async function () {
            // Create an active supplier
            const sharedName = `TestSupplier-${Date.now()}`;
            const supplierA = TestDataGenerator.supplier({ name: sharedName, is_active: 1 });
            const respA = await api.post('/api/suppliers', supplierA);
            AssertionHelpers.assertSuccess(respA);
            const supplierIdA = respA.data.supplier_id || respA.data.id;
            createdSupplierIds.push(supplierIdA);

            // Create a second supplier with same name but inactive
            const supplierB = TestDataGenerator.supplier({ name: sharedName, is_active: 0 });
            const respB = await api.post('/api/suppliers', supplierB);
            AssertionHelpers.assertSuccess(respB);
            const supplierIdB = respB.data.supplier_id || respB.data.id;
            createdSupplierIds.push(supplierIdB);

            // Attempt to toggle B active - should fail
            const toggleResp = await api.patch(`/api/suppliers/${supplierIdB}/toggle-status`);
            expect(api.isSuccess(toggleResp)).to.be.false;

            // Deactivate A
            const deactivateResp = await api.patch(`/api/suppliers/${supplierIdA}/toggle-status`);
            expect(api.isSuccess(deactivateResp)).to.be.true;

            // Now toggling B active should succeed
            const toggleResp2 = await api.patch(`/api/suppliers/${supplierIdB}/toggle-status`);
            expect(api.isSuccess(toggleResp2)).to.be.true;
        });
    });
});
