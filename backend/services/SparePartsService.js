/**
 * Consolidated Spare Parts Service (MongoDB Version)
 * Handles spare parts catalog, inventory, and reorder recommendations
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Inventory = require('../models/Inventory');
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
        const query = { device_type: 'spare_part' };

        if (filters.category) query['attributes.category'] = filters.category;
        if (filters.brand) query.device_maker = new RegExp(filters.brand, 'i');
        if (filters.search) {
            query.$or = [
                { device_name: new RegExp(filters.search, 'i') },
                { sku: new RegExp(filters.search, 'i') }
            ];
        }
        if (filters.is_active !== undefined) query.is_active = filters.is_active;

        const parts = await Product.find(query).sort({ device_name: 1 }).lean();

        // Enrich with inventory counts
        const partIds = parts.map(p => p.product_id);
        const invCounts = await Inventory.aggregate([
            { $match: { spare_part_id: { $in: partIds } } },
            { $group: { _id: '$spare_part_id', total_quantity: { $sum: '$quantity' } } }
        ]);
        const invMap = {};
        invCounts.forEach(i => { invMap[i._id] = i.total_quantity; });

        return parts.map(p => ({
            uuid: p.product_id,
            name: p.device_name,
            sku: p.sku,
            category: p.attributes?.category,
            brand: p.device_maker,
            description: p.description,
            unit_price: p.base_price,
            min_stock_level: p.min_stock_level,
            is_active: p.is_active !== false,
            current_stock: invMap[p.product_id] || 0,
            created_at: p.created_at,
            updated_at: p.updated_at
        }));
    }

    async getSparePartById(uuid) {
        const part = await Product.findOne({ product_id: uuid }).lean();
        if (!part) return null;

        // Get inventory
        const inventory = await Inventory.aggregate([
            { $match: { spare_part_id: uuid } },
            { $group: { _id: null, total_quantity: { $sum: '$quantity' } } }
        ]);

        return {
            uuid: part.product_id,
            name: part.device_name,
            sku: part.sku,
            category: part.attributes?.category,
            brand: part.device_maker,
            description: part.description,
            unit_price: part.base_price,
            min_stock_level: part.min_stock_level,
            lead_time_days: part.lead_time_days,
            is_active: part.is_active !== false,
            current_stock: inventory[0]?.total_quantity || 0,
            attributes: part.attributes,
            created_at: part.created_at,
            updated_at: part.updated_at
        };
    }

    async createSparePart(data) {
        const {
            name, sku, category, brand, description,
            unit_price = 0, min_stock_level = 0, lead_time_days = 7,
            compatible_products = []
        } = data;

        // Check duplicate SKU
        if (sku) {
            const existing = await Product.findOne({ sku });
            if (existing) throw new Error('SKU already exists');
        }

        const part = await Product.create({
            product_id: uuidv4(),
            device_type: 'spare_part',
            device_name: name,
            sku: sku || uuidv4().substring(0, 8).toUpperCase(),
            device_maker: brand,
            description,
            base_price: unit_price,
            min_stock_level,
            lead_time_days,
            is_active: true,
            attributes: {
                category,
                compatible_products
            }
        });

        return { uuid: part.product_id, success: true };
    }

    async updateSparePart(uuid, data) {
        const part = await Product.findOne({ product_id: uuid });
        if (!part) throw new Error('Spare part not found');

        const updateFields = {};
        if (data.name !== undefined) updateFields.device_name = data.name;
        if (data.sku !== undefined) updateFields.sku = data.sku;
        if (data.brand !== undefined) updateFields.device_maker = data.brand;
        if (data.description !== undefined) updateFields.description = data.description;
        if (data.unit_price !== undefined) updateFields.base_price = data.unit_price;
        if (data.min_stock_level !== undefined) updateFields.min_stock_level = data.min_stock_level;
        if (data.lead_time_days !== undefined) updateFields.lead_time_days = data.lead_time_days;
        if (data.is_active !== undefined) updateFields.is_active = data.is_active;
        if (data.category !== undefined) updateFields['attributes.category'] = data.category;

        await Product.updateOne({ product_id: uuid }, { $set: updateFields });
        return { success: true };
    }

    async deleteSparePart(uuid) {
        const result = await Product.deleteOne({ product_id: uuid });
        return { success: result.deletedCount > 0 };
    }

    async getCategories() {
        const categories = await Product.distinct('attributes.category', { device_type: 'spare_part' });
        return categories.filter(Boolean).map(c => ({ name: c, count: 0 }));
    }

    // =========================================================================
    // INVENTORY MANAGEMENT
    // =========================================================================

    async getLowStockReport() {
        const parts = await Product.find({
            device_type: 'spare_part',
            is_active: true,
            min_stock_level: { $gt: 0 }
        }).lean();

        const lowStock = [];
        for (const part of parts) {
            const inventory = await Inventory.aggregate([
                { $match: { spare_part_id: part.product_id } },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]);
            const currentStock = inventory[0]?.total || 0;

            if (currentStock < part.min_stock_level) {
                lowStock.push({
                    uuid: part.product_id,
                    name: part.device_name,
                    sku: part.sku,
                    current_stock: currentStock,
                    min_stock_level: part.min_stock_level,
                    shortage: part.min_stock_level - currentStock
                });
            }
        }

        return lowStock.sort((a, b) => b.shortage - a.shortage);
    }

    async getSparePartInventory(uuid) {
        const inventory = await Inventory.find({ spare_part_id: uuid }).lean();

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
            spare_part_uuid,
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
            spare_part_id: spare_part_uuid,
            product_id: spare_part_uuid,
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
        const parts = await Product.find({
            device_type: 'spare_part',
            'attributes.compatible_products': productId
        }).lean();

        return parts.map(p => ({
            uuid: p.product_id,
            name: p.device_name,
            sku: p.sku,
            category: p.attributes?.category
        }));
    }

    async linkToDevice(sparePartUuid, productId) {
        await Product.updateOne(
            { product_id: sparePartUuid },
            { $addToSet: { 'attributes.compatible_products': productId } }
        );
        return { success: true };
    }

    async removeAssignment(sparePartUuid, productId) {
        await Product.updateOne(
            { product_id: sparePartUuid },
            { $pull: { 'attributes.compatible_products': productId } }
        );
        return { success: true };
    }

    async getLinkedEquipment(sparePartUuid) {
        const part = await Product.findOne({ product_id: sparePartUuid }).lean();
        if (!part?.attributes?.compatible_products) return [];

        const products = await Product.find({
            product_id: { $in: part.attributes.compatible_products }
        }).lean();

        return products.map(p => ({
            product_id: p.product_id,
            device_name: p.device_name,
            device_maker: p.device_maker
        }));
    }

    async getDevicesByCategory(category) {
        const products = await Product.find({
            device_type: { $ne: 'spare_part' },
            'attributes.category': category
        }).lean();

        return products.map(p => ({
            product_id: p.product_id,
            device_name: p.device_name,
            device_maker: p.device_maker
        }));
    }

    // =========================================================================
    // RECOMMENDATIONS & ANALYTICS
    // =========================================================================

    async calculateUsageFromRepairs(spare_part_uuid, warehouse_id = null, days = 30) {
        // Would need Repair model integration
        // For now, estimate from inventory transactions
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const query = {
            'items.spare_part_id': spare_part_uuid,
            transaction_type: 'outgoing',
            transaction_date: { $gte: cutoff }
        };

        const Transaction = require('../models/Transaction');
        const txns = await Transaction.find(query).lean();

        let totalUsed = 0;
        for (const txn of txns) {
            for (const item of txn.items) {
                if (item.spare_part_id === spare_part_uuid) {
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

            // Calculate recommended order quantity
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
        // Placeholder - would need separate recommendation tracking collection
        return { success: true };
    }

    async getUsageAnalytics(filters = {}) {
        // Placeholder - would need more complex aggregation
        return [];
    }
}

module.exports = SparePartsService;
