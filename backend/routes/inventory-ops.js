const asyncHandler = require('../utils/asyncHandler');
/**
 * Inventory Operations Helper API Routes
 * Consolidates Inventory Movement and Transaction operations
 * Provides endpoints for stock transfers, receiving, dispensing, and movement history
 */

const express = require('express');
const router = express.Router();
const InventoryService = require('../services/InventoryService');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { sendSuccess, sendError } = require('../utils/response');
const SanitizationService = require('../services/SanitizationService');

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = (dbPool) => {
    const inventoryService = new InventoryService(dbPool);


    // ==============================================================================
    // INVENTORY MOVEMENT ROUTES
    // Originally mounted at /inventory-movement
    // ==============================================================================

    /**
     * POST /api/inventory-movement/warehouse-transfer
     * Transfer inventory between different warehouses
     */
    router.post('/inventory-movement/warehouse-transfer', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
        try {
            const result = await inventoryService.warehouseTransfer(req.body);

            sendSuccess(res, { data: result }, `Successfully transferred ${result.quantity} units between warehouses`);
        } catch (error) {
            console.error('Warehouse transfer error:', error);
            if (error.message.includes('Missing required fields')) {
                return sendError(res, error.message, 400);
            }
            sendError(res, error.message || 'Failed to transfer inventory', error.statusCode || 500, error.details);
        }
    }));

    /**
     * GET /api/inventory-movement/history
     * Get inventory movement history with filters
     */
    router.get('/inventory-movement/history', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        try {
            const movements = await inventoryService.getMovementHistory(req.query);

            sendSuccess(res, {
                count: movements.length,
                movements: movements.map(m => convertBigIntToNumber(m))
            });
        } catch (error) {
            console.error('Movement history error:', error);
            sendError(res, 'Failed to fetch movement history');
        }
    }));

    /**
     * GET /api/inventory-movement
     * Alias for history - Get all inventory movements
     */
    router.get('/inventory-movement', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        try {
            const movements = await inventoryService.getMovementHistory(req.query);

            // Return array directly to match legacy API behavior expected by tests
            res.json(movements.map(m => convertBigIntToNumber(m)));
        } catch (error) {
            console.error('Movement history error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch movement history' });
        }
    }));

    /**
     * POST /api/inventory-movement/bulk-transfer
     * Transfer multiple products in a single operation
     */
    router.post('/inventory-movement/bulk-transfer', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
        try {
            const { results, errors } = await inventoryService.bulkTransfer(req.body);

            res.json({
                success: true,
                message: `Successfully transferred ${results.length} of ${results.length + errors.length} products`,
                results,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (error) {
            console.error('Bulk transfer error:', error);
            if (error.message.includes('required') || error.message.includes('All transfers failed')) {
                return res.status(400).json({ success: false, error: error.message });
            }
            res.status(500).json({ success: false, error: 'Failed to process bulk transfer: ' + error.message });
        }
    }));

    /**
     * GET /api/inventory-movement/validate
     * Validate a potential transfer before executing
     */
    router.get('/inventory-movement/validate', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        try {
            const result = await inventoryService.validateTransfer(req.query);

            sendSuccess(res, {
                valid: result.valid,
                message: result.message,
                stock: result.stock ? convertBigIntToNumber(result.stock) : undefined
            });
        } catch (error) {
            console.error('Validation error:', error);
            if (error.message.includes('Missing')) {
                return sendError(res, error.message, 400);
            }
            sendError(res, 'Failed to validate transfer');
        }
    }));



    // ==============================================================================
    // INVENTORY TRANSACTION ROUTES
    // Originally mounted at /inventory-transactions
    // ==============================================================================

    /**
     * POST /api/inventory-transactions/receive
     * Receive new stock into inventory
     */
    router.post('/inventory-transactions/receive', requirePermission('inventory:write'), asyncHandler(async (req, res, _next) => {
        try {
            const {
                supplier_id,
                items,
                warehouse_id,
                bin_id,
                notes,
                subtotal,
                tax_amount,
                total_amount,
                po_id,
                invoice_id
            } = req.body;

            // Validate tax amount
            if (tax_amount !== undefined && (isNaN(parseFloat(tax_amount)) || parseFloat(tax_amount) < 0)) {
                return sendError(res, 'Tax amount must be a non-negative number', 400);
            }

            // Validation
            if (!supplier_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Supplier ID is required'
                });
            }

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'At least one item is required'
                });
            }

            if (!warehouse_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Warehouse ID is required'
                });
            }

            // Validate each item
            for (const item of items) {
                if (!item.product_id && !item.specialty_inventory_id) {
                    return res.status(400).json({
                        success: false,
                        error: 'Each item must have either product_id or specialty_inventory_id'
                    });
                }

                if (!item.quantity || item.quantity <= 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Each item must have a valid quantity'
                    });
                }

                if (!item.unit_cost || item.unit_cost < 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Each item must have a valid unit cost'
                    });
                }
            }

            // Execute receive stock transaction
            const result = await inventoryService.receiveStock({
                supplier_id,
                items,
                warehouse_id,
                bin_id,
                user_id: req.user?.id || null, // Authentication disabled
                notes,
                subtotal: subtotal || 0,
                tax_amount: tax_amount || 0,
                total_amount: total_amount || 0,
                po_id,
                invoice_id
            });

            sendSuccess(res, {
                message: `Successfully received ${result.total_items} item(s)`,
                data: convertBigIntToNumber(result)
            }, null, 201);

        } catch (err) {
            console.error('❌ Receive stock error:', err);
            sendError(res, err.message || 'Failed to receive stock');
        }
    }));


    /**
     * POST /api/inventory-transactions/dispense
     * Dispense stock from inventory (sell/use)
     */
    router.post('/inventory-transactions/dispense', requirePermission('inventory:write'), asyncHandler(async (req, res, _next) => {
        try {
            const {
                items,
                warehouse_id,
                bin_id,
                customer_name,
                customer_address,
                delivery_person,
                notes,
                po_id,
                invoice_id
            } = req.body;

            // Validation
            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'At least one item is required'
                });
            }

            if (!warehouse_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Warehouse ID is required'
                });
            }

            // Validate each item
            for (const item of items) {
                if (!item.product_id && !item.asset_id && !item.batch_id) {
                    return res.status(400).json({
                        success: false,
                        error: 'Each item must have product_id, asset_id, or batch_id'
                    });
                }

                if (!item.quantity || item.quantity <= 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Each item must have a valid quantity'
                    });
                }
            }

            // Execute dispense stock transaction
            const result = await inventoryService.dispenseStock({
                items,
                warehouse_id,
                bin_id,
                user_id: req.user?.id || null, // Authentication disabled
                customer_name,
                customer_address,
                delivery_person,
                notes,
                po_id,
                invoice_id
            });

            sendSuccess(res, {
                message: `Successfully dispensed ${result.total_items} item(s)`,
                data: convertBigIntToNumber(result)
            }, null, 201);

        } catch (err) {
            console.error('❌ Dispense stock error:', err);
            sendError(res, err.message || 'Failed to dispense stock');
        }
    }));


    /**
     * POST /api/inventory-transactions/transfer
     * Transfer stock between locations
     */
    router.post('/inventory-transactions/transfer', requirePermission('inventory:write'), asyncHandler(async (req, res, _next) => {
        try {
            const {
                product_id,
                asset_id,
                batch_id,
                quantity,
                from_warehouse_id,
                from_bin_id,
                to_warehouse_id,
                to_bin_id,
                notes
            } = req.body;

            // Validation
            if (!from_warehouse_id || !to_warehouse_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Source and destination warehouse IDs are required'
                });
            }

            if (!product_id && !asset_id && !batch_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Must specify product_id, asset_id, or batch_id'
                });
            }

            if (product_id && (!quantity || quantity <= 0)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid quantity is required for bulk transfers'
                });
            }

            // Execute transfer transaction
            const result = await inventoryService.transferStock({
                product_id,
                asset_id,
                batch_id,
                quantity: quantity || 1,
                from_warehouse_id,
                from_bin_id,
                to_warehouse_id,
                to_bin_id,
                user_id: req.user?.id || null, // Authentication disabled
                notes
            });

            sendSuccess(res, {
                message: 'Transfer completed successfully',
                data: convertBigIntToNumber(result)
            });

        } catch (err) {
            console.error('❌ Transfer stock error:', err);
            sendError(res, err.message || 'Failed to transfer stock');
        }
    }));

    /**
     * GET /api/inventory-transactions/inventory-level/:productId
     * 
     * Get current inventory level derived from transaction log
     * Demonstrates that device_inventory is deprecated
     * 
     * Query Parameters:
     * - warehouse_id: Filter by warehouse (optional)
     * - bin_id: Filter by bin (optional)
     */
    router.get('/inventory-transactions/inventory-level/:productId', requirePermission('inventory:read'), asyncHandler(async (req, res, _next) => {
        try {
            const productId = req.params.productId;
            const warehouseId = req.query.warehouse_id || null;
            const binId = req.query.bin_id ? parseInt(req.query.bin_id, 10) : null;

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid product ID'
                });
            }

            const level = await inventoryService.getInventoryLevel(productId, warehouseId, binId);

            sendSuccess(res, {
                data: {
                    product_id: productId,
                    warehouse_id: warehouseId,
                    bin_id: binId,
                    current_level: level,
                    note: 'Level derived from inventory_log transactions'
                }
            });

        } catch (err) {
            console.error('❌ Get inventory level error:', err);
            sendError(res, err.message || 'Failed to get inventory level');
        }
    }));


    /**
     * GET /api/inventory-transactions/history/:productId
     * Get transaction history for a product
     */
    router.get('/inventory-transactions/history/:productId', requirePermission('inventory:read'), asyncHandler(async (req, res, _next) => {
        try {
            const productId = req.params.productId;

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid product ID'
                });
            }

            const filters = {
                warehouse_id: req.query.warehouse_id || null,
                transaction_type: req.query.transaction_type || null,
                start_date: req.query.start_date || null,
                end_date: req.query.end_date || null,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 100
            };

            const history = await inventoryService.getTransactionHistory(productId, filters);

            sendSuccess(res, {
                data: history.map(h => convertBigIntToNumber(h)),
                count: history.length
            });

        } catch (err) {
            console.error('❌ Get transaction history error:', err);
            sendError(res, err.message || 'Failed to get transaction history');
        }
    }));


    /**
         * GET /api/inventory-transactions/validate-availability
         * Validate if products are available for requested quantity
         */
    router.get('/inventory-transactions/validate-availability', requirePermission('inventory:read'), asyncHandler(async (req, res, _next) => {
        try {
            const productId = req.query.product_id;
            const quantity = parseInt(req.query.quantity, 10);
            const warehouseId = req.query.warehouse_id;
            const binId = req.query.bin_id ? parseInt(req.query.bin_id, 10) : null;

            if (!productId || isNaN(quantity) || !warehouseId) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid parameters'
                });
            }

            const result = await inventoryService.validateAvailability({
                product_id: productId,
                quantity,
                warehouse_id: warehouseId,
                bin_id: binId
            });

            sendSuccess(res, result);

        } catch (err) {
            console.error('❌ Validate availability error:', err);
            sendError(res, err.message || 'Failed to validate availability');
        }
    }));


    /**
     * GET /api/inventory-transactions/stats
     * Get transaction statistics
     */
    router.get('/inventory-transactions/stats', requirePermission('inventory:read'), asyncHandler(async (req, res, _next) => {
        try {
            const warehouseId = req.query.warehouse_id || null;
            const startDate = req.query.start_date || null;
            const endDate = req.query.end_date || null;

            const stats = await inventoryService.getTransactionStats({
                warehouse_id: warehouseId,
                start_date: startDate,
                end_date: endDate
            });

            sendSuccess(res, {
                transaction_stats: stats.transaction_stats.map(s => convertBigIntToNumber(s)),
                receipt_stats: stats.receipt_stats.map(r => convertBigIntToNumber(r)),
                filters: stats.filters
            });

        } catch (err) {
            console.error('❌ Get stats error:', err);
            sendError(res, err.message || 'Failed to get transaction stats');
        }
    }));

    /**
     * GET /api/inventory-transactions/manifest/:uuid
     * Get items/expected serials from a PO/Invoice manifest
     */
    router.get('/inventory-transactions/manifest/:uuid', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        try {
            const manifest = await inventoryService.getReceivingManifest(req.params.uuid);
            sendSuccess(res, convertBigIntToNumber(manifest));
        } catch (err) {
            console.error('❌ Get manifest error:', err);
            sendError(res, err.message || 'Failed to get manifest');
        }
    }));

    return router;
};
