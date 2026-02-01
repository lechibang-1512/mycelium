/**
 * Customer Invoice Routes
 * API endpoints for retail customer invoices with IMEI linking
 */

const express = require('express');
const router = express.Router();
const CustomerInvoiceService = require('../services/CustomerInvoiceService');

// Initialize service (will be replaced with pool injection)
let service = null;

const getService = (req) => {
    if (!service) {
        service = new CustomerInvoiceService(req.app.locals.masterPool);
    }
    return service;
};

/**
 * GET /customer-invoices
 * List customer invoices with filters
 */
router.get('/', async (req, res) => {
    try {
        const filters = {
            customer_search: req.query.search,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            offset: req.query.offset ? parseInt(req.query.offset) : 0
        };
        const invoices = await getService(req).list(filters);
        res.json({ success: true, data: invoices });
    } catch (error) {
        console.error('Error listing customer invoices:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /customer-invoices/by-imei/:imei
 * Find invoices containing a specific IMEI
 */
router.get('/by-imei/:imei', async (req, res) => {
    try {
        const invoices = await getService(req).getByIMEI(req.params.imei);
        res.json({ success: true, data: invoices });
    } catch (error) {
        console.error('Error finding invoice by IMEI:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /customer-invoices/warranty/:imei
 * Get warranty information for a device
 */
router.get('/warranty/:imei', async (req, res) => {
    try {
        const warranty = await getService(req).getWarrantyInfo(req.params.imei);
        if (!warranty) {
            return res.status(404).json({ success: false, error: 'No warranty info found' });
        }
        res.json({ success: true, data: warranty });
    } catch (error) {
        console.error('Error getting warranty info:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /customer-invoices/:id
 * Get invoice by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const invoice = await getService(req).getById(parseInt(req.params.id));
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }
        res.json({ success: true, data: invoice });
    } catch (error) {
        console.error('Error getting customer invoice:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /customer-invoices
 * Create a new customer invoice
 */
router.post('/', async (req, res) => {
    try {
        const userId = req.user?.id || 1; // Default to system user if auth disabled
        const invoice = await getService(req).create(req.body, userId);
        res.status(201).json({ success: true, data: invoice });
    } catch (error) {
        console.error('Error creating customer invoice:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * PUT /customer-invoices/:id
 * Update a customer invoice
 */
router.put('/:id', async (req, res) => {
    try {
        const invoice = await getService(req).update(parseInt(req.params.id), req.body);
        res.json({ success: true, data: invoice });
    } catch (error) {
        console.error('Error updating customer invoice:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /customer-invoices/:id
 * Delete a customer invoice
 */
router.delete('/:id', async (req, res) => {
    try {
        const success = await getService(req).delete(parseInt(req.params.id));
        if (!success) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }
        res.json({ success: true, message: 'Invoice deleted' });
    } catch (error) {
        console.error('Error deleting customer invoice:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
