/**
 * Spare Parts Service (Sequelize Version)
 * Handles spare parts catalog management
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');

class SparePartsService {
    constructor() { }

    async getSpareParts(filters = {}) {
        let sql = `
            SELECT p.*, s.* 
            FROM master_db.products p
            JOIN master_db.spare_part_specs s ON p.product_id = s.product_id
            WHERE p.product_type = 'SPARE_PART' AND p.is_active = 1
        `;
        const params = [];

        if (filters.search) {
            sql += ` AND (p.part_code LIKE ? OR p.name LIKE ? OR p.description LIKE ?)`;
            params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.category) {
            sql += ` AND s.part_category = ?`;
            params.push(filters.category);
        }

        sql += ` ORDER BY p.name ASC`;

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        return rows.map(p => this._mapPart(p));
    }

    async getSparePartById(id) {
        const [part] = await sequelizeMaster.query(`
            SELECT p.*, s.* 
            FROM master_db.products p
            JOIN master_db.spare_part_specs s ON p.product_id = s.product_id
            WHERE p.product_type = 'SPARE_PART' AND (p.product_id = ? OR p.part_code = ?)
        `, { replacements: [id, id], type: QueryTypes.SELECT });
        
        if (!part) return null;

        const [{ total }] = await sequelizeMaster.query(`
            SELECT SUM(quantity) as total 
            FROM master_db.inventory 
            WHERE product_id = ?
        `, { replacements: [part.product_id], type: QueryTypes.SELECT });

        return {
            ...this._mapPart(part),
            total_stock: Number(total || 0)
        };
    }

    async createSparePart(data) {
        const {
            part_code, part_name, part_category, description,
            compatible_models, cost_price, selling_price
        } = data;

        const productId = generateId();
        const t = await sequelizeMaster.transaction();

        try {
            await sequelizeMaster.query(`
                INSERT INTO master_db.products 
                (product_id, part_code, product_type, name, description, unit_cost, unit_price, is_active)
                VALUES (?, ?, 'SPARE_PART', ?, ?, ?, ?, 1)
            `, {
                replacements: [
                    productId,
                    part_code || `SP-${Date.now()}`,
                    part_name,
                    description || null,
                    cost_price || 0,
                    selling_price || 0
                ],
                type: QueryTypes.INSERT,
                transaction: t
            });

            await sequelizeMaster.query(`
                INSERT INTO master_db.spare_part_specs
                (product_id, part_category, compatible_models)
                VALUES (?, ?, ?)
            `, {
                replacements: [
                    productId,
                    part_category || 'General',
                    JSON.stringify(compatible_models || [])
                ],
                type: QueryTypes.INSERT,
                transaction: t
            });

            await t.commit();
            return { id: productId, success: true };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async updateSparePart(id, data) {
        const t = await sequelizeMaster.transaction();

        try {
            // Update base products table
            const productUpdates = [];
            const productValues = [];

            if (data.part_name !== undefined) { productUpdates.push('name = ?'); productValues.push(data.part_name); }
            if (data.description !== undefined) { productUpdates.push('description = ?'); productValues.push(data.description); }
            if (data.unit_cost !== undefined) { productUpdates.push('unit_cost = ?'); productValues.push(data.unit_cost); }
            if (data.unit_price !== undefined) { productUpdates.push('unit_price = ?'); productValues.push(data.unit_price); }

            if (productUpdates.length > 0) {
                await sequelizeMaster.query(`
                    UPDATE master_db.products SET ${productUpdates.join(', ')} WHERE product_id = ?
                `, {
                    replacements: [...productValues, id],
                    type: QueryTypes.UPDATE,
                    transaction: t
                });
            }

            // Update spare_part_specs table
            const specUpdates = [];
            const specValues = [];

            if (data.part_category !== undefined) { specUpdates.push('part_category = ?'); specValues.push(data.part_category); }
            if (data.compatible_models !== undefined) { specUpdates.push('compatible_models = ?'); specValues.push(JSON.stringify(data.compatible_models)); }

            if (specUpdates.length > 0) {
                await sequelizeMaster.query(`
                    UPDATE master_db.spare_part_specs SET ${specUpdates.join(', ')} WHERE product_id = ?
                `, {
                    replacements: [...specValues, id],
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

    async deleteSparePart(id) {
        const [{ count }] = await sequelizeMaster.query(`
            SELECT COUNT(*) as count 
            FROM master_db.inventory 
            WHERE product_id = ?
        `, { replacements: [id], type: QueryTypes.SELECT });

        if (count > 0) return { error: 'Cannot delete part with inventory' };

        await sequelizeMaster.query(`
            UPDATE master_db.products SET is_active = 0 WHERE product_id = ?
        `, {
            replacements: [id], type: QueryTypes.UPDATE
        });
        return { success: true };
    }

    _mapPart(p) {
        let models = [];
        try { models = typeof p.compatible_models === 'string' ? JSON.parse(p.compatible_models) : p.compatible_models || []; } catch (_e) { /* intentional */ }
        return {
            id: p.product_id,
            code: p.part_code,
            name: p.name,
            category: p.part_category,
            description: p.description,
            compatible_models: models,
            price: Number(p.unit_price),
            cost: Number(p.unit_cost)
        };
    }
}

module.exports = SparePartsService;
