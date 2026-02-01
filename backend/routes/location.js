/**
 * Location Management Consolidated Routes
 * 
 * Manages warehouse bin locations in a column-row-bin hierarchy.
 * Hierarchy: Warehouse → Column → Row → Bin
 * 
 * All routes maintain original URL paths for backward compatibility.
 */

const express = require('express');
const router = express.Router();
const WarehouseService = require('../services/WarehouseService');
const locationApi = require('../apis/locationApi');
const { withTransaction } = require('../utils/queryHelper');

module.exports = () => {
    const warehouseService = new WarehouseService();

    // ========================================================================
    // BINS ENDPOINTS (/api/bins)
    // ========================================================================
    const binsRouter = express.Router();

    // List bins with optional filters
    binsRouter.get('/', async (req, res) => {
        try {
            const { warehouse_id, active, product_type } = req.query;

            if (warehouse_id) {
                const bins = await warehouseService.getBinsByWarehouse(warehouse_id, active !== 'false');
                return res.json(bins.map(b => convertBigIntToNumber(b)));
            }

            // Use locationApi for listing all bins
            const api = locationApi();
            const bins = await api.listAllBins({
                active: active !== 'false',
                product_type
            });
            res.json(bins.map(b => convertBigIntToNumber(b)));
        } catch (error) {
            console.error('List bins error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to list bins' });
        }
    });

    // Get all bins in a warehouse
    binsRouter.get('/warehouse/:warehouseId', async (req, res) => {
        try {
            const warehouseId = req.params.warehouseId;
            const activeOnly = req.query.active !== 'false';
            const bins = await warehouseService.getBinsByWarehouse(warehouseId, activeOnly);

            const payload = bins.map(b => convertBigIntToNumber(b));
            res.json(payload);
        } catch (error) {
            console.error('Get warehouse bins error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to fetch bins' });
        }
    });

    // Get bins organized hierarchically by column-row-bin for a warehouse
    binsRouter.get('/warehouse/:warehouseId/hierarchical', async (req, res) => {
        try {
            const warehouseId = req.params.warehouseId;
            const activeOnly = req.query.active !== 'false';
            const hierarchicalData = await warehouseService.getBinsHierarchical(warehouseId, activeOnly);

            // Convert BigInt to Number for JSON serialization
            const convertedData = {
                hierarchical: {},
                flat: hierarchicalData.flat.map(b => convertBigIntToNumber(b)),
                summary: hierarchicalData.summary
            };

            // Convert hierarchical structure (column -> row -> bin)
            for (const [col, rows] of Object.entries(hierarchicalData.hierarchical)) {
                convertedData.hierarchical[col] = {};
                for (const [row, bins] of Object.entries(rows)) {
                    convertedData.hierarchical[col][row] = {};
                    for (const [binPos, bin] of Object.entries(bins)) {
                        convertedData.hierarchical[col][row][binPos] = convertBigIntToNumber(bin);
                    }
                }
            }

            res.json(convertedData);
        } catch (error) {
            console.error('Get hierarchical bins error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to fetch hierarchical bins' });
        }
    });

    // Get bin by ID
    binsRouter.get('/:binId', async (req, res) => {
        try {
            const binId = req.params.binId;
            const bin = await warehouseService.getBinById(binId);

            if (!bin) {
                return res.status(404).json({ success: false, error: 'Bin not found' });
            }

            res.json({ success: true, bin: convertBigIntToNumber(bin) });
        } catch (error) {
            console.error('Get bin error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to fetch bin' });
        }
    });

    // Get bin contents with detailed item information (IMEI, serial numbers, etc.)
    binsRouter.get('/:binId/contents', async (req, res) => {
        try {
            const binId = req.params.binId;

            // Get bin info first
            const bin = await warehouseService.getBinById(binId);
            if (!bin) {
                return res.status(404).json({ success: false, error: 'Bin not found' });
            }

            // Use locationApi for detailed contents
            const api = locationApi();
            const { aggregateItems, serializedItems } = await api.getBinContentsDetailed(binId);

            // Calculate totals
            const aggregateCount = aggregateItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
            const serializedCount = serializedItems.length;

            res.json({
                success: true,
                bin: convertBigIntToNumber(bin),
                contents: {
                    aggregate_items: aggregateItems.map(i => convertBigIntToNumber(i)),
                    serialized_items: serializedItems.map(i => convertBigIntToNumber(i)),
                    summary: {
                        aggregate_count: aggregateCount,
                        serialized_count: serializedCount,
                        total_items: aggregateCount + serializedCount,
                        unique_products: new Set([
                            ...aggregateItems.filter(i => i.product_id).map(i => i.product_id),
                            ...serializedItems.map(i => i.product_id)
                        ]).size,
                        unique_spare_parts: new Set(
                            aggregateItems.filter(i => i.spare_part_id).map(i => i.spare_part_id)
                        ).size
                    }
                }
            });
        } catch (error) {
            console.error('Get bin contents error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to fetch bin contents' });
        }
    });

    // Create new bin
    binsRouter.post('/', async (req, res) => {
        try {
            const binData = req.body;
            const binId = await warehouseService.createBin(binData);

            res.json({
                success: true,
                binId: binId,
                message: 'Bin created successfully'
            });
        } catch (error) {
            console.error('Create bin error:', error);
            res.status(400).json({ success: false, error: error.message || 'Failed to create bin' });
        }
    });

    // Bulk create bins
    binsRouter.post('/bulk', async (req, res) => {
        try {
            const { warehouse_id, bins } = req.body;

            if (!warehouse_id || !bins || !Array.isArray(bins)) {
                return res.status(400).json({ success: false, error: 'warehouse_id and bins array required' });
            }

            const binIds = await warehouseService.bulkCreateBins(warehouse_id, bins);
            res.json({
                success: true,
                binIds: binIds,
                count: binIds.length,
                message: `${binIds.length} bins created successfully`
            });
        } catch (error) {
            console.error('Bulk create bins error:', error);
            res.status(400).json({ success: false, error: error.message || 'Failed to create bins' });
        }
    });

    // Update bin
    binsRouter.put('/:binId', async (req, res) => {
        try {
            const binId = req.params.binId;
            const updateData = req.body;
            const updated = await warehouseService.updateBin(binId, updateData);

            if (!updated) {
                return res.status(404).json({ success: false, error: 'Bin not found' });
            }

            res.json({ success: true, message: 'Bin updated successfully' });
        } catch (error) {
            console.error('Update bin error:', error);
            res.status(400).json({ success: false, error: error.message || 'Failed to update bin' });
        }
    });

    // Delete/deactivate bin
    binsRouter.delete('/:binId', async (req, res) => {
        try {
            const binId = req.params.binId;
            const result = await warehouseService.deleteBin(binId);

            if (!result.success) {
                return res.status(404).json({ success: false, error: 'Bin not found' });
            }

            res.json({
                success: true,
                message: 'Bin deleted successfully',
                itemsReturned: result.itemsReturned,
                totalQuantity: result.totalQuantity,
                note: result.totalQuantity > 0
                    ? `${result.totalQuantity} units from ${result.itemsReturned} product(s) permanently removed`
                    : 'Bin was empty'
            });
        } catch (error) {
            console.error('Delete bin error:', error);
            res.status(400).json({ success: false, error: error.message || 'Failed to delete bin' });
        }
    });

    // Assign product to bin
    binsRouter.post('/:binId/inventory', async (req, res) => {
        try {
            const binId = req.params.binId;
            const { product_id, spare_part_id, quantity, batch_id } = req.body;

            if ((!product_id && !spare_part_id) || !quantity || quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Either product_id or spare_part_id, and positive quantity required'
                });
            }

            if (product_id && spare_part_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot assign both product and spare part to same bin entry'
                });
            }

            const assignmentId = await warehouseService.assignProductToBin(
                binId,
                product_id || null,
                quantity,
                batch_id || null,
                spare_part_id || null
            );
            res.json({
                success: true,
                assignmentId: assignmentId,
                message: spare_part_id ? 'Spare part assigned to bin successfully' : 'Product assigned to bin successfully'
            });
        } catch (error) {
            console.error('Assign product to bin error:', error);
            res.status(400).json({ success: false, error: error.message || 'Failed to assign to bin' });
        }
    });

    // Remove product from bin
    binsRouter.delete('/:binId/inventory/:productId', async (req, res) => {
        try {
            const binId = req.params.binId;
            const productId = req.params.productId;
            const { quantity, batch_id } = req.body;

            if (!quantity || quantity <= 0) {
                return res.status(400).json({ success: false, error: 'Positive quantity required' });
            }

            await warehouseService.removeProductFromBin(binId, productId, quantity, batch_id || null);
            res.json({ success: true, message: 'Product removed from bin successfully' });
        } catch (error) {
            console.error('Remove product from bin error:', error);
            res.status(400).json({ success: false, error: error.message || 'Failed to remove product from bin' });
        }
    });

    // Move product or spare part between bins
    binsRouter.post('/move', async (req, res) => {
        try {
            const { from_bin_id, to_bin_id, product_id, spare_part_id, quantity, batch_id } = req.body;

            if (!from_bin_id || !to_bin_id || (!product_id && !spare_part_id) || !quantity || quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'from_bin_id, to_bin_id, product_id or spare_part_id, and positive quantity required'
                });
            }

            // Use locationApi for transfer with full transaction support
            const api = locationApi();
            const result = await api.transferBetweenBins({
                from_bin_id,
                to_bin_id,
                product_id,
                spare_part_id,
                quantity,
                batch_id
            });

            res.json(result);
        } catch (error) {
            console.error('Move product between bins error:', error);
            res.status(400).json({ success: false, error: error.message || 'Failed to move between bins' });
        }
    });

    // Get bin utilization report for a warehouse
    binsRouter.get('/warehouse/:warehouseId/utilization', async (req, res) => {
        try {
            const warehouseId = req.params.warehouseId;
            const utilization = await warehouseService.getWarehouseBinUtilization(warehouseId);

            res.json({
                success: true,
                utilization: utilization.map(u => convertBigIntToNumber(u))
            });
        } catch (error) {
            console.error('Get bin utilization error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to fetch bin utilization' });
        }
    });

    // Find available bins with capacity in a warehouse
    binsRouter.get('/warehouse/:warehouseId/available', async (req, res) => {
        try {
            const warehouseId = req.params.warehouseId;
            const requiredCapacity = parseInt(req.query.capacity) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const bins = await warehouseService.findAvailableBins(warehouseId, requiredCapacity, limit);

            res.json({
                success: true,
                bins: bins.map(b => convertBigIntToNumber(b)),
                count: bins.length
            });
        } catch (error) {
            console.error('Find available bins error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to find available bins' });
        }
    });

    // Get product locations in bins across warehouses
    binsRouter.get('/product/:productId/locations', async (req, res) => {
        try {
            const productId = req.params.productId;
            const warehouseId = req.query.warehouse_id || null;
            const locations = await warehouseService.getProductBinLocations(productId, warehouseId);

            res.json({
                success: true,
                locations: locations.map(l => convertBigIntToNumber(l)),
                count: locations.length
            });
        } catch (error) {
            console.error('Get product bin locations error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to fetch product locations' });
        }
    });

    // Auto-generate bins for a warehouse
    binsRouter.post('/warehouse/:warehouseId/auto-generate', async (req, res) => {
        try {
            const warehouseId = req.params.warehouseId;
            const config = req.body;
            const result = await warehouseService.autoGenerateBins(warehouseId, config);

            res.json({
                success: true,
                message: `${result.bins_created} bins created successfully`,
                result: convertBigIntToNumber(result)
            });
        } catch (error) {
            console.error('Auto-generate bins error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to auto-generate bins' });
        }
    });

    // Get next available bin code for warehouse
    binsRouter.get('/warehouse/:warehouseId/next-bin-code', async (req, res) => {
        try {
            const warehouseId = req.params.warehouseId;
            const result = await warehouseService.getNextBinCode(warehouseId);

            res.json({ success: true, ...result });
        } catch (error) {
            console.error('Get next bin code error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to get next bin code' });
        }
    });

    // Update bin metadata
    binsRouter.patch('/:binId/metadata', async (req, res) => {
        try {
            const binId = req.params.binId;
            const metadata = req.body;
            const updated = await warehouseService.updateBinMetadata(binId, metadata);

            if (!updated) {
                return res.status(404).json({ success: false, error: 'Bin not found or no changes made' });
            }

            res.json({ success: true, message: 'Bin metadata updated successfully' });
        } catch (error) {
            console.error('Update bin metadata error:', error);
            res.status(400).json({ success: false, error: error.message || 'Failed to update bin metadata' });
        }
    });

    // Get bins by priority level for a warehouse
    binsRouter.get('/warehouse/:warehouseId/priority/:priorityLevel', async (req, res) => {
        try {
            const warehouseId = req.params.warehouseId;
            const { priorityLevel } = req.params;

            const validPriorities = ['low', 'normal', 'high', 'critical'];
            if (!validPriorities.includes(priorityLevel)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid priority level. Must be one of: ${validPriorities.join(', ')}`
                });
            }

            const bins = await warehouseService.getBinsByPriority(warehouseId, priorityLevel);
            res.json({
                success: true,
                bins: bins.map(b => convertBigIntToNumber(b)),
                count: bins.length
            });
        } catch (error) {
            console.error('Get bins by priority error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to fetch bins by priority' });
        }
    });

    // Get bins requiring attention
    binsRouter.get('/attention/required', async (req, res) => {
        try {
            const warehouseId = req.query.warehouse_id || null;
            const bins = await warehouseService.getBinsRequiringAttention(warehouseId);

            res.json({
                success: true,
                bins: bins.map(b => convertBigIntToNumber(b)),
                count: bins.length
            });
        } catch (error) {
            console.error('Get bins requiring attention error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to fetch bins requiring attention' });
        }
    });

    // Clone bin configuration to same warehouse
    binsRouter.post('/:binId/clone', async (req, res) => {
        try {
            const sourceBinId = req.params.binId;
            const { new_bin_code, column_position, row_position, bin_position } = req.body;

            const result = await warehouseService.cloneBin(sourceBinId, { new_bin_code, column_position, row_position, bin_position });
            res.json({
                success: true,
                message: 'Bin cloned successfully',
                bin: convertBigIntToNumber(result)
            });
        } catch (error) {
            console.error('Clone bin error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to clone bin' });
        }
    });

    // Mount bins router only (zones removed)
    router.use('/bins', binsRouter);

    return router;
};
