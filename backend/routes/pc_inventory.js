const express = require('express');
const router = express.Router();
const pcInventoryService = require('../services/PCInventoryService');
const asyncHandler = require('../utils/asyncHandler');
const { requirePermission } = require('../middleware/rbacMiddleware');

// Get all inventory
router.get('/', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    const items = await pcInventoryService.getAllStock();
    res.json(items);
}));

// Get stock for specific component
router.get('/:type/:id', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const stock = await pcInventoryService.getStock(type, id);
    res.json(stock);
}));

// Update stock
router.post('/update', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    const { type, id, quantity, warehouse_id, location } = req.body;
    await pcInventoryService.updateStock(type, id, quantity, warehouse_id, location);
    res.json({ message: 'Stock updated successfully' });
}));

module.exports = router;
