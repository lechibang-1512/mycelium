const express = require('express');
const router = express.Router();
const SanitizationService = require('../services/SanitizationService');
const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;


module.exports = () => {
    const InvoiceReceivingService = require('../services/InvoiceReceivingService');
    const invoiceReceivingService = new InvoiceReceivingService();

    /**
     * @route GET /api/receiving/invoices
     * @desc Get pending invoices ready for receiving
     */
    router.get('/invoices', async (req, res) => {
        try {
            const { supplier_id, status, limit } = req.query;
            const filters = {
                supplierId: supplier_id,
                status: status || 'draft',
                limit: limit ? parseInt(limit) : 50
            };

            const invoices = await invoiceReceivingService.getPendingInvoices(filters);

            const responseData = convertBigIntToNumber(invoices);

            res.json({
                success: true,
                data: responseData
            });
        } catch (error) {
            console.error('Error fetching pending invoices:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch pending invoices',
                details: error.message
            });
        }
    });

    /**
     * @route GET /api/receiving/invoices/:uuid/manifest
     * @desc Get detailed receiving manifest for a specific invoice
     */
    router.get('/invoices/:uuid/manifest', async (req, res) => {
        try {
            const { uuid } = req.params;
            const result = await invoiceReceivingService.getReceivingManifest(uuid);

            if (result.data) {
                result.data = convertBigIntToNumber(result.data);
            }

            res.json(result);
        } catch (error) {
            console.error('Error fetching receiving manifest:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch receiving manifest',
                details: error.message
            });
        }
    });

    /**
     * @route POST /api/receiving/invoices/:uuid/receive
     * @desc Receive stock against an invoice
     */
    router.post('/invoices/:uuid/receive', async (req, res) => {
        try {
            const { uuid } = req.params;
            const receivingData = req.body;

            console.log('=== RECEIVE STOCK REQUEST ===');
            console.log('Invoice UUID:', uuid);
            console.log('Request body:', JSON.stringify(receivingData, null, 2));

            // Validate required fields
            const { warehouseId, items } = receivingData;
            if (!warehouseId) {
                return res.status(400).json({
                    success: false,
                    error: 'Warehouse ID is required'
                });
            }

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'At least one item is required'
                });
            }

            // Add user ID from session (fallback to system user)
            receivingData.userId = req.user?.id || 1;

            const result = await invoiceReceivingService.receiveStockFromInvoice(uuid, receivingData);

            if (result.data) {
                result.data = convertBigIntToNumber(result.data);
            }

            res.json(result);
        } catch (error) {
            console.error('Error receiving stock:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to receive stock',
                details: error.message
            });
        }
    });

    /**
     * @route GET /api/receiving/invoices/:uuid/history
     * @desc Get receiving history for an invoice
     */
    router.get('/invoices/:uuid/history', async (req, res) => {
        try {
            const { uuid } = req.params;
            const result = await invoiceReceivingService.getReceivingHistory(uuid);

            if (result.data) {
                result.data = convertBigIntToNumber(result.data);
            }

            res.json(result);
        } catch (error) {
            console.error('Error fetching receiving history:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch receiving history',
                details: error.message
            });
        }
    });

    /**
     * @route POST /api/receiving/invoices/:uuid/mark-serial-received
     * @desc Mark specific serial numbers as received
     */
    router.post('/invoices/:uuid/mark-serial-received', async (req, res) => {
        try {
            const { uuid } = req.params;
            const { serialNumbers, userId, notes } = req.body;

            if (!serialNumbers || !Array.isArray(serialNumbers)) {
                return res.status(400).json({
                    success: false,
                    error: 'Serial numbers array is required'
                });
            }

            // This would be a simplified endpoint for just marking serials as received
            // without creating full inventory records - useful for partial receiving workflows

            res.json({
                success: true,
                message: 'Serial receiving endpoint - implementation needed',
                uuid,
                serialNumbers
            });
        } catch (error) {
            console.error('Error marking serials as received:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to mark serials as received',
                details: error.message
            });
        }
    });

    /**
     * @route POST /api/receiving/invoices/:uuid/reset-item
     * @desc Reset receiving tracking for a specific invoice item (allows re-receiving)
     */
    router.post('/invoices/:uuid/reset-item', async (req, res) => {
        try {
            const { uuid } = req.params;
            const { itemId, productUuid } = req.body;

            if (!productUuid) {
                return res.status(400).json({
                    success: false,
                    error: 'productUuid is required'
                });
            }

            const result = await invoiceReceivingService.resetReceivingForItem(uuid, itemId, productUuid);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('Error resetting receiving:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to reset receiving',
                details: error.message
            });
        }
    });

    /**
     * @route GET /api/receiving/summary
     * @desc Get receiving summary statistics
     */
    router.get('/summary', async (req, res) => {
        try {
            // This could show dashboard-style metrics
            const result = {
                success: true,
                data: {
                    pendingInvoices: 0,
                    partiallyReceived: 0,
                    pendingSerials: 0,
                    recentActivity: []
                }
            };

            res.json(result);
        } catch (error) {
            console.error('Error fetching receiving summary:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch receiving summary',
                details: error.message
            });
        }
    });

    return router;
};