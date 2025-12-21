/**
 * Phones Service (Sequelize Version)
 * Handles phone (Product) queries and CRUD operations
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');
const { ValidationError } = require('../utils/errors');

class PhonesService {
    constructor() { }

    async getAllPhones(filters = {}) {
        let sql = `
            SELECT p.*, s.* 
            FROM master_db.products p
            JOIN master_db.phone_specs s ON p.product_id = s.product_id
            WHERE p.product_type = 'PHONE'
        `;
        const params = [];

        if (!filters.include_inactive) sql += ` AND p.is_active = 1`;
        if (filters.search) {
            sql += ` AND (p.name LIKE ? OR p.manufacturer LIKE ?)`;
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }
        if (filters.brand) {
            sql += ` AND p.manufacturer = ?`;
            params.push(filters.brand);
        }
        if (filters.category) {
            sql += ` AND p.category = ?`;
            params.push(filters.category);
        }
        sql += ` ORDER BY p.name ASC LIMIT ?`;
        params.push(parseInt(filters.limit || 500));

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        return rows.map(p => this._mapPhone(p));
    }

    async getPhoneById(phoneId) {
        if (!phoneId) return null;

        const [phone] = await sequelizeMaster.query(`
            SELECT p.*, s.* 
            FROM master_db.products p
            JOIN master_db.phone_specs s ON p.product_id = s.product_id
            WHERE p.product_id = ?
        `, { replacements: [phoneId], type: QueryTypes.SELECT });

        if (!phone) return null;

        const [inv] = await sequelizeMaster.query(`
            SELECT 
                SUM(CASE WHEN condition_status = 'NEW' AND inventory_type = 'bulk' THEN quantity ELSE 0 END) as available,
                SUM(reserved_quantity) as reserved,
                SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
                SUM(CASE WHEN status = 'in_repair' THEN 1 ELSE 0 END) as in_repair,
                SUM(quantity) as total
            FROM master_db.inventory
            WHERE product_id = ?
        `, { replacements: [phoneId], type: QueryTypes.SELECT });

        const serialInv = await sequelizeMaster.query(`
            SELECT status, COUNT(*) as count 
            FROM master_db.inventory 
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
            water_and_dust_rating, nfc, category,
            warranty_months = 12
        } = phoneData;

        if (!device_name) throw new ValidationError('device name is required');

        const productId = generateId();
        const price = device_price || base_price;
        const t = await sequelizeMaster.transaction();

        try {
            await sequelizeMaster.query(`
                INSERT INTO master_db.products 
                (product_id, part_code, product_type, name, manufacturer, unit_price, is_active, warranty_months, category)
                VALUES (?, ?, 'PHONE', ?, ?, ?, ?, ?, ?)
            `, {
                replacements: [
                    productId, 
                    `PHONE-${Date.now()}`, 
                    device_name, 
                    device_maker || null, 
                    price, 
                    is_active ? 1 : 0, 
                    warranty_months,
                    category || null
                ],
                type: QueryTypes.INSERT,
                transaction: t
            });

            await sequelizeMaster.query(`
                INSERT INTO master_db.phone_specs
                (product_id, device_type, attributes, color, ram, rom, processor, display_size, resolution, refresh_rate, battery_capacity, fast_charging, rear_camera_main, front_camera, operating_system, water_and_dust_rating, nfc)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, {
                replacements: [
                    productId,
                    device_type,
                    JSON.stringify(attributes),
                    color || null,
                    ram || null,
                    rom || null,
                    processor || null,
                    display_size || null,
                    resolution || null,
                    refresh_rate || null,
                    battery_capacity || null,
                    fast_charging || null,
                    rear_camera_main || null,
                    front_camera || null,
                    operating_system || null,
                    water_and_dust_rating || null,
                    nfc || null
                ],
                type: QueryTypes.INSERT,
                transaction: t
            });

            await t.commit();
            return { product_id: productId, success: true };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async updatePhone(phoneId, phoneData) {
        const [phone] = await sequelizeMaster.query(`SELECT * FROM master_db.products WHERE product_id = ?`, {
            replacements: [phoneId], type: QueryTypes.SELECT
        });
        if (!phone) return { success: false, error: 'Phone not found' };

        const t = await sequelizeMaster.transaction();
        
        try {
            // Update products table
            const productUpdates = [];
            const productValues = [];
            
            if (phoneData.device_name !== undefined) { productUpdates.push('name = ?'); productValues.push(phoneData.device_name); }
            if (phoneData.device_maker !== undefined) { productUpdates.push('manufacturer = ?'); productValues.push(phoneData.device_maker); }
            if (phoneData.device_price !== undefined || phoneData.base_price !== undefined) { 
                productUpdates.push('unit_price = ?'); 
                productValues.push(phoneData.device_price !== undefined ? phoneData.device_price : phoneData.base_price); 
            }
            if (phoneData.is_active !== undefined) { productUpdates.push('is_active = ?'); productValues.push(phoneData.is_active ? 1 : 0); }
            if (phoneData.warranty_months !== undefined) { productUpdates.push('warranty_months = ?'); productValues.push(phoneData.warranty_months); }
            if (phoneData.category !== undefined) { productUpdates.push('category = ?'); productValues.push(phoneData.category); }

            if (productUpdates.length > 0) {
                await sequelizeMaster.query(`
                    UPDATE master_db.products SET ${productUpdates.join(', ')} WHERE product_id = ?
                `, {
                    replacements: [...productValues, phoneId],
                    type: QueryTypes.UPDATE,
                    transaction: t
                });
            }

            // Update phone_specs table
            const specUpdates = [];
            const specValues = [];
            
            const specFields = [
                'device_type', 'color', 'ram', 'rom', 'processor', 'display_size', 'resolution',
                'refresh_rate', 'battery_capacity', 'fast_charging', 'rear_camera_main', 'front_camera', 
                'operating_system', 'water_and_dust_rating', 'nfc'
            ];

            for (const field of specFields) {
                if (phoneData[field] !== undefined) {
                    specUpdates.push(`${field} = ?`);
                    specValues.push(phoneData[field] === '' ? null : phoneData[field]);
                }
            }

            if (phoneData.attributes !== undefined) {
                const [existingSpec] = await sequelizeMaster.query(`SELECT attributes FROM master_db.phone_specs WHERE product_id = ?`, {
                    replacements: [phoneId], type: QueryTypes.SELECT, transaction: t
                });
                
                let currentAttrs = {};
                if (existingSpec && existingSpec.attributes) {
                    try { currentAttrs = typeof existingSpec.attributes === 'string' ? JSON.parse(existingSpec.attributes) : existingSpec.attributes; } catch(_e){ /* ignore */ }
                }
                
                specUpdates.push(`attributes = ?`);
                specValues.push(JSON.stringify({ ...currentAttrs, ...phoneData.attributes }));
            }

            if (specUpdates.length > 0) {
                await sequelizeMaster.query(`
                    UPDATE master_db.phone_specs SET ${specUpdates.join(', ')} WHERE product_id = ?
                `, {
                    replacements: [...specValues, phoneId],
                    type: QueryTypes.UPDATE,
                    transaction: t
                });
            }

            await t.commit();
            return { success: true };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async deletePhone(phoneId) {
        const [{ count }] = await sequelizeMaster.query(`SELECT COUNT(*) as count FROM master_db.inventory WHERE product_id = ?`, {
            replacements: [phoneId], type: QueryTypes.SELECT
        });
        if (count > 0) return { success: false, error: 'Cannot delete: inventory exists' };

        await sequelizeMaster.query(`UPDATE master_db.products SET is_active = 0 WHERE product_id = ?`, {
            replacements: [phoneId], type: QueryTypes.UPDATE
        });
        return { success: true };
    }

    async getBrands() {
        const rows = await sequelizeMaster.query(`
            SELECT DISTINCT manufacturer as device_maker FROM master_db.products 
            WHERE product_type = 'PHONE' AND is_active = 1
            ORDER BY manufacturer ASC
        `, { type: QueryTypes.SELECT });
        return rows.map(r => r.device_maker).filter(Boolean);
    }

    async getCategories() {
        const rows = await sequelizeMaster.query(`
            SELECT DISTINCT category 
            FROM master_db.products 
            WHERE product_type = 'PHONE' AND is_active = 1
        `, { type: QueryTypes.SELECT });
        return rows.map(r => r.category).filter(Boolean);
    }

    _mapPhone(p) {
        let attrs = {};
        try { attrs = typeof p.attributes === 'string' ? JSON.parse(p.attributes) : p.attributes || {}; } catch (_e) { /* intentional */ }

        return {
            product_id: p.product_id,
            device_name: p.name,
            device_maker: p.manufacturer,
            device_price: Number(p.unit_price),
            base_price: Number(p.unit_price),
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
            attributes: attrs,
            created_at: p.created_at,
            updated_at: p.updated_at
        };
    }
}

module.exports = PhonesService;
