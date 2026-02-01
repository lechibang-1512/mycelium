/**
 * Invoice Service (MongoDB Version)
 * Handles invoice CRUD operations
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Invoice = require('../models/Invoice');

class InvoiceService {
    constructor(_pool) {
        // Pool parameter kept for backward compatibility but not used
    }

    async getInvoiceList(filters = {}) {
        const query = {};

        if (filters.status) query.status = filters.status;
        if (filters.supplier_id) query.supplier_id = filters.supplier_id;
        if (filters.start_date) query.invoice_date = { $gte: new Date(filters.start_date) };
        if (filters.end_date) {
            query.invoice_date = query.invoice_date || {};
            query.invoice_date.$lte = new Date(filters.end_date);
        }
        if (filters.search) {
            query.$or = [
                { invoice_number: new RegExp(filters.search, 'i') },
                { notes: new RegExp(filters.search, 'i') }
            ];
        }

        const invoices = await Invoice.find(query)
            .select('-items')
            .sort({ invoice_date: -1 })
            .limit(filters.limit || 100)
            .lean();

        return invoices.map(inv => ({
            id: inv._id,
            uuid: inv.uuid,
            invoice_number: inv.invoice_number,
            pattern_number: inv.pattern_number,
            serial_number: inv.serial_number,
            supplier_id: inv.supplier_id,
            status: inv.status,
            verification_status: inv.verification_status,
            invoice_date: inv.invoice_date,
            due_date: inv.due_date,
            subtotal: inv.subtotal,
            tax_amount: inv.tax_amount,
            total_amount: inv.total_amount,
            currency: inv.currency,
            created_at: inv.created_at,
            updated_at: inv.updated_at
        }));
    }

    async getInvoiceDetail(identifier) {
        const query = typeof identifier === 'string' && identifier.length === 36
            ? { uuid: identifier }
            : { invoice_number: identifier };

        const invoice = await Invoice.findOne(query).lean();
        if (!invoice) return null;

        return {
            id: invoice._id,
            uuid: invoice.uuid,
            invoice_number: invoice.invoice_number,
            pattern_number: invoice.pattern_number,
            serial_number: invoice.serial_number,
            supplier_id: invoice.supplier_id,
            status: invoice.status,
            verification_status: invoice.verification_status,
            invoice_date: invoice.invoice_date,
            due_date: invoice.due_date,
            imported_at: invoice.imported_at,
            items: invoice.items || [],
            subtotal: invoice.subtotal,
            tax_rate: invoice.tax_rate,
            tax_amount: invoice.tax_amount,
            shipping_fee: invoice.shipping_fee,
            discount_amount: invoice.discount_amount,
            total_amount: invoice.total_amount,
            currency: invoice.currency,
            payment_method: invoice.payment_method,
            notes: invoice.notes,
            created_at: invoice.created_at,
            updated_at: invoice.updated_at
        };
    }

    async createInvoice(invoiceData) {
        const {
            invoice_number,
            pattern_number,
            serial_number,
            supplier_id,
            invoice_date,
            due_date,
            items = [],
            tax_rate = 10,
            shipping_fee = 0,
            payment_method = 'TM/CK',
            notes = null
        } = invoiceData;

        // Check duplicate
        if (invoice_number) {
            const existing = await Invoice.findOne({ invoice_number });
            if (existing) throw new Error('Invoice number already exists');
        }

        // Generate invoice number if not provided
        const finalInvoiceNumber = invoice_number || await this._generateInvoiceNumber();

        const invoice = await Invoice.create({
            uuid: uuidv4(),
            invoice_number: finalInvoiceNumber,
            pattern_number,
            serial_number,
            supplier_id,
            invoice_date: invoice_date ? new Date(invoice_date) : new Date(),
            due_date: due_date ? new Date(due_date) : null,
            items: items.map(item => ({
                product_id: item.product_id,
                spare_part_id: item.spare_part_id,
                product_name: item.product_name || item.description,
                product_uuid: item.product_uuid,
                description: item.description,
                unit: item.unit || 'Cái',
                quantity: item.quantity || 1,
                unit_price: item.unit_price || 0,
                tax_rate: item.tax_rate ?? tax_rate,
                discount_rate: item.discount_rate || 0
            })),
            tax_rate,
            shipping_fee,
            payment_method,
            notes,
            status: 'draft',
            imported_at: new Date()
        });

        return {
            uuid: invoice.uuid,
            invoice_number: invoice.invoice_number,
            success: true
        };
    }

    async updateStatus(identifier, status) {
        const query = typeof identifier === 'string' && identifier.length === 36
            ? { uuid: identifier }
            : { invoice_number: identifier };

        const result = await Invoice.updateOne(query, { $set: { status } });
        return { success: result.modifiedCount > 0 };
    }

    async deleteInvoice(identifier) {
        const query = typeof identifier === 'string' && identifier.length === 36
            ? { uuid: identifier }
            : { invoice_number: identifier };

        const result = await Invoice.deleteOne(query);
        return { success: result.deletedCount > 0 };
    }

    async _generateInvoiceNumber() {
        const date = new Date();
        const prefix = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

        const lastInvoice = await Invoice.findOne({
            invoice_number: new RegExp(`^${prefix}`)
        }).sort({ invoice_number: -1 });

        let sequence = 1;
        if (lastInvoice) {
            const match = lastInvoice.invoice_number.match(/-(\d+)$/);
            if (match) sequence = parseInt(match[1]) + 1;
        }

        return `${prefix}-${String(sequence).padStart(5, '0')}`;
    }

    // Additional methods for receiving workflow
    async updateVerificationStatus(uuid, status) {
        await Invoice.updateOne({ uuid }, { $set: { verification_status: status } });
        return { success: true };
    }

    async addItem(uuid, itemData) {
        await Invoice.updateOne(
            { uuid },
            { $push: { items: itemData } }
        );
        return { success: true };
    }

    async updateItem(uuid, itemIndex, itemData) {
        const updatePath = {};
        Object.keys(itemData).forEach(key => {
            updatePath[`items.${itemIndex}.${key}`] = itemData[key];
        });

        await Invoice.updateOne({ uuid }, { $set: updatePath });
        return { success: true };
    }
}

module.exports = InvoiceService;
