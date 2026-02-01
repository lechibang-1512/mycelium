/**
 * RepairJob Model (replaces smartphone_repair_jobs and related tables)
 * Complete repair job tracking with embedded parts usage and attachments
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Parts usage subdocument
const PartsUsageSchema = new Schema({
    spare_part_id: { type: Number, required: true },
    inventory_id: Number,
    quantity_used: { type: Number, default: 1, min: 1 },
    unit_cost: { type: Number, default: 0 },
    total_cost: Number,  // Calculated: quantity_used * unit_cost
    installed_date: { type: Date, default: Date.now },
    installed_by: String,
    warranty_months: Number,
    notes: String
}, { _id: false });

// Attachment subdocument
const AttachmentSchema = new Schema({
    file_name: { type: String, required: true },
    file_path: { type: String, required: true },
    file_type: {
        type: String,
        enum: ['IMAGE', 'DOCUMENT', 'VIDEO', 'OTHER'],
        default: 'IMAGE'
    },
    file_size_kb: Number,
    mime_type: String,
    category: {
        type: String,
        enum: ['BEFORE_PHOTO', 'AFTER_PHOTO', 'INVOICE', 'QUOTE', 'DIAGNOSTIC_REPORT', 'WARRANTY_CARD', 'OTHER'],
        default: 'OTHER'
    },
    description: String,
    uploaded_by: String,
    uploaded_at: { type: Date, default: Date.now }
}, { _id: false });

// Status history subdocument
const StatusHistorySchema = new Schema({
    old_status: String,
    new_status: String,
    changed_by: String,
    changed_at: { type: Date, default: Date.now },
    notes: String
}, { _id: false });

// Main RepairJob schema
const RepairJobSchema = new Schema({
    repair_job_id: { type: Number, unique: true, index: true },
    job_number: { type: String, required: true, unique: true, index: true },

    // Device info
    product_id: String,
    device_name: String,
    device_serial_number: { type: String, index: true },
    device_imei: { type: String, index: true },

    // Customer info
    customer: {
        name: { type: String, index: true },
        phone: String,
        email: String,
        address: String
    },

    // Issue and diagnosis
    issue_description: { type: String, required: true },
    diagnosis: String,
    repair_notes: String,

    // Status and priority
    status: {
        type: String,
        enum: ['PENDING', 'DIAGNOSED', 'PARTS_ORDERED', 'IN_PROGRESS', 'TESTING', 'COMPLETED', 'DELIVERED', 'CANCELLED'],
        default: 'PENDING',
        index: true
    },
    priority: {
        type: String,
        enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
        default: 'NORMAL'
    },

    // Assignment
    assigned_technician: { type: String, index: true },
    assigned_at: Date,
    warehouse_id: String,

    // Dates
    received_date: { type: Date, default: Date.now },
    estimated_completion_date: Date,
    completion_date: Date,
    delivered_date: Date,

    // Costs
    costs: {
        estimated: { type: Number, default: 0 },
        parts: { type: Number, default: 0 },
        labor: { type: Number, default: 0 },
        final: { type: Number, default: 0 },
        customer_charge: { type: Number, default: 0 }
    },
    currency: { type: String, default: 'USD' },

    // Testing
    tested_by: String,
    test_results: String,
    quality_check_passed: Boolean,

    // Warranty
    warranty_months: { type: Number, default: 3 },
    warranty_expires_at: Date,

    // Embedded data
    parts_used: [PartsUsageSchema],
    attachments: [AttachmentSchema],
    status_history: [StatusHistorySchema],

    created_by: String

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'repair_jobs'
});

// Auto-increment repair_job_id
RepairJobSchema.pre('save', async function (next) {
    if (this.isNew) {
        if (!this.repair_job_id) {
            const last = await this.constructor.findOne().sort({ repair_job_id: -1 });
            this.repair_job_id = (last?.repair_job_id || 0) + 1;
        }
        if (!this.job_number) {
            const year = new Date().getFullYear();
            this.job_number = `RPR-${year}-${String(this.repair_job_id).padStart(5, '0')}`;
        }
    }

    // Calculate total parts cost
    if (this.parts_used && this.parts_used.length > 0) {
        this.costs.parts = this.parts_used.reduce((sum, part) => {
            part.total_cost = part.quantity_used * part.unit_cost;
            return sum + part.total_cost;
        }, 0);
    }

    next();
});

// Track status changes
RepairJobSchema.pre('save', function (next) {
    if (this.isModified('status') && !this.isNew) {
        this.status_history.push({
            old_status: this._previousStatus,
            new_status: this.status,
            changed_at: new Date()
        });
    }
    next();
});

RepairJobSchema.post('init', function () {
    this._previousStatus = this.status;
});

// Indexes
RepairJobSchema.index({ status: 1, received_date: -1 });
RepairJobSchema.index({ assigned_technician: 1, status: 1 });

module.exports = mongoose.model('RepairJob', RepairJobSchema);
