const asyncHandler = require('../utils/asyncHandler');
/**
 * Serialized Inventory API Routes
 * Provides endpoints for managing devices and spare parts with IMEI/serial tracking
 */
const express = require('express');
const router = express.Router();
const SanitizationService = require('../services/SanitizationService');
const { requirePermission } = require('../middleware/rbacMiddleware');

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
    const SerializedInventoryService = require('../services/SerializedInventoryService');
    const serializedInventoryService = new SerializedInventoryService();

    /**
     * @route GET /api/serialized-inventory
     * @desc Get all serialized inventory items with filtering
     * @query {string} type - Filter by type: 'device' or 'spare_part'
     * @query {string} status - Filter by status
     * @query {string} warehouse_id - Filter by warehouse
     * @query {string} search - Search by IMEI, serial, or model name
     * @query {number} limit - Limit results (default: 100)
     * @query {number} offset - Offset for pagination
     */
    router.get('/', requirePermission('serialized:read'), asyncHandler(async (req, res) => {
        try {
            const { type, status, warehouse_id, search, limit = 100, offset = 0 } = req.query;

            const filters = {
                type: type || null,
                status: status || null,
                warehouseId: warehouse_id || null,
                search: search || null,
                limit: parseInt(limit),
                offset: parseInt(offset)
            };

            const items = await serializedInventoryService.getAll(filters);
            const responseData = convertBigIntToNumber(items);

            res.json({
                success: true,
                data: responseData,
                pagination: {
                    limit: filters.limit,
                    offset: filters.offset,
                    count: responseData.length
                }
            });
        } catch (error) {
            console.error('Error fetching serialized inventory:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch serialized inventory',
                details: error.message
            });
        }
    }));

    /**
     * @route GET /api/serialized-inventory/devices
     * @desc Get all devices (phones/smartphones) with IMEI tracking
     */
    router.get('/devices', requirePermission('serialized:read'), asyncHandler(async (req, res) => {
        try {
            const { status, warehouse_id, search, limit = 100, offset = 0 } = req.query;

            const filters = {
                type: 'device',
                status: status || null,
                warehouseId: warehouse_id || null,
                search: search || null,
                limit: parseInt(limit),
                offset: parseInt(offset)
            };

            const items = await serializedInventoryService.getAll(filters);
            const responseData = convertBigIntToNumber(items);

            res.json({
                success: true,
                data: responseData,
                pagination: {
                    limit: filters.limit,
                    offset: filters.offset,
                    count: responseData.length
                }
            });
        } catch (error) {
            console.error('Error fetching devices:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch devices',
                details: error.message
            });
        }
    }));

    /**
     * @route GET /api/serialized-inventory/spare-parts
     * @desc Get all spare parts with serial tracking
     */
    router.get('/spare-parts', requirePermission('serialized:read'), asyncHandler(async (req, res) => {
        try {
            const { status, warehouse_id, search, limit = 100, offset = 0 } = req.query;

            const filters = {
                type: 'spare_part',
                status: status || null,
                warehouseId: warehouse_id || null,
                search: search || null,
                limit: parseInt(limit),
                offset: parseInt(offset)
            };

            const items = await serializedInventoryService.getAll(filters);
            const responseData = convertBigIntToNumber(items);

            res.json({
                success: true,
                data: responseData,
                pagination: {
                    limit: filters.limit,
                    offset: filters.offset,
                    count: responseData.length
                }
            });
        } catch (error) {
            console.error('Error fetching spare parts:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch spare parts',
                details: error.message
            });
        }
    }));

    /**
     * @route GET /api/serialized-inventory/stats
     * @route GET /api/serialized-inventory/stats/summary
     * @desc Get inventory statistics summary
     */
    router.get(['/stats', '/stats/summary'], requirePermission('serialized:read'), asyncHandler(async (req, res) => {
        try {
            // Get summary stats by status
            const items = await serializedInventoryService.getAll({ limit: 10000 });

            const summary = {
                total: items.length,
                byStatus: {},
                byCondition: {},
                devices: 0,
                spareParts: 0
            };

            items.forEach(item => {
                // Count by status
                const status = item.status || 'unknown';
                summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;

                // Count by condition
                const condition = item.condition_grade || 'unknown';
                summary.byCondition[condition] = (summary.byCondition[condition] || 0) + 1;

                // Count by type (devices have IMEI, spare parts don't or have serial)
                if (item.imei_1) {
                    summary.devices++;
                } else {
                    summary.spareParts++;
                }
            });

            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch statistics',
                details: error.message
            });
        }
    }));

    /**
     * @route GET /api/serialized-inventory/:id
     * @desc Get single serialized inventory item by ID
     */
    router.get('/:id', requirePermission('serialized:read'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const item = await serializedInventoryService.getById(id);

            if (!item) {
                return res.status(404).json({
                    success: false,
                    error: 'Item not found'
                });
            }

            const responseData = convertBigIntToNumber(item);

            res.json({
                success: true,
                data: responseData
            });
        } catch (error) {
            console.error('Error fetching item:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch item',
                details: error.message
            });
        }
    }));

    /**
     * @route PUT /api/serialized-inventory/:id
     * @desc Update serialized inventory item
     */
    router.put('/:id', requirePermission('serialized:write'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const result = await serializedInventoryService.update(id, updateData);

            res.json({
                success: true,
                message: 'Item updated successfully',
                data: convertBigIntToNumber(result)
            });
        } catch (error) {
            console.error('Error updating item:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to update item',
                details: error.message
            });
        }
    }));

    /**
     * @route PUT /api/serialized-inventory/:id/status
     * @desc Update item status (available, reserved, sold, in_repair)
     */
    router.put('/:id/status', requirePermission('serialized:write'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    error: 'Status is required'
                });
            }

            const validStatuses = ['available', 'reserved', 'sold', 'in_repair', 'disposed'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
            }

            const result = await serializedInventoryService.updateStatus(id, status, notes || '');

            res.json({
                success: true,
                message: 'Status updated successfully',
                data: convertBigIntToNumber(result)
            });
        } catch (error) {
            console.error('Error updating status:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to update status',
                details: error.message
            });
        }
    }));

    /**
     * @route DELETE /api/serialized-inventory/:id
     * @desc Soft delete inventory item (mark as disposed)
     */
    router.delete('/:id', requirePermission('serialized:delete'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;

            // Perform hard delete
            const result = await serializedInventoryService.delete(id);

            res.json({
                success: true,
                message: 'Item deleted successfully',
                data: convertBigIntToNumber(result)
            });
        } catch (error) {
            console.error('Error deleting item:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to delete item',
                details: error.message
            });
        }
    }));

    /**
     * @route POST /api/serialized-inventory/:id/transfer
     * @desc Transfer item to new location (warehouse/bin)
     */
    router.post('/:id/transfer', requirePermission('serialized:write'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const { warehouseId, binId, notes } = req.body;

            if (!warehouseId) {
                return res.status(400).json({
                    success: false,
                    error: 'Warehouse ID is required'
                });
            }

            const transferData = {
                warehouseId,
                binId: binId || null,
                notes: notes || ''
            };

            const result = await serializedInventoryService.transfer(id, transferData);

            res.json({
                success: true,
                message: 'Item transferred successfully',
                data: convertBigIntToNumber(result)
            });
        } catch (error) {
            console.error('Error transferring item:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to transfer item',
                details: error.message
            });
        }
    }));



    return router;
};
