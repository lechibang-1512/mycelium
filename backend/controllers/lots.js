/**
 * Lot Tracking Routes
 * API endpoints for lot tracking and FIFO selection
 */

const express = require('express');
const router = express.Router();
const LotTrackingService = require('../services/LotTrackingService');

let service = null;

const getService = (req) => {
    if (!service) {
        service = new LotTrackingService(req.app.locals.masterPool);
    }
    return service;
};

/**
 * GET /lots
 * List all lots with summary
 */
router.get('/', async (req, res) => {
    try {
        const filters = {
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            warehouse_id: req.query.warehouse_id,
            limit: req.query.limit ? parseInt(req.query.limit) : 100
        };
        const lots = await getService(req).listLots(filters);
        res.json({ success: true, data: lots });
    } catch (error) {
        console.error('Error listing lots:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /lots/:lotId/history
 * Get history for a specific lot
 */
router.get('/:lotId/history', async (req, res) => {
    try {
        const history = await getService(req).getLotHistory(req.params.lotId);
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Error getting lot history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /lots/:lotId/inventory
 * Get current inventory for a specific lot
 */
router.get('/:lotId/inventory', async (req, res) => {
    try {
        const inventory = await getService(req).getLotInventory(req.params.lotId);
        res.json({ success: true, data: inventory });
    } catch (error) {
        console.error('Error getting lot inventory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /lots/fifo-allocation
 * Get FIFO lot allocation for dispensing
 */
router.post('/fifo-allocation', async (req, res) => {
    try {
        const { spare_part_id, warehouse_id, quantity_needed } = req.body;

        if (!spare_part_id || !warehouse_id || !quantity_needed) {
            return res.status(400).json({
                success: false,
                error: 'spare_part_id, warehouse_id, and quantity_needed are required'
            });
        }

        const allocation = await getService(req).getFIFOLots(
            spare_part_id, warehouse_id, parseInt(quantity_needed)
        );
        res.json({ success: true, data: allocation });
    } catch (error) {
        console.error('Error getting FIFO allocation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
