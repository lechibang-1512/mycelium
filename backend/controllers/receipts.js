const express = require('express');
const router = express.Router();
const ReceiptsService = require('../services/ReceiptsService');
const { sendSuccess, sendError } = require('../utils/response');

module.exports = () => {

    // Get all receipts with items and product info
    router.get('/list', async (req, res) => {
        try {
            const receipts = await ReceiptsService.getReceiptsList(req.query);
            sendSuccess(res, receipts);
        } catch (error) {
            console.error('Receipts list error:', error);
            sendError(res, 'Failed to fetch receipts list');
        }
    });

    // Get Stock In (GRN) documents
    router.get('/stock-in', async (req, res) => {
        try {
            const grns = await ReceiptsService.getStockIn(req.query);
            sendSuccess(res, { grns, total: grns.length });
        } catch (error) {
            console.error('Stock In fetch error:', error);
            sendError(res, 'Failed to fetch Stock In documents');
        }
    });

    // Get Stock Out (GDN) documents
    router.get('/stock-out', async (req, res) => {
        try {
            const gdns = await ReceiptsService.getStockOut(req.query);
            sendSuccess(res, { gdns, total: gdns.length });
        } catch (error) {
            console.error('Stock Out fetch error:', error);
            sendError(res, 'Failed to fetch Stock Out documents');
        }
    });

    // Get phones/products for receipts form
    router.get('/phones', async (req, res) => {
        try {
            const phones = await ReceiptsService.getPhones();
            sendSuccess(res, phones);
        } catch (error) {
            console.error('Phones list error:', error);
            sendError(res, 'Failed to fetch phones');
        }
    });

    // Get receipt detail with items and product info
    router.get('/detail/:receipt_id', async (req, res) => {
        try {
            const result = await ReceiptsService.getReceiptDetail(req.params.receipt_id);
            if (!result) {
                return sendError(res, 'Receipt not found', 404);
            }
            sendSuccess(res, result);
        } catch (error) {
            console.error('Receipt detail error:', error);
            sendError(res, 'Failed to fetch receipt detail');
        }
    });

    // Get all receipts (with filters)
    router.get('/', async (req, res) => {
        try {
            const receipts = await ReceiptsService.getAllReceipts(req.query);
            sendSuccess(res, { receipts, total: receipts.length });
        } catch (error) {
            console.error('Receipts fetch error:', error);
            sendError(res, 'Failed to fetch receipts');
        }
    });

    // Get single receipt with full details
    router.get('/:id', async (req, res) => {
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
    });

    // Create receipt
    router.post('/', async (req, res) => {
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
    });

    // Delete receipt
    router.delete('/:id', async (req, res) => {
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
    });

    return router;
};
