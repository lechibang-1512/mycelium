const asyncHandler = require('../utils/asyncHandler');
const express = require('express');
const router = express.Router();
const SanitizationService = require('../services/SanitizationService');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
    const InvoiceService = require('../services/InvoiceService');
    const invoiceService = new InvoiceService();


    router.get('/', requirePermission('invoice:read'), asyncHandler(async (req, res) => {
        try {
            const invoices = await invoiceService.getInvoices(req.query);
            res.json({ success: true, data: invoices.map(i => convertBigIntToNumber(i)) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }));

    router.get('/:id', requirePermission('invoice:read'), asyncHandler(async (req, res) => {
        try {
            const invoice = await invoiceService.getInvoiceById(req.params.id);
            if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
            res.json({ success: true, data: convertBigIntToNumber(invoice) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }));

    router.post('/', requirePermission('invoice:write'), asyncHandler(async (req, res) => {
        try {
            const result = await invoiceService.createInvoice(req.body);
            res.status(201).json({ success: true, data: convertBigIntToNumber(result) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }));

    router.delete('/:id', requirePermission('invoice:delete'), asyncHandler(async (req, res) => {
        try {
            await invoiceService.deleteInvoice(req.params.id);
            res.json({ success: true, message: 'Invoice deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }));

    // Get spare parts from a specific invoice
    router.get('/:id/spare-parts', requirePermission('invoice:read'), asyncHandler(async (req, res) => {
        try {
            const invoiceUuid = req.params.id;
            const spareParts = await sequelizeMaster.query(`
                SELECT 
                    ii.spare_part_id as id,
                    sp.spare_part_uuid,
                    sp.part_name as name,
                    sp.part_code as sku,
                    sp.part_category as category,
                    ii.quantity,
                    ii.unit_price
                FROM invoices inv
                JOIN invoice_items ii ON inv.id = ii.invoice_id
                JOIN spare_parts sp ON ii.spare_part_id = sp.spare_part_id
                WHERE inv.uuid = ? AND ii.spare_part_id IS NOT NULL
            `, { replacements: [invoiceUuid], type: QueryTypes.SELECT });
            const result = Array.isArray(spareParts) ? spareParts : [];
            res.json({ success: true, data: result.map(p => convertBigIntToNumber(p)) });
        } catch (error) {
            console.error('Error fetching spare parts from invoice:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }));


    return router;
};
