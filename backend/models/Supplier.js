/**
 * Supplier Model (replaces suppliers table)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const SupplierSchema = new Schema({
    // Using auto-increment ID for backward compat
    supplier_id: { type: Number, unique: true, index: true },

    name: { type: String, required: true, index: true },
    category: { type: String, index: true },  // electronics, parts, accessories

    // Contact info
    contact_person: String,
    contact_position: String,
    email: { type: String, index: true },
    phone: String,
    website: String,

    // Address
    address: String,
    city: String,
    province: String,
    ward: String,
    district: String,

    // Business info
    tax_code: { type: String, index: true },
    payment_terms: String,  // Net 30, etc.
    lead_time_days: Number,
    rating: { type: Number, min: 0, max: 5 },

    // Brands they supply
    brands: [String],

    // Additional contacts
    additional_contacts: [{
        name: String,
        position: String,
        email: String,
        phone: String
    }],

    notes: String,
    is_active: { type: Boolean, default: true, index: true }

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'suppliers'
});

// Auto-increment supplier_id
SupplierSchema.pre('save', async function () {
    if (this.isNew && !this.supplier_id) {
        const lastSupplier = await this.constructor.findOne().sort({ supplier_id: -1 });
        this.supplier_id = (lastSupplier?.supplier_id || 0) + 1;
    }
});

module.exports = mongoose.model('Supplier', SupplierSchema);
