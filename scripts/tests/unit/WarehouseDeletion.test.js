const { expect } = require('chai');
const sinon = require('sinon');
const WarehouseService = require('../../../backend/services/WarehouseService');

describe('WarehouseService - Deletion & Deactivation', function () {
    this.timeout(10000);

    let service;
    let mockPool;
    let mockConnection;

    beforeEach(function () {
        // Create mock connection
        mockConnection = {
            query: sinon.stub(),
            release: sinon.stub(),
            beginTransaction: sinon.stub(),
            commit: sinon.stub(),
            rollback: sinon.stub()
        };

        // Create mock pool
        mockPool = {
            getConnection: sinon.stub().resolves(mockConnection)
        };

        service = new WarehouseService(mockPool);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('deactivateWarehouse()', function () {
        it('should simply toggle is_active flag to 0', async function () {
            const warehouseId = 1;

            // Mock warehouse exists
            mockConnection.query.withArgs(sinon.match(/SELECT \* FROM warehouses/), [warehouseId])
                .resolves([{ warehouse_id: 1, is_active: 1 }]);

            // Mock update
            mockConnection.query.withArgs(sinon.match(/UPDATE warehouses SET is_active = 0/), [warehouseId])
                .resolves({ affectedRows: 1 });

            const result = await service.deactivateWarehouse(warehouseId);

            expect(result.success).to.be.true;
            expect(result.message).to.include('deactivated successfully');

            // Verify UPDATE was called
            expect(mockConnection.query.calledWith(
                sinon.match(/UPDATE warehouses SET is_active = 0/),
                [warehouseId]
            )).to.be.true;

            // Verify NO transfer logic was triggered (no select of inventory to likely transfer)
            // The original logic selected inventory to loop through. The new one assumes simple toggle.
            // We can check that we didn't call any inventory transfer queries.
            expect(mockConnection.query.neverCalledWith(
                sinon.match(/UPDATE warehouse_product_locations/)
            )).to.be.true;
        });

        it('should throw error if warehouse not found', async function () {
            const warehouseId = 999;
            mockConnection.query.withArgs(sinon.match(/SELECT \* FROM warehouses/), [warehouseId])
                .resolves([]);

            try {
                await service.deactivateWarehouse(warehouseId);
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err.message).to.equal('Warehouse not found');
            }
        });
    });

    describe('deleteWarehouse() (Hard Delete)', function () {
        it('should hard delete warehouse, zones, and locations AND return inventory to Staging', async function () {
            const warehouseId = 1;

            // Mock warehouse exists
            mockConnection.query.withArgs(sinon.match(/SELECT \* FROM warehouses/), [warehouseId])
                .resolves([{ warehouse_id: 1 }]);

            // Mock NO RMAs
            mockConnection.query.withArgs(sinon.match(/SELECT COUNT\(\*\) as count FROM rma/), [warehouseId])
                .resolves([{ count: 0 }]);

            // Mock NO stocktakes
            mockConnection.query.withArgs(sinon.match(/SELECT COUNT\(\*\) as count FROM stocktakes/), [warehouseId])
                .resolves([{ count: 0 }]);

            // Mock NO spare parts inventory (or some)
            mockConnection.query.withArgs(sinon.match(/SELECT COUNT\(\*\) as count FROM smartphone_spare_parts_inventory/), [warehouseId])
                .resolves([{ count: 0 }]);

            // Mock Inventory to Return (e.g. 2 products)
            // Product 101: 5 units. Product 102: 3 units.
            mockConnection.query.withArgs(sinon.match(/SELECT product_id, SUM\(quantity\) as total_qty/), [warehouseId])
                .resolves([
                    { product_id: 101, total_qty: 5 },
                    { product_id: 102, total_qty: 3 }
                ]);

            // Mock Update Staging (specs_db)
            mockConnection.query.withArgs(sinon.match(/UPDATE specs_db SET staging_inventory = staging_inventory \+ \?/))
                .resolves({ affectedRows: 1 });

            // Mock Log insert
            mockConnection.query.withArgs(sinon.match(/INSERT INTO inventory_log/))
                .resolves({ affectedRows: 1 });

            // Mock Deletes
            mockConnection.query.withArgs(sinon.match(/DELETE FROM warehouse_product_locations/), [warehouseId])
                .resolves({ affectedRows: 5 });

            mockConnection.query.withArgs(sinon.match(/DELETE FROM warehouse_zones/), [warehouseId])
                .resolves({ affectedRows: 2 });

            mockConnection.query.withArgs(sinon.match(/DELETE FROM warehouses/), [warehouseId])
                .resolves({ affectedRows: 1 });

            const result = await service.deleteWarehouse(warehouseId);

            expect(result.success).to.be.true;
            expect(result.message).to.include('Warehouse hard deleted');
            expect(result.message).to.include('returned to Staging');

            // Verify specs_db WAS updated (Items returned to Staging)
            // Should be called twice (once for each product)
            expect(mockConnection.query.calledWith(
                sinon.match(/UPDATE specs_db SET staging_inventory = staging_inventory \+ \? WHERE product_id = \?/),
                [5, 101]
            )).to.be.true;

            expect(mockConnection.query.calledWith(
                sinon.match(/UPDATE specs_db SET staging_inventory = staging_inventory \+ \? WHERE product_id = \?/),
                [3, 102]
            )).to.be.true;
        });

        it('should block delete if RMAs exist', async function () {
            const warehouseId = 1;

            // Mock warehouse exists
            mockConnection.query.withArgs(sinon.match(/SELECT \* FROM warehouses/), [warehouseId])
                .resolves([{ warehouse_id: 1 }]);

            // Mock RMAs EXIST
            mockConnection.query.withArgs(sinon.match(/SELECT COUNT\(\*\) as count FROM rma/), [warehouseId])
                .resolves([{ count: 5 }]);

            try {
                await service.deleteWarehouse(warehouseId);
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err.message).to.include('Cannot delete warehouse');
                expect(err.message).to.include('RMA request(s)');
            }
        });
    });
});
