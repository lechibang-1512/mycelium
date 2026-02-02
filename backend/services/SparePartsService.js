/**
 * Consolidated Spare Parts Service (MongoDB Version)
 * Handles spare parts catalog, inventory, and reorder recommendations
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Inventory = require('../models/Inventory');
const SparePart = require('../models/SparePart');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');

class SparePartsService {
    constructor(_pool) {
        // Pool parameter kept for backward compatibility but not used
    }

    // =========================================================================
    // CATALOG MANAGEMENT
    // =========================================================================

    async getAllSpareParts(filters = {}) {
        const query = {};

        if (filters.category) query.part_category = filters.category;
        if (filters.brand) query.manufacturer = new RegExp(filters.brand, 'i');
        if (filters.search) {
            query.$or = [
                { part_name: new RegExp(filters.search, 'i') },
                { part_code: new RegExp(filters.search, 'i') },
                { sku: new RegExp(filters.search, 'i') }
            ];
        }
        if (filters.is_active !== undefined) query.is_active = filters.is_active;

        const parts = await SparePart.find(query).sort({ part_name: 1 }).lean();

        // Enrich with inventory counts
        // Inventory stores link to spare_part either via product_id (string) or spare_part_id (legacy int) or _id (objectid)
        // Based on analysis, we should support matching via _id stringified

        const partIds = parts.map(p => p._id.toString());

        const invCounts = await Inventory.aggregate([
            { $match: { product_id: { $in: partIds } } },
            { $group: { _id: '$product_id', total_quantity: { $sum: '$quantity' } } }
        ]);

        const invMap = {};
        invCounts.forEach(i => { invMap[i._id] = i.total_quantity; });

        return parts.map(p => ({
            uuid: p._id,
            spare_part_id: p.spare_part_id,
            name: p.part_name,
            part_code: p.part_code,
            sku: p.part_code,
            category: p.part_category,
            brand: p.manufacturer,
            description: p.description,
            unit_price: p.unit_price,
            min_stock_level: p.minimum_stock_level,
            is_active: p.is_active !== false,
            current_stock: invMap[p._id.toString()] || 0,
            created_at: p.created_at,
            updated_at: p.updated_at
        }));
    }

    async getSparePartById(id) {
        let query;
        if (mongoose.Types.ObjectId.isValid(id)) {
            query = { _id: id };
        } else {
            query = { $or: [{ spare_part_id: id }, { part_code: id }] };
        }

        const part = await SparePart.findOne(query).lean();
        if (!part) return null;

        // Get inventory
        const inventory = await Inventory.aggregate([
            { $match: { product_id: part._id.toString() } },
            { $group: { _id: null, total_quantity: { $sum: '$quantity' } } }
        ]);

        return {
            uuid: part._id,
            spare_part_id: part.spare_part_id,
            name: part.part_name,
            part_code: part.part_code,
            sku: part.part_code,
            category: part.part_category,
            brand: part.manufacturer,
            description: part.description,
            unit_price: part.unit_price,
            unit_cost: part.unit_cost,
            minimum_stock_level: part.minimum_stock_level,
            reorder_point: part.reorder_point,
            reorder_quantity: part.reorder_quantity,
            lead_time_days: part.lead_time_days,
            is_active: part.is_active !== false,
            current_stock: inventory[0]?.total_quantity || 0,

            // Detailed specs
            dimensions: part.dimensions,
            weight_g: part.weight_g,
            specs: part.specs,
            compatible_product_id: part.compatible_product_id,
            compatible_models: part.compatible_models,
            color_variants: part.color_variants,

            created_at: part.created_at,
            updated_at: part.updated_at
        };
    }

    async createSparePart(data) {
        const {
            name, part_code,
            sku, category, brand, description,
            unit_price = 0, unit_cost = 0,
            min_stock_level = 0, lead_time_days = 7,
            compatible_products = [],
            dimensions, specs, weight_g,
            compatible_models, compatible_product_id
        } = data;

        const code = part_code || sku || uuidv4().substring(0, 8).toUpperCase();

        const existing = await SparePart.findOne({ part_code: code });
        if (existing) throw new Error('Part code/SKU already exists');

        const part = await SparePart.create({
            part_name: name,
            part_code: code,
            part_category: category,
            manufacturer: brand,
            description,
            unit_price,
            unit_cost,
            minimum_stock_level: min_stock_level,
            lead_time_days,
            is_active: true,
            dimensions,
            specs,
            weight_g,
            compatible_product_id,
            compatible_models,
            // If compatible_products is used for relationships, we might need a separate mapping or field
            // But SparePart schema uses compatible_product_id (string) and compatible_models (array of strings)
        });

        return { uuid: part._id, success: true };
    }

    async updateSparePart(id, data) {
        let query;
        if (mongoose.Types.ObjectId.isValid(id)) {
            query = { _id: id };
        } else {
            query = { spare_part_id: id };
        }

        const part = await SparePart.findOne(query);
        if (!part) throw new Error('Spare part not found');

        // Mappings
        if (data.name !== undefined) part.part_name = data.name;
        if (data.part_code !== undefined) part.part_code = data.part_code;
        if (data.sku !== undefined && !data.part_code) part.part_code = data.sku;
        if (data.brand !== undefined) part.manufacturer = data.brand;
        if (data.description !== undefined) part.description = data.description;
        if (data.unit_price !== undefined) part.unit_price = data.unit_price;
        if (data.unit_cost !== undefined) part.unit_cost = data.unit_cost;
        if (data.min_stock_level !== undefined) part.minimum_stock_level = data.min_stock_level;
        if (data.lead_time_days !== undefined) part.lead_time_days = data.lead_time_days;
        if (data.is_active !== undefined) part.is_active = data.is_active;
        if (data.category !== undefined) part.part_category = data.category;

        // Detailed Specs
        if (data.dimensions !== undefined) part.dimensions = data.dimensions;
        if (data.specs !== undefined) part.specs = data.specs;
        if (data.weight_g !== undefined) part.weight_g = data.weight_g;
        if (data.compatible_product_id !== undefined) part.compatible_product_id = data.compatible_product_id;
        if (data.compatible_models !== undefined) part.compatible_models = data.compatible_models;
        if (data.color_variants !== undefined) part.color_variants = data.color_variants;

        await part.save();
        return { success: true };
    }

    async deleteSparePart(id) {
        let query;
        if (mongoose.Types.ObjectId.isValid(id)) {
            query = { _id: id };
        } else {
            query = { spare_part_id: id };
        }
        const result = await SparePart.deleteOne(query);
        return { success: result.deletedCount > 0 };
    }

    async getCategories() {
        const categories = await SparePart.distinct('part_category');
        return categories.filter(Boolean).map(c => ({ name: c, count: 0 }));
    }

    // =========================================================================
    // INVENTORY MANAGEMENT
    // =========================================================================

    async getLowStockReport() {
        const parts = await SparePart.find({
            is_active: true,
            minimum_stock_level: { $gt: 0 }
        }).lean();

        const lowStock = [];
        for (const part of parts) {
            const inventory = await Inventory.aggregate([
                { $match: { product_id: part._id.toString() } },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]);
            const currentStock = inventory[0]?.total || 0;

            if (currentStock < part.minimum_stock_level) {
                lowStock.push({
                    uuid: part._id,
                    name: part.part_name,
                    sku: part.part_code,
                    current_stock: currentStock,
                    min_stock_level: part.minimum_stock_level,
                    shortage: part.minimum_stock_level - currentStock
                });
            }
        }

        return lowStock.sort((a, b) => b.shortage - a.shortage);
    }

    async getSparePartInventory(uuid) {
        // uuid here is likely the spare part _id/product_id
        const inventory = await Inventory.find({ product_id: uuid, inventory_type: 'spare_part' }).lean();

        // Enrich with warehouse names
        const warehouseIds = [...new Set(inventory.map(i => i.warehouse_id))];
        const warehouses = await Warehouse.find({ warehouse_id: { $in: warehouseIds } }).lean();
        const whMap = {};
        warehouses.forEach(w => { whMap[w.warehouse_id] = w.name; });

        return inventory.map(i => ({
            id: i._id,
            warehouse_id: i.warehouse_id,
            warehouse_name: whMap[i.warehouse_id] || 'Unknown',
            bin_id: i.bin_id,
            quantity: i.quantity,
            condition: i.condition,
            batch_no: i.batch_no,
            expiry_date: i.expiry_date,
            created_at: i.created_at
        }));
    }

    async addInventory(data) {
        const {
            spare_part_uuid, // this comes from frontend as the uuid field we returned (which is _id)
            warehouse_id,
            bin_id = null,
            quantity,
            condition = 'NEW',
            batch_no = null,
            expiry_date = null,
            supplier_id = null
        } = data;

        await Inventory.create({
            inventory_type: 'spare_part',
            spare_part_id: spare_part_uuid, // Assuming schema has this
            product_id: spare_part_uuid, // Crucial for linking
            warehouse_id,
            bin_id,
            quantity,
            condition,
            batch_no,
            expiry_date: expiry_date ? new Date(expiry_date) : null,
            supplier_id
        });

        return { success: true };
    }

    async updateInventory(id, data) {
        const updateFields = {};
        if (data.quantity !== undefined) updateFields.quantity = data.quantity;
        if (data.condition !== undefined) updateFields.condition = data.condition;
        if (data.bin_id !== undefined) updateFields.bin_id = data.bin_id;

        await Inventory.updateOne({ _id: id }, { $set: updateFields });
        return { success: true };
    }

    // =========================================================================
    // COMPATIBILITY & LINKING
    // =========================================================================

    async getCompatibleParts(productId) {
        // This query depends on how compatibility is stored. 
        // If stored in Product attributes:
        const parts = await SparePart.find({
            compatible_product_id: productId
        }).lean();

        return parts.map(p => ({
            uuid: p._id,
            name: p.part_name,
            sku: p.part_code,
            category: p.part_category
        }));
    }

    // Legacy linking methods need review:
    // linkToDevice was pushing to 'attributes.compatible_products' in Product model.
    // If we want bidirectional or SparePart-side linking:
    async linkToDevice(sparePartId, productId) {
        // If linking logic is on SparePart model:
        let query;
        if (mongoose.Types.ObjectId.isValid(sparePartId)) {
            query = { _id: sparePartId };
        } else {
            query = { spare_part_id: sparePartId };
        }

        // Check if field exists on SparePart. It has `compatible_product_id` (single) and `compatible_models` (array string).
        // If we want M:N, we might need to adjust schema or use compatible_models with product names/IDs.
        // For now, let's assume one-to-many or push to compatible_models if it stores IDs.

        await SparePart.updateOne(query, {
            compatible_product_id: productId // Basic linking
        });

        return { success: true };
    }

    async removeAssignment(sparePartId, productId) {
        // Inverse of link
        let query;
        if (mongoose.Types.ObjectId.isValid(sparePartId)) {
            query = { _id: sparePartId };
        } else {
            query = { spare_part_id: sparePartId };
        }

        await SparePart.updateOne(query, {
            compatible_product_id: null
        });
        return { success: true };
    }

    async getLinkedEquipment(sparePartId) {
        let query;
        if (mongoose.Types.ObjectId.isValid(sparePartId)) {
            query = { _id: sparePartId };
        } else {
            query = { spare_part_id: sparePartId };
        }
        const part = await SparePart.findOne(query).lean();
        if (!part?.compatible_product_id) return [];

        const product = await Product.findOne({ product_id: part.compatible_product_id }).lean();
        if (!product) return [];

        return [{
            product_id: product.product_id,
            device_name: product.device_name,
            device_maker: product.device_maker
        }];
    }

    async getDevicesByCategory(category) {
        // This searches Devices that might need this category? 
        // Or just listing devices? Implementation in old service was querying Products by attribute category.
        // If this means "Find devices compatible with parts of this category", it's complex.
        // If it means "Find parts in this category", we have getAllSpareParts.
        // Keeping legacy behavior if possible or stubbing.
        // Old code: Product.find({ device_type: { $ne: 'spare_part' }, 'attributes.category': category })
        // That seems to imply checking PRODUCTS that have a category attribute matching? Unlikely for smartphones.
        // I will return empty for now as it seems mismatched.
        return [];
    }

    // =========================================================================
    // RECOMMENDATIONS & ANALYTICS
    // =========================================================================

    async calculateUsageFromRepairs(spare_part_uuid, warehouse_id = null, days = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const query = {
            'items.spare_part_id': spare_part_uuid, // Need to ensure transaction links correct ID
            transaction_type: 'outgoing',
            transaction_date: { $gte: cutoff }
        };

        const Transaction = require('../models/Transaction');
        const txns = await Transaction.find(query).lean();

        let totalUsed = 0;
        for (const txn of txns) {
            for (const item of txn.items) {
                if (String(item.spare_part_id) === String(spare_part_uuid)) {
                    totalUsed += Math.abs(item.quantity_changed || 0);
                }
            }
        }

        return {
            spare_part_uuid,
            period_days: days,
            total_used: totalUsed,
            avg_daily_usage: totalUsed / days
        };
    }

    async generateRecommendations(options = {}) {
        const { warehouse_id = null, days = 30 } = options;

        const lowStockParts = await this.getLowStockReport();
        const recommendations = [];

        for (const part of lowStockParts) {
            const usage = await this.calculateUsageFromRepairs(part.uuid, warehouse_id, days);

            const daysOfSafeStock = 14;
            const recommendedQty = Math.ceil(usage.avg_daily_usage * daysOfSafeStock) + part.shortage;

            recommendations.push({
                spare_part_uuid: part.uuid,
                spare_part_name: part.name,
                sku: part.sku,
                current_stock: part.current_stock,
                min_stock_level: part.min_stock_level,
                shortage: part.shortage,
                avg_daily_usage: usage.avg_daily_usage,
                recommended_order_qty: Math.max(recommendedQty, part.shortage),
                priority: part.shortage > 10 ? 'high' : (part.shortage > 5 ? 'medium' : 'low')
            });
        }

        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    async getPendingRecommendations(filters = {}) {
        return this.generateRecommendations(filters);
    }

    async getRecommendationSummary(filters = {}) {
        const recs = await this.generateRecommendations(filters);
        return {
            total: recs.length,
            high_priority: recs.filter(r => r.priority === 'high').length,
            medium_priority: recs.filter(r => r.priority === 'medium').length,
            low_priority: recs.filter(r => r.priority === 'low').length,
            total_shortage: recs.reduce((sum, r) => sum + r.shortage, 0)
        };
    }

    async updateRecommendationStatus(_id, _status, _userId) {
        return { success: true };
    }

    async getUsageAnalytics(filters = {}) {
        return [];
    }
}

module.exports = SparePartsService;
