const express = require('express');
const router = express.Router();
const pcComponentService = require('../services/PCComponentService');
const asyncHandler = require('../utils/asyncHandler');
const { requirePermission } = require('../middleware/rbacMiddleware');

// Valid types list
const VALID_TYPES = pcComponentService.getValidTypes();

// Middleware to validate :type parameter
const validateType = (req, res, next) => {
    const { type } = req.params;
    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({
            error: `Invalid component type: '${type}'`,
            validTypes: VALID_TYPES
        });
    }
    next();
};

// Get valid component types
router.get('/types', requirePermission('inventory:read'), (req, res) => {
    res.json(VALID_TYPES);
});

// Get table schema/columns for a type
router.get('/:type/schema', validateType, requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    const { type } = req.params;
    const columns = await pcComponentService.getSchema(type);
    res.json(columns);
}));

// List all
router.get('/:type', validateType, requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    const { type } = req.params;
    const items = await pcComponentService.getAll(type);
    res.json(items);
}));

// Get by ID
router.get('/:type/:id', validateType, requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const item = await pcComponentService.getById(type, id);
    if (!item) {
        return res.status(404).json({ error: 'Component not found' });
    }
    res.json(item);
}));

// Create
router.post('/:type', validateType, requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    const { type } = req.params;
    const newItem = await pcComponentService.create(type, req.body);
    res.status(201).json(newItem);
}));

// Update
router.put('/:type/:id', validateType, requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const updatedItem = await pcComponentService.update(type, id, req.body);
    if (!updatedItem) {
        return res.status(404).json({ error: 'Component not found' });
    }
    res.json(updatedItem);
}));

// Delete
router.delete('/:type/:id', validateType, requirePermission('inventory:delete'), asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    await pcComponentService.delete(type, id);
    res.json({ message: 'Component deleted successfully' });
}));

module.exports = router;
