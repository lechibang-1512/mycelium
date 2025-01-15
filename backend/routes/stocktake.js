const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const StocktakeService = require('../services/StocktakeService');
const { requirePermission } = require('../middleware/rbacMiddleware');

module.exports = (_pool) => {
  const router = express.Router();

  const parseIdParam = (value, _paramName = 'ID') => {
    const parsed = parseInt(value);
    if (isNaN(parsed) || parsed <= 0) return null;
    return parsed;
  };

  // ============================================
  // LOCKDOWN STATUS ENDPOINT
  // ============================================

  router.get('/lockdown-status', requirePermission('stocktake:read'), asyncHandler(async (req, res) => {
    // Check for active full stocktakes
    const activeStocktakes = await StocktakeService.listStocktakes({
      status: 'IN_PROGRESS',
      count_type: 'full',
      limit: 1
    });
    const activeStocktake = activeStocktakes[0] || null;

    res.json({
      success: true,
      isLocked: !!activeStocktake,
      activeStocktake
    });
  }));

  // ============================================
  // ACCURACY AND DUE ITEMS ENDPOINTS
  // ============================================

  router.get('/accuracy', requirePermission('stocktake:read'), asyncHandler(async (req, res) => {
    // Calculate accuracy from recent stocktakes
    const stats = await StocktakeService.getAccuracyStats();
    res.json({ success: true, data: stats });
  }));

  router.get('/due-items', requirePermission('stocktake:read'), asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const warehouseId = req.query.warehouse_id || null;

    const items = await StocktakeService.getDueItems({
      warehouse_id: warehouseId,
      limit
    });

    res.json({ success: true, data: items, count: items.length });
  }));

  router.get('/products', requirePermission('stocktake:read'), asyncHandler(async (req, res) => {
    const { warehouse_id, search } = req.query;
    if (!warehouse_id) {
      return res.status(400).json({ error: 'warehouse_id is required' });
    }

    const products = await StocktakeService.getWarehouseProducts({
      warehouse_id,
      search
    });

    res.json({ success: true, data: products, count: products.length });
  }));

  // ============================================
  // CYCLE COUNT
  // ============================================

  router.post('/cycle', requirePermission('stocktake:write'), asyncHandler(async (req, res) => {
    const { warehouse_id, limit, notes } = req.body;
    if (!warehouse_id) {
      return res.status(400).json({ error: 'warehouse_id is required' });
    }

    const stocktake = await StocktakeService.createCycleCount({
      warehouse_id,
      limit: parseInt(limit) || 50,
      notes,
      initiated_by: 1
    });

    res.status(201).json({
      success: true,
      message: `Cycle count created with ${stocktake.items?.length || 0} items`,
      data: stocktake
    });
  }));

  // ============================================
  // STOCKTAKE CRUD ENDPOINTS
  // ============================================

  router.post('/', requirePermission('stocktake:write'), asyncHandler(async (req, res) => {
    const { warehouse_id, notes, items, count_type } = req.body;
    if (!warehouse_id) {
      return res.status(400).json({ error: 'warehouse_id is required' });
    }

    const stocktake = await StocktakeService.createStocktake({
      warehouse_id,
      initiated_by: 1,
      notes,
      count_type: count_type || 'full',
      items: items || []
    });

    res.status(201).json({
      success: true,
      message: `Stocktake created successfully with ${stocktake.items?.length || 0} items`,
      data: stocktake
    });
  }));

  router.get('/', requirePermission('stocktake:read'), asyncHandler(async (req, res) => {
    const { warehouse_id, status, limit } = req.query;
    const stocktakes = await StocktakeService.listStocktakes({
      warehouse_id,
      status,
      limit: limit || 100
    });

    res.json({ success: true, data: stocktakes, count: stocktakes.length });
  }));

  router.get('/:id', requirePermission('stocktake:read'), asyncHandler(async (req, res) => {
    const stocktake_id = parseIdParam(req.params.id, 'stocktake_id');
    if (!stocktake_id) {
      return res.status(400).json({ success: false, error: 'Invalid stocktake ID' });
    }

    const stocktake = await StocktakeService.getStocktakeById(stocktake_id);
    res.json({ success: true, data: stocktake });
  }));

  router.put('/:id', requirePermission('stocktake:write'), asyncHandler(async (req, res) => {
    const stocktake_id = parseIdParam(req.params.id, 'stocktake_id');
    if (!stocktake_id) {
      return res.status(400).json({ success: false, error: 'Invalid stocktake ID' });
    }

    const { notes, warehouse_id, count_type } = req.body;
    const current = await StocktakeService.getStocktakeById(stocktake_id);
    if (!current) {
      return res.status(404).json({ error: 'Stocktake not found' });
    }

    const isMetadataChange = (warehouse_id && String(warehouse_id) !== String(current.warehouse_id)) ||
      (count_type && count_type !== current.count_type);

    if (isMetadataChange && current.status !== 'PLANNED') {
      return res.status(400).json({ error: 'Cannot change warehouse or type unless stocktake is PLANNED' });
    }

    await StocktakeService.updateStocktake(stocktake_id, { notes, warehouse_id, count_type });
    const updatedStocktake = await StocktakeService.getStocktakeById(stocktake_id);

    res.json({ success: true, message: 'Stocktake updated successfully', data: updatedStocktake });
  }));

  router.delete('/:id', requirePermission('stocktake:delete'), asyncHandler(async (req, res) => {
    const stocktake_id = parseIdParam(req.params.id, 'stocktake_id');
    if (!stocktake_id) {
      return res.status(400).json({ success: false, error: 'Invalid stocktake ID' });
    }

    const deleted = await StocktakeService.deleteStocktake(stocktake_id);
    if (!deleted) {
      return res.status(404).json({ error: 'Stocktake not found' });
    }

    res.json({ success: true, message: 'Stocktake deleted successfully' });
  }));

  // ============================================
  // STATUS ENDPOINTS
  // ============================================

  router.put('/:id/start', requirePermission('stocktake:write'), asyncHandler(async (req, res) => {
    const stocktake_id = parseIdParam(req.params.id, 'stocktake_id');
    if (!stocktake_id) {
      return res.status(400).json({ success: false, error: 'Invalid stocktake ID' });
    }

    const stocktake = await StocktakeService.updateStatus(stocktake_id, 'IN_PROGRESS', 1, 'Stocktake started');
    res.json({ success: true, message: 'Stocktake started', data: stocktake });
  }));

  router.put('/:id/complete', requirePermission('stocktake:write'), asyncHandler(async (req, res) => {
    const stocktake_id = parseIdParam(req.params.id, 'stocktake_id');
    if (!stocktake_id) {
      return res.status(400).json({ success: false, error: 'Invalid stocktake ID' });
    }

    const stocktake = await StocktakeService.updateStatus(stocktake_id, 'COMPLETED', 1, 'Stocktake completed');
    res.json({ success: true, message: 'Stocktake completed', data: stocktake });
  }));

  router.put('/:id/approve', requirePermission('stocktake:write'), asyncHandler(async (req, res) => {
    const stocktake_id = parseIdParam(req.params.id, 'stocktake_id');
    if (!stocktake_id) {
      return res.status(400).json({ success: false, error: 'Invalid stocktake ID' });
    }

    const stocktake = await StocktakeService.updateStatus(stocktake_id, 'APPROVED', 1, 'Stocktake approved');
    res.json({ success: true, message: 'Stocktake approved', data: stocktake });
  }));

  router.put('/:id/cancel', requirePermission('stocktake:write'), asyncHandler(async (req, res) => {
    const stocktake_id = parseIdParam(req.params.id, 'stocktake_id');
    if (!stocktake_id) {
      return res.status(400).json({ success: false, error: 'Invalid stocktake ID' });
    }
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    const stocktake = await StocktakeService.updateStatus(stocktake_id, 'CANCELLED', 1, reason);
    res.json({ success: true, message: 'Stocktake cancelled', data: stocktake });
  }));

  // ============================================
  // ITEM ENDPOINTS
  // ============================================

  router.post('/:id/items', requirePermission('stocktake:write'), asyncHandler(async (req, res) => {
    const stocktake_id = parseIdParam(req.params.id, 'stocktake_id');
    if (!stocktake_id) {
      return res.status(400).json({ success: false, error: 'Invalid stocktake ID' });
    }
    const { product_id, bin_location, system_quantity, counted_quantity, notes } = req.body;
    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    const item = await StocktakeService.addItem(stocktake_id, {
      product_id,
      bin_location,
      system_quantity,
      counted_quantity,
      notes
    });

    res.status(201).json({ success: true, message: 'Item added successfully', data: item });
  }));

  router.put('/items/:item_id', requirePermission('stocktake:write'), asyncHandler(async (req, res) => {
    const item_id = parseIdParam(req.params.item_id, 'item_id');
    if (!item_id) {
      return res.status(400).json({ success: false, error: 'Invalid item ID' });
    }
    const { counted_quantity, notes } = req.body;
    if (counted_quantity === undefined || counted_quantity === null) {
      return res.status(400).json({ error: 'counted_quantity is required' });
    }

    const item = await StocktakeService.updateItem(item_id, {
      counted_quantity: parseInt(counted_quantity),
      counted_by: 1,
      notes
    });

    res.json({ success: true, message: 'Item count recorded', data: item });
  }));

  router.put('/items/:item_id/count', requirePermission('stocktake:write'), asyncHandler(async (req, res) => {
    const item_id = parseIdParam(req.params.item_id, 'item_id');
    if (!item_id) {
      return res.status(400).json({ success: false, error: 'Invalid item ID' });
    }
    const { counted_quantity, notes } = req.body;
    if (counted_quantity === undefined || counted_quantity === null) {
      return res.status(400).json({ error: 'counted_quantity is required' });
    }

    const item = await StocktakeService.updateItem(item_id, {
      counted_quantity: parseInt(counted_quantity),
      counted_by: 1,
      notes
    });

    res.json({ success: true, message: 'Item count recorded', data: item });
  }));

  router.delete('/items/:item_id', requirePermission('stocktake:delete'), asyncHandler(async (req, res) => {
    const item_id = parseIdParam(req.params.item_id, 'item_id');
    if (!item_id) {
      return res.status(400).json({ success: false, error: 'Invalid item ID' });
    }

    const deleted = await StocktakeService.deleteItem(item_id);
    if (!deleted) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ success: true, message: 'Item deleted successfully' });
  }));

  router.get('/:id/stats', requirePermission('stocktake:read'), asyncHandler(async (req, res) => {
    const stocktake_id = parseIdParam(req.params.id, 'stocktake_id');
    if (!stocktake_id) {
      return res.status(400).json({ success: false, error: 'Invalid stocktake ID' });
    }

    const stats = await StocktakeService.getStats(stocktake_id);
    res.json({ success: true, data: stats });
  }));

  return router;
};
