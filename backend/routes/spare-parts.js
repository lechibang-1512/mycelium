const asyncHandler = require('../utils/asyncHandler');
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/rbacMiddleware');

module.exports = () => {
  const SparePartsService = require('../services/SparePartsService');
  const service = new SparePartsService();

  // GET /api/spare-parts
  router.get('/', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    try {
      const parts = await service.getSpareParts(req.query);
      res.json(parts);
    } catch (err) {
      console.error('Error fetching spare parts:', err);
      res.status(500).json({ error: 'Failed to fetch spare parts' });
    }
  }));

  // POST /api/spare-parts
  router.post('/', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    try {
      const result = await service.createSparePart(req.body);
      res.status(201).json(result);
    } catch (err) {
      console.error('Error creating spare part:', err);
      res.status(500).json({ error: 'Failed to create spare part' });
    }
  }));

  // GET /api/spare-parts/:id
  router.get('/:id', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    try {
      const part = await service.getSparePartById(req.params.id);
      if (!part) return res.status(404).json({ error: 'Spare part not found' });
      res.json(part);
    } catch (err) {
      console.error('Error fetching spare part:', err);
      res.status(500).json({ error: 'Failed to fetch spare part' });
    }
  }));

  // PUT /api/spare-parts/:id
  router.put('/:id', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    try {
      const result = await service.updateSparePart(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      console.error('Error updating spare part:', err);
      res.status(500).json({ error: 'Failed to update spare part' });
    }
  }));

  // DELETE /api/spare-parts/:id
  router.delete('/:id', requirePermission('inventory:delete'), asyncHandler(async (req, res) => {
    try {
      const result = await service.deleteSparePart(req.params.id);
      if (result.error) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      console.error('Error deleting spare part:', err);
      res.status(500).json({ error: 'Failed to delete spare part' });
    }
  }));

  return router;
};
