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
            message: 'Failed to load warehouses',
            error: error.message
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
            message: 'Failed to load warehouse analytics',
            error: error.message
        });
    }
});

/**
 * GET /warehouses/:id - View specific warehouse
 */
router.get('/:id', async (req, res) => {
    try {
        const warehouseId = parseInt(req.params.id);
        
        const [warehouses, zones, inventory, zoneUtilization] = await Promise.all([
            warehouseService.getWarehouses(false),
            warehouseService.getWarehouseZones(warehouseId),
            warehouseService.getInventoryByLocation(warehouseId),
            warehouseAnalyticsService.getZoneUtilizationData(warehouseId)
        ]);

        const warehouse = warehouses.find(w => w.warehouse_id === warehouseId);
        
        if (!warehouse) {
            return res.status(404).render('error', { 
                message: 'Warehouse not found' 
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
            message: 'Failed to load warehouse details',
            error: error.message
        });
    }
});

/**
 * GET /warehouses/:id/zones - List zones for a warehouse
 */
router.get('/:id/zones', async (req, res) => {
    try {
        const warehouseId = parseInt(req.params.id);
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
            message: 'Failed to load expiring batches',
            error: error.message
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
 * PUT /warehouses/serial/:id/status - Update serialized item status
 */
router.put('/serial/:id/status', async (req, res) => {
    try {
        const serialId = parseInt(req.params.id);
        const { status, notes } = req.body;

        if (!status) {
            return res.status(400).json({ 
                success: false, 
                message: 'Status is required' 
            });
        }

        const success = await warehouseService.updateSerializedItemStatus(
            serialId, 
            status, 
            notes
        );

        if (success) {
            res.json({ 
                success: true, 
                message: 'Status updated successfully' 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Failed to update status' 
            });
        }
    } catch (error) {
        console.error('Error updating serial status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update status: ' + error.message 
        });
    }
});

/**
 * GET /warehouses/api/summary - Get warehouse summary (API endpoint)
 */
router.get('/api/summary', async (req, res) => {
    try {
        const warehouseId = req.query.warehouse_id ? parseInt(req.query.warehouse_id) : null;
        const summary = await warehouseAnalyticsService.getWarehouseInventorySummary(warehouseId);
        
        res.json({ success: true, summary });
    } catch (error) {
        console.error('Error fetching warehouse summary:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch summary' 
        });
    }
});

return router;
};
