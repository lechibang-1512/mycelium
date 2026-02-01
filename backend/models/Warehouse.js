/**
 * Warehouse Model (replaces warehouses, warehouse_zones, bin_locations)
 * Denormalized document structure with embedded zones and bins
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

// Bin subdocument schema
const BinSchema = new Schema({
    bin_id: { type: String, default: uuidv4 },
    bin_code: { type: String, required: true },
    bin_type: {
        type: String,
        enum: ['standard', 'cold', 'hazmat', 'bulk', 'small_parts'],
        default: 'standard'
    },
    product_type: {
        type: String,
        enum: ['smartphone', 'spare_part', null],
        default: null
    },

    // Hierarchical positioning (C-R-B system)
    row_position: String,
    column_position: String,
    bin_position: String,
    hierarchical_code: String,  // e.g., "C01-R02-B03"

    // Legacy fields (for backward compat during migration)
    aisle: String,
    rack: String,
    shelf: String,

    // Capacity
    max_capacity: Number,
    weight_capacity: Number,
    height_cm: Number,
    width_cm: Number,
    depth_cm: Number,

    // Temperature control
    temperature_controlled: { type: Boolean, default: false },
    temperature_min: Number,
    temperature_max: Number,

    // Status
    priority_level: {
        type: String,
        enum: ['low', 'normal', 'high', 'critical'],
        default: 'normal'
    },
    accessibility_level: {
        type: String,
        enum: ['easy', 'moderate', 'difficult', 'restricted'],
        default: 'easy'
    },
    is_active: { type: Boolean, default: true },
    notes: String
}, { _id: false });

// Zone subdocument schema
const ZoneSchema = new Schema({
    zone_id: { type: Number, required: true },
    zone_uuid: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    description: String,
    zone_type: {
        type: String,
        enum: ['receiving', 'storage', 'picking', 'staging', 'shipping'],
        default: 'storage'
    },

    // Bin configuration
    bin_prefix: String,        // e.g., "RCV", "STG", "PCK"
    max_bins: Number,
    require_bins: { type: Boolean, default: false },
    default_bin_type: {
        type: String,
        enum: ['standard', 'cold', 'hazmat', 'bulk', 'small_parts'],
        default: 'standard'
    },
    bin_layout: {
        type: String,
        enum: ['single_row', 'double_row', 'grid', 'mixed', 'custom'],
        default: 'grid'
    },

    capacity_limit: Number,
    is_active: { type: Boolean, default: true },

    // Embedded bins
    bins: [BinSchema]
}, { _id: false });

// Main Warehouse schema
const WarehouseSchema = new Schema({
    warehouse_id: {
        type: String,
        default: uuidv4,
        unique: true,
        index: true
    },
    warehouse_uuid: String,  // Legacy compat

    name: { type: String, required: true, index: true },
    location: String,
    description: String,

    contact_info: {
        phone: String,
        email: String,
        manager: String
    },

    is_active: { type: Boolean, default: true, index: true },

    // Embedded zones with bins
    zones: [ZoneSchema]

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'warehouses'
});

// Indexes
WarehouseSchema.index({ 'zones.zone_id': 1 });
WarehouseSchema.index({ 'zones.bins.bin_id': 1 });
WarehouseSchema.index({ 'zones.zone_type': 1 });

// Methods to manage zones and bins
WarehouseSchema.methods.addZone = function (zoneData) {
    const maxZoneId = this.zones.reduce((max, z) => Math.max(max, z.zone_id || 0), 0);
    zoneData.zone_id = maxZoneId + 1;
    this.zones.push(zoneData);
    return this.save();
};

WarehouseSchema.methods.addBinToZone = function (zoneId, binData) {
    const zone = this.zones.find(z => z.zone_id === zoneId);
    if (!zone) throw new Error(`Zone ${zoneId} not found`);
    zone.bins.push(binData);
    return this.save();
};

WarehouseSchema.methods.findZone = function (zoneId) {
    return this.zones.find(z => z.zone_id === zoneId);
};

WarehouseSchema.methods.findBin = function (binId) {
    for (const zone of this.zones) {
        const bin = zone.bins.find(b => b.bin_id === binId);
        if (bin) return { zone, bin };
    }
    return null;
};

module.exports = mongoose.model('Warehouse', WarehouseSchema);
