/**
 * SparePart Model (replaces smartphone_spare_parts)
 * Spare parts catalog with inventory tracked in Inventory collection
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const SparePartSchema = new Schema({
    spare_part_id: { type: Number, unique: true, index: true },

    part_code: { type: String, required: true, unique: true, index: true },
    part_name: { type: String, required: true, index: true },

    part_category: {
        type: String,
        enum: [
            'DISPLAY', 'BATTERY', 'CAMERA_REAR', 'CAMERA_FRONT', 'MOTHERBOARD',
            'SPEAKER', 'MICROPHONE', 'CHARGING_PORT', 'BUTTON', 'CASE',
            'ANTENNA', 'FLEX_CABLE', 'OTHER'
        ],
        required: true,
        index: true
    },
    part_type: String,  // OLED, LCD, Li-ion, etc.
    description: String,

    // Compatibility
    compatible_product_id: String,
    compatible_device_category: String,
    compatible_brands: [String],
    compatible_models: [String],

    // Physical specs
    dimensions: String,
    weight_g: Number,
    color_variants: [String],

    // Quality and warranty
    quality_grade: {
        type: String,
        enum: ['OEM', 'ORIGINAL', 'PREMIUM', 'STANDARD', 'ECONOMY'],
        default: 'STANDARD'
    },
    warranty_months: { type: Number, default: 3 },

    // Supplier and pricing
    manufacturer: String,
    manufacturer_part_number: String,
    default_supplier_id: Number,
    unit_cost: { type: Number, default: 0 },
    unit_price: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },

    // Inventory thresholds
    minimum_stock_level: { type: Number, default: 5 },
    max_stock_level: { type: Number, default: 50 },
    reorder_point: { type: Number, default: 10 },
    reorder_quantity: { type: Number, default: 20 },
    lead_time_days: Number,

    // Flags
    is_active: { type: Boolean, default: true, index: true },
    is_hazardous: { type: Boolean, default: false },
    requires_serial_tracking: { type: Boolean, default: false },

    notes: String,
    created_by: String

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'spare_parts'
});

// Auto-increment spare_part_id
SparePartSchema.pre('save', async function (next) {
    if (this.isNew && !this.spare_part_id) {
        const last = await this.constructor.findOne().sort({ spare_part_id: -1 });
        this.spare_part_id = (last?.spare_part_id || 0) + 1;
    }
    next();
});

// Indexes
SparePartSchema.index({ part_category: 1, quality_grade: 1 });
SparePartSchema.index({ is_active: 1, default_supplier_id: 1 });

module.exports = mongoose.model('SparePart', SparePartSchema);
