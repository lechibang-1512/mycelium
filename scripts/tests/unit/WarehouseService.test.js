/**
 * Unit Tests: WarehouseService
 * 
 * Tests warehouse management service methods
 * 
 * @version 1.0.0
 * @date 2025-11-11
 */

const { expect } = require('chai');
const sinon = require('sinon');
const WarehouseService = require('../../../backend/services/WarehouseService');

describe('WarehouseService', function () {
    this.timeout(10000);

    let service;
    let mockPool;
    let mockConnection;

    beforeEach(function () {
        // Create mock connection
        mockConnection = {
            query: sinon.stub(),
            release: sinon.stub()
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

    describe('getWarehouses()', function () {
        it('should return all active warehouses', async function () {
            const mockWarehouses = [
                { warehouse_id: 1, name: 'Warehouse A', location: 'Location A', is_active: 1 },
                { warehouse_id: 2, name: 'Warehouse B', location: 'Location B', is_active: 1 }
            ];

            mockConnection.query.resolves(mockWarehouses);

            const result = await service.getWarehouses(true);

            expect(result).to.deep.equal(mockWarehouses);
            expect(mockConnection.query.calledOnce).to.be.true;
            expect(mockConnection.release.calledOnce).to.be.true;
        });

        it('should return all warehouses including inactive', async function () {
            const mockWarehouses = [
                { warehouse_id: 1, name: 'Warehouse A', location: 'Location A', is_active: 1 },
                { warehouse_id: 2, name: 'Warehouse B', location: 'Location B', is_active: 0 }
            ];

            mockConnection.query.resolves(mockWarehouses);

            const result = await service.getWarehouses(false);

            expect(result).to.deep.equal(mockWarehouses);
            expect(mockConnection.release.calledOnce).to.be.true;
        });

        it('should handle empty result', async function () {
            mockConnection.query.resolves([]);

            const result = await service.getWarehouses();

            expect(result).to.be.an('array').that.is.empty;
        });

        it('should release connection on error', async function () {
            mockConnection.query.rejects(new Error('Database error'));

            try {
                await service.getWarehouses();
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err.message).to.equal('Database error');
                expect(mockConnection.release.calledOnce).to.be.true;
            }
        });
    });

    describe('getWarehouseZones()', function () {
        it('should return zones for a warehouse', async function () {
            const warehouseId = 1;
            const mockZones = [
                { zone_id: 1, warehouse_id: 1, name: 'Zone A', zone_type: 'storage', is_active: 1 },
                { zone_id: 2, warehouse_id: 1, name: 'Zone B', zone_type: 'picking', is_active: 1 }
            ];

            mockConnection.query.resolves(mockZones);

            const result = await service.getWarehouseZones(warehouseId);

            expect(result).to.deep.equal(mockZones);
            expect(mockConnection.query.calledOnce).to.be.true;
            expect(mockConnection.query.firstCall.args[1]).to.deep.equal([warehouseId]);
        });

        it('should filter by active status', async function () {
            const warehouseId = 1;
            const mockZones = [
                { zone_id: 1, warehouse_id: 1, name: 'Zone A', zone_type: 'storage', is_active: 1 }
            ];

            mockConnection.query.resolves(mockZones);

            const result = await service.getWarehouseZones(warehouseId, true);

            expect(result).to.deep.equal(mockZones);
            expect(mockConnection.release.calledOnce).to.be.true;
        });
    });

    describe('getInventoryByLocation()', function () {
        it('should return inventory for specific warehouse', async function () {
            const warehouseId = 1;
            const mockProducts = [
                {
                    product_id: 1,
                    device_name: 'Product A',
                    warehouse_id: 1,
                    warehouse_quantity: 100
                }
            ];

            // Service calls two queries: products + spare parts
            mockConnection.query.onFirstCall().resolves(mockProducts);
            mockConnection.query.onSecondCall().resolves([]); // No spare parts

            const result = await service.getInventoryByLocation(warehouseId);

            expect(result).to.deep.equal(mockProducts);
            expect(mockConnection.query.calledTwice).to.be.true;
        });

        it('should return inventory for specific zone', async function () {
            const warehouseId = 1;
            const zoneId = 1;
            const mockProducts = [
                {
                    product_id: 1,
                    device_name: 'Product A',
                    warehouse_id: 1,
                    zone_id: 1,
                    warehouse_quantity: 50
                }
            ];

            // Service calls two queries: products + spare parts
            mockConnection.query.onFirstCall().resolves(mockProducts);
            mockConnection.query.onSecondCall().resolves([]); // No spare parts

            const result = await service.getInventoryByLocation(warehouseId, zoneId);

            expect(result).to.deep.equal(mockProducts);
            expect(mockConnection.release.calledOnce).to.be.true;
        });

        it('should return all inventory when no filters', async function () {
            const mockProducts = [
                { product_id: 1, device_name: 'Product A', warehouse_quantity: 100 },
                { product_id: 2, device_name: 'Product B', warehouse_quantity: 200 }
            ];

            // Service calls two queries: products + spare parts
            mockConnection.query.onFirstCall().resolves(mockProducts);
            mockConnection.query.onSecondCall().resolves([]); // No spare parts

            const result = await service.getInventoryByLocation();

            expect(result).to.deep.equal(mockProducts);
        });
    });

    describe('getExpiringBatches()', function () {
        it('should return batches expiring within specified days', async function () {
            const daysAhead = 30;
            const mockBatches = [
                {
                    batch_id: 1,
                    batch_no: 'BATCH-001',
                    expiry_date: '2025-12-01',
                    days_until_expiry: 20
                }
            ];

            mockConnection.query.resolves(mockBatches);

            const result = await service.getExpiringBatches(daysAhead);

            expect(result).to.deep.equal(mockBatches);
            expect(mockConnection.release.calledOnce).to.be.true;
        });

        it('should use default 30 days if not specified', async function () {
            mockConnection.query.resolves([]);

            await service.getExpiringBatches();

            expect(mockConnection.query.calledOnce).to.be.true;
        });
    });
});
