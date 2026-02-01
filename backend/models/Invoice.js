/**
 * Invoice Model (replaces invoices and invoice_items)
 * Denormalized with embedded items
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

// Invoice item subdocument
const InvoiceItemSchema = new Schema({
    product_id: String,
    spare_part_id: Number,
    product_name: String,
    product_uuid: String,
    description: String,

    unit: { type: String, default: 'Cái' },
    unit_name: String,
    quantity: { type: Number, default: 1 },
    unit_price: { type: Number, default: 0 },

    // Calculated fields
    total_price: Number,
    tax_rate: { type: Number, default: 10 },
    tax_amount: Number,
    discount_rate: { type: Number, default: 0 },
    discount_amount: Number,
    total_amount: Number
}, { _id: false });

// Main Invoice schema
const InvoiceSchema = new Schema({
    uuid: { type: String, default: uuidv4, unique: true, index: true },
    invoice_number: { type: String, required: true, unique: true, index: true },

    // Vietnamese invoice format
    pattern_number: { type: String, default: '01GTKT0/001' },
    serial_number: { type: String, default: 'AA/24P' },

    // Supplier reference
    supplier_id: { type: Number, index: true },

    // Status
    status: {
        type: String,
        enum: ['draft', 'issued', 'paid', 'cancelled'],
        default: 'draft',
        index: true
    },
    verification_status: {
        type: String,
        enum: ['PENDING', 'PARTIAL', 'VERIFIED'],
        default: 'PENDING'
    },

    // Dates
    invoice_date: Date,
    due_date: Date,
    imported_at: Date,

    // Embedded items
    items: [InvoiceItemSchema],

    // Totals
    subtotal: { type: Number, default: 0 },
    tax_rate: { type: Number, default: 10 },
    tax_amount: { type: Number, default: 0 },
    shipping_fee: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },

    currency: { type: String, default: 'VND' },
    payment_method: { type: String, default: 'TM/CK' },

    notes: String

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'invoices'
});

// Recalculate totals before save
InvoiceSchema.pre('save', function (next) {
    if (this.items && this.items.length > 0) {
        let subtotal = 0;
        let totalTax = 0;
        let totalDiscount = 0;

        this.items.forEach(item => {
            const lineTotal = item.quantity * item.unit_price;
            item.total_price = lineTotal;
            item.tax_amount = lineTotal * (item.tax_rate / 100);
            item.discount_amount = lineTotal * (item.discount_rate / 100);
            item.total_amount = lineTotal + item.tax_amount - item.discount_amount;

            subtotal += lineTotal;
            totalTax += item.tax_amount;
            totalDiscount += item.discount_amount;
        });

        this.subtotal = subtotal;
        this.tax_amount = totalTax;
        this.discount_amount = totalDiscount;
        this.total_amount = subtotal + totalTax - totalDiscount + (this.shipping_fee || 0);
    }
    next();
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
