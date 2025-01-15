const asyncHandler = require('../utils/asyncHandler');
const express = require('express');
const router = express.Router();
const InventoryService = require('../services/InventoryService');
const { requirePermission } = require('../middleware/rbacMiddleware');

const SanitizationService = require('../services/SanitizationService');
const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
    const inventoryService = new InventoryService();

    // Get all inventory with optional filters
    router.get('/', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        // AUTHENTICATION INTENTIONALLY DISABLED - Internal tool with direct DB access
        // Note: This API is designed for internal use only. Ensure network-level security.

        try {
            const products = await inventoryService.getAllInventory(req.query);
            res.json(products.map(p => convertBigIntToNumber(p)));
        } catch (error) {
            console.error('Inventory fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch inventory' });
        }
    }));

    // Get single product by product_id (for specs_db compatibility)
    router.get('/product/:id', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        // AUTHENTICATION INTENTIONALLY DISABLED - Internal tool with direct DB access
        // Note: This API is designed for internal use only. Ensure network-level security.

        try {
            const product = await inventoryService.getProductById(req.params.id);

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json(convertBigIntToNumber(product));
        } catch (error) {
            console.error('Product fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch product' });
        }
    }));

    // Get product inventory logs by product_id
    router.get('/product/:id/logs', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        // AUTHENTICATION INTENTIONALLY DISABLED - Internal tool with direct DB access
        // Note: This API is designed for internal use only. Ensure network-level security.

        try {
            const logs = await inventoryService.getProductLogs(req.params.id, 10);
            res.json(logs.map(l => convertBigIntToNumber(l)));
        } catch (error) {
            console.error('Product logs fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch product logs' });
        }
    }));

    // Get single product
    router.get('/:id', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        // AUTHENTICATION INTENTIONALLY DISABLED - Internal tool with direct DB access
        // Note: This API is designed for internal use only. Ensure network-level security.

        try {
            const product = await inventoryService.getProductById(req.params.id);

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json(convertBigIntToNumber(product));
        } catch (error) {
            console.error('Product fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch product' });
        }
    }));

    // Receive stock
    router.post('/receive', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
        // AUTHENTICATION INTENTIONALLY DISABLED - Internal tool with direct DB access
        // Note: This API is designed for internal use only. Ensure network-level security.

        try {
            const result = await inventoryService.receiveStock({ ...req.body, user_id: req.user?.id || null });
            res.json(result);
        } catch (error) {
            console.error('Receive stock error:', error);
            if (error.message.includes('Invalid input')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to receive stock' });
        }
    }));



    // Get stock history
    router.get('/:id/history', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        // AUTHENTICATION INTENTIONALLY DISABLED - Internal tool with direct DB access
        // Note: This API is designed for internal use only. Ensure network-level security.

        try {
            const transactions = await inventoryService.getTransactionHistory(req.params.id, { limit: 50 });
            res.json(transactions.map(t => convertBigIntToNumber(t)));
        } catch (error) {
            console.error('Transaction history error:', error);
            res.status(500).json({ error: 'Failed to fetch transaction history' });
        }
    }));

    // Get transaction logs with filters
    router.get('/logs', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        try {
            const logs = await inventoryService.getTransactionLogs(req.query);
            res.json(logs.map(l => convertBigIntToNumber(l)));
        } catch (error) {
            console.error('Transaction logs error:', error);
            res.status(500).json({ error: 'Failed to fetch transaction logs' });
        }
    }));

    // Get zone inventory status
    router.get('/status/zones', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        try {
            const status = await inventoryService.getZoneInventoryStatus();
            res.json(convertBigIntToNumber(status));
        } catch (error) {
            console.error('Zone status error:', error);
            res.status(500).json({ error: 'Failed to fetch zone status' });
        }
    }));

    // Get receipt details for printing
    router.get('/receipt/:receiptId', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        try {
            const receipt = await inventoryService.getReceiptDetails(req.params.receiptId);
            if (!receipt) {
                return res.status(404).json({ error: 'Receipt not found' });
            }
            res.json(convertBigIntToNumber(receipt));
        } catch (error) {
            console.error('Receipt details error:', error);
            res.status(500).json({ error: 'Failed to fetch receipt details' });
        }
    }));

    return router;
};
