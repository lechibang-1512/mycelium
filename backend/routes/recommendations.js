const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const RecommendationService = require('../services/RecommendationService');

module.exports = () => {
  const router = express.Router();

  /**
   * @route   POST /api/recommendations/generate
   * @desc    Generate reorder recommendations
   */
  router.post('/generate', asyncHandler(async (req, res) => {
    const { warehouse_id, product_id, recalculate_usage } = req.body;
    const options = { warehouse_id, product_id, recalculate_usage: recalculate_usage === true };
    const recommendations = await RecommendationService.generateRecommendations(options);
    res.json({ success: true, message: `Generated ${recommendations.length} recommendations`, data: recommendations, count: recommendations.length });
  }));

  /**
   * @route   GET /api/recommendations
   * @desc    Get pending recommendations
   */
  router.get('/', asyncHandler(async (req, res) => {
    const filters = { warehouse_id: req.query.warehouse_id, urgency_level: req.query.urgency_level, limit: req.query.limit || 100 };
    const recommendations = await RecommendationService.getPendingRecommendations(filters);
    res.json({ success: true, data: recommendations, count: recommendations.length });
  }));

  /**
   * @route   GET /api/recommendations/stats
   * @desc    Get recommendation statistics
   */
  router.get('/stats', asyncHandler(async (req, res) => {
    const filters = { warehouse_id: req.query.warehouse_id, status: req.query.status };
    const stats = await RecommendationService.getRecommendationStats(filters);
    res.json({ success: true, data: stats });
  }));

  /**
   * @route   PUT /api/recommendations/:id/status
   * @desc    Update recommendation status
   */
  router.put('/:id/status', asyncHandler(async (req, res) => {
    const recommendation_id = parseInt(req.params.id);
    const { status } = req.body;
    const user_id = req.user?.id || 1;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    try {
      const recommendation = await RecommendationService.updateRecommendationStatus(recommendation_id, status, user_id);
      res.json({ success: true, message: 'Recommendation status updated', data: recommendation });
    } catch (error) {
      if (error.message === 'Invalid status') return res.status(400).json({ error: error.message });
      throw error;
    }
  }));

  /**
   * @route   POST /api/recommendations/calculate-usage/:product_id
   * @desc    Calculate average daily usage for a product
   */
  router.post('/calculate-usage/:product_id', asyncHandler(async (req, res) => {
    const product_id = req.params.product_id;
    const { warehouse_id, days } = req.body;
    const avgUsage = await RecommendationService.calculateAverageDailyUsage(product_id, warehouse_id, days || 30);
    res.json({ success: true, data: { product_id, warehouse_id, avg_daily_usage: avgUsage, period_days: days || 30 } });
  }));

  /**
   * @route   GET /api/recommendations/reorder
   * @desc    Get products that need reordering
   */
  router.get('/reorder', asyncHandler(async (req, res) => {
    const filters = { warehouse_id: req.query.warehouse_id, urgency_level: req.query.urgency_level, threshold: req.query.threshold, limit: req.query.limit || 100 };
    const recommendations = await RecommendationService.getPendingRecommendations(filters);
    res.json({ success: true, data: recommendations, count: recommendations.length });
  }));

  /**
   * @route   GET /api/recommendations/overstocked
   * @desc    Get overstocked products
   */
  router.get('/overstocked', asyncHandler(async (req, res) => {
    const filters = { warehouse_id: req.query.warehouse_id, limit: req.query.limit || 100 };
    const products = await RecommendationService.getOverstockedProducts(filters);
    res.json({ success: true, data: products, count: products.length });
  }));

  /**
   * @route   GET /api/recommendations/slow-moving
   * @desc    Get slow-moving products
   */
  router.get('/slow-moving', asyncHandler(async (req, res) => {
    const filters = { warehouse_id: req.query.warehouse_id, days: parseInt(req.query.days) || 90, limit: req.query.limit || 100 };
    const products = await RecommendationService.getSlowMovingProducts(filters);
    res.json({ success: true, data: products, count: products.length });
  }));

  /**
   * @route   GET /api/recommendations/optimal-stock
   * @desc    Get optimal stock level recommendations
   */
  router.get('/optimal-stock', asyncHandler(async (req, res) => {
    const filters = { warehouse_id: req.query.warehouse_id, product_id: req.query.product_id, limit: req.query.limit || 100 };
    const recommendations = await RecommendationService.getOptimalStockLevels(filters);
    res.json({ success: true, data: recommendations, count: recommendations.length });
  }));

  /**
   * @route   GET /api/recommendations/transfer-suggestions
   * @desc    Get inter-warehouse transfer suggestions
   */
  router.get('/transfer-suggestions', asyncHandler(async (req, res) => {
    const filters = { from_warehouse_id: req.query.from_warehouse_id, to_warehouse_id: req.query.to_warehouse_id, limit: req.query.limit || 50 };
    const suggestions = await RecommendationService.getTransferSuggestions(filters);
    res.json({ success: true, data: suggestions, count: suggestions.length });
  }));

  /**
   * @route   GET /api/recommendations/summary
   * @desc    Get recommendations summary for dashboard
   */
  router.get('/summary', asyncHandler(async (req, res) => {
    const filters = { warehouse_id: req.query.warehouse_id };
    const summary = await RecommendationService.getRecommendationSummary(filters);
    res.json({ success: true, data: summary });
  }));

  return router;
};
