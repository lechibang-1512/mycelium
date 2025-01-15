/**
 * Purchase Order Service
 * Handles PO CRUD, status management, and XML export for EDI procurement workflow.
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const { create } = require('xmlbuilder2');

class PurchaseOrderService {
    constructor() {}

    // =========================================================================
    // CRUD
    // =========================================================================

    async getPurchaseOrders(filters = {}) {
        let sql = `
            SELECT po.*,
                   s.name AS supplier_name,
                   COUNT(poi.id) AS item_count,
                   (SELECT COUNT(*) FROM advance_shipping_notices asn WHERE asn.po_id = po.id) AS asn_count
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
            WHERE 1=1
        `;
        const params = [];

        if (filters.search) {
            sql += ` AND (po.po_number LIKE ? OR s.name LIKE ? OR po.notes LIKE ?)`;
            params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.status) {
            sql += ` AND po.status = ?`;
            params.push(filters.status);
        }

        if (filters.supplier_id) {
            sql += ` AND po.supplier_id = ?`;
            params.push(filters.supplier_id);
        }

        sql += ` GROUP BY po.id ORDER BY po.created_at DESC`;

        if (filters.limit) {
            sql += ` LIMIT ?`;
            params.push(parseInt(filters.limit));
        }

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        return rows.map(r => this._mapPo(r));
    }

    async getPurchaseOrderById(id) {
        if (!id) return null;

        const [po] = await sequelizeMaster.query(`
            SELECT po.*, s.name AS supplier_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            WHERE po.id = ? OR po.po_number = ?
        `, { replacements: [id, id], type: QueryTypes.SELECT });

        if (!po) return null;

        const items = await sequelizeMaster.query(`
            SELECT poi.*
            FROM purchase_order_items poi
            WHERE poi.po_id = ?
            ORDER BY poi.created_at ASC
        `, { replacements: [po.id], type: QueryTypes.SELECT });

        const asns = await sequelizeMaster.query(`
            SELECT asn.id, asn.asn_number, asn.status, asn.ship_date,
                   asn.expected_arrival_date, asn.carrier, asn.tracking_number
            FROM advance_shipping_notices asn
            WHERE asn.po_id = ?
            ORDER BY asn.created_at DESC
        `, { replacements: [po.id], type: QueryTypes.SELECT });

        const invoices = await sequelizeMaster.query(`
            SELECT i.id, i.uuid, i.invoice_number, i.status, i.total_amount
            FROM invoices i
            WHERE i.po_id = ?
            ORDER BY i.created_at DESC
        `, { replacements: [po.id], type: QueryTypes.SELECT });

        return {
            ...this._mapPo(po),
            items: items.map(i => ({
                id: i.id,
                product_id: i.product_id,
                spare_part_id: i.spare_part_id,
                product_name: i.product_name,
                description: i.description,
                unit: i.unit,
                quantity: i.quantity,
                unit_price: Number(i.unit_price),
                total_price: Number(i.total_price),
                tax_rate: Number(i.tax_rate),
                tax_amount: Number(i.tax_amount),
                total_amount: Number(i.total_amount)
            })),
            asns,
            invoices
        };
    }

    async createPurchaseOrder(data) {
        if (!data.supplier_id) throw new ValidationError('Supplier is required');
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
            throw new ValidationError('At least one item is required');
        }

        return await sequelizeMaster.transaction(async (t) => {
            const poId = generateId();
            const poNumber = data.po_number || await this._generatePoNumber(t);

            // Check uniqueness
            const [existing] = await sequelizeMaster.query(
                `SELECT id FROM purchase_orders WHERE po_number = ?`,
                { replacements: [poNumber], type: QueryTypes.SELECT, transaction: t }
            );
            if (existing) throw new ConflictError(`PO number ${poNumber} already exists`);

            // Calculate item totals
            const items = data.items.map(item => {
                const quantity = parseInt(item.quantity, 10) || 1;
                const unitPrice = parseFloat(item.unit_price) || 0;
                const taxRate = parseFloat(item.tax_rate) || 0;
                const totalPrice = quantity * unitPrice;
                const taxAmount = totalPrice * (taxRate / 100);
                return {
                    ...item,
                    quantity,
                    unit_price: unitPrice,
                    total_price: totalPrice,
                    tax_rate: taxRate,
                    tax_amount: taxAmount,
                    total_amount: totalPrice + taxAmount
                };
            });

            const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);
            const taxRate = parseFloat(data.tax_rate) || 10;
            const taxAmount = items.reduce((sum, i) => sum + i.tax_amount, 0);
            const shippingFee = parseFloat(data.shipping_fee) || 0;
            const discountAmount = parseFloat(data.discount_amount) || 0;
            const totalAmount = subtotal + taxAmount + shippingFee - discountAmount;

            await sequelizeMaster.query(`
                INSERT INTO purchase_orders (
                    id, po_number, supplier_id, status, order_date, expected_delivery_date,
                    subtotal, tax_rate, tax_amount, shipping_fee, discount_amount, total_amount, notes
                ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, {
                replacements: [
                    poId, poNumber, data.supplier_id,
                    data.order_date || new Date().toISOString(),
                    data.expected_delivery_date || null,
                    subtotal, taxRate, taxAmount, shippingFee, discountAmount, totalAmount,
                    data.notes || null
                ],
                type: QueryTypes.INSERT,
                transaction: t
            });

            for (const item of items) {
                const itemId = generateId();
                await sequelizeMaster.query(`
                    INSERT INTO purchase_order_items (
                        id, po_id, product_id, spare_part_id, product_name, description,
                        unit, quantity, unit_price, total_price, tax_rate, tax_amount, total_amount
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, {
                    replacements: [
                        itemId, poId,
                        item.product_id || null,
                        item.spare_part_id || null,
                        item.product_name || `Item`,
                        item.description || null,
                        item.unit || 'pcs',
                        item.quantity,
                        item.unit_price,
                        item.total_price,
                        item.tax_rate,
                        item.tax_amount,
                        item.total_amount
                    ],
                    type: QueryTypes.INSERT,
                    transaction: t
                });
            }

            return { id: poId, po_number: poNumber, success: true };
        });
    }

    async updatePurchaseOrderStatus(id, status) {
        const allowed = ['draft', 'sent', 'acknowledged', 'partially_received', 'received', 'cancelled'];
        if (!allowed.includes(status)) throw new ValidationError(`Invalid status: ${status}`);

        const poId = await this._resolveId(id);
        if (!poId) throw new NotFoundError('Purchase order not found');

        await sequelizeMaster.query(
            `UPDATE purchase_orders SET status = ? WHERE id = ?`,
            { replacements: [status, poId], type: QueryTypes.UPDATE }
        );

        if (status === 'sent') {
            await sequelizeMaster.query(
                `UPDATE purchase_orders SET xml_exported_at = NOW() WHERE id = ? AND xml_exported_at IS NULL`,
                { replacements: [poId], type: QueryTypes.UPDATE }
            );
        }

        return { success: true };
    }

    async deletePurchaseOrder(id) {
        const poId = await this._resolveId(id);
        if (!poId) throw new NotFoundError('Purchase order not found');

        const [po] = await sequelizeMaster.query(
            `SELECT status FROM purchase_orders WHERE id = ?`,
            { replacements: [poId], type: QueryTypes.SELECT }
        );
        if (po.status !== 'draft') {
            throw new ConflictError('Only draft purchase orders can be deleted');
        }

        await sequelizeMaster.query(
            `DELETE FROM purchase_orders WHERE id = ?`,
            { replacements: [poId], type: QueryTypes.DELETE }
        );

        return { success: true };
    }

    // =========================================================================
    // XML EXPORT
    // =========================================================================

    async generatePoXml(id) {
        const po = await this.getPurchaseOrderById(id);
        if (!po) throw new NotFoundError('Purchase order not found');

        const doc = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('PurchaseOrder')
                .ele('PONumber').txt(po.po_number).up()
                .ele('SupplierID').txt(po.supplier_id).up()
                .ele('SupplierName').txt(po.supplier_name || '').up()
                .ele('OrderDate').txt(po.order_date ? new Date(po.order_date).toISOString().slice(0, 10) : '').up()
                .ele('ExpectedDeliveryDate').txt(po.expected_delivery_date ? new Date(po.expected_delivery_date).toISOString().slice(0, 10) : '').up()
                .ele('TaxRate').txt(String(po.totals.tax_rate)).up()
                .ele('ShippingFee').txt(String(po.totals.shipping)).up()
                .ele('DiscountAmount').txt(String(po.totals.discount)).up()
                .ele('Notes').txt(po.notes || '').up();

        const itemsEle = doc.ele('Items');
        for (const item of po.items) {
            const itemEle = itemsEle.ele('Item');
            if (item.product_id) itemEle.ele('ProductID').txt(item.product_id).up();
            if (item.spare_part_id) itemEle.ele('SparePartID').txt(item.spare_part_id).up();
            itemEle.ele('ProductName').txt(item.product_name || '').up();
            if (item.description) itemEle.ele('Description').txt(item.description).up();
            itemEle.ele('Unit').txt(item.unit || 'pcs').up();
            itemEle.ele('Quantity').txt(String(item.quantity)).up();
            itemEle.ele('UnitPrice').txt(String(item.unit_price)).up();
            itemEle.ele('TaxRate').txt(String(item.tax_rate)).up();
            itemEle.up();
        }

        return doc.end({ prettyPrint: true });
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    _mapPo(row) {
        return {
            id: row.id,
            po_number: row.po_number,
            supplier_id: row.supplier_id,
            supplier_name: row.supplier_name,
            status: row.status,
            order_date: row.order_date,
            expected_delivery_date: row.expected_delivery_date,
            totals: {
                subtotal: Number(row.subtotal),
                tax_rate: Number(row.tax_rate),
                tax_amount: Number(row.tax_amount),
                shipping: Number(row.shipping_fee),
                discount: Number(row.discount_amount),
                total: Number(row.total_amount)
            },
            notes: row.notes,
            xml_exported_at: row.xml_exported_at,
            item_count: row.item_count != null ? Number(row.item_count) : undefined,
            asn_count: row.asn_count != null ? Number(row.asn_count) : undefined,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }

    async _resolveId(id) {
        const [row] = await sequelizeMaster.query(
            `SELECT id FROM purchase_orders WHERE id = ? OR po_number = ?`,
            { replacements: [id, id], type: QueryTypes.SELECT }
        );
        return row ? row.id : null;
    }

    async _generatePoNumber(t) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `PO-${dateStr}`;
        const [row] = await sequelizeMaster.query(
            `SELECT COUNT(*) AS cnt FROM purchase_orders WHERE po_number LIKE ?`,
            { replacements: [`${prefix}%`], type: QueryTypes.SELECT, transaction: t }
        );
        const seq = String((row.cnt || 0) + 1).padStart(4, '0');
        return `${prefix}-${seq}`;
    }
}

module.exports = PurchaseOrderService;
