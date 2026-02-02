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
            device_price: p.device_price,
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
            device_price: phone.device_price,
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
        // Start with existing attributes ensuring deep merge isn't needed for top level replacements
        let attributes = { ...existingAttributes };

        // If phoneData already has attributes (new frontend structure), merge them first
        if (phoneData.attributes && typeof phoneData.attributes === 'object') {
            // Function to deep merge objects
            const deepMerge = (target, source) => {
                for (const key of Object.keys(source)) {
                    if (source[key] instanceof Object && key in target) {
                        Object.assign(source[key], deepMerge(target[key], source[key]));
                    }
                }
                Object.assign(target || {}, source);
                return target;
            };
            attributes = deepMerge(attributes, phoneData.attributes);
        }

        // Feature flags / Legacy support:
        // Even if we have attributes, we might still receive flat fields from other sources (e.g. bulk import)
        // So we continue to map them if present, effectively overwriting nested values if legacy fields are provided.

        // Processor
        if (phoneData.processor || phoneData.processor_manufacturer || phoneData.process_node || phoneData.cpu_cores || phoneData.cpu_frequency || phoneData.gpu) {
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

        // Memory
        if (phoneData.ram || phoneData.rom || phoneData.expandable_memory || phoneData.memory_type) {
            attributes.memory = {
                ...(attributes.memory || {}),
                ram: phoneData.ram || attributes.memory?.ram,
                rom: phoneData.rom || attributes.memory?.rom,
                type: phoneData.memory_type || attributes.memory?.type,
                expandable: phoneData.expandable_memory || attributes.memory?.expandable
            };
        }

        // Display
        if (phoneData.display_size || phoneData.display_type || phoneData.resolution || phoneData.refresh_rate || phoneData.hdr_support || phoneData.display_features) {
            attributes.display = {
                ...(attributes.display || {}),
                size: phoneData.display_size || attributes.display?.size,
                type: phoneData.display_type || attributes.display?.type,
                resolution: phoneData.resolution || attributes.display?.resolution,
                refresh_rate: phoneData.refresh_rate || attributes.display?.refresh_rate,
                hdr: phoneData.hdr_support || attributes.display?.hdr,
                features: phoneData.display_features || attributes.display?.features
            };
        }

        // Camera - Rear
        if (phoneData.rear_camera_main || phoneData.rear_camera_ultrawide || phoneData.rear_camera_telephoto || phoneData.rear_camera_features) {
            // Ensure legacy checks don't wipe out existing camera structure if only partial fields differ
            const currentRear = attributes.camera?.rear || {};
            attributes.camera = {
                ...(attributes.camera || {}),
                rear: {
                    ...currentRear,
                    main: phoneData.rear_camera_main || currentRear.main,
                    ultrawide: phoneData.rear_camera_ultrawide || currentRear.ultrawide,
                    telephoto: phoneData.rear_camera_telephoto || currentRear.telephoto,
                    features: phoneData.rear_camera_features || currentRear.features,
                    optical_zoom: phoneData.optical_zoom || currentRear.optical_zoom
                }
            };
        }

        // Camera - Front
        if (phoneData.front_camera || phoneData.front_camera_features) {
            const currentFront = attributes.camera?.front || {};
            attributes.camera = {
                ...(attributes.camera || {}),
                front: {
                    ...currentFront,
                    main: phoneData.front_camera || currentFront.main,
                    features: phoneData.front_camera_features || currentFront.features
                }
            };
        }

        // Battery
        if (phoneData.battery_capacity || phoneData.fast_charging || phoneData.fast_charging_w || phoneData.wireless_charging) {
            const currentBattery = attributes.battery || {};
            const currentCharging = currentBattery.charging || {};

            attributes.battery = {
                ...currentBattery,
                capacity: phoneData.battery_capacity || currentBattery.capacity,
                fast_charging_support: phoneData.fast_charging || currentBattery.fast_charging_support,
                charging: {
                    ...currentCharging,
                    wired_wattage: phoneData.fast_charging_w || currentCharging.wired_wattage,
                    wireless_wattage: phoneData.wireless_charging_w || currentCharging.wireless_wattage,
                    reverse_wireless_wattage: phoneData.reverse_charging_w || currentCharging.reverse_wireless_wattage,
                    connector_type: phoneData.connector || currentCharging.connector_type
                }
            };
        }

        // Physical Dimensions
        if (phoneData.length_mm || phoneData.width_mm || phoneData.thickness_mm || phoneData.weight_g) {
            attributes.dimensions = {
                ...(attributes.dimensions || {}),
                length: phoneData.length_mm || attributes.dimensions?.length,
                width: phoneData.width_mm || attributes.dimensions?.width,
                thickness: phoneData.thickness_mm || attributes.dimensions?.thickness,
                weight: phoneData.weight_g || attributes.dimensions?.weight
            };
        }

        // Connectivity & Misc
        if (phoneData.sim_card || phoneData.nfc || phoneData.wireless_connectivity || phoneData.operating_system || phoneData.water_and_dust_rating || phoneData.color) {
            attributes.connectivity = {
                ...(attributes.connectivity || {}),
                sim: phoneData.sim_card || attributes.connectivity?.sim,
                nfc: phoneData.nfc || attributes.connectivity?.nfc,
                wireless: phoneData.wireless_connectivity || attributes.connectivity?.wireless
            };
            attributes.software = {
                ...(attributes.software || {}),
                os: phoneData.operating_system || attributes.software?.os
            };
            attributes.body = {
                ...(attributes.body || {}),
                water_resistance: phoneData.water_and_dust_rating || attributes.body?.water_resistance,
                color: phoneData.color || attributes.body?.color
            };
            attributes.features = {
                ...(attributes.features || {}),
                security: phoneData.security_features || attributes.features?.security,
                sensors: phoneData.sensors || attributes.features?.sensors
            };
        }

        // Clean up undefined values and empty objects recursively
        const clean = (obj) => {
            Object.keys(obj).forEach(key => {
                if (obj[key] && typeof obj[key] === 'object') clean(obj[key]);
                if (obj[key] === undefined || obj[key] === '' || (typeof obj[key] === 'object' && Object.keys(obj[key]).length === 0)) {
                    delete obj[key];
                }
            });
            return obj;
        };

        return clean(attributes);
    }

    async createPhone(phoneData) {
        const {
            device_name, device_maker, sku, device_price = 0,
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
            device_price,
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
            'device_name', 'device_maker', 'sku', 'device_price',
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
