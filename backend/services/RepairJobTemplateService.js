/**
 * Repair Job Template Service (Sequelize Version)
 * Handles repair templates CRUD
 */

const { Op } = require('sequelize');
const { RepairJobTemplate } = require('../models/master');
const { generateId } = require('../utils/generateId');
const { ValidationError, NotFoundError, ConflictError, InsufficientStockError, CapacityError } = require('../utils/errors');


class RepairJobTemplateService {
    constructor() { }

    async getAllTemplates(filters = {}) {
        const where = {};

        if (filters.device_type) {
            where.device_type = { [Op.like]: `%${filters.device_type}%` };
        }

        if (filters.search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${filters.search}%` } },
                { description: { [Op.like]: `%${filters.search}%` } }
            ];
        }

        if (filters.is_active !== undefined) {
            where.is_active = filters.is_active ? 1 : 0;
        }

        const templates = await RepairJobTemplate.findAll({
            where,
            order: [['name', 'ASC']]
        });

        return templates.map(t => this._mapTemplate(t.toJSON()));
    }

    async getTemplateById(id) {
        const tpl = await RepairJobTemplate.findOne({ where: { id } });
        return tpl ? this._mapTemplate(tpl.toJSON()) : null;
    }

    async createTemplate(data) {
        const {
            name, description, device_type, estimated_labor_hours, labor_cost,
            default_diagnosis, default_repair_notes, required_parts, is_active
        } = data;

        if (!name) throw new ValidationError('name is required');

        const templateId = generateId();
        await RepairJobTemplate.create({
            template_id: templateId,
            name,
            description,
            device_type,
            estimated_labor_hours: estimated_labor_hours || 0,
            labor_cost: labor_cost || 0,
            default_diagnosis,
            default_repair_notes,
            required_parts: JSON.stringify(required_parts || []),
            is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1
        });

        return { id: templateId, success: true };
    }

    async updateTemplate(id, data) {
        const allowed = [
            'name', 'description', 'device_type', 'estimated_labor_hours', 'labor_cost',
            'default_diagnosis', 'default_repair_notes', 'is_active'
        ];
        const updateData = {};

        allowed.forEach(f => {
            if (data[f] !== undefined) {
                updateData[f] = f === 'is_active' ? (data[f] ? 1 : 0) : data[f];
            }
        });

        if (data.required_parts !== undefined) {
            updateData.required_parts = JSON.stringify(data.required_parts);
        }

        if (Object.keys(updateData).length === 0) return { success: true };

        await RepairJobTemplate.update(updateData, { where: { id } });
        return { success: true };
    }

    async deleteTemplate(id) {
        await RepairJobTemplate.destroy({ where: { id } });
        return { success: true };
    }

    _mapTemplate(t) {
        let parts = [];
        try { parts = typeof t.required_parts === 'string' ? JSON.parse(t.required_parts) : t.required_parts || []; } catch (e) { /* intentional */ }
        return {
            ...t,
            required_parts: parts,
            is_active: !!t.is_active
        };
    }
}

module.exports = RepairJobTemplateService;
