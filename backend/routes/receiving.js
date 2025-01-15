const express = require('express');
const router = express.Router();
const multer = require('multer');
const { convertBigIntToNumber } = require('../services/SanitizationService');
const { requirePermission } = require('../middleware/rbacMiddleware');
const asyncHandler = require('../utils/asyncHandler');

// Multer configured for in-memory XML file uploads (max 5MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/xml' || file.mimetype === 'text/xml' || file.originalname.endsWith('.xml')) {
            cb(null, true);
        } else {
            cb(new Error('Only XML files are allowed'));
        }
    }
});


module.exports = () => {
    const InvoiceReceivingService = require('../services/InvoiceReceivingService');
    const invoiceReceivingService = new InvoiceReceivingService();
    const XmlIngestionService = require('../services/XmlIngestionService');
    const xmlIngestionService = new XmlIngestionService();
    const AsnService = require('../services/AsnService');
    const asnService = new AsnService();

    /**
     * @route POST /api/receiving/invoices/upload-xml
     * @desc Ingest an XML invoice from a VAN or manual file upload.
     *       Supports two modes:
     *       1. File upload (multipart/form-data): send .xml file in 'xmlFile' field
     *       2. Raw XML body (application/xml or text/xml): send XML string as request body
     */
    router.post('/invoices/upload-xml', requirePermission('inventory:write'), upload.single('xmlFile'), asyncHandler(async (req, res) => {
        let xmlString;

        if (req.file) {
            // Mode 1: File uploaded via multipart/form-data
            xmlString = req.file.buffer.toString('utf-8');
        } else if (typeof req.body === 'string' && req.body.trim().startsWith('<')) {
            // Mode 2: Raw XML body (text/xml or application/xml)
            xmlString = req.body;
        } else {
            return res.status(400).json({
                success: false,
                error: 'No XML content provided. Upload an .xml file or send raw XML in the request body.'
            });
        }

        const result = await xmlIngestionService.ingestXmlInvoice(xmlString);
        res.json(convertBigIntToNumber(result));
    }));

    /**
     * @route GET /api/receiving/invoices
     * @desc Get pending invoices ready for receiving
     */
    router.get('/invoices', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
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
    }));

    /**
     * @route GET /api/receiving/invoices/:uuid/manifest
     * @desc Get detailed receiving manifest for a specific invoice
     */
    router.get('/invoices/:uuid/manifest', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
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
    }));

    /**
     * @route POST /api/receiving/invoices/:uuid/receive
     * @desc Receive stock against an invoice
     */
    router.post('/invoices/:uuid/receive', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
        try {
            const { uuid } = req.params;
            const receivingData = req.body;

            console.info('=== RECEIVE STOCK REQUEST ===');
            console.info('Invoice UUID:', uuid);
            console.info('Request body:', JSON.stringify(receivingData, null, 2));

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
    }));


    /**
     * @route POST /api/receiving/invoices/:uuid/reset-item
     * @desc Reset receiving tracking for a specific invoice item (allows re-receiving)
     */
    router.post('/invoices/:uuid/reset-item', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
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
    }));

    // =========================================================================
    // ASN (Advance Shipping Notice) Routes
    // =========================================================================

    /**
     * @route POST /api/receiving/asn/upload-xml
     * @desc Ingest an ASN XML from a VAN or manual file upload
     */
    router.post('/asn/upload-xml', requirePermission('inventory:write'), upload.single('xmlFile'), asyncHandler(async (req, res) => {
        let xmlString;

        if (req.file) {
            xmlString = req.file.buffer.toString('utf-8');
        } else if (typeof req.body === 'string' && req.body.trim().startsWith('<')) {
            xmlString = req.body;
        } else {
            return res.status(400).json({
                success: false,
                error: 'No XML content provided. Upload an .xml file or send raw XML in the request body.'
            });
        }

        const result = await asnService.ingestAsnXml(xmlString);
        res.json(convertBigIntToNumber(result));
    }));

    /**
     * @route GET /api/receiving/asn
     * @desc List ASNs (optionally filter by status, po_id, search)
     */
    router.get('/asn', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        const asns = await asnService.getAdvanceShippingNotices(req.query);
        res.json({ success: true, data: asns.map(a => convertBigIntToNumber(a)) });
    }));

    /**
     * @route GET /api/receiving/asn/:id
     * @desc Get ASN detail with items (serial numbers, batch numbers, receive status)
     */
    router.get('/asn/:id', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
        const asn = await asnService.getAsnById(req.params.id);
        if (!asn) return res.status(404).json({ success: false, error: 'ASN not found' });
        res.json({ success: true, data: convertBigIntToNumber(asn) });
    }));

    /**
     * @route POST /api/receiving/asn/:id/receive
     * @desc Receive items against an ASN (scan serials, verify quantities)
     */
    router.post('/asn/:id/receive', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
        const userId = req.user?.id || 1;
        const result = await asnService.receiveAsnItems(req.params.id, req.body, userId);
        res.json(convertBigIntToNumber(result));
    }));

    return router;
};