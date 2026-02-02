/**
 * Phones Service (MongoDB Version)
 * Handles phone (Product) queries and CRUD operations
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

class PhonesService {
    constructor(_pool) { }

    async getAllPhones(filters = {}) {
        const query = { device_type: { $in: ['smartphone', 'phone', 'tablet'] } };

        if (!filters.include_inactive) {
            query.is_active = { $ne: false };
        }

        if (filters.search) {
            query.$or = [
                { device_name: new RegExp(filters.search, 'i') },
                { device_maker: new RegExp(filters.search, 'i') },
                { sku: new RegExp(filters.search, 'i') }
            ];
        }

        if (filters.brand) query.device_maker = filters.brand;
        if (filters.category) query['attributes.category'] = filters.category;

        const phones = await Product.find(query)
            .sort({ device_name: 1 })
            .limit(filters.limit || 500)
            .lean();

        return phones.map(p => ({
            product_id: p.product_id,
            device_name: p.device_name,
            device_maker: p.device_maker,
            sku: p.sku,
            base_price: p.base_price,
            is_active: p.is_active !== false,
            device_type: p.device_type,
            attributes: p.attributes,
            created_at: p.created_at
        }));
    }

    async getPhoneById(phoneId) {
        const phone = await Product.findOne({ product_id: phoneId }).lean();
        if (!phone) return null;

        // Get inventory counts
        const inventory = await Inventory.aggregate([
            { $match: { product_id: phoneId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: '$quantity' }
                }
            }
        ]);

        const invCounts = {};
        inventory.forEach(i => { invCounts[i._id] = i.count; });

        return {
            product_id: phone.product_id,
            device_name: phone.device_name,
            device_maker: phone.device_maker,
            sku: phone.sku,
            base_price: phone.base_price,
            is_active: phone.is_active !== false,
            device_type: phone.device_type,
            description: phone.description,
            attributes: phone.attributes,
            min_stock_level: phone.min_stock_level,
            inventory_summary: {
                available: invCounts['available'] || 0,
                reserved: invCounts['reserved'] || 0,
                sold: invCounts['sold'] || 0,
                in_repair: invCounts['in_repair'] || 0,
                total: Object.values(invCounts).reduce((a, b) => a + b, 0)
            },
            created_at: phone.created_at,
            updated_at: phone.updated_at
        };
    }

    // Helper to map flat spec fields to attributes
    _mapSpecFieldsToAttributes(phoneData, existingAttributes = {}) {
        const attributes = { ...existingAttributes, ...phoneData.attributes };

        // Processor mapping
        if (phoneData.processor || phoneData.processor_manufacturer || phoneData.process_node || phoneData.cpu_cores || phoneData.gpu) {
            attributes.processor = {
                ...(attributes.processor || {}),
                name: phoneData.processor || attributes.processor?.name,
                manufacturer: phoneData.processor_manufacturer || attributes.processor?.manufacturer,
                process_nm: phoneData.process_node || attributes.processor?.process_nm,
                cores: phoneData.cpu_cores || attributes.processor?.cores,
                clock_speed: phoneData.cpu_frequency || attributes.processor?.clock_speed,
                gpu: phoneData.gpu || attributes.processor?.gpu
            };
        }

        // Battery mapping
        if (phoneData.battery_capacity || phoneData.battery_type || phoneData.fast_charging_w) {
            attributes.battery = {
                ...(attributes.battery || {}),
                capacity: phoneData.battery_capacity || attributes.battery?.capacity,
                type: phoneData.battery_type || attributes.battery?.type,
                charging: {
                    ...(attributes.battery?.charging || {}),
                    wired_wattage: phoneData.fast_charging_w || attributes.battery?.charging?.wired_wattage,
                    wireless_wattage: phoneData.wireless_charging_w || attributes.battery?.charging?.wireless_wattage,
                    reverse_wireless_wattage: phoneData.reverse_charging_w || attributes.battery?.charging?.reverse_wireless_wattage,
                    connector_type: phoneData.connector || attributes.battery?.charging?.connector_type
                }
            };
        }

        // Display mapping coverage (basic)
        if (phoneData.display_size || phoneData.display_type || phoneData.resolution) {
            attributes.display = {
                ...(attributes.display || {}),
                size: phoneData.display_size || attributes.display?.size,
                type: phoneData.display_type || attributes.display?.type,
                resolution: phoneData.resolution || attributes.display?.resolution,
                refresh_rate: phoneData.refresh_rate || attributes.display?.refresh_rate
            };
        }

        // Legacy/Flat mappings (for backward compatibility or top-level access)
        const flatFields = [
            'storage_capacity', 'ram', 'screen_size', 'color', 'camera', 'os_version'
        ];
        flatFields.forEach(f => {
            if (phoneData[f] !== undefined) attributes[f] = phoneData[f];
        });

        // Clean up undefined keys in nested objects
        const cleanCtx = (obj) => {
            Object.keys(obj).forEach(key => {
                if (obj[key] === undefined) delete obj[key];
                else if (typeof obj[key] === 'object' && obj[key] !== null) cleanCtx(obj[key]);
            });
        };
        cleanCtx(attributes);

        return attributes;
    }

    async createPhone(phoneData) {
        const {
            device_name, device_maker, sku, base_price = 0,
            device_type = 'smartphone', description,
            min_stock_level = 0, is_active = true
        } = phoneData;

        if (!device_name) throw new Error('Device name is required');

        // Check duplicate SKU
        if (sku) {
            const existing = await Product.findOne({ sku });
            if (existing) throw new Error('SKU already exists');
        }

        const attributes = this._mapSpecFieldsToAttributes(phoneData);

        const phone = await Product.create({
            product_id: uuidv4(),
            device_name,
            device_maker,
            sku: sku || uuidv4().substring(0, 8).toUpperCase(),
            base_price,
            device_type,
            description,
            attributes,
            min_stock_level,
            is_active
        });

        return {
            product_id: phone.product_id,
            success: true
        };
    }

    async updatePhone(phoneId, phoneData) {
        const phone = await Product.findOne({ product_id: phoneId });
        if (!phone) return { success: false, error: 'Phone not found' };

        const fields = [
            'device_name', 'device_maker', 'sku', 'base_price',
            'device_type', 'description', 'min_stock_level', 'is_active'
        ];

        fields.forEach(f => {
            if (phoneData[f] !== undefined) phone[f] = phoneData[f];
        });

        // Handle attributes with new detailed mapping
        phone.attributes = this._mapSpecFieldsToAttributes(phoneData, phone.attributes);

        await phone.save();
        return { success: true };
    }

    async deletePhone(phoneId) {
        // Check for inventory
        const invCount = await Inventory.countDocuments({ product_id: phoneId });
        if (invCount > 0) {
            return {
                success: false,
                error: `Cannot delete: ${invCount} inventory items linked. Deactivate instead.`
            };
        }

        const result = await Product.deleteOne({ product_id: phoneId });
        return { success: result.deletedCount > 0 };
    }

    // Helper methods
    async getBrands() {
        const brands = await Product.distinct('device_maker', {
            device_type: { $in: ['smartphone', 'phone', 'tablet'] },
            is_active: { $ne: false }
        });
        return brands.filter(Boolean).sort();
    }

    async getCategories() {
        const categories = await Product.distinct('attributes.category', {
            device_type: { $in: ['smartphone', 'phone', 'tablet'] }
        });
        return categories.filter(Boolean);
    }
}

module.exports = PhonesService;
