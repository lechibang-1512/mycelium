/**
 * Warehouse Management Routes
 * Handles multi-warehouse, zone management, and batch tracking endpoints
 */

const express = require('express');
const { isAuthenticated, isStaffOrAdmin } = require('../middleware/auth');

module.exports = (pool, convertBigIntToNumber) => {
    const router = express.Router();
    const WarehouseService = require('../services/WarehouseService');
    const WarehouseAnalyticsService = require('../services/WarehouseAnalyticsService');

    // Initialize services
    let warehouseService;
    let warehouseAnalyticsService;

    // Middleware to initialize services
    router.use((req, res, next) => {
        if (!warehouseService) {
            warehouseService = new WarehouseService(pool);
        }
        if (!warehouseAnalyticsService) {
            warehouseAnalyticsService = new WarehouseAnalyticsService(
                pool,
                convertBigIntToNumber
            );
        }
        next();
    });

/**
 * GET /warehouses - List all warehouses
 */
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const warehouses = await warehouseService.getWarehouses();
        
        res.render('warehouses/index', {
            title: 'Warehouse Management',
            warehouses
        });
    } catch (error) {
        console.error('Error fetching warehouses:', error);
        res.status(500).render('error', { 
            error: 'Failed to load warehouses: ' + error.message
        });
    }
});

/**
 * GET /warehouses/analytics - Warehouse analytics dashboard
 */
router.get('/analytics', async (req, res) => {
    try {
        const period = parseInt(req.query.period) || 30;
        
        const [
            warehousePerformance,
            zoneUtilization,
            batchExpiry,
            serializedInventory,
            inventoryTurnover,
            topZones,
            lowStock,
            warehouseSummary
        ] = await Promise.all([
            warehouseAnalyticsService.getWarehousePerformanceData(period),
            warehouseAnalyticsService.getZoneUtilizationData(),
            warehouseAnalyticsService.getBatchExpiryAnalytics(),
            warehouseAnalyticsService.getSerializedInventoryAnalytics(),
            warehouseAnalyticsService.getInventoryTurnoverByWarehouse(period),
            warehouseAnalyticsService.getTopPerformingZones(period),
            warehouseAnalyticsService.getLowStockByWarehouse(),
            warehouseAnalyticsService.getWarehouseInventorySummary()
        ]);

        res.render('warehouses/analytics', {
            title: 'Warehouse Analytics',
            period,
            warehousePerformance,
            zoneUtilization,
            batchExpiry,
            serializedInventory,
            inventoryTurnover,
            topZones,
            lowStock,
            warehouseSummary
        });
    } catch (error) {
        console.error('Error fetching warehouse analytics:', error);
        res.status(500).render('error', { 
            error: 'Failed to load warehouse analytics: ' + error.message
        });
    }
});

/**
 * GET /warehouses/:id - View specific warehouse
 */
router.get('/:id', async (req, res) => {
    try {
        const warehouseId = parseInt(req.params.id);
        
        if (isNaN(warehouseId)) {
            return res.status(400).render('error', { 
                error: 'Invalid warehouse ID' 
            });
        }
        
        const [warehouses, zones, inventory, zoneUtilization] = await Promise.all([
            warehouseService.getWarehouses(false),
            warehouseService.getWarehouseZones(warehouseId),
            warehouseService.getInventoryByLocation(warehouseId),
            warehouseAnalyticsService.getZoneUtilizationData(warehouseId)
        ]);

        const warehouse = warehouses.find(w => w.warehouse_id === warehouseId);
        
        if (!warehouse) {
            return res.status(404).render('error', { 
                error: 'Warehouse not found' 
            });
        }

        res.render('warehouses/details', {
            title: `${warehouse.name} - Warehouse Details`,
            warehouse,
            zones,
            inventory,
            zoneUtilization
        });
    } catch (error) {
        console.error('Error fetching warehouse details:', error);
        res.status(500).render('error', { 
            error: 'Failed to load warehouse details: ' + error.message
        });
    }
});

/**
 * GET /warehouses/:id/zones - List zones for a warehouse
 */
router.get('/:id/zones', async (req, res) => {
    try {
        const warehouseId = parseInt(req.params.id);
        
        if (isNaN(warehouseId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid warehouse ID' 
            });
        }
        
        const zones = await warehouseService.getWarehouseZones(warehouseId);
        
        res.json({ success: true, zones });
    } catch (error) {
        console.error('Error fetching zones:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch zones' 
        });
    }
});

/**
 * GET /warehouses/batches/expiring - Get expiring batches
 */
router.get('/batches/expiring', async (req, res) => {
    try {
        const daysAhead = parseInt(req.query.days) || 30;
        const expiringBatches = await warehouseAnalyticsService.getExpiringBatchesDetails(daysAhead);
        
        res.render('warehouses/expiring-batches', {
            title: 'Expiring Batches',
            expiringBatches,
            daysAhead
        });
    } catch (error) {
        console.error('Error fetching expiring batches:', error);
        res.status(500).render('error', { 
            error: 'Failed to load expiring batches: ' + error.message
        });
    }
});

/**
 * GET /warehouses/serial/:serialNumber - Find item by serial number
 */
router.get('/serial/:serialNumber', async (req, res) => {
    try {
        const serialNumber = req.params.serialNumber;
        const item = await warehouseService.findBySerialNumber(serialNumber);
        
        if (!item) {
            return res.status(404).json({ 
                success: false, 
                message: 'Serial number not found' 
            });
        }

        res.json({ success: true, item });
    } catch (error) {
        console.error('Error finding serial number:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to find serial number' 
        });
    }
});

/**
 * POST /warehouses/transfer - Transfer inventory between warehouses
 */
router.post('/transfer', async (req, res) => {
    try {
        const { 
            productId, 
            fromWarehouseId, 
            toWarehouseId, 
            quantity, 
            fromZoneId, 
            toZoneId, 
            notes 
        } = req.body;

        // Basic validation
        if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        const success = await warehouseService.transferInventory(
            productId, 
            fromWarehouseId, 
            toWarehouseId, 
            parseInt(quantity), 
            fromZoneId, 
            toZoneId, 
            notes
        );

        if (success) {
            res.json({ 
                success: true, 
                message: 'Inventory transferred successfully' 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Transfer failed' 
            });
        }
    } catch (error) {
        console.error('Error transferring inventory:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Transfer failed: ' + error.message 
        });
    }
});

/**
 * POST /warehouses/batches - Create new batch
 */
router.post('/batches', async (req, res) => {
    try {
        const { 
            productId, 
            batchNo, 
            lotNo, 
            supplierId, 
            warehouseId, 
            zoneId, 
            quantity, 
            expiryDate, 
            notes 
        } = req.body;

        // Basic validation
        if (!productId || !batchNo || !quantity) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        const batchId = await warehouseService.createBatch(
            productId, 
            batchNo, 
            lotNo, 
            supplierId, 
            warehouseId, 
            zoneId, 
            parseInt(quantity), 
            expiryDate, 
            notes
        );

        res.json({ 
            success: true, 
            message: 'Batch created successfully',
            batchId
        });
    } catch (error) {
        console.error('Error creating batch:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create batch: ' + error.message 
        });
    }
});

/**
 * POST /warehouses/serial - Create serialized item
 */
router.post('/serial', async (req, res) => {
    try {
        const { 
            productId, 
            serialNumber, 
            warehouseId, 
            zoneId, 
            batchNo, 
            lotNo, 
            expiryDate, 
            supplierId, 
            notes 
        } = req.body;

        // Basic validation
        if (!productId || !serialNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        const serialId = await warehouseService.createSerializedItem(
            productId, 
            serialNumber, 
            warehouseId, 
            zoneId, 
            batchNo, 
            lotNo, 
            expiryDate, 
            supplierId, 
            notes
        );

        res.json({ 
            success: true, 
            message: 'Serialized item created successfully',
            serialId
        });
    } catch (error) {
        console.error('Error creating serialized item:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create serialized item: ' + error.message 
        });
    }
});

/**
 * GET /warehouses/distribution/overview - Get distribution overview
 */
router.get('/distribution/overview', async (req, res) => {
    try {
        const overview = await warehouseService.getWarehouseDistributionOverview();
        res.json({ success: true, overview });
    } catch (error) {
        console.error('Error fetching distribution overview:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch distribution overview' 
        });
    }
});

/**
 * GET /warehouses/:id/zones/efficiency - Get zone efficiency for warehouse
 */
router.get('/:id/zones/efficiency', async (req, res) => {
    try {
        const warehouseId = parseInt(req.params.id);
        
        if (isNaN(warehouseId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid warehouse ID' 
            });
        }
        
        const efficiency = await warehouseService.getZoneDistributionEfficiency(warehouseId);
        res.json({ success: true, efficiency });
    } catch (error) {
        console.error('Error fetching zone efficiency:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch zone efficiency' 
        });
    }
});

/**
 * POST /warehouses/:id/distribute - Distribute inventory across zones
 */
router.post('/:id/distribute', async (req, res) => {
    try {
        const warehouseId = parseInt(req.params.id);
        
        if (isNaN(warehouseId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid warehouse ID' 
            });
        }
        const { productId, totalQuantity, distributionStrategy = 'even' } = req.body;

        if (!productId || !totalQuantity) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        const distributions = await warehouseService.distributeInventoryAcrossZones(
            productId, 
            warehouseId, 
            parseInt(totalQuantity), 
            distributionStrategy
        );

        res.json({ 
            success: true, 
            message: 'Inventory distributed successfully',
            distributions
        });
    } catch (error) {
        console.error('Error distributing inventory:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to distribute inventory: ' + error.message 
        });
    }
});

/**
 * GET /warehouses/:id/products/:productId/optimize - Get optimization suggestions
 */
router.get('/:id/products/:productId/optimize', async (req, res) => {
    try {
        const warehouseId = parseInt(req.params.id);
        const productId = parseInt(req.params.productId);

        if (isNaN(warehouseId) || isNaN(productId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid warehouse ID or product ID' 
            });
        }

        const suggestions = await warehouseService.optimizeZoneAllocation(productId, warehouseId);

        res.json({ 
            success: true, 
            suggestions
        });
    } catch (error) {
        console.error('Error generating optimization suggestions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate suggestions' 
        });
    }
});

/**
 * POST /warehouses/bulk-operations - Perform bulk inventory operations
 */
router.post('/bulk-operations', async (req, res) => {
    try {
        const { operations } = req.body;

        if (!operations || !Array.isArray(operations)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Operations array is required' 
            });
        }

        const results = await warehouseService.bulkInventoryOperation(operations);

        res.json({ 
            success: true, 
            message: 'Bulk operations completed',
            results
        });
    } catch (error) {
        console.error('Error performing bulk operations:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to perform bulk operations: ' + error.message 
        });
    }
});

/**
 * GET /warehouses/movement-tracking - Get inventory movement tracking
 */
router.get('/movement-tracking', async (req, res) => {
    try {
        const filters = {
            productId: req.query.product_id ? parseInt(req.query.product_id) : null,
            warehouseId: req.query.warehouse_id ? parseInt(req.query.warehouse_id) : null,
            zoneId: req.query.zone_id ? parseInt(req.query.zone_id) : null,
            transactionType: req.query.transaction_type,
            fromDate: req.query.from_date,
            toDate: req.query.to_date
        };

        const movements = await warehouseService.getInventoryMovementTracking(filters);

        res.json({ 
            success: true, 
            movements
        });
    } catch (error) {
        console.error('Error fetching movement tracking:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch movement tracking' 
        });
    }
});

/**
 * GET /warehouses/low-stock-alerts - Get low stock alerts
 */
router.get('/low-stock-alerts', async (req, res) => {
    try {
        const warehouseId = req.query.warehouse_id ? parseInt(req.query.warehouse_id) : null;
        const alertLevel = req.query.alert_level;

        const alerts = await warehouseService.getLowStockAlerts(warehouseId, alertLevel);

        res.json({ 
            success: true, 
            alerts
        });
    } catch (error) {
        console.error('Error fetching low stock alerts:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch low stock alerts' 
        });
    }
});

/**
 * POST /warehouses - Create new warehouse
 */
router.post('/', isStaffOrAdmin, async (req, res) => {
    try {
        const warehouseData = req.body;
        const warehouseId = await warehouseService.createOrUpdateWarehouse(warehouseData);

        res.json({ 
            success: true, 
            message: 'Warehouse created successfully',
            warehouseId
        });
    } catch (error) {
        console.error('Error creating warehouse:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create warehouse: ' + error.message 
        });
    }
});

/**
 * PUT /warehouses/:id - Update warehouse
 */
router.put('/:id', isStaffOrAdmin, async (req, res) => {
    try {
        const warehouseId = parseInt(req.params.id);
        
        if (isNaN(warehouseId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid warehouse ID' 
            });
        }
        
        const warehouseData = req.body;
        
        await warehouseService.createOrUpdateWarehouse(warehouseData, warehouseId);

        res.json({ 
            success: true, 
            message: 'Warehouse updated successfully'
        });
    } catch (error) {
        console.error('Error updating warehouse:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update warehouse: ' + error.message 
        });
    }
});

/**
 * POST /warehouses/:id/zones - Create new zone
 */
router.post('/:id/zones', isStaffOrAdmin, async (req, res) => {
    try {
        const warehouseId = parseInt(req.params.id);
        
        if (isNaN(warehouseId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid warehouse ID' 
            });
        }
        
        const zoneData = { ...req.body, warehouseId };
        const zoneId = await warehouseService.createOrUpdateZone(zoneData);

        // Convert BigInt to Number for JSON serialization
        const safeZoneId = typeof zoneId === 'bigint' ? Number(zoneId) : zoneId;

        res.json({ 
            success: true, 
            message: 'Zone created successfully',
            zoneId: safeZoneId
        });
    } catch (error) {
        console.error('Error creating zone:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create zone: ' + error.message 
        });
    }
});

/**
 * PUT /warehouses/:warehouseId/zones/:zoneId - Update zone
 */
router.put('/:warehouseId/zones/:zoneId', isStaffOrAdmin, async (req, res) => {
    try {
        const warehouseIdNum = parseInt(req.params.warehouseId);
        const zoneIdNum = parseInt(req.params.zoneId);
        
        if (isNaN(warehouseIdNum) || isNaN(zoneIdNum)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid warehouse ID or zone ID' 
            });
        }
        
        const zoneData = { ...req.body, warehouseId: warehouseIdNum };
        
        await warehouseService.createOrUpdateZone(zoneData, zoneIdNum);

        res.json({ 
            success: true, 
            message: 'Zone updated successfully'
        });
    } catch (error) {
        console.error('Error updating zone:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update zone: ' + error.message 
        });
    }
});

/**
 * GET /warehouses/api/warehouse/:warehouseId/product/:productId - Get zone distribution for a specific product in a warehouse
 */
router.get('/api/warehouse/:warehouseId/product/:productId', isAuthenticated, async (req, res) => {
    try {
        const { warehouseId, productId } = req.params;
        
        const warehouseIdNum = parseInt(warehouseId);
        const productIdNum = parseInt(productId);
        
        if (isNaN(warehouseIdNum) || isNaN(productIdNum)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid warehouse ID or product ID' 
            });
        }
        
        const zoneDistribution = await warehouseService.getProductZoneDistribution(
            productIdNum, 
            warehouseIdNum
        );

        res.json({ 
            success: true, 
            zones: convertBigIntToNumber(zoneDistribution),
            warehouseId: warehouseIdNum,
            productId: productIdNum
        });
    } catch (error) {
        console.error('Error fetching zone distribution:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch zone distribution: ' + error.message 
        });
    }
});

/**
 * GET /warehouses/api/warehouse/:warehouseId/product/:productId/current-distribution - Get current distribution across zones
 */
router.get('/api/warehouse/:warehouseId/product/:productId/current-distribution', isAuthenticated, async (req, res) => {
    try {
        const { warehouseId, productId } = req.params;
        
        const warehouseIdNum = parseInt(warehouseId);
        const productIdNum = parseInt(productId);
        
        if (isNaN(warehouseIdNum) || isNaN(productIdNum)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid warehouse ID or product ID' 
            });
        }
        
        const [distribution, zones] = await Promise.all([
            warehouseService.getCurrentZoneDistribution(productIdNum, warehouseIdNum),
            warehouseService.getWarehouseZones(warehouseIdNum)
        ]);

        res.json({ 
            success: true, 
            distribution: convertBigIntToNumber(distribution),
            zones: convertBigIntToNumber(zones),
            warehouseId: warehouseIdNum,
            productId: productIdNum
        });
    } catch (error) {
        console.error('Error fetching current distribution:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch current distribution: ' + error.message 
        });
    }
});

/**
 * POST /warehouses/zones/replace/single - Single zone replacement
 */
router.post('/zones/replace/single', isStaffOrAdmin, async (req, res) => {
    try {
        const { 
            productId, 
            warehouseId, 
            fromZoneId, 
            toZoneId, 
            quantity, 
            reason 
        } = req.body;

        // Validate inputs
        if (!productId || !warehouseId || !fromZoneId || !toZoneId || !quantity) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: productId, warehouseId, fromZoneId, toZoneId, quantity' 
            });
        }

        const productIdNum = parseInt(productId);
        const warehouseIdNum = parseInt(warehouseId);
        const fromZoneIdNum = parseInt(fromZoneId);
        const toZoneIdNum = parseInt(toZoneId);
        const quantityNum = parseInt(quantity);

        if (isNaN(productIdNum) || isNaN(warehouseIdNum) || isNaN(fromZoneIdNum) || isNaN(toZoneIdNum) || isNaN(quantityNum)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid numeric values for productId, warehouseId, fromZoneId, toZoneId, or quantity' 
            });
        }

        if (fromZoneIdNum === toZoneIdNum) {
            return res.status(400).json({ 
                success: false, 
                message: 'Source and destination zones cannot be the same' 
            });
        }

        const result = await warehouseService.singleZoneReplacement(
            productIdNum, 
            warehouseIdNum, 
            fromZoneIdNum, 
            toZoneIdNum, 
            quantityNum, 
            reason
        );

        res.json({ 
            success: true, 
            message: result.message,
            result 
        });
    } catch (error) {
        console.error('Error in single zone replacement:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Single zone replacement failed: ' + error.message 
        });
    }
});

/**
 * POST /warehouses/zones/replace/multi - Multi-zone replacement
 */
router.post('/zones/replace/multi', isStaffOrAdmin, async (req, res) => {
    try {
        const { 
            productId, 
            warehouseId, 
            targetZoneDistribution, 
            strategy 
        } = req.body;

        // Validate inputs
        if (!productId || !warehouseId || !targetZoneDistribution) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: productId, warehouseId, targetZoneDistribution' 
            });
        }

        const productIdNum = parseInt(productId);
        const warehouseIdNum = parseInt(warehouseId);

        if (isNaN(productIdNum) || isNaN(warehouseIdNum)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid numeric values for productId or warehouseId' 
            });
        }

        if (typeof targetZoneDistribution !== 'object' || Object.keys(targetZoneDistribution).length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'targetZoneDistribution must be an object with zone IDs as keys and quantities as values' 
            });
        }

        const result = await warehouseService.multiZoneReplacement(
            productIdNum, 
            warehouseIdNum, 
            targetZoneDistribution, 
            strategy || 'optimize'
        );

        res.json({ 
            success: true, 
            message: result.message,
            result 
        });
    } catch (error) {
        console.error('Error in multi-zone replacement:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Multi-zone replacement failed: ' + error.message 
        });
    }
});

/**
 * GET /warehouses/:warehouseId/zones/:zoneId/bins/available - Get available bin locations
 */
router.get('/:warehouseId/zones/:zoneId/bins/available', isAuthenticated, async (req, res) => {
    try {
        const { warehouseId, zoneId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const warehouseIdNum = parseInt(warehouseId);
        const zoneIdNum = parseInt(zoneId);
        
        if (isNaN(warehouseIdNum) || isNaN(zoneIdNum)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid warehouse ID or zone ID' 
            });
        }

        const bins = await warehouseService.findAvailableBinLocations(
            warehouseIdNum, 
            zoneIdNum, 
            limit
        );

        res.json({ 
            success: true, 
            bins: convertBigIntToNumber(bins) 
        });
    } catch (error) {
        console.error('Error fetching available bins:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch available bins: ' + error.message 
        });
    }
});

/**
 * GET /warehouses/:warehouseId/product/:productId/bins - Get bin locations for a product
 */
router.get('/:warehouseId/product/:productId/bins', isAuthenticated, async (req, res) => {
    try {
        const { warehouseId, productId } = req.params;
        const { zoneId } = req.query;

        const warehouseIdNum = parseInt(warehouseId);
        const productIdNum = parseInt(productId);
        const zoneIdNum = zoneId ? parseInt(zoneId) : null;
        
        if (isNaN(warehouseIdNum) || isNaN(productIdNum) || (zoneId && isNaN(zoneIdNum))) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid warehouse ID, product ID, or zone ID' 
            });
        }

        const binDetails = await warehouseService.getBinLocationDetails(
            productIdNum, 
            warehouseIdNum, 
            zoneIdNum
        );

        res.json({ 
            success: true, 
            binDetails: convertBigIntToNumber(binDetails) 
        });
    } catch (error) {
        console.error('Error fetching bin details:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch bin details: ' + error.message 
        });
    }
});

/**
 * PUT /warehouses/:warehouseId/zones/:zoneId/product/:productId/bin - Update bin location
 */
router.put('/:warehouseId/zones/:zoneId/product/:productId/bin', isStaffOrAdmin, async (req, res) => {
    try {
        const { warehouseId, zoneId, productId } = req.params;
        const { aisle, shelf, bin } = req.body;

        const warehouseIdNum = parseInt(warehouseId);
        const zoneIdNum = parseInt(zoneId);
        const productIdNum = parseInt(productId);
        
        if (isNaN(warehouseIdNum) || isNaN(zoneIdNum) || isNaN(productIdNum)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid warehouse ID, zone ID, or product ID' 
            });
        }

        const success = await warehouseService.updateBinLocation(
            productIdNum, 
            warehouseIdNum, 
            zoneIdNum, 
            aisle, 
            shelf, 
            bin
        );

        if (success) {
            res.json({ 
                success: true, 
                message: 'Bin location updated successfully' 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: 'Product location not found' 
            });
        }
    } catch (error) {
        console.error('Error updating bin location:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update bin location: ' + error.message 
        });
    }
});

/**
 * GET /warehouses/zone-management - Zone management interface
 */
router.get('/zone-management', isStaffOrAdmin, async (req, res) => {
    try {
        const [warehouses, products] = await Promise.all([
            warehouseService.getWarehouses(),
            pool.query('SELECT product_id, device_name, device_inventory FROM specs_db ORDER BY device_name')
        ]);

        res.render('warehouses/zone-management', {
            title: 'Zone Management',
            warehouses: convertBigIntToNumber(warehouses),
            products: convertBigIntToNumber(products),
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.error('Error loading zone management page:', error);
        res.status(500).render('error', { 
            message: 'Failed to load zone management page',
            error: error.message
        });
    }
});

return router;
};
