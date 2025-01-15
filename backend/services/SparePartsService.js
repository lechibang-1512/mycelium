/**
 * Spare Parts Service (Sequelize Version)
 * Handles spare parts catalog management
 */

const { Op } = require('sequelize');
const { SparePart, Inventory } = require('../models/master');
const { generateId } = require('../utils/generateId');

class SparePartsService {
    constructor() { }

    async getSpareParts(filters = {}) {
        const where = {};

        if (filters.search) {
            where[Op.or] = [
                { part_code: { [Op.like]: `%${filters.search}%` } },
                { part_name: { [Op.like]: `%${filters.search}%` } },
                { description: { [Op.like]: `%${filters.search}%` } }
            ];
        }

        if (filters.category) {
            where.part_category = filters.category;
        }

        const parts = await SparePart.findAll({
            where,
            order: [['part_name', 'ASC']]
        });
        return parts.map(p => this._mapPart(p.toJSON()));
    }

    async getSparePartById(id) {
        const partModel = await SparePart.findOne({
            where: {
                [Op.or]: [{ spare_part_id: id }, { part_code: id }]
            }
        });
        if (!partModel) return null;
        const part = partModel.toJSON();

        const invCount = await Inventory.sum('quantity', { where: { spare_part_id: part.spare_part_id } });

        return {
            ...this._mapPart(part),
            total_stock: Number(invCount || 0)
        };
    }

    async createSparePart(data) {
        const {
            part_code, part_name, part_category, description,
            compatible_models, cost_price, selling_price
        } = data;

        const sparePartId = generateId();
        await SparePart.create({
            spare_part_id: sparePartId,
            part_code, part_name, part_category, description,
            compatible_models: JSON.stringify(compatible_models || []),
            unit_cost: cost_price || 0,
            unit_price: selling_price || 0
        });

        return { id: sparePartId, success: true };
    }

    async updateSparePart(id, data) {
        const allowed = ['part_name', 'part_category', 'description', 'unit_cost', 'unit_price'];
        const updateData = {};

        allowed.forEach(f => {
            if (data[f] !== undefined) {
                updateData[f] = data[f];
            }
        });

        if (data.compatible_models) {
            updateData.compatible_models = JSON.stringify(data.compatible_models);
        }

        if (Object.keys(updateData).length === 0) return { success: true };

        await SparePart.update(updateData, { where: { spare_part_id: id } });
        return { success: true };
    }

    async deleteSparePart(id) {
        const invCount = await Inventory.count({ where: { spare_part_id: id } });
        if (invCount > 0) return { error: 'Cannot delete part with inventory' };

        await SparePart.destroy({ where: { spare_part_id: id } });
        return { success: true };
    }

    _mapPart(p) {
        let models = [];
        try { models = typeof p.compatible_models === 'string' ? JSON.parse(p.compatible_models) : p.compatible_models || []; } catch (e) { /* intentional */ }
        return {
            id: p.spare_part_id,
            code: p.part_code,
            name: p.part_name,
            category: p.part_category,
            description: p.description,
            compatible_models: models,
            price: Number(p.unit_price),
            cost: Number(p.unit_cost)
        };
    }
}

module.exports = SparePartsService;
