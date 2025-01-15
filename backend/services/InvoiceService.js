/**
 * Invoice Service (Sequelize Version)
 * Handles invoice management (CRUD, status updates)
 */

const { QueryTypes, Op } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { Invoice, InvoiceItem } = require('../models/master');
const { generateId } = require('../utils/generateId');
const { ValidationError, NotFoundError, ConflictError, InsufficientStockError, CapacityError } = require('../utils/errors');


class InvoiceService {
    constructor() { }

    async getInvoices(filters = {}) {
        let sql = `
            SELECT i.*, 
                   s.name as supplier_name,
                   COUNT(ii.id) as item_count 
            FROM invoices i
            LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
            LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
            WHERE 1=1
        `;
        const params = [];

        if (filters.search) {
            sql += ` AND (i.invoice_number LIKE ? OR s.name LIKE ? OR i.notes LIKE ?)`;
            params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.status) {
            sql += ` AND i.status = ?`;
            params.push(filters.status);
        }

        if (filters.supplier_id) {
            sql += ` AND i.supplier_id = ?`;
            params.push(filters.supplier_id);
        }

        if (filters.startDate) {
            sql += ` AND i.invoice_date >= ?`;
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            sql += ` AND i.invoice_date <= ?`;
            params.push(filters.endDate);
        }

        sql += ` GROUP BY i.id ORDER BY i.invoice_date DESC, i.created_at DESC`;

        if (filters.limit) {
            sql += ` LIMIT ?`;
            params.push(parseInt(filters.limit));
        }

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        return rows.map(this._mapInvoice);
    }

    async getInvoiceById(id) {
        if (!id) return null;

        let query = `
            SELECT i.*, s.name as supplier_name 
            FROM invoices i 
            LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id 
            WHERE i.id = ? OR i.uuid = ? OR i.invoice_number = ?
        `;
        const [invoice] = await sequelizeMaster.query(query, {
            replacements: [id, id, id], type: QueryTypes.SELECT
        });

        if (!invoice) return null;

        const items = await sequelizeMaster.query(`
            SELECT ii.*, p.device_name 
            FROM invoice_items ii 
            LEFT JOIN phone_specs p ON ii.product_id = p.product_id
            WHERE ii.invoice_id = ?
        `, { replacements: [invoice.id], type: QueryTypes.SELECT });

        return {
            ...this._mapInvoice(invoice),
            items: items.map(this._mapInvoiceItem)
        };
    }

    async createInvoice(invoiceData) {
        if (!invoiceData.invoice_number) throw new ValidationError('invoice number is required');
        if (!invoiceData.supplier_id) throw new ValidationError('supplier is required');

        return await sequelizeMaster.transaction(async (t) => {
            const invCount = await Invoice.count({
                where: { invoice_number: invoiceData.invoice_number },
                transaction: t
            });
            if (invCount > 0) throw new ConflictError(`Invoice number ${invoiceData.invoice_number} already exists`);

            const invoiceId = generateId();
            const uuid = invoiceId;
            const {
                invoice_number, pattern_number, serial_number, supplier_id,
                invoice_date, due_date, status = 'draft',
                subtotal, tax_rate, tax_amount, shipping_fee, discount_amount, total_amount,
                notes, items = []
            } = invoiceData;

            await Invoice.create({
                id: invoiceId, uuid, invoice_number, pattern_number, serial_number, supplier_id,
                status, invoice_date, due_date, imported_at: new Date(),
                subtotal: subtotal || 0, tax_rate: tax_rate || 0, tax_amount: tax_amount || 0, 
                shipping_fee: shipping_fee || 0, discount_amount: discount_amount || 0, total_amount: total_amount || 0,
                notes
            }, { transaction: t });

            if (items && items.length > 0) {
                for (const item of items) {
                    await InvoiceItem.create({
                        id: generateId(), invoice_id: invoiceId, 
                        product_id: item.product_id || null, spare_part_id: item.spare_part_id || null, 
                        product_name: item.product_name, description: item.description,
                        unit: item.unit, quantity: item.quantity, unit_price: item.unit_price, 
                        total_price: item.total_price || (item.quantity * item.unit_price),
                        tax_rate: item.tax_rate, tax_amount: item.tax_amount, 
                        discount_amount: item.discount_amount, total_amount: item.total_amount
                    }, { transaction: t });
                }
            }

            return { id: invoiceId, uuid, success: true };
        });
    }

    async updateInvoiceStatus(id, status) {
        const allowed = ['draft', 'issued', 'paid', 'cancelled'];
        if (!allowed.includes(status)) throw new ValidationError('invalid status');

        const invoiceId = await this._resolveId(id);
        if (!invoiceId) throw new NotFoundError('invoice not found');

        await Invoice.update({ status }, { where: { id: invoiceId } });
        return { success: true };
    }

    async deleteInvoice(id) {
        const invoiceId = await this._resolveId(id);
        if (!invoiceId) return { error: 'Invoice not found' };

        await Invoice.destroy({ where: { id: invoiceId } });
        return { success: true };
    }

    _mapInvoice(row) {
        return {
            id: row.id,
            uuid: row.uuid,
            invoice_number: row.invoice_number,
            pattern_number: row.pattern_number,
            serial_number: row.serial_number,
            supplier_id: row.supplier_id,
            supplier_name: row.supplier_name,
            status: row.status,
            verification_status: row.verification_status,
            invoice_date: row.invoice_date,
            due_date: row.due_date,
            imported_at: row.imported_at,
            totals: {
                subtotal: Number(row.subtotal),
                tax_amount: Number(row.tax_amount),
                shipping: Number(row.shipping_fee),
                discount: Number(row.discount_amount),
                total: Number(row.total_amount)
            },
            notes: row.notes,
            created_at: row.created_at,
            item_count: row.item_count ? Number(row.item_count) : undefined
        };
    }

    _mapInvoiceItem(item) {
        return {
            id: item.id,
            product_id: item.product_id,
            spare_part_id: item.spare_part_id,
            product_name: item.product_name,
            device_name: item.device_name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: Number(item.unit_price),
            total_price: Number(item.total_price),
            tax_amount: Number(item.tax_amount),
            total_amount: Number(item.total_amount)
        };
    }

    async _resolveId(id) {
        const invoice = await Invoice.findOne({
            where: {
                [Op.or]: [{ id }, { uuid: id }, { invoice_number: id }]
            },
            attributes: ['id']
        });
        return invoice ? invoice.id : null;
    }
}

module.exports = InvoiceService;
