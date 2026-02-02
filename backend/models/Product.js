/**
 * Product Model (replaces specs_db)
 * Flexible schema for any device type: smartphones, laptops, tablets, accessories, etc.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const ProductSchema = new Schema({
    // Primary identifier (backwards compatible with MariaDB product_id)
    product_id: {
        type: String,
        default: uuidv4,
        unique: true,
        index: true
    },

    // Device classification
    device_type: {
        type: String,
        enum: ['smartphone', 'tablet', 'laptop', 'accessory', 'spare_part', 'other', 'general'],
        default: 'smartphone',
        index: true
    },

    // Basic info (common to all device types)
    device_name: { type: String, required: true, index: true },
    device_maker: { type: String, index: true },
    device_price: { type: Number, default: 0 },
    color: String,

    // Flexible attributes - schema-less, different per device_type
    // Smartphones: { ram, processor, display_size, battery_capacity, rear_camera_main, ... }
    // Laptops: { cpu, ports, keyboard_layout, screen_size, ... }
    // Accessories: { compatibility, color_options, material, ... }
    attributes: {
        type: Schema.Types.Mixed,
        default: {}
    },

    // Common smartphone specs (kept for backward compatibility during migration)
    // These will be moved to attributes.* over time
    processor: String,
    ram: String,
    rom: String,
    display_size: Number,
    resolution: String,
    refresh_rate: String,
    battery_capacity: String,
    fast_charging: String,
    rear_camera_main: String,
    front_camera: String,
    operating_system: String,
    water_and_dust_rating: String,
    nfc: String,
    warranty_months: { type: Number, default: 12 },
    warranty_type: {
        type: String,
        enum: ['MANUFACTURER', 'DISTRIBUTOR', 'STORE', 'EXTENDED', 'NONE'],
        default: 'MANUFACTURER'
    },

    // Inventory settings
    inventory: {
        staging_inventory: { type: Number, default: 0 },
        reorder_point: { type: Number, default: 0 },
        reorder_quantity: { type: Number, default: 0 },
        lead_time_days: { type: Number, default: 7 },
        safety_stock: { type: Number, default: 0 },
        avg_daily_usage: { type: Number, default: 0 }
    },

    // Supplier reference
    default_supplier_id: { type: Number, index: true },

    // Status flags
    is_active: { type: Boolean, default: true, index: true },
    is_discontinued: { type: Boolean, default: false },
    launch_date: Date,
    end_of_life_date: Date

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'products'
});

// Indexes for common queries
ProductSchema.index({ device_maker: 1, device_name: 1 });
ProductSchema.index({ device_type: 1, is_active: 1 });
ProductSchema.index({ 'inventory.staging_inventory': 1 });

// Virtual for total available quantity (will be computed via aggregation in service)
ProductSchema.virtual('display_name').get(function () {
    return `${this.device_maker || ''} ${this.device_name || ''}`.trim();
});

// Static method to find by device type with flexible query
ProductSchema.statics.findByDeviceType = function (deviceType, additionalFilters = {}) {
    return this.find({ device_type: deviceType, is_active: true, ...additionalFilters });
};

// Instance method to update flexible attributes
ProductSchema.methods.setAttributes = function (newAttributes) {
    this.attributes = { ...this.attributes, ...newAttributes };
    return this.save();
};

module.exports = mongoose.model('Product', ProductSchema);
