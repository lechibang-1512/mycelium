/**
 * Dashboard API Routes
 * Provides endpoints for dashboard KPIs, stock trends, warehouse utilization,
 * and service center summaries.
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const DashboardService = require('../services/DashboardService');
const SanitizationService = require('../services/SanitizationService');

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
    const dashboardService = new DashboardService();

    /**
     * GET /api/dashboard/kpis
     * Get key performance indicators
     */
    router.get('/kpis', asyncHandler(async (req, res) => {
        const kpis = await dashboardService.getKPIs();
        res.json(success(convertBigIntToNumber(kpis), { message: 'KPIs retrieved successfully' }));
    }));

    /**
     * GET /api/dashboard/stock-trend
     * Get stock movement trend over the last N days
     */
    router.get('/stock-trend', asyncHandler(async (req, res) => {
        const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
        const trend = await dashboardService.getStockTrend(days);
        res.json(success(trend.map(convertBigIntToNumber), { message: 'Stock trend retrieved successfully' }));
    }));

    /**
     * GET /api/dashboard/warehouse-util
     * Get warehouse utilization summary
     */
    router.get('/warehouse-util', asyncHandler(async (req, res) => {
        const utilization = await dashboardService.getWarehouseUtilization();
        res.json(success(utilization.map(convertBigIntToNumber), { message: 'Warehouse utilization retrieved successfully' }));
    }));

    /**
     * GET /api/dashboard/service-summary
     * Get service center summary (repairs + RMAs)
     */
    router.get('/service-summary', asyncHandler(async (req, res) => {
        const summary = await dashboardService.getServiceSummary();
        res.json(success({
            repairs: summary.repairs.map(convertBigIntToNumber),
            rmas: summary.rmas.map(convertBigIntToNumber)
        }, { message: 'Service summary retrieved successfully' }));
    }));

    return router;
};
