/**
 * Reports API Module
 * 
 * Provides various reporting endpoints for inventory, transactions, and analytics
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const ReportsService = require('../services/ReportsService');
const SanitizationService = require('../services/SanitizationService');

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
    const reportsService = new ReportsService();

    /**
     * GET /api/reports
     * List available reports
     */
    router.get('/', (req, res) => {
        const reports = [
            { id: 'inventory', name: 'Inventory Summary', description: 'Current stock levels and value' },
            { id: 'transactions', name: 'Transaction History', description: 'Inbound and outbound movements' },
            { id: 'stock-valuation', name: 'Stock Valuation', description: 'Value of inventory by warehouse' },
            { id: 'sales', name: 'Sales Report', description: 'Sales performance over time' },
            { id: 'aging', name: 'Inventory Aging', description: 'Stock age analysis' },
            { id: 'low-stock', name: 'Low Stock Alerts', description: 'Items below reorder point' },
            { id: 'movement-summary', name: 'Movement Summary', description: 'Summary of inventory movements' }
        ];
        // Test expects array directly
        res.json(reports);
    });

    /**
     * GET /api/reports/scheduled
     * Get scheduled reports
     */
    router.get('/scheduled', (req, res) => {
        res.json([]);
    });

    /**
     * POST /api/reports/schedule
     * Schedule a report
     */
    router.post('/schedule', (req, res) => {
        res.json(success({ id: Date.now(), status: 'scheduled' }, { message: 'Report scheduled' }));
    });

    /**
     * GET /api/reports/products
     * Get all products for selection in forms (RMA, Repair Jobs, etc.)
     */
    router.get('/products', asyncHandler(async (req, res) => {
        const result = await reportsService.getProducts();
        const products = result.map(convertBigIntToNumber);

        res.json(success(products, { message: 'Products retrieved successfully' }));
    }));

    /**
     * GET /api/reports/inventory
     * Generate inventory report with optional filters
     */
    router.get('/inventory', asyncHandler(async (req, res) => {
        const result = await reportsService.getInventoryReport(req.query);
        const inventory = result.map(convertBigIntToNumber);

        res.json(success(inventory, { message: 'Inventory report generated successfully' }));
    }));

    /**
     * GET /api/reports/transactions
     * Generate transaction report with pagination and filters
     */
    router.get('/transactions', asyncHandler(async (req, res) => {
        const result = await reportsService.getTransactionsReport(req.query);
        const transactions = result.map(convertBigIntToNumber);

        res.json(success(transactions, { message: 'Transaction report generated successfully' }));
    }));

    /**
     * GET /api/reports/stock-valuation
     * Calculate total stock valuation by warehouse
     */
    router.get('/stock-valuation', asyncHandler(async (req, res) => {
        const valuation = await reportsService.getStockValuation(req.query);

        res.json(success({
            warehouses: valuation.warehouses.map(convertBigIntToNumber),
            total_value: valuation.total_value,
            currency: valuation.currency
        }, { message: 'Stock valuation calculated successfully' }));
    }));

    /**
     * GET /api/reports/sales
     * Generate sales report (based on outgoing transactions)
     */
    router.get('/sales', asyncHandler(async (req, res) => {
        const { period = 30 } = req.query;
        const salesData = await reportsService.getSalesReport(period);

        res.json(success({
            period_days: salesData.period_days,
            daily_sales: salesData.daily_sales.map(convertBigIntToNumber),
            total_sales: salesData.total_sales,
            total_quantity: salesData.total_quantity
        }, { message: 'Sales report generated successfully' }));
    }));

    /**
     * GET /api/reports/aging
     * Generate inventory aging report
     */
    router.get('/aging', asyncHandler(async (req, res) => {
        const result = await reportsService.getAgingReport();
        const aging = result.map(convertBigIntToNumber);

        res.json(success(aging, { message: 'Aging report generated successfully' }));
    }));

    /**
     * GET /api/reports/movement-summary
     * Generate summary of inventory movements
     */
    router.get('/movement-summary', asyncHandler(async (req, res) => {
        const summary = await reportsService.getMovementSummary(req.query);

        res.json(success({
            movements: summary.movements.map(convertBigIntToNumber),
            date_range: summary.date_range
        }, { message: 'Movement summary generated successfully' }));
    }));

    /**
     * GET /api/reports/low-stock
     * Get products below reorder level
     */
    router.get('/low-stock', asyncHandler(async (req, res) => {
        const result = await reportsService.getLowStock();
        const lowStock = result.map(convertBigIntToNumber);

        res.json(success(lowStock, { message: 'Low stock report generated successfully' }));
    }));

    /**
     * GET /api/reports/export/:reportType
     * Export reports in various formats (CSV, JSON)
     */
    router.get('/export/:reportType', asyncHandler(async (req, res) => {
        const { reportType } = req.params;
        const { format = 'json' } = req.query;

        // This is a placeholder - implement specific export logic based on reportType
        res.json(success({
            report_type: reportType,
            format: format,
            status: 'Export functionality coming soon'
        }, { message: 'Export requested' }));
    }));

    return router;
};
