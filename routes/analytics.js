const express = require('express');
const router = express.Router();
const { isAuthenticated, isStaffOrAdmin } = require('../middleware/auth');
const AnalyticsService = require('../services/AnalyticsService');

module.exports = (pool, suppliersPool, convertBigIntToNumber) => {
    
    const analyticsService = new AnalyticsService(pool, suppliersPool, convertBigIntToNumber);
    
    // Simple analytics dashboard
    router.get('/analytics', isAuthenticated, async (req, res) => {
        try {
            const period = parseInt(req.query.period) || 30; // Default to 30 days
            const hasFilters = req.query.period && req.query.period !== '30';
            
            // Get analytics data using the service
            const analyticsData = await analyticsService.getAnalyticsData(period);
            
            // Generate simple insights
            const insights = analyticsService.generateInsights(analyticsData);
            
            res.render('analytics', {
                ...analyticsData,
                insights,
                title: 'Analytics Dashboard',
                currentPage: 'analytics',
                filters: { period },
                showFilterNotification: hasFilters
            });
            
        } catch (err) {
            console.error('Analytics error:', err);
            res.status(500).render('error', {
                error: 'Failed to load analytics: ' + err.message,
                title: 'Analytics Error'
            });
        }
    });

    // API endpoint for real-time analytics data
    router.get('/api/analytics/realtime', isAuthenticated, async (req, res) => {
        try {
            const realTimeData = await analyticsService.getRealTimeData();
            res.json(realTimeData);
            
        } catch (err) {
            console.error('Real-time analytics error:', err);
            res.status(500).json({ error: 'Failed to load real-time data' });
        }
    });

    // API endpoint for analytics export (Staff+ only)
    router.get('/api/analytics/export', isStaffOrAdmin, async (req, res) => {
        try {
            const period = parseInt(req.query.period) || 30;
            const format = req.query.format || 'json';
            
            const exportData = await analyticsService.getExportData(period);
            
            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
                res.send(await analyticsService.convertToCSV(exportData));
            } else {
                res.json(exportData);
            }
            
        } catch (err) {
            console.error('Analytics export error:', err);
            res.status(500).json({ error: 'Failed to export analytics data' });
        }
    });

    // API endpoint for product performance analysis
    router.get('/api/analytics/product/:id', isAuthenticated, async (req, res) => {
        try {
            const productId = req.params.id;
            const period = parseInt(req.query.period) || 90;
            
            const productAnalytics = await analyticsService.getProductAnalytics(productId, period);
            res.json(productAnalytics);
            
        } catch (err) {
            console.error('Product analytics error:', err);
            res.status(500).json({ error: 'Failed to load product analytics' });
        }
    });

    // API endpoint for sales forecasting (Staff+ only)
    router.get('/api/analytics/forecast', isStaffOrAdmin, async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 30;
            if (days < 1 || days > 365) { // Enforce a maximum of 365 days
                return res.status(400).json({ error: "Invalid 'days' parameter. Must be between 1 and 365." });
            }
            const productId = req.query.productId || null;
            
            const forecast = await analyticsService.generateForecast(days, productId);
            res.json(forecast);
            
        } catch (err) {
            console.error('Forecast error:', err);
            res.status(500).json({ error: 'Failed to generate forecast' });
        }
    });

    return router;
};
