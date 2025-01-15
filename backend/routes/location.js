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
const SanitizationService = require('../services/SanitizationService');
const WarehouseService = require('../services/WarehouseService');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');

// ── Inlined location helpers (formerly backend/apis/locationApi.js) ──

async function listAllBins(filters = {}) {
    const { active = true, product_type } = filters;
    let query = `
        SELECT b.*, w.name as warehouse_name
        FROM warehouse_bins b
        JOIN warehouses w ON b.warehouse_id = w.warehouse_id
        WHERE 1=1
        ${active ? 'AND b.is_active = 1' : ''}
        ${product_type ? 'AND b.product_type = ?' : ''}
        ORDER BY w.name, b.column_position, b.row_position, b.bin_position
        LIMIT 500
    `;
    const params = product_type ? [product_type] : [];
    return sequelizeMaster.query(query, { replacements: params, type: QueryTypes.SELECT });
}

async function getBinContentsDetailed(binId) {
    const aggregateItems = await sequelizeMaster.query(`
        SELECT 
            i.id as assignment_id, i.quantity, i.product_id, i.batch_id,
            p.device_name as product_name, p.device_maker as brand, p.color as model,
            'aggregate' as item_type, i.inventory_type
        FROM inventory i
        LEFT JOIN phone_specs p ON i.product_id = p.product_id
        WHERE i.bin_id = ? AND i.quantity > 0 AND i.inventory_type = 'bulk'
        ORDER BY p.device_name
    `, { replacements: [binId], type: QueryTypes.SELECT });

    const sparePartsItems = await sequelizeMaster.query(`
        SELECT 
            i.id as assignment_id, i.quantity, i.product_id as spare_part_id, i.batch_id,
            sp.part_name as spare_part_name, sp.part_code, sp.part_category,
            i.serial_number, i.condition_status, 'spare_part' as item_type
        FROM inventory i
        LEFT JOIN spare_parts sp ON i.product_id = sp.spare_part_id
        WHERE i.bin_id = ? AND i.quantity > 0 AND i.inventory_type = 'spare_part'
        ORDER BY sp.part_name
    `, { replacements: [binId], type: QueryTypes.SELECT });

    const serializedItems = await sequelizeMaster.query(`
        SELECT 
            i.id as tracking_id, i.product_id, i.serial_number as imei_1,
            i.serial_number, i.status, i.condition_status as condition_grade,
            i.created_at as received_at, p.device_name as product_name,
            p.device_maker as brand, p.color as model, 'serialized' as item_type
        FROM inventory i
        LEFT JOIN phone_specs p ON i.product_id = p.product_id
        WHERE i.bin_id = ? AND i.status IN ('available', 'reserved')
          AND i.inventory_type = 'serialized'
        ORDER BY p.device_name, i.serial_number
    `, { replacements: [binId], type: QueryTypes.SELECT });

    return { aggregateItems: [...aggregateItems, ...sparePartsItems], serializedItems };
}

async function transferBetweenBins(transferData) {
    const { from_bin_id, to_bin_id, product_id, spare_part_id, quantity, batch_id } = transferData;
    return sequelizeMaster.transaction(async (t) => {
        const targetId = product_id || spare_part_id;
        const type = spare_part_id ? 'spare_part' : 'bulk';

        const sourceInventory = await sequelizeMaster.query(`
            SELECT id, quantity FROM inventory
            WHERE bin_id = ? AND product_id = ? AND inventory_type = ?
            AND (batch_id = ? OR (batch_id IS NULL AND ? IS NULL))
            AND quantity >= ? LIMIT 1 FOR UPDATE
        `, { replacements: [from_bin_id, targetId, type, batch_id, batch_id, quantity], type: QueryTypes.SELECT, transaction: t });

        if (!sourceInventory || sourceInventory.length === 0) {
            throw new Error('Item not found in source bin or insufficient quantity');
        }
        const sourceItem = sourceInventory[0];

        if (sourceItem.quantity == quantity) {
            await sequelizeMaster.query(`DELETE FROM inventory WHERE id = ?`, {
                replacements: [sourceItem.id], type: QueryTypes.DELETE, transaction: t
            });
        } else {
            await sequelizeMaster.query(`UPDATE inventory SET quantity = quantity - ? WHERE id = ?`, {
                replacements: [quantity, sourceItem.id], type: QueryTypes.UPDATE, transaction: t
            });
        }

        const destInventory = await sequelizeMaster.query(`
            SELECT id FROM inventory
            WHERE bin_id = ? AND product_id = ? AND inventory_type = ?
            AND (batch_id = ? OR (batch_id IS NULL AND ? IS NULL)) LIMIT 1
        `, { replacements: [to_bin_id, targetId, type, batch_id, batch_id], type: QueryTypes.SELECT, transaction: t });

        if (destInventory && destInventory.length > 0) {
            await sequelizeMaster.query(`UPDATE inventory SET quantity = quantity + ? WHERE id = ?`, {
                replacements: [quantity, destInventory[0].id], type: QueryTypes.UPDATE, transaction: t
            });
        } else {
            const [binInfo] = await sequelizeMaster.query('SELECT warehouse_id FROM warehouse_bins WHERE bin_id = ?', {
                replacements: [to_bin_id], type: QueryTypes.SELECT, transaction: t
            });
            const newId = generateId();
            await sequelizeMaster.query(`
                INSERT INTO inventory (id, bin_id, warehouse_id, product_id, quantity, batch_id, inventory_type, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, { replacements: [newId, to_bin_id, binInfo?.warehouse_id, targetId, quantity, batch_id || null, type], type: QueryTypes.INSERT, transaction: t });
        }

        const transId = generateId();
        await sequelizeMaster.query(`
            INSERT INTO transactions (id, transaction_group_id, transaction_type, transaction_date, warehouse_id, from_warehouse_id, bin_id, notes)
            VALUES (?, ?, 'bin_transfer', NOW(), (SELECT warehouse_id FROM warehouse_bins WHERE bin_id = ?), (SELECT warehouse_id FROM warehouse_bins WHERE bin_id = ?), ?, 'Bin Transfer')
        `, { replacements: [transId, transId, to_bin_id, from_bin_id, to_bin_id], type: QueryTypes.INSERT, transaction: t });

        return { success: true, message: 'Item moved between bins successfully' };
    });
}

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
    const warehouseService = new WarehouseService();

    // ========================================================================
    // BINS ENDPOINTS (/api/bins)
    // ========================================================================
    const binsRouter = express.Router();

    // List bins with optional filters
    binsRouter.get('/', requirePermission('warehouse:read'), async (req, res) => {
        try {
            const { warehouse_id, active, product_type } = req.query;

            if (warehouse_id) {
                const bins = await warehouseService.getBinsByWarehouse(warehouse_id, active !== 'false');
                return res.json(bins.map(b => convertBigIntToNumber(b)));
            }

            const bins = await listAllBins({ active: active !== 'false', product_type });
            res.json(bins.map(b => convertBigIntToNumber(b)));
        } catch (error) {
            console.error('List bins error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to list bins' });
        }
    });

    // Get all bins in a warehouse
    binsRouter.get('/warehouse/:warehouseId', requirePermission('warehouse:read'), async (req, res) => {
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
    binsRouter.get('/warehouse/:warehouseId/hierarchical', requirePermission('warehouse:read'), async (req, res) => {
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
    binsRouter.get('/:binId', requirePermission('warehouse:read'), async (req, res) => {
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
    binsRouter.get('/:binId/contents', requirePermission('warehouse:read'), async (req, res) => {
        try {
            const binId = req.params.binId;

            // Get bin info first
            const bin = await warehouseService.getBinById(binId);
            if (!bin) {
                return res.status(404).json({ success: false, error: 'Bin not found' });
            }

            const { aggregateItems, serializedItems } = await getBinContentsDetailed(binId);

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
    binsRouter.post('/', requirePermission('warehouse:write'), async (req, res) => {
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
    binsRouter.post('/bulk', requirePermission('warehouse:write'), async (req, res) => {
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
    binsRouter.put('/:binId', requirePermission('warehouse:write'), async (req, res) => {
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
    binsRouter.delete('/:binId', requirePermission('warehouse:delete'), async (req, res) => {
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
    binsRouter.post('/:binId/inventory', requirePermission('warehouse:write'), async (req, res) => {
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

    // Move product or spare part between bins
    binsRouter.post('/move', requirePermission('warehouse:write'), async (req, res) => {
        try {
            const { from_bin_id, to_bin_id, product_id, spare_part_id, quantity, batch_id } = req.body;

            if (!from_bin_id || !to_bin_id || (!product_id && !spare_part_id) || !quantity || quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'from_bin_id, to_bin_id, product_id or spare_part_id, and positive quantity required'
                });
            }

            const result = await transferBetweenBins({
                from_bin_id, to_bin_id, product_id, spare_part_id, quantity, batch_id
            });
            res.json(result);
        } catch (error) {
            console.error('Move product between bins error:', error);
            res.status(400).json({ success: false, error: error.message || 'Failed to move between bins' });
        }
    });

    // Get bin utilization report for a warehouse
    binsRouter.get('/warehouse/:warehouseId/utilization', requirePermission('warehouse:read'), async (req, res) => {
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
    binsRouter.get('/warehouse/:warehouseId/available', requirePermission('warehouse:read'), async (req, res) => {
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

    // Mount bins router only (zones removed)
    router.use('/bins', binsRouter);

    return router;
};
