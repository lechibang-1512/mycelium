/**
 * Matching Service
 * Implements 3-way matching: Purchase Order ↔ ASN ↔ Invoice
 * Validates that invoiced items match what was ordered (PO) and what was received (ASN).
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { NotFoundError } = require('../utils/errors');

class MatchingService {
    constructor() {}

    /**
     * Get the full 3-way matching status for a Purchase Order.
     * Compares PO items → ASN items → Invoice items.
     * @param {string} poId - PO ID or PO number
     * @returns {Promise<Object>} Matching result with discrepancies
     */
    async getMatchingStatus(poId) {
        // Resolve PO
        const [po] = await sequelizeMaster.query(`
            SELECT id, po_number, supplier_id, status, total_amount
            FROM purchase_orders WHERE id = ? OR po_number = ?
        `, { replacements: [poId, poId], type: QueryTypes.SELECT });
        if (!po) throw new NotFoundError('Purchase order not found');

        // Fetch PO items
        const poItems = await sequelizeMaster.query(`
            SELECT id, product_id, spare_part_id, product_name, quantity, unit_price, total_amount
            FROM purchase_order_items WHERE po_id = ?
        `, { replacements: [po.id], type: QueryTypes.SELECT });

        // Fetch ASN items (aggregated by product)
        const asnItems = await sequelizeMaster.query(`
            SELECT ai.product_id, ai.spare_part_id, ai.product_name,
                   SUM(ai.quantity_shipped) AS total_shipped,
                   SUM(ai.quantity_received) AS total_received,
                   GROUP_CONCAT(DISTINCT ai.serial_number) AS serials
            FROM asn_items ai
            JOIN advance_shipping_notices asn ON ai.asn_id = asn.id
            WHERE asn.po_id = ?
            GROUP BY ai.product_id, ai.spare_part_id, ai.product_name
        `, { replacements: [po.id], type: QueryTypes.SELECT });

        // Fetch invoices linked to this PO
        const invoices = await sequelizeMaster.query(`
            SELECT i.id, i.invoice_number, i.status, i.total_amount
            FROM invoices i WHERE i.po_id = ?
        `, { replacements: [po.id], type: QueryTypes.SELECT });

        // Fetch invoice items
        const invoiceItems = await sequelizeMaster.query(`
            SELECT ii.product_id, ii.spare_part_id, ii.product_name,
                   SUM(ii.quantity) AS total_invoiced,
                   SUM(ii.total_amount) AS total_amount
            FROM invoice_items ii
            JOIN invoices i ON ii.invoice_id = i.id
            WHERE i.po_id = ?
            GROUP BY ii.product_id, ii.spare_part_id, ii.product_name
        `, { replacements: [po.id], type: QueryTypes.SELECT });

        // Build matching comparison
        const discrepancies = [];
        const lineMatches = [];

        for (const poItem of poItems) {
            const key = poItem.product_id || poItem.spare_part_id;

            const asn = asnItems.find(a =>
                (poItem.product_id && a.product_id === poItem.product_id) ||
                (poItem.spare_part_id && a.spare_part_id === poItem.spare_part_id)
            );

            const inv = invoiceItems.find(a =>
                (poItem.product_id && a.product_id === poItem.product_id) ||
                (poItem.spare_part_id && a.spare_part_id === poItem.spare_part_id)
            );

            const orderedQty = poItem.quantity;
            const shippedQty = asn ? Number(asn.total_shipped) : 0;
            const receivedQty = asn ? Number(asn.total_received) : 0;
            const invoicedQty = inv ? Number(inv.total_invoiced) : 0;

            const line = {
                product_id: poItem.product_id,
                spare_part_id: poItem.spare_part_id,
                product_name: poItem.product_name,
                ordered: orderedQty,
                shipped: shippedQty,
                received: receivedQty,
                invoiced: invoicedQty,
                po_match: shippedQty === orderedQty,
                asn_match: receivedQty === shippedQty,
                invoice_match: invoicedQty === orderedQty
            };

            lineMatches.push(line);

            if (shippedQty !== orderedQty) {
                discrepancies.push({
                    type: 'po_asn_quantity',
                    item: key,
                    product_name: poItem.product_name,
                    message: `Ordered ${orderedQty}, shipped ${shippedQty}`,
                    severity: shippedQty > orderedQty ? 'over' : 'under'
                });
            }

            if (receivedQty !== shippedQty && shippedQty > 0) {
                discrepancies.push({
                    type: 'asn_receipt_quantity',
                    item: key,
                    product_name: poItem.product_name,
                    message: `Shipped ${shippedQty}, received ${receivedQty}`,
                    severity: receivedQty < shippedQty ? 'short' : 'over'
                });
            }

            if (invoicedQty !== orderedQty && invoicedQty > 0) {
                discrepancies.push({
                    type: 'po_invoice_quantity',
                    item: key,
                    product_name: poItem.product_name,
                    message: `Ordered ${orderedQty}, invoiced ${invoicedQty}`,
                    severity: invoicedQty > orderedQty ? 'over' : 'under'
                });
            }
        }

        // Overall status
        const allLinesMatch = lineMatches.every(l => l.po_match && l.asn_match && l.invoice_match);
        const hasAsn = asnItems.length > 0;
        const hasInvoice = invoiceItems.length > 0;

        let overallStatus;
        if (allLinesMatch && hasAsn && hasInvoice) {
            overallStatus = 'matched';
        } else if (discrepancies.length > 0) {
            overallStatus = 'discrepancy';
        } else if (!hasAsn && !hasInvoice) {
            overallStatus = 'pending';
        } else {
            overallStatus = 'partial';
        }

        return {
            po_id: po.id,
            po_number: po.po_number,
            po_status: po.status,
            overall_status: overallStatus,
            has_asn: hasAsn,
            has_invoice: hasInvoice,
            line_matches: lineMatches,
            discrepancies,
            invoices: invoices.map(i => ({
                id: i.id,
                invoice_number: i.invoice_number,
                status: i.status,
                total_amount: Number(i.total_amount)
            }))
        };
    }

    /**
     * Validate an invoice against its linked PO and ASN data.
     * @param {string} invoiceId
     * @returns {Promise<Object>} Validation result
     */
    async validateInvoiceMatch(invoiceId) {
        const [invoice] = await sequelizeMaster.query(`
            SELECT id, invoice_number, po_id, supplier_id, total_amount, status
            FROM invoices WHERE id = ? OR uuid = ?
        `, { replacements: [invoiceId, invoiceId], type: QueryTypes.SELECT });

        if (!invoice) throw new NotFoundError('Invoice not found');
        if (!invoice.po_id) {
            return { matched: false, reason: 'Invoice not linked to any purchase order' };
        }

        return await this.getMatchingStatus(invoice.po_id);
    }
}

module.exports = MatchingService;
