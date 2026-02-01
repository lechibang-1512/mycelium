/**
 * RMA Model (replaces rma table)
 * Return Merchandise Authorization with embedded items and history
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

// RMA item subdocument
const RMAItemSchema = new Schema({
    product_id: String,
    spare_part_id: Number,
    serial_number: String,
    quantity: { type: Number, default: 1 },
    condition: String,
    disposition: {
        type: String,
        enum: ['restock', 'repair', 'scrap', 'return_to_supplier', 'pending'],
        default: 'pending'
    },
    unit_value: Number,
    notes: String
}, { _id: false });

// Status history subdocument
const RMAStatusHistorySchema = new Schema({
    old_status: String,
    new_status: String,
    changed_by: Number,
    changed_at: { type: Date, default: Date.now },
    notes: String
}, { _id: false });

// Attachment subdocument
const RMAAttachmentSchema = new Schema({
    file_name: String,
    file_path: String,
    file_type: String,
    uploaded_by: String,
    uploaded_at: { type: Date, default: Date.now }
}, { _id: false });

// Main RMA schema
const RMASchema = new Schema({
    rma_id: { type: String, default: uuidv4, unique: true, index: true },

    // Customer info
    customer: {
        name: { type: String, index: true },
        email: String,
        phone: String
    },

    // Original transaction reference
    original_receipt_id: String,
    original_transaction_date: Date,

    // Reason
    reason_code: {
        type: String,
        enum: ['defective', 'damaged', 'wrong_item', 'customer_remorse', 'warranty', 'other'],
        default: 'other'
    },
    reason_description: String,

    // Status
    status: {
        type: String,
        enum: ['pending', 'awaiting_receipt', 'received', 'inspecting', 'approved', 'rejected', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },

    // Location
    warehouse_id: String,
    quarantine_zone_id: Number,

    // Assignment
    requested_by: { type: Number, required: true },
    assigned_to: Number,

    // Dates
    expected_return_date: Date,
    actual_return_date: Date,
    inspection_date: Date,
    completion_date: Date,

    // Financial
    total_value: { type: Number, default: 0 },
    refund_amount: { type: Number, default: 0 },
    restocking_fee: { type: Number, default: 0 },

    // Embedded data
    items: [RMAItemSchema],
    status_history: [RMAStatusHistorySchema],
    attachments: [RMAAttachmentSchema],

    notes: String,
    internal_notes: String

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'rmas'
});

// Indexes
RMASchema.index({ status: 1, created_at: -1 });
RMASchema.index({ 'customer.name': 1, 'customer.email': 1 });

// Track status changes
RMASchema.pre('save', function (next) {
    if (this.isModified('status') && !this.isNew) {
        this.status_history.push({
            old_status: this._previousStatus,
            new_status: this.status,
            changed_at: new Date()
        });
    }
    next();
});

RMASchema.post('init', function () {
    this._previousStatus = this.status;
});

module.exports = mongoose.model('RMA', RMASchema);
