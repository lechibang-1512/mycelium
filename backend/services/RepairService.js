/**
 * Repair Service (Sequelize Version)
 * Handles repair job management and parts usage
 */

const { QueryTypes, Op } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { RepairJob, RepairJobPart, Inventory } = require('../models/master');
const { generateId } = require('../utils/generateId');
const { NotFoundError, InsufficientStockError } = require('../utils/errors');


class RepairService {
    constructor() { }

    async getRepairJobs(filters = {}) {
        let sql = `
            SELECT r.*, 
                   COUNT(rp.id) as parts_count
            FROM repair_jobs r
            LEFT JOIN repair_job_parts rp ON r.repair_job_id = rp.repair_job_id
            WHERE 1=1
        `;
        const params = [];

        if (filters.status) {
            sql += ` AND r.status = ?`;
            params.push(filters.status);
        }

        if (filters.search) {
            sql += ` AND (r.job_number LIKE ? OR r.customer_name LIKE ? OR r.device_serial_number LIKE ?)`;
            params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.myJobs && filters.technician) {
            sql += ` AND r.assigned_technician = ?`;
            params.push(filters.technician);
        }

        sql += ` GROUP BY r.repair_job_id ORDER BY r.created_at DESC`;

        if (filters.limit) {
            sql += ` LIMIT ?`;
            params.push(parseInt(filters.limit));
        }

        const rows = await sequelizeMaster.query(sql, {
            replacements: params,
            type: QueryTypes.SELECT
        });

        return rows.map(this._mapRepairJob);
    }

    async getRepairJobById(id) {
        let sql = `SELECT * FROM repair_jobs WHERE repair_job_id = ? OR job_number = ?`;

        const [job] = await sequelizeMaster.query(sql, {
            replacements: [id, id],
            type: QueryTypes.SELECT
        });

        if (!job) return null;

        const parts = await sequelizeMaster.query(`
            SELECT rp.*, sp.name as part_name, sp.part_code
            FROM repair_parts rp
            LEFT JOIN master_db.products sp ON rp.spare_part_id = sp.product_id
            WHERE rp.repair_job_id = ?
        `, {
            replacements: [job.repair_job_id],
            type: QueryTypes.SELECT
        });

        return {
            ...this._mapRepairJob(job),
            parts: parts.map(this._mapPartUsage)
        };
    }

    async createRepairJob(jobData) {
        const repairJobId = generateId();
        const jobNumber = `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const {
            customer_name, customer_phone, customer_email,
            device_name, device_serial_number, device_imei,
            issue_description, priority = 'NORMAL', status = 'PENDING',
            cost_estimated
        } = jobData;

        await RepairJob.create({
            repair_job_id: repairJobId, job_number: jobNumber, 
            customer_name, customer_phone, customer_email,
            device_name, device_serial_number, device_imei,
            issue_description, priority, status,
            cost_estimated: cost_estimated || 0, 
            received_date: new Date()
        });

        return { repair_job_id: repairJobId, job_number: jobNumber, success: true };
    }

    async updateRepairJob(id, updates) {
        const allowed = [
            'status', 'diagnosis', 'repair_notes', 'priority',
            'assigned_technician', 'cost_estimated', 'cost_labor',
            'cost_customer_charge', 'completion_date'
        ];

        const updateData = {};
        allowed.forEach(f => {
            if (updates[f] !== undefined) updateData[f] = updates[f];
        });

        if (updates.status === 'COMPLETED' && !updateData.completion_date) {
            updateData.completion_date = new Date();
        }

        if (Object.keys(updateData).length === 0) return { success: true };

        let [affectedRows] = await RepairJob.update(updateData, { where: { repair_job_id: id } });

        if (affectedRows === 0) {
            [affectedRows] = await RepairJob.update(updateData, { where: { job_number: id } });
            if (affectedRows === 0) return { error: 'Job not found' };
        }
        return { success: true };
    }

    async addPartToJob(jobId, partData) {
        const { spare_part_id, quantity, inventory_id } = partData;

        return await sequelizeMaster.transaction(async (t) => {
            const [job] = await sequelizeMaster.query('SELECT repair_job_id FROM repair_jobs WHERE repair_job_id = ?', {
                replacements: [jobId],
                type: QueryTypes.SELECT,
                transaction: t
            });
            if (!job) throw new NotFoundError('job not found');

            // Deduct quantity
            if (inventory_id) {
                const [deductRows] = await Inventory.update({
                    quantity: sequelizeMaster.literal(`quantity - ${quantity}`)
                }, { 
                    where: { id: inventory_id, quantity: { [Op.gte]: quantity } },
                    transaction: t
                });
                if (deductRows === 0) {
                    throw new InsufficientStockError('insufficient stock for part deduction');
                }
            }

            await RepairJobPart.create({
                repair_job_id: jobId, spare_part_id, inventory_id, quantity_used: quantity,
                installed_date: new Date()
            }, { transaction: t });

            return { success: true };
        });
    }

    _mapRepairJob(j) {
        return {
            id: j.repair_job_id,
            job_number: j.job_number,
            customer: {
                name: j.customer_name,
                phone: j.customer_phone,
                email: j.customer_email
            },
            device: {
                name: j.device_name,
                serial: j.device_serial_number,
                imei: j.device_imei
            },
            status: j.status,
            priority: j.priority,
            description: j.issue_description,
            diagnosis: j.diagnosis,
            notes: j.repair_notes,
            technician: j.assigned_technician,
            costs: {
                estimated: j.cost_estimated,
                parts: j.cost_parts,
                labor: j.cost_labor,
                total: j.cost_final
            },
            created_at: j.created_at,
            updated_at: j.updated_at
        };
    }

    _mapPartUsage(p) {
        return {
            id: p.id,
            spare_part_id: p.spare_part_id,
            part_name: p.part_name,
            part_code: p.part_code,
            quantity: p.quantity_used,
            cost: p.total_cost,
            installed_at: p.installed_date
        };
    }
}

module.exports = RepairService;
