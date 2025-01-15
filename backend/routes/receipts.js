const asyncHandler = require('../utils/asyncHandler');
const express = require('express');
const router = express.Router();
const ReceiptsService = require('../services/ReceiptsService');
const { sendSuccess, sendError } = require('../utils/response');

module.exports = () => {

    // Get all receipts (with filters)
    router.get('/', asyncHandler(async (req, res) => {
        try {
            const receipts = await ReceiptsService.getAllReceipts(req.query);
            sendSuccess(res, { receipts, total: receipts.length });
        } catch (error) {
            console.error('Receipts fetch error:', error);
            sendError(res, 'Failed to fetch receipts');
        }
    }));

    // Get single receipt with full details
    router.get('/:id', asyncHandler(async (req, res) => {
        try {
            const result = await ReceiptsService.getReceiptById(req.params.id);
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
    router.post('/', asyncHandler(async (req, res) => {
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
    router.delete('/:id', asyncHandler(async (req, res) => {
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
