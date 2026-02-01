/**
 * Inventory Model (replaces warehouse_product_locations, serialized_inventory, bin_inventory)
 * Unified collection for all inventory types with discriminator pattern
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const InventorySchema = new Schema({
    // Discriminator for inventory type
    inventory_type: {
        type: String,
        enum: ['bulk', 'serialized', 'spare_part', 'batch'],
        required: true,
        index: true
    },

    // Product reference (for bulk and serialized)
    product_id: { type: String, index: true },

    // Spare part reference (for spare_part type)
    spare_part_id: { type: Number, index: true },

    // Batch reference (for batch type)
    batch_id: { type: Number, index: true },
    batch_no: String,

    // Location references
    warehouse_id: { type: String, required: true, index: true },
    zone_id: { type: Number, index: true },
    bin_id: { type: String, index: true },

    // Quantity fields (for bulk/spare_part/batch)
    quantity: { type: Number, default: 0, min: 0 },
    reserved_quantity: { type: Number, default: 0, min: 0 },
    min_stock_level: { type: Number, default: 0 },

    // Condition (for bulk inventory)
    condition: {
        type: String,
        enum: ['NEW', 'REFURBISHED', 'USED', 'TESTING', 'DEFECTIVE'],
        default: 'NEW'
    },

    // Serialized inventory specific fields
    serial_number: { type: String },
    imei_1: { type: String },
    imei_2: String,
    status: {
        type: String,
        enum: ['available', 'reserved', 'sold', 'damaged', 'returned', 'scrapped', 'in_repair', 'quarantine'],
        default: 'available'
    },
    condition_grade: {
        type: String,
        enum: ['A', 'B', 'C', 'D', 'F'],
        default: 'A'
    },

    // Spare parts specific
    quantity_on_hand: { type: Number, default: 0, min: 0 },
    quantity_reserved: { type: Number, default: 0, min: 0 },
    quantity_defective: { type: Number, default: 0, min: 0 },
    quantity_in_transit: { type: Number, default: 0, min: 0 },

    // Batch/expiry tracking
    manufacture_date: Date,
    expiry_date: Date,

    // Supplier/invoice tracking
    supplier_id: Number,
    import_invoice_id: Number,

    // Count/audit tracking
    last_counted_at: Date,
    last_counted_by: String,
    last_movement_at: Date,
    last_movement_type: String,

    notes: String

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'inventory'
});

// Compound indexes for common query patterns
InventorySchema.index({ warehouse_id: 1, product_id: 1, condition: 1 });
InventorySchema.index({ warehouse_id: 1, zone_id: 1, bin_id: 1 });
InventorySchema.index({ inventory_type: 1, warehouse_id: 1 });
InventorySchema.index({ serial_number: 1 }, { sparse: true });
InventorySchema.index({ imei_1: 1 }, { sparse: true });
InventorySchema.index({ expiry_date: 1 }, { sparse: true });

// Virtual for available quantity
InventorySchema.virtual('available_quantity').get(function () {
    if (this.inventory_type === 'bulk') {
        return this.quantity - this.reserved_quantity;
    }
    if (this.inventory_type === 'spare_part') {
        return this.quantity_on_hand - this.quantity_reserved;
    }
    return this.status === 'available' ? 1 : 0;
});

// Static methods for common queries
InventorySchema.statics.getBulkInventory = function (warehouseId, productId) {
    return this.find({
        inventory_type: 'bulk',
        warehouse_id: warehouseId,
        product_id: productId
    });
};

InventorySchema.statics.getSerializedByIMEI = function (imei) {
    return this.findOne({
        inventory_type: 'serialized',
        $or: [{ imei_1: imei }, { imei_2: imei }]
    });
};

InventorySchema.statics.getSparePartStock = function (warehouseId, sparePartId) {
    return this.findOne({
        inventory_type: 'spare_part',
        warehouse_id: warehouseId,
        spare_part_id: sparePartId
    });
};

InventorySchema.statics.getLowStockItems = function (warehouseId) {
    return this.find({
        warehouse_id: warehouseId,
        $expr: { $lte: ['$quantity', '$min_stock_level'] }
    });
};

// Instance method to reserve stock
InventorySchema.methods.reserve = function (qty) {
    if (this.inventory_type === 'serialized') {
        if (this.status !== 'available') throw new Error('Item not available');
        this.status = 'reserved';
    } else {
        const available = this.quantity - this.reserved_quantity;
        if (qty > available) throw new Error('Insufficient stock');
        this.reserved_quantity += qty;
    }
    return this.save();
};

// Instance method to release reservation
InventorySchema.methods.releaseReservation = function (qty) {
    if (this.inventory_type === 'serialized') {
        if (this.status === 'reserved') this.status = 'available';
    } else {
        this.reserved_quantity = Math.max(0, this.reserved_quantity - qty);
    }
    return this.save();
};

module.exports = mongoose.model('Inventory', InventorySchema);
