/**
 * Repair Job Template Service (MongoDB Version)
 * Handles CRUD operations for repair job templates
 */

const mongoose = require('mongoose');

// RepairJobTemplate schema (inline)
const RepairJobTemplateSchema = new mongoose.Schema({
    template_id: { type: Number, unique: true, index: true },
    template_name: { type: String, required: true, index: true },
    template_category: { type: String, default: 'OTHER' },
    description: String,
    default_priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
    estimated_cost: { type: Number, default: 0 },
    estimated_labor_cost: { type: Number, default: 0 },
    estimated_duration_hours: { type: Number, default: 2 },
    default_parts: [{
        part_id: String,
        part_name: String,
        quantity: { type: Number, default: 1 }
    }],
    checklist: [{
        step: String,
        description: String
    }],
    diagnosis_template: String,
    repair_notes_template: String,
    warranty_months: { type: Number, default: 3 },
    is_active: { type: Boolean, default: true },
    created_by: Number
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'repair_job_templates'
});

RepairJobTemplateSchema.pre('save', async function (next) {
    if (this.isNew && !this.template_id) {
        const last = await this.constructor.findOne().sort({ template_id: -1 });
        this.template_id = (last?.template_id || 0) + 1;
    }
    next();
});

const RepairJobTemplate = mongoose.models.RepairJobTemplate || mongoose.model('RepairJobTemplate', RepairJobTemplateSchema);

class RepairJobTemplateService {
    constructor(_pool) { }

    async getAllTemplates(includeInactive = false) {
        const query = includeInactive ? {} : { is_active: true };
        const templates = await RepairJobTemplate.find(query)
            .sort({ template_category: 1, template_name: 1 })
            .lean();

        return templates.map(t => ({
            ...t,
            id: t.template_id
        }));
    }

    async getTemplateById(id) {
        const template = await RepairJobTemplate.findOne({ template_id: id }).lean();
        if (!template) return null;
        return { ...template, id: template.template_id };
    }

    async createTemplate(data) {
        if (!data.template_name) {
            throw new Error('template_name is required');
        }

        const template = await RepairJobTemplate.create({
            template_name: data.template_name,
            template_category: data.template_category || 'OTHER',
            description: data.description,
            default_priority: data.default_priority || 'NORMAL',
            estimated_cost: data.estimated_cost || 0,
            estimated_labor_cost: data.estimated_labor_cost || 0,
            estimated_duration_hours: data.estimated_duration_hours || 2,
            default_parts: data.default_parts || [],
            checklist: data.checklist || [],
            diagnosis_template: data.diagnosis_template,
            repair_notes_template: data.repair_notes_template,
            warranty_months: data.warranty_months || 3,
            is_active: data.is_active !== false,
            created_by: data.created_by
        });

        return {
            template_id: template.template_id,
            ...template.toObject()
        };
    }

    async updateTemplate(id, data) {
        const template = await RepairJobTemplate.findOne({ template_id: id });
        if (!template) return false;

        const fields = [
            'template_name', 'template_category', 'description', 'default_priority',
            'estimated_cost', 'estimated_labor_cost', 'estimated_duration_hours',
            'default_parts', 'checklist', 'diagnosis_template', 'repair_notes_template',
            'warranty_months', 'is_active'
        ];

        fields.forEach(f => {
            if (data[f] !== undefined) template[f] = data[f];
        });

        await template.save();
        return true;
    }

    async deleteTemplate(id, force = false) {
        if (force) {
            const result = await RepairJobTemplate.deleteOne({ template_id: id });
            return result.deletedCount > 0;
        } else {
            const result = await RepairJobTemplate.updateOne(
                { template_id: id },
                { $set: { is_active: false } }
            );
            return result.modifiedCount > 0;
        }
    }

    async applyTemplate(templateId, jobData = {}) {
        const template = await this.getTemplateById(templateId);
        if (!template) {
            throw new Error('Template not found');
        }

        return {
            ...jobData,
            priority: jobData.priority || template.default_priority,
            estimated_cost: jobData.estimated_cost || template.estimated_cost,
            labor_cost: jobData.labor_cost || template.estimated_labor_cost,
            diagnosis: jobData.diagnosis || template.diagnosis_template,
            repair_notes: jobData.repair_notes || template.repair_notes_template,
            warranty_months: jobData.warranty_months || template.warranty_months,
            template_id: templateId,
            template_name: template.template_name,
            default_parts: template.default_parts,
            checklist: template.checklist
        };
    }
}

module.exports = RepairJobTemplateService;
