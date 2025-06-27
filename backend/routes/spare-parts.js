const asyncHandler = require('../utils/asyncHandler');
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/rbacMiddleware');
const RecommendationService = require('../services/RecommendationService');
const { convertBigIntToNumber } = require('../services/SanitizationService');

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

  // ========================================================================
  // SPARE PARTS RECOMMENDATIONS (must come before /:id)
  // ========================================================================

  /**
   * GET /api/spare-parts/recommendations
   * Get pending spare parts recommendations
   */
  router.get('/recommendations', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    const { urgency_level } = req.query;
    let list = RecommendationService.recommendations.filter(r => r.spare_part_id && r.status === 'PENDING');
    if (urgency_level) {
      list = list.filter(r => r.urgency_level === urgency_level);
    }
    res.json({
      success: true,
      data: list.map(convertBigIntToNumber)
    });
  }));

  /**
   * GET /api/spare-parts/recommendations/summary
   * Get spare parts recommendations stats summary
   */
  router.get('/recommendations/summary', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    const list = RecommendationService.recommendations.filter(r => r.spare_part_id && r.status === 'PENDING');
    const criticalCount = list.filter(r => r.urgency_level === 'CRITICAL').length;
    const highCount = list.filter(r => r.urgency_level === 'HIGH').length;
    const pendingCount = list.length;
    
    res.json({
      success: true,
      data: {
        criticalCount,
        highCount,
        pendingCount,
        critical_count: criticalCount,
        high_count: highCount,
        pending_count: pendingCount
      }
    });
  }));

  /**
   * POST /api/spare-parts/recommendations/generate
   * Trigger generation of spare parts recommendations
   */
  router.post('/recommendations/generate', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    await RecommendationService.generateRecommendations();
    const list = RecommendationService.recommendations.filter(r => r.spare_part_id && r.status === 'PENDING');
    res.json({
      success: true,
      count: list.length
    });
  }));

  /**
   * PUT /api/spare-parts/recommendations/:id/status
   * Update status of a spare part recommendation
   */
  router.put('/recommendations/:id/status', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const rec = RecommendationService.recommendations.find(r => r.recommendation_id === id);
    if (!rec) {
      return res.status(404).json({ success: false, error: 'Recommendation not found' });
    }
    
    rec.status = status;
    res.json({
      success: true,
      message: `Status updated to ${status}`
    });
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
