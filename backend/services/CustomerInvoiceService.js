/**
 * Customer Invoice Service (MongoDB Version)
 * Handles retail customer invoices with device IMEI linking
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// CustomerInvoice schema (separate from supplier invoices)
const CustomerInvoiceSchema = new mongoose.Schema({
    invoice_id: { type: Number, unique: true, index: true },
    invoice_number: { type: String, unique: true, index: true },
    customer_name: { type: String, index: true },
    customer_phone: String,
    customer_email: String,
    customer_address: String,
    items: [{
        product_id: String,
        device_name: String,
        imei: { type: String, index: true },
        serial_number: String,
        quantity: { type: Number, default: 1 },
        unit_price: Number,
        warranty_months: { type: Number, default: 12 },
        notes: String
    }],
    subtotal: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    payment_method: String,
    payment_status: { type: String, enum: ['PENDING', 'PAID', 'PARTIAL'], default: 'PENDING' },
    notes: String,
    created_by: Number
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'customer_invoices'
});

// Auto-increment
CustomerInvoiceSchema.pre('save', async function (next) {
    if (this.isNew) {
        if (!this.invoice_id) {
            const last = await this.constructor.findOne().sort({ invoice_id: -1 });
            this.invoice_id = (last?.invoice_id || 0) + 1;
        }
        if (!this.invoice_number) {
            const date = new Date();
            this.invoice_number = `CI-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(this.invoice_id).padStart(5, '0')}`;
        }
        // Calculate totals
        if (this.items?.length) {
            this.subtotal = this.items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
            this.total_amount = this.subtotal + this.tax_amount - this.discount_amount;
        }
    }
    next();
});

const CustomerInvoice = mongoose.models.CustomerInvoice || mongoose.model('CustomerInvoice', CustomerInvoiceSchema);

class CustomerInvoiceService {
    constructor(_pool) { }

    async create(invoiceData, userId) {
        const invoice = await CustomerInvoice.create({
            customer_name: invoiceData.customer_name,
            customer_phone: invoiceData.customer_phone,
            customer_email: invoiceData.customer_email,
            customer_address: invoiceData.customer_address,
            items: invoiceData.items || [],
            tax_amount: invoiceData.tax_amount || 0,
            discount_amount: invoiceData.discount_amount || 0,
            payment_method: invoiceData.payment_method,
            payment_status: invoiceData.payment_status || 'PENDING',
            notes: invoiceData.notes,
            created_by: userId
        });

        return {
            invoice_id: invoice.invoice_id,
            invoice_number: invoice.invoice_number,
            success: true
        };
    }

    async getById(id) {
        const query = typeof id === 'number' ? { invoice_id: id } : { invoice_number: id };
        const invoice = await CustomerInvoice.findOne(query).lean();
        if (!invoice) return null;
        return { ...invoice, id: invoice.invoice_id };
    }

    async list(filters = {}) {
        const query = {};
        if (filters.customer_name) query.customer_name = new RegExp(filters.customer_name, 'i');
        if (filters.payment_status) query.payment_status = filters.payment_status;
        if (filters.start_date) query.created_at = { $gte: new Date(filters.start_date) };
        if (filters.end_date) {
            query.created_at = query.created_at || {};
            query.created_at.$lte = new Date(filters.end_date);
        }

        const invoices = await CustomerInvoice.find(query)
            .sort({ created_at: -1 })
            .limit(filters.limit || 100)
            .lean();

        return invoices.map(i => ({ ...i, id: i.invoice_id }));
    }

    async getByIMEI(imei) {
        const invoices = await CustomerInvoice.find({ 'items.imei': imei }).lean();
        return invoices.map(i => ({ ...i, id: i.invoice_id }));
    }

    async update(id, updateData) {
        const query = typeof id === 'number' ? { invoice_id: id } : { invoice_number: id };
        const invoice = await CustomerInvoice.findOne(query);
        if (!invoice) return { success: false, error: 'Invoice not found' };

        const fields = ['customer_name', 'customer_phone', 'customer_email', 'customer_address',
            'payment_method', 'payment_status', 'notes', 'items'];
        fields.forEach(f => {
            if (updateData[f] !== undefined) invoice[f] = updateData[f];
        });

        await invoice.save();
        return { success: true };
    }

    async delete(id) {
        const query = typeof id === 'number' ? { invoice_id: id } : { invoice_number: id };
        const result = await CustomerInvoice.deleteOne(query);
        return { success: result.deletedCount > 0 };
    }

    async getWarrantyInfo(imei) {
        const invoice = await CustomerInvoice.findOne({ 'items.imei': imei }).lean();
        if (!invoice) return null;

        const item = invoice.items.find(i => i.imei === imei);
        if (!item) return null;

        const purchaseDate = invoice.created_at;
        const warrantyEndDate = new Date(purchaseDate);
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + (item.warranty_months || 12));

        return {
            imei,
            device_name: item.device_name,
            purchase_date: purchaseDate,
            warranty_months: item.warranty_months || 12,
            warranty_end_date: warrantyEndDate,
            is_under_warranty: new Date() < warrantyEndDate,
            invoice_number: invoice.invoice_number,
            customer_name: invoice.customer_name
        };
    }
}

module.exports = CustomerInvoiceService;
