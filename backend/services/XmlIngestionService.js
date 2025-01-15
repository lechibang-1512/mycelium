/**
 * XML Ingestion Service
 * Parses supplier XML invoices and creates invoice records + expected serials.
 *
 * Expected XML structure (adjust field mappings for real supplier schemas):
 *
 * <InvoiceDocument>
 *   <InvoiceNumber>INV-2026-001</InvoiceNumber>
 *   <SupplierID>42</SupplierID>
 *   <Date>2026-03-17</Date>
 *   <DueDate>2026-04-17</DueDate>
 *   <TaxRate>10.00</TaxRate>
 *   <ShippingFee>50000</ShippingFee>
 *   <Notes>Quarterly order</Notes>
 *   <Items>
 *     <Item>
 *       <ProductID>uuid-of-product</ProductID>
 *       <SparePartID>uuid-of-spare-part</SparePartID>
 *       <ProductName>iPhone 15 Screen</ProductName>
 *       <Description>OEM replacement screen</Description>
 *       <Unit>pcs</Unit>
 *       <Quantity>5</Quantity>
 *       <UnitPrice>1200000</UnitPrice>
 *       <TaxRate>10.00</TaxRate>
 *       <SerialNumbers>
 *         <Serial>IMEI-001</Serial>
 *         <Serial>IMEI-002</Serial>
 *       </SerialNumbers>
 *     </Item>
 *   </Items>
 * </InvoiceDocument>
 */

const { XMLParser } = require('fast-xml-parser');
const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');
const { ValidationError } = require('../utils/errors');
const InvoiceService = require('./InvoiceService');
const PurchaseOrderService = require('./PurchaseOrderService');

class XmlIngestionService {
    constructor() {
        this.invoiceService = new InvoiceService();
        this.poService = new PurchaseOrderService();
        this.parser = new XMLParser({
            ignoreAttributes: false,
            parseTagValue: true,
            trimValues: true,
            isArray: (name) => {
                // Force these tags to always be arrays even if only one element
                return ['Item', 'Serial'].includes(name);
            }
        });
    }

    /**
     * Ingest a raw XML invoice string, create the invoice + items + expected serials.
     * @param {string} xmlString - Raw XML content
     * @returns {Promise<{success: boolean, invoice_id: string, invoice_uuid: string, item_count: number, serial_count: number}>}
     */
    async ingestXmlInvoice(xmlString) {
        if (!xmlString || typeof xmlString !== 'string' || xmlString.trim().length === 0) {
            throw new ValidationError('XML content is required');
        }

        // 1. Parse XML
        const parsed = this._parseXml(xmlString);

        // 2. Map to internal schema (preserves _serialNumbers on each item)
        const { invoiceData, serialsByIndex, poNumber } = this._mapXmlToInvoiceData(parsed);

        // 2b. If PO number present, resolve and link
        let resolvedPoId = null;
        if (poNumber) {
            const [po] = await sequelizeMaster.query(
                `SELECT id FROM purchase_orders WHERE po_number = ? OR id = ?`,
                { replacements: [poNumber, poNumber], type: QueryTypes.SELECT }
            );
            if (po) resolvedPoId = po.id;
        }

        // 3. Create invoice via InvoiceService (handles dedup + transaction)
        const createResult = await this.invoiceService.createInvoice(invoiceData);

        // 3b. Link invoice to PO if resolved
        if (resolvedPoId && createResult.id) {
            await sequelizeMaster.query(
                `UPDATE invoices SET po_id = ? WHERE id = ?`,
                { replacements: [resolvedPoId, createResult.id], type: QueryTypes.UPDATE }
            );
        }

        // 4. Insert expected serials if any were found in the XML
        let serialCount = 0;
        if (createResult.id && serialsByIndex.some(s => s.length > 0)) {
            serialCount = await this._insertExpectedSerials(
                createResult.id,
                invoiceData.items,
                serialsByIndex
            );
        }

        return {
            success: true,
            invoice_id: createResult.id,
            invoice_uuid: createResult.uuid,
            item_count: invoiceData.items.length,
            serial_count: serialCount
        };
    }

    /**
     * Parse raw XML string into a JS object.
     * @param {string} xmlString
     * @returns {Object} Parsed InvoiceDocument object
     */
    _parseXml(xmlString) {
        try {
            const result = this.parser.parse(xmlString);
            if (!result || !result.InvoiceDocument) {
                throw new ValidationError(
                    'Invalid XML structure: missing <InvoiceDocument> root element'
                );
            }
            return result.InvoiceDocument;
        } catch (err) {
            if (err instanceof ValidationError) throw err;
            throw new ValidationError(`Failed to parse XML: ${err.message}`);
        }
    }

    /**
     * Map parsed XML object to the invoice data shape expected by InvoiceService.createInvoice().
     * Also extracts serial numbers per item index for later insertion.
     * @param {Object} xmlDoc - Parsed InvoiceDocument object
     * @returns {{ invoiceData: Object, serialsByIndex: Array<string[]> }}
     */
    _mapXmlToInvoiceData(xmlDoc) {
        const invoiceNumber = xmlDoc.InvoiceNumber;
        const supplierId = xmlDoc.SupplierID;

        if (!invoiceNumber) {
            throw new ValidationError('XML missing required field: <InvoiceNumber>');
        }
        if (!supplierId) {
            throw new ValidationError('XML missing required field: <SupplierID>');
        }

        // Extract items
        const rawItems = xmlDoc.Items?.Item;
        if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
            throw new ValidationError('XML must contain at least one <Item> inside <Items>');
        }

        const serialsByIndex = [];
        const items = rawItems.map((item, idx) => {
            const quantity = parseInt(item.Quantity, 10);
            if (!quantity || quantity <= 0) {
                throw new ValidationError(`Item #${idx + 1}: invalid or missing <Quantity>`);
            }

            const unitPrice = parseFloat(item.UnitPrice) || 0;
            const taxRate = parseFloat(item.TaxRate) || 0;
            const subtotal = quantity * unitPrice;
            const taxAmount = subtotal * (taxRate / 100);

            // Extract serial numbers if present
            let serials = [];
            if (item.SerialNumbers?.Serial) {
                serials = Array.isArray(item.SerialNumbers.Serial)
                    ? item.SerialNumbers.Serial.map(String)
                    : [String(item.SerialNumbers.Serial)];
            }
            serialsByIndex.push(serials);

            return {
                product_id: item.ProductID || null,
                spare_part_id: item.SparePartID || null,
                product_name: item.ProductName || `Item ${idx + 1}`,
                description: item.Description || null,
                unit: item.Unit || 'pcs',
                quantity,
                unit_price: unitPrice,
                total_price: subtotal,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                discount_amount: parseFloat(item.DiscountAmount) || 0,
                total_amount: subtotal + taxAmount - (parseFloat(item.DiscountAmount) || 0)
            };
        });

        // Compute totals
        const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);
        const taxRate = parseFloat(xmlDoc.TaxRate) || 0;
        const taxAmount = items.reduce((sum, i) => sum + i.tax_amount, 0);
        const shippingFee = parseFloat(xmlDoc.ShippingFee) || 0;
        const discountAmount = parseFloat(xmlDoc.DiscountAmount) || 0;
        const totalAmount = subtotal + taxAmount + shippingFee - discountAmount;

        const invoiceData = {
            invoice_number: String(invoiceNumber),
            supplier_id: supplierId,
            invoice_date: xmlDoc.Date || new Date().toISOString(),
            due_date: xmlDoc.DueDate || null,
            status: 'draft',
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            shipping_fee: shippingFee,
            discount_amount: discountAmount,
            total_amount: totalAmount,
            notes: xmlDoc.Notes || 'Imported from XML',
            items
        };

        // Extract optional PO number for auto-linking
        const poNumber = xmlDoc.PONumber ? String(xmlDoc.PONumber) : null;

        return { invoiceData, serialsByIndex, poNumber };
    }

    /**
     * Insert expected serials from the parsed serial arrays into expected_serials table.
     * @param {string} invoiceId
     * @param {Array} items - Mapped invoice items
     * @param {Array<string[]>} serialsByIndex - Serial numbers grouped by item index
     * @returns {Promise<number>} Total serials inserted
     */
    async _insertExpectedSerials(invoiceId, items, serialsByIndex) {
        let totalInserted = 0;

        for (let i = 0; i < items.length; i++) {
            const serials = serialsByIndex[i] || [];
            if (serials.length === 0) continue;

            const item = items[i];

            for (const serial of serials) {
                const id = generateId();
                await sequelizeMaster.query(`
                    INSERT INTO expected_serials (id, invoice_id, product_id, spare_part_id, expected_serial, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `, {
                    replacements: [
                        id,
                        invoiceId,
                        item.product_id || null,
                        item.spare_part_id || null,
                        serial,
                        `XML import for ${item.product_name || 'unknown product'}`
                    ],
                    type: QueryTypes.INSERT
                });
                totalInserted++;
            }
        }

        return totalInserted;
    }
}

module.exports = XmlIngestionService;
