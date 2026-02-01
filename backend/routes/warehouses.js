const express = require('express');
const router = express.Router();
const SanitizationService = require('../services/SanitizationService');
const WarehouseService = require('../services/WarehouseService');

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
    // Initialize warehouse service
    const warehouseService = new WarehouseService();

    // ========== SPECIAL ROUTES (must come before /:id) ==========

    // Get distribution overview
    router.get('/distribution/overview', async (req, res) => {
        try {
            const overview = await warehouseService.getWarehouseDistributionOverview();
            res.json({
                success: true,
                overview: overview.map(o => convertBigIntToNumber(o))
            });
        } catch (error) {
            console.error('Distribution overview fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch distribution overview' });
        }
    });

    // Get low stock alerts with stock level classification
    // Supports per-product thresholds from database (min_stock_level, reorder_point)
    router.get('/low-stock-alerts', async (req, res) => {
        try {
            // Parse threshold parameters from query string (allows frontend customization)
            const options = {
                lowStockThreshold: req.query.lowThreshold ? parseInt(req.query.lowThreshold, 10) : 10,
                criticalStockThreshold: req.query.criticalThreshold ? parseInt(req.query.criticalThreshold, 10) : 5,
                highStockThreshold: req.query.highThreshold ? parseInt(req.query.highThreshold, 10) : 50,
                // Enable per-product thresholds by default, can be disabled with ?usePerProduct=false
                usePerProductThresholds: req.query.usePerProduct !== 'false'
            };

            const alerts = await warehouseService.getLowStockAlerts(options);

            res.json({
                success: true,
                alerts: alerts.map(a => convertBigIntToNumber(a)),
                thresholds: {
                    globalFallback: {
                        low: options.lowStockThreshold,
                        critical: options.criticalStockThreshold,
                        high: options.highStockThreshold
                    },
                    usePerProductThresholds: options.usePerProductThresholds
                },
                count: alerts.length
            });
        } catch (error) {
            console.error('Low stock alerts fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch low stock alerts' });
        }
    });

    // Get bin distribution for a product (nested api path)
    router.get('/api/warehouse/:warehouseId/product/:productId', async (req, res) => {
        try {
            const warehouseId = req.params.warehouseId;
            const productId = req.params.productId;

            const bins = await warehouseService.getProductBinDistribution(productId, warehouseId);

            res.json({
                success: true,
                bins: bins.map(b => convertBigIntToNumber(b)),
                warehouseId,
                productId
            });
        } catch (error) {
            console.error('Product bin distribution fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch bin distribution' });
        }
    });

    // ========== MAIN WAREHOUSE ROUTES ==========

    // Get all warehouses
    router.get('/', async (req, res) => {
        try {
            const warehouses = await warehouseService.getWarehouses(false);
            res.json({
                success: true,
                warehouses: warehouses.map(w => convertBigIntToNumber(w))
            });
        } catch (error) {
            console.error('Warehouses fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch warehouses' });
        }
    });

    // Get single warehouse
    router.get('/:id', async (req, res) => {
        try {
            const warehouses = await warehouseService.getWarehouses(false);
            const warehouse = warehouses.find(w => w.warehouse_id === req.params.id);

            if (!warehouse) {
                return res.status(404).json({ error: 'Warehouse not found' });
            }

            res.json({
                success: true,
                warehouse: convertBigIntToNumber(warehouse)
            });
        } catch (error) {
            console.error('Warehouse fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch warehouse' });
        }
    });
    // Get warehouse statistics
    router.get('/:id/statistics', async (req, res) => {
        try {
            const warehouseId = req.params.id;
            const stats = await warehouseService.getWarehouseStatistics(warehouseId);

            res.json({
                success: true,
                statistics: convertBigIntToNumber(stats)
            });
        } catch (error) {
            console.error('Warehouse statistics fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch warehouse statistics' });
        }
    });
    // Create warehouse
    router.post('/', async (req, res) => {
        try {
            const { name, location, description, contact_info, is_active } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Name is required' });
            }

            const warehouseId = await warehouseService.createOrUpdateWarehouse({
                name,
                location,
                description,
                contactInfo: contact_info,
                isActive: is_active !== undefined ? is_active : true
            });

            res.json({
                success: true,
                warehouseId: warehouseId,
                message: 'Warehouse created successfully'
            });
        } catch (error) {
            console.error('Create warehouse error:', error);
            res.status(500).json({ error: 'Failed to create warehouse' });
        }
    });

    // Update warehouse
    router.put('/:id', async (req, res) => {
        try {
            const { name, location, description, contact_info, contactInfo, is_active, isActive } = req.body;

            // Handle both snake_case and camelCase naming conventions
            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (location !== undefined) updateData.location = location;
            if (description !== undefined) updateData.description = description;
            if (contactInfo !== undefined) updateData.contactInfo = contactInfo;
            if (contact_info !== undefined) updateData.contactInfo = contact_info;
            if (isActive !== undefined) updateData.isActive = isActive;
            if (is_active !== undefined) updateData.isActive = is_active;

            await warehouseService.createOrUpdateWarehouse(updateData, req.params.id);

            res.json({ success: true, message: 'Warehouse updated successfully' });
        } catch (error) {
            console.error('Update warehouse error:', error);
            res.status(500).json({ error: error.message || 'Failed to update warehouse' });
        }
    });

    // Deactivate warehouse with inventory transfer
    router.put('/:id/deactivate', async (req, res) => {
        try {
            const warehouseId = req.params.id;
            const { targetWarehouseId, targetZoneType } = req.body;

            const result = await warehouseService.deactivateWarehouse(
                warehouseId,
                targetWarehouseId || null,
                targetZoneType || 'staging'
            );

            res.json(result);
        } catch (error) {
            console.error('Deactivate warehouse error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to deactivate warehouse'
            });
        }
    });

    // Activate warehouse
    router.put('/:id/activate', async (req, res) => {
        try {
            const result = await warehouseService.activateWarehouse(req.params.id);
            res.json(result);
        } catch (error) {
            console.error('Activate warehouse error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to activate warehouse'
            });
        }
    });

    // Delete warehouse (soft delete) - Removes all inventory from the warehouse
    router.delete('/:id', async (req, res) => {
        try {
            const result = await warehouseService.deleteWarehouse(req.params.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error || 'Failed to delete warehouse'
                });
            }
        } catch (error) {
            console.error('Delete warehouse error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to delete warehouse'
            });
        }
    });

    // ========== COLUMN-ROW-BIN ENDPOINTS ==========

    // Get bins organized by column-row for a warehouse
    router.get('/:id/columns', async (req, res) => {
        try {
            const result = await warehouseService.getWarehouseColumns(req.params.id);
            res.json({
                success: true,
                columns: result.columns,
                bins: result.flat.map(b => convertBigIntToNumber(b))
            });
        } catch (error) {
            console.error('Columns fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch columns' });
        }
    });

    // Get bins for a warehouse (flat list)
    router.get('/:id/bins', async (req, res) => {
        try {
            const bins = await warehouseService.getBinsByWarehouse(req.params.id);
            res.json({
                success: true,
                bins: bins.map(b => convertBigIntToNumber(b))
            });
        } catch (error) {
            console.error('Bins fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch bins' });
        }
    });

    // Get bins organized hierarchically by column-row-bin
    router.get('/:id/bins/hierarchical', async (req, res) => {
        try {
            const result = await warehouseService.getBinsHierarchical(req.params.id);
            res.json({
                success: true,
                hierarchical: result
            });
        } catch (error) {
            console.error('Hierarchical bins fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch hierarchical bins' });
        }
    });

    // Get inventory by location
    router.get('/:id/inventory', async (req, res) => {
        try {
            const warehouseId = req.params.id;
            const binId = req.query.bin_id || null;

            const inventory = await warehouseService.getInventoryByLocation(warehouseId, binId);

            res.json({
                success: true,
                inventory: inventory.map(i => convertBigIntToNumber(i))
            });
        } catch (error) {
            console.error('Inventory fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch inventory' });
        }
    });

    // Get product bins for a specific warehouse and product
    router.get('/:warehouseId/products/:productId/bins', async (req, res) => {
        try {
            const warehouseId = req.params.warehouseId;
            const productId = req.params.productId;

            const bins = await warehouseService.getProductBinDistribution(productId, warehouseId);

            res.json({
                success: true,
                bins: bins.map(b => convertBigIntToNumber(b)),
                warehouseId,
                productId
            });
        } catch (error) {
            console.error('Product bin distribution fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch bin distribution' });
        }
    });

    return router;
};
