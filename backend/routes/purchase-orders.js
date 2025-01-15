/**
 * Purchase Order Routes
 * CRUD, status management, XML export, and 3-way matching for purchase orders.
 */

const express = require('express');
const router = express.Router();
const { convertBigIntToNumber } = require('../services/SanitizationService');
const { requirePermission } = require('../middleware/rbacMiddleware');
const asyncHandler = require('../utils/asyncHandler');

module.exports = () => {
    const PurchaseOrderService = require('../services/PurchaseOrderService');
    const MatchingService = require('../services/MatchingService');
    const poService = new PurchaseOrderService();
    const matchingService = new MatchingService();

    // List purchase orders
    router.get('/', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        const orders = await poService.getPurchaseOrders(req.query);
        res.json({ success: true, data: orders.map(o => convertBigIntToNumber(o)) });
    }));

    // Get purchase order detail
    router.get('/:id', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        const order = await poService.getPurchaseOrderById(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: 'Purchase order not found' });
        res.json({ success: true, data: convertBigIntToNumber(order) });
    }));

    // Create purchase order
    router.post('/', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
        const result = await poService.createPurchaseOrder(req.body);
        res.status(201).json({ success: true, data: convertBigIntToNumber(result) });
    }));

    // Update status
    router.patch('/:id/status', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
        const { status } = req.body;
        const result = await poService.updatePurchaseOrderStatus(req.params.id, status);
        res.json({ success: true, ...result });
    }));

    // Delete (draft only)
    router.delete('/:id', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
        const result = await poService.deletePurchaseOrder(req.params.id);
        res.json({ success: true, ...result });
    }));

    // Export as XML
    router.get('/:id/export-xml', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        const xml = await poService.generatePoXml(req.params.id);
        const po = await poService.getPurchaseOrderById(req.params.id);
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="${po.po_number}.xml"`);
        res.send(xml);
    }));

    // 3-way matching status
    router.get('/:id/matching', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        const result = await matchingService.getMatchingStatus(req.params.id);
        res.json({ success: true, data: convertBigIntToNumber(result) });
    }));

    return router;
};
