/**
 * Transaction Model (replaces inventory_log)
 * Unified transaction log for all inventory movements
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

// Transaction item subdocument
const TransactionItemSchema = new Schema({
    product_id: String,
    spare_part_id: Number,
    batch_id: Number,
    asset_id: Number,
    serial_number: String,

    quantity_changed: Number,
    condition: {
        type: String,
        enum: ['NEW', 'REFURBISHED', 'USED', 'TESTING', 'DEFECTIVE'],
        default: 'NEW'
    },

    unit_cost: { type: Number, default: 0 },
    total_value: { type: Number, default: 0 },

    // Location info
    from_location: {
        warehouse_id: String,
        zone_id: Number,
        bin_id: String
    },
    to_location: {
        warehouse_id: String,
        zone_id: Number,
        bin_id: String
    },

    // Post-transaction state
    new_inventory_level: Number,

    notes: String
}, { _id: false });

// Main Transaction schema
const TransactionSchema = new Schema({
    // Transaction identification
    transaction_group_id: {
        type: String,
        default: () => `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        index: true
    },
    receipt_id: { type: String, index: true },

    transaction_type: {
        type: String,
        enum: [
            'incoming', 'outgoing', 'adjustment', 'transfer',
            'rma_return', 'rma_disposition',
            'zone_transfer_out', 'zone_transfer_in',
            'zone_to_bin', 'bin_to_zone', 'bin_transfer', 'bin_deletion_return'
        ],
        required: true,
        index: true
    },

    transaction_date: { type: Date, default: Date.now, index: true },

    // Transaction items
    items: [TransactionItemSchema],

    // Location (primary)
    warehouse_id: { type: String, index: true },
    from_warehouse_id: String,
    zone_id: Number,
    bin_id: String,

    // Financial totals
    totals: {
        subtotal: { type: Number, default: 0 },
        tax_amount: { type: Number, default: 0 },
        total_amount: { type: Number, default: 0 },
        shipping_fee: { type: Number, default: 0 },
        discount_amount: { type: Number, default: 0 }
    },

    // References
    supplier_id: Number,
    invoice_id: Number,
    po_id: Number,
    user_id: Number,

    // External references
    external_doc_no: String,
    document_reference: String,

    // Customer info (for outgoing)
    customer: {
        name: String,
        address: String,
        phone: String,
        email: String
    },

    delivery_person: String,

    notes: String,
    internal_notes: String

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'transactions'
});

// Compound indexes
TransactionSchema.index({ transaction_date: -1, transaction_type: 1 });
TransactionSchema.index({ warehouse_id: 1, transaction_date: -1 });
TransactionSchema.index({ supplier_id: 1, transaction_date: -1 });
TransactionSchema.index({ 'items.product_id': 1 });

// Pre-save validation for referential integrity
TransactionSchema.pre('save', async function (next) {
    const mongoose = require('mongoose');

    // Validate supplier_id if provided
    if (this.supplier_id) {
        const Supplier = mongoose.model('Supplier');
        const supplierExists = await Supplier.exists({ supplier_id: this.supplier_id });
        if (!supplierExists) {
            return next(new Error(`Invalid supplier_id: ${this.supplier_id} does not exist`));
        }
    }

    // Validate warehouse_id if provided
    if (this.warehouse_id) {
        const Warehouse = mongoose.model('Warehouse');
        const warehouseExists = await Warehouse.exists({ warehouse_id: this.warehouse_id });
        if (!warehouseExists) {
            return next(new Error(`Invalid warehouse_id: ${this.warehouse_id} does not exist`));
        }
    }

    next();
});

// Statics
TransactionSchema.statics.getByDateRange = function (startDate, endDate, filters = {}) {
    return this.find({
        transaction_date: { $gte: startDate, $lte: endDate },
        ...filters
    }).sort({ transaction_date: -1 });
};

TransactionSchema.statics.getByProduct = function (productId, limit = 50) {
    return this.find({ 'items.product_id': productId })
        .sort({ transaction_date: -1 })
        .limit(limit);
};

TransactionSchema.statics.summarizeByType = function (warehouseId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                warehouse_id: warehouseId,
                transaction_date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$transaction_type',
                count: { $sum: 1 },
                total_value: { $sum: '$totals.total_amount' },
                total_items: { $sum: { $size: '$items' } }
            }
        }
    ]);
};

module.exports = mongoose.model('Transaction', TransactionSchema);
