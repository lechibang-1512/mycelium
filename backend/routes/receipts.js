const asyncHandler = require('../utils/asyncHandler');
const express = require('express');
const router = express.Router();
const ReceiptsService = require('../services/ReceiptsService');
const { sendSuccess, sendError } = require('../utils/response');
const { requirePermission } = require('../middleware/rbacMiddleware');

module.exports = () => {

    // Get all receipts (with filters)
    router.get('/', requirePermission('invoice:read'), asyncHandler(async (req, res) => {
        try {
            const receipts = await ReceiptsService.getReceiptsList(req.query);
            sendSuccess(res, { receipts, total: receipts.length });
        } catch (error) {
            console.error('Receipts fetch error:', error);
            sendError(res, 'Failed to fetch receipts');
        }
    }));

    // Get single receipt with full details
    router.get('/:id', requirePermission('invoice:read'), asyncHandler(async (req, res) => {
        try {
            const result = await ReceiptsService.getReceiptDetail(req.params.id);
            if (!result) {
                return sendError(res, 'Receipt not found', 404);
            }
            sendSuccess(res, result);
        } catch (error) {
            console.error('Receipt fetch error:', error);
            sendError(res, 'Failed to fetch receipt');
        }
    }));

    // Create receipt
    router.post('/', requirePermission('invoice:write'), asyncHandler(async (req, res) => {
        try {
            const result = await ReceiptsService.createReceipt(req.body);
            sendSuccess(res, { receipt_id: result.receipt_id }, 'Receipt created successfully');
        } catch (error) {
            console.error('Create receipt error:', error);
            if (error.message.includes('required') || error.message.includes('Invalid')) {
                return sendError(res, error.message, 400);
            }
            sendError(res, 'Failed to create receipt', 500, error.message);
        }
    }));

    // Delete receipt
    router.delete('/:id', requirePermission('invoice:delete'), asyncHandler(async (req, res) => {
        try {
            const result = await ReceiptsService.deleteReceipt(req.params.id);
            sendSuccess(res, result);
        } catch (error) {
            console.error('Delete receipt error:', error);
            if (error.message === 'Receipt not found') {
                return sendError(res, error.message, 404);
            }
            sendError(res, 'Failed to delete receipt', 500, error.message);
        }
    }));

    return router;
};
