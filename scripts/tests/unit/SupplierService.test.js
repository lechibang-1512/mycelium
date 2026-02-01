/**
 * Unit Tests: SupplierService
 * 
 * Tests supplier management service methods
 * 
 * @version 1.0.0
 * @date 2025-11-11
 */

const { expect } = require('chai');
const sinon = require('sinon');
const SupplierService = require('../../../backend/services/SupplierService');

describe('SupplierService', function () {
    this.timeout(5000);

    let service;
    let mockPool;
    let mockConnection;

    beforeEach(function () {
        mockConnection = {
            query: sinon.stub(),
            release: sinon.stub()
        };

        mockPool = {
            getConnection: sinon.stub().resolves(mockConnection)
        };

        service = new SupplierService(mockPool);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('getSuppliers()', function () {
        it('should return all suppliers', async function () {
            const mockSuppliers = [
                { id: 1, name: 'Supplier A', category: 'electronics', is_active: 1 },
                { id: 2, name: 'Supplier B', category: 'accessories', is_active: 1 }
            ];

            mockConnection.query.resolves(mockSuppliers);

            const result = await service.getSuppliers();

            expect(result).to.deep.equal(mockSuppliers);
            expect(mockConnection.query.calledOnce).to.be.true;
            expect(mockConnection.release.calledOnce).to.be.true;
        });

        it('should filter by active status', async function () {
            const mockSuppliers = [
                { id: 1, name: 'Supplier A', category: 'electronics', is_active: 1 }
            ];

            mockConnection.query.resolves(mockSuppliers);

            const result = await service.getSuppliers({ is_active: true });

            expect(result).to.deep.equal(mockSuppliers);
        });

        it('should support search filter', async function () {
            mockConnection.query.resolves([]);

            await service.getSuppliers({ search: 'test' });

            expect(mockConnection.query.calledOnce).to.be.true;
        });
    });

    describe('getSupplierById()', function () {
        it('should return specific supplier', async function () {
            const supplierId = 1;
            const mockSupplier = [{
                id: 1,
                name: 'Supplier A',
                category: 'electronics',
                contact_person: 'John Doe',
                email: 'john@supplier.com'
            }];

            mockConnection.query.resolves(mockSupplier);

            const result = await service.getSupplierById(supplierId);

            expect(result).to.deep.equal(mockSupplier[0]);
            expect(mockConnection.query.calledOnce).to.be.true;
        });

        it('should return null for non-existent supplier', async function () {
            mockConnection.query.resolves([]);

            const result = await service.getSupplierById(999);

            expect(result).to.be.null;
        });
    });

    describe('createSupplier()', function () {
        it('should create a new supplier', async function () {
            const supplierData = {
                name: 'New Supplier',
                category: 'electronics',
                contact_person: 'Jane Doe',
                contact_email: 'jane@supplier.com',
                phone: '1234567890'
            };

            // First query: check for duplicate name (returns empty)
            mockConnection.query.onFirstCall().resolves([]);
            // Second query: INSERT returns insertId
            mockConnection.query.onSecondCall().resolves({ insertId: 5 });

            const result = await service.createSupplier(supplierData);

            expect(result).to.equal(5);
            expect(mockConnection.release.calledOnce).to.be.true;
        });
    });

    describe('updateSupplier()', function () {
        it('should update supplier information', async function () {
            const supplierId = 1;
            const updateData = {
                name: 'Updated Supplier',
                contact_email: 'updated@supplier.com'
            };

            mockConnection.query.resolves({ affectedRows: 1 });

            await service.updateSupplier(supplierId, updateData);

            expect(mockConnection.query.called).to.be.true;
            expect(mockConnection.release.calledOnce).to.be.true;
        });

        it('should allow deactivation without failing duplicate-name checks', async function () {
            const supplierId = 1;
            const updateData = { is_active: 0 };

            // Current supplier returned by SELECT *
            const currentSupplier = [{ id: 1, name: 'SharedName', is_active: 1, email: 'x@a.com' }];

            mockConnection.query.onFirstCall().resolves(currentSupplier);
            // No duplicate check expected for deactivation; next call is the UPDATE
            mockConnection.query.onSecondCall().resolves({ affectedRows: 1 });

            const result = await service.updateSupplier(supplierId, updateData);

            expect(mockConnection.query.called).to.be.true;
            expect(result).to.be.true;
        });

        it('should reject activation if active duplicate name exists', async function () {
            const supplierId = 1;
            const updateData = { is_active: 1 };

            // Current supplier is inactive and wants to be activated
            const currentSupplier = [{ id: 1, name: 'SharedName', is_active: 0, email: 'x@a.com' }];

            // Sequence:
            // 1) SELECT * current
            // 2) Duplicate check returns a different active supplier
            // 3) The duplicate check should cause an error
            mockConnection.query.onFirstCall().resolves(currentSupplier);
            mockConnection.query.onSecondCall().resolves([{ id: 2 }]);

            let thrown = false;
            try {
                await service.updateSupplier(supplierId, updateData);
            } catch (e) {
                thrown = true;
                expect(e.message).to.include('A supplier with the name');
            }

            expect(thrown).to.be.true;
        });
    });

    describe('deleteSupplier()', function () {
        it('should soft delete supplier', async function () {
            const supplierId = 1;

            // First query: check products linked to supplier (returns count 0)
            mockConnection.query.onFirstCall().resolves([{ count: 0 }]);
            // Second query: check recent transactions (returns count 0)
            mockConnection.query.onSecondCall().resolves([{ count: 0 }]);
            // Third query: check all transactions (returns count 0)
            mockConnection.query.onThirdCall().resolves([{ count: 0 }]);
            // Fourth query: UPDATE to soft delete
            mockConnection.query.onCall(3).resolves({ affectedRows: 1 });

            const result = await service.deleteSupplier(supplierId);

            expect(result).to.be.true;
            expect(mockConnection.query.called).to.be.true;
            expect(mockConnection.release.calledOnce).to.be.true;
        });
    });
});
