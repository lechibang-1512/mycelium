/**
 * Phones Service (Sequelize Version)
 * Handles phone (Product) queries and CRUD operations
 */

const { QueryTypes, Op } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { PhoneSpec, Inventory } = require('../models/master');
const { generateId } = require('../utils/generateId');
const { ValidationError, NotFoundError, ConflictError, InsufficientStockError, CapacityError } = require('../utils/errors');


class PhonesService {
    constructor() { }

    async getAllPhones(filters = {}) {
        if (filters.category) {
            let sql = `SELECT * FROM phone_specs WHERE device_type IN ('smartphone', 'phone', 'tablet')`;
            const params = [];

            if (!filters.include_inactive) sql += ` AND is_active = 1`;
            if (filters.search) {
                sql += ` AND (device_name LIKE ? OR device_maker LIKE ?)`;
                params.push(`%${filters.search}%`, `%${filters.search}%`);
            }
            if (filters.brand) {
                sql += ` AND device_maker = ?`;
                params.push(filters.brand);
            }
            if (filters.category) {
                sql += ` AND JSON_EXTRACT(attributes, '$.category') = ?`;
                params.push(filters.category);
            }
            sql += ` ORDER BY device_name ASC LIMIT ?`;
            params.push(parseInt(filters.limit || 500));

            const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
            return rows.map(p => this._mapPhone(p));
        }

        const where = {
            device_type: { [Op.in]: ['smartphone', 'phone', 'tablet'] }
        };

        if (!filters.include_inactive) {
            where.is_active = 1;
        }

        if (filters.search) {
            where[Op.or] = [
                { device_name: { [Op.like]: `%${filters.search}%` } },
                { device_maker: { [Op.like]: `%${filters.search}%` } }
            ];
        }

        if (filters.brand) {
            where.device_maker = filters.brand;
        }

        const phones = await PhoneSpec.findAll({
            where,
            order: [['device_name', 'ASC']],
            limit: parseInt(filters.limit || 500)
        });

        return phones.map(p => this._mapPhone(p.toJSON()));
    }

    async getPhoneById(phoneId) {
        if (!phoneId) return null;

        const phoneModel = await PhoneSpec.findByPk(phoneId);
        if (!phoneModel) return null;
        const phone = phoneModel.toJSON();

        const [inv] = await sequelizeMaster.query(`
            SELECT 
                SUM(CASE WHEN condition_status = 'NEW' AND inventory_type = 'bulk' THEN quantity ELSE 0 END) as available,
                SUM(reserved_quantity) as reserved,
                0 as sold,
                0 as in_repair,
                SUM(quantity) as total
            FROM inventory
            WHERE product_id = ?
        `, { replacements: [phoneId], type: QueryTypes.SELECT });

        const serialInv = await sequelizeMaster.query(`
            SELECT status, COUNT(*) as count 
            FROM inventory 
            WHERE product_id = ? AND inventory_type = 'serialized'
            GROUP BY status
        `, { replacements: [phoneId], type: QueryTypes.SELECT });

        const serialCounts = {};
        serialInv.forEach(r => serialCounts[r.status] = Number(r.count));

        const summary = {
            available: Number(inv?.available || 0) + (serialCounts['available'] || 0),
            reserved: Number(inv?.reserved || 0) + (serialCounts['reserved'] || 0),
            sold: (serialCounts['sold'] || 0),
            in_repair: (serialCounts['in_repair'] || 0),
            total: Number(inv?.total || 0) + Object.values(serialCounts).reduce((a, b) => a + b, 0)
        };

        return {
            ...this._mapPhone(phone),
            inventory_summary: summary
        };
    }

    async createPhone(phoneData) {
        const {
            device_name, device_maker, device_price, base_price = 0,
            device_type = 'smartphone', attributes = {},
            is_active = true,
            color, ram, rom, processor, display_size, resolution,
            refresh_rate, battery_capacity, fast_charging,
            rear_camera_main, front_camera, operating_system,
            water_and_dust_rating, nfc,
            warranty_months = 12, warranty_type = 'MANUFACTURER'
        } = phoneData;

        if (!device_name) throw new ValidationError('device name is required');

        const productId = generateId();
        const price = device_price || base_price;

        await PhoneSpec.create({
            product_id: productId,
            device_name,
            device_maker,
            device_price: price,
            device_type,
            attributes: JSON.stringify(attributes),
            is_active: is_active ? 1 : 0,
            color: color || null,
            ram: ram || null,
            rom: rom || null,
            processor: processor || null,
            display_size: display_size || null,
            resolution: resolution || null,
            refresh_rate: refresh_rate || null,
            battery_capacity: battery_capacity || null,
            fast_charging: fast_charging || null,
            rear_camera_main: rear_camera_main || null,
            front_camera: front_camera || null,
            operating_system: operating_system || null,
            water_and_dust_rating: water_and_dust_rating || null,
            nfc: nfc || null,
            warranty_months,
            warranty_type
        });

        return { product_id: productId, success: true };
    }

    async updatePhone(phoneId, phoneData) {
        const phoneModel = await PhoneSpec.findByPk(phoneId);
        if (!phoneModel) return { success: false, error: 'Phone not found' };
        const existing = phoneModel.toJSON();

        const allowed = [
            'device_name', 'device_maker', 'device_price',
            'device_type', 'is_active',
            'color', 'ram', 'rom', 'processor', 'display_size', 'resolution',
            'refresh_rate', 'battery_capacity', 'fast_charging',
            'rear_camera_main', 'front_camera', 'operating_system',
            'water_and_dust_rating', 'nfc', 'warranty_months', 'warranty_type'
        ];

        const updateData = {};

        allowed.forEach(f => {
            if (phoneData[f] !== undefined) {
                if (f === 'device_price' && phoneData.base_price !== undefined) {
                    updateData.device_price = phoneData.base_price;
                } else if (f === 'is_active') {
                    updateData.is_active = phoneData.is_active ? 1 : 0;
                } else {
                    const val = phoneData[f];
                    updateData[f] = val === '' ? null : val;
                }
            }
        });

        if (phoneData.base_price !== undefined && updateData.device_price === undefined) {
            updateData.device_price = phoneData.base_price;
        }

        let currentAttrs = {};
        try { currentAttrs = typeof existing.attributes === 'string' ? JSON.parse(existing.attributes) : existing.attributes || {}; } catch (e) { /* intentional */ }

        if (phoneData.attributes) {
            const newAttrs = { ...currentAttrs, ...phoneData.attributes };
            updateData.attributes = JSON.stringify(newAttrs);
        }

        if (Object.keys(updateData).length === 0) return { success: true };

        await PhoneSpec.update(updateData, { where: { product_id: phoneId } });
        return { success: true };
    }

    async deletePhone(phoneId) {
        const invCount = await Inventory.count({ where: { product_id: phoneId } });
        if (invCount > 0) return { success: false, error: 'Cannot delete: inventory exists' };

        await PhoneSpec.destroy({ where: { product_id: phoneId } });
        return { success: true };
    }

    async getBrands() {
        const rows = await sequelizeMaster.query(`
            SELECT DISTINCT device_maker FROM phone_specs 
            WHERE device_type IN ('smartphone', 'phone', 'tablet') AND is_active = 1
            ORDER BY device_maker ASC
        `, { type: QueryTypes.SELECT });
        return rows.map(r => r.device_maker).filter(Boolean);
    }

    async getCategories() {
        const rows = await sequelizeMaster.query(`
            SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(attributes, '$.category')) as category 
            FROM phone_specs 
            WHERE device_type IN ('smartphone', 'phone', 'tablet')
        `, { type: QueryTypes.SELECT });
        return rows.map(r => r.category).filter(Boolean);
    }

    _mapPhone(p) {
        let attrs = {};
        try { attrs = typeof p.attributes === 'string' ? JSON.parse(p.attributes) : p.attributes || {}; } catch (e) { /* intentional */ }

        return {
            product_id: p.product_id,
            device_name: p.device_name,
            device_maker: p.device_maker,
            device_price: Number(p.device_price),
            base_price: Number(p.device_price),
            is_active: !!p.is_active,
            device_type: p.device_type,
            color: p.color || null,
            ram: p.ram || null,
            rom: p.rom || null,
            processor: p.processor || null,
            display_size: p.display_size || null,
            resolution: p.resolution || null,
            refresh_rate: p.refresh_rate || null,
            battery_capacity: p.battery_capacity || null,
            fast_charging: p.fast_charging || null,
            rear_camera_main: p.rear_camera_main || null,
            front_camera: p.front_camera || null,
            operating_system: p.operating_system || null,
            water_and_dust_rating: p.water_and_dust_rating || null,
            nfc: p.nfc || null,
            warranty_months: p.warranty_months,
            warranty_type: p.warranty_type,
            attributes: attrs,
            created_at: p.created_at,
            updated_at: p.updated_at
        };
    }
}

module.exports = PhonesService;
