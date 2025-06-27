const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { requirePermission } = require('../middleware/rbacMiddleware');
const RecommendationService = require('../services/RecommendationService');
const SanitizationService = require('../services/SanitizationService');

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
    /**
     * @route GET /api/recommendations/reorder
     * @desc Get pending product recommendations
     */
    router.get('/reorder', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        const { urgency_level } = req.query;
        let list = RecommendationService.recommendations.filter(r => r.product_id && r.status === 'PENDING');
        
        if (urgency_level) {
            list = list.filter(r => r.urgency_level === urgency_level);
        }
        
        res.json({
            success: true,
            data: list.map(convertBigIntToNumber)
        });
    }));

    /**
     * @route GET /api/recommendations/summary
     * @desc Get product recommendations summary stats
     */
    router.get('/summary', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        const list = RecommendationService.recommendations.filter(r => r.product_id && r.status === 'PENDING');
        const criticalCount = list.filter(r => r.urgency_level === 'CRITICAL').length;
        const highPriorityCount = list.filter(r => r.urgency_level === 'HIGH').length;
        const reorderCount = list.length;
        
        res.json({
            success: true,
            data: {
                criticalCount,
                highPriorityCount,
                reorderCount,
                critical_count: criticalCount,
                high_priority_count: highPriorityCount,
                reorder_count: reorderCount
            }
        });
    }));

    /**
     * @route POST /api/recommendations/generate
     * @desc Run analysis and generate product recommendations
     */
    router.post('/generate', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
        await RecommendationService.generateRecommendations();
        const list = RecommendationService.recommendations.filter(r => r.product_id && r.status === 'PENDING');
        res.json({
            success: true,
            count: list.length
        });
    }));

    /**
     * @route PUT /api/recommendations/:id/status
     * @desc Update status of a product recommendation
     */
    router.put('/:id/status', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
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

    return router;
};
