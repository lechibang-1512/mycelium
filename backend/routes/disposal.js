/**
 * Disposal Routes
 * API endpoints for disposal bin management and item disposal
 */

const express = require('express');
const router = express.Router();
const DisposalService = require('../services/DisposalService');

let service = null;

const getService = (req) => {
    if (!service) {
        service = new DisposalService(req.app.locals.masterPool);
    }
    return service;
};

/**
 * GET /disposal/bins/:warehouseId
 * Get disposal bin for a warehouse
 */
router.get('/bins/:warehouseId', async (req, res) => {
    try {
        const bin = await getService(req).getDisposalBin(req.params.warehouseId);
        res.json({ success: true, data: bin });
    } catch (error) {
        console.error('Error getting disposal bin:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /disposal/bins
 * Create a disposal bin
 */
router.post('/bins', async (req, res) => {
    try {
        const { warehouse_id, name, description, column_position, row_position, bin_position } = req.body;
        const bin = await getService(req).createDisposalBin(warehouse_id, {
            name, description, column_position, row_position, bin_position
        });
        res.status(201).json({ success: true, data: bin });
    } catch (error) {
        console.error('Error creating disposal bin:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * GET /disposal/pending
 * Get items pending disposal
 */
router.get('/pending', async (req, res) => {
    try {
        const items = await getService(req).getPendingDisposal(req.query.warehouse_id);
        res.json({ success: true, data: items, count: items.length });
    } catch (error) {
        console.error('Error getting pending disposal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /disposal/move
 * Move items to disposal bin
 */
router.post('/move', async (req, res) => {
    try {
        const { serial_numbers, bin_id, reason } = req.body;
        const userId = req.user?.id || 1;

        if (!serial_numbers || !Array.isArray(serial_numbers) || serial_numbers.length === 0) {
            return res.status(400).json({ success: false, error: 'serial_numbers array required' });
        }
        if (!bin_id) {
            return res.status(400).json({ success: false, error: 'bin_id required' });
        }

        const result = await getService(req).moveToDisposal(serial_numbers, bin_id, reason, userId);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error moving to disposal:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /disposal/complete
 * Permanently dispose items
 */
router.post('/complete', async (req, res) => {
    try {
        const { serial_numbers, disposal_method, notes } = req.body;
        const userId = req.user?.id || 1;

        if (!serial_numbers || !Array.isArray(serial_numbers) || serial_numbers.length === 0) {
            return res.status(400).json({ success: false, error: 'serial_numbers array required' });
        }

        const result = await getService(req).permanentlyDispose(
            serial_numbers, userId, disposal_method, notes
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error completing disposal:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * GET /disposal/history
 * Get disposal history
 */
router.get('/history', async (req, res) => {
    try {
        const filters = {
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            limit: req.query.limit ? parseInt(req.query.limit) : 100
        };
        const history = await getService(req).getDisposalHistory(filters);
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Error getting disposal history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
