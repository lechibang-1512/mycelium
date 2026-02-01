const express = require('express');
const router = express.Router();

module.exports = () => {
    const InvoiceService = require('../services/InvoiceService');
    const InvoiceImportService = require('../services/InvoiceImportService');
    const invoiceService = new InvoiceService();
    const invoiceImportService = new InvoiceImportService();
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage() });

    router.get('/', async (req, res) => {
        try {
            const invoices = await invoiceService.getInvoiceList(req.query);
            res.json({ success: true, data: invoices.map(i => convertBigIntToNumber(i)) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/:id', async (req, res) => {
        try {
            const invoice = await invoiceService.getInvoiceDetail(req.params.id);
            if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
            res.json({ success: true, data: convertBigIntToNumber(invoice) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const result = await invoiceService.createInvoice(req.body);
            res.status(201).json({ success: true, data: convertBigIntToNumber(result) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            await invoiceService.deleteInvoice(req.params.id);
            res.json({ success: true, message: 'Invoice deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Get spare parts from a specific invoice
    router.get('/:id/spare-parts', async (req, res) => {
        try {
            const invoiceUuid = req.params.id;
            const spareParts = await pool.query(`
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
                JOIN smartphone_spare_parts sp ON ii.spare_part_id = sp.spare_part_uuid
                WHERE inv.uuid = ? AND ii.spare_part_id IS NOT NULL
            `, [invoiceUuid]);
            const result = Array.isArray(spareParts) ? spareParts : [];
            res.json({ success: true, data: result.map(p => convertBigIntToNumber(p)) });
        } catch (error) {
            console.error('Error fetching spare parts from invoice:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });


    /**
     * POST /api/invoices/import
     * Import invoice from file (XML, JSON, CSV)
     */
    router.post('/import', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }

            const fileContent = req.file.buffer.toString('utf-8');
            const format = req.body.format || req.query.format || 'auto'; // xml, json, csv, auto

            const result = await invoiceImportService.importInvoice(fileContent, format, req.user?.id || 1);

            if (result.success) {
                res.status(200).json(convertBigIntToNumber(result));
            } else {
                res.status(400).json(convertBigIntToNumber(result));
            }
        } catch (error) {
            console.error('❌ Invoice import error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
