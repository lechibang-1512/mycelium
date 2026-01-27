/**
 * Repair Service (Sequelize Version)
 * Handles repair job management, parts usage, and links to RMAs
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');

class RepairService {
    constructor() {
        // Bind methods to preserve "this" context
        this._mapRepairJob = this._mapRepairJob.bind(this);
        this._mapPartUsage = this._mapPartUsage.bind(this);
    }

    /**
     * Map database row to repair job object
     */
    _mapRepairJob(j) {
        if (!j) return null;
        return {
            id: j.repair_job_id,
            repair_job_id: j.repair_job_id,
            job_number: j.job_number,
            customer_name: j.customer_name,
            customer_phone: j.customer_phone,
            customer_email: j.customer_email,
            customer: {
                name: j.customer_name,
                phone: j.customer_phone,
                email: j.customer_email,
                address: j.customer_address
            },
            device_name: j.device_name,
            device_serial_number: j.device_serial_number,
            device_imei: j.device_imei,
            device: {
                name: j.device_name,
                serial: j.device_serial_number,
                imei: j.device_imei
            },
            status: j.status,
            priority: j.priority,
            description: j.issue_description,
            issue_description: j.issue_description,
            diagnosis: j.diagnosis,
            notes: j.repair_notes,
            repair_notes: j.repair_notes,
            assigned_technician: j.assigned_technician,
            assigned_at: j.assigned_at,
            warehouse_id: j.warehouse_id,
            received_date: j.received_date,
            estimated_completion_date: j.estimated_completion_date,
            completion_date: j.completion_date,
            delivered_date: j.delivered_date,
            tested_by: j.tested_by,
            test_results: j.test_results,
            quality_check_passed: j.quality_check_passed,
            warranty_months: j.warranty_months,
            warranty_expires_at: j.warranty_expires_at,
            created_by: j.created_by,
            created_at: j.created_at,
            updated_at: j.updated_at,
            parts_count: j.parts_count ? Number(j.parts_count) : 0,
            costs: {
                estimated: Number(j.cost_estimated || 0),
                parts: Number(j.cost_parts || 0),
                labor: Number(j.cost_labor || 0),
                total: Number(j.cost_final || 0),
                customer_charge: Number(j.cost_customer_charge || 0)
            }
        };
    }

    /**
     * Map database row to part usage object
     */
    _mapPartUsage(p) {
        if (!p) return null;
        return {
            id: p.id,
            spare_part_id: p.spare_part_id,
            inventory_id: p.inventory_id,
            part_name: p.part_name,
            part_code: p.part_code,
            quantity: Number(p.quantity_used || 1),
            quantity_used: Number(p.quantity_used || 1),
            cost: Number(p.total_cost || 0),
            unit_cost: Number(p.unit_cost || 0),
            total_cost: Number(p.total_cost || 0),
            installed_at: p.installed_date,
            installed_date: p.installed_date,
            installed_by: p.installed_by,
            warranty_months: p.warranty_months,
            notes: p.notes
        };
    }

    /**
     * Normalize Status
     */
    static normalizeStatus(status) {
        const allowed = ['PENDING', 'DIAGNOSING', 'AWAITING_PARTS', 'IN_PROGRESS', 'TESTING', 'COMPLETED', 'CANCELLED'];
        const normalized = status.toUpperCase();
        if (allowed.includes(normalized)) {
            return { valid: true, normalized };
        }
        return { valid: false, allowed };
    }

    /**
     * Normalize Priority
     */
    static normalizePriority(priority) {
        const allowed = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
        const normalized = priority.toUpperCase();
        if (allowed.includes(normalized)) {
            return { valid: true, normalized };
        }
        return { valid: false, allowed };
    }

    /**
     * Get all repair jobs with optional filtering
     */
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
        if (filters.priority) {
            sql += ` AND r.priority = ?`;
            params.push(filters.priority);
        }
        if (filters.search) {
            sql += ` AND (r.job_number LIKE ? OR r.customer_name LIKE ? OR r.device_serial_number LIKE ? OR r.device_imei LIKE ?)`;
            params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }
        if (filters.myJobs && filters.technician) {
            sql += ` AND r.assigned_technician = ?`;
            params.push(filters.technician);
        }

        sql += ` GROUP BY r.repair_job_id ORDER BY r.created_at DESC`;

        if (filters.limit) {
            sql += ` LIMIT ?`;
            params.push(parseInt(filters.limit, 10));
        }

        const rows = await sequelizeMaster.query(sql, {
            replacements: params,
            type: QueryTypes.SELECT
        });

        return rows.map(this._mapRepairJob);
    }

    /**
     * Search repair jobs
     */
    async searchJobs(searchQuery, limit = 50) {
        return await this.getRepairJobs({ search: searchQuery, limit });
    }

    /**
     * Get a specific repair job by ID or job number
     */
    async getJobById(id) {
        const [job] = await sequelizeMaster.query(
            `SELECT * FROM repair_jobs WHERE repair_job_id = ? OR job_number = ? LIMIT 1`,
            { replacements: [id, id], type: QueryTypes.SELECT }
        );

        if (!job) return null;

        const parts = await sequelizeMaster.query(`
            SELECT rp.*, sp.name as part_name, sp.part_code
            FROM repair_job_parts rp
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

    /**
     * Create a new repair job
     */
    async createJob(jobData) {
        const repairJobId = generateId();
        const jobNumber = jobData.job_number || `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const {
            customer_name, customer_phone, customer_email, customer_address,
            device_name, device_serial_number, device_imei, product_id,
            issue_description, priority = 'NORMAL', status = 'PENDING',
            cost_estimated, assigned_technician, warehouse_id
        } = jobData;

        await sequelizeMaster.query(`
            INSERT INTO repair_jobs (
                repair_job_id, job_number, customer_name, customer_phone, customer_email, customer_address,
                device_name, device_serial_number, device_imei, product_id,
                issue_description, priority, status, cost_estimated,
                assigned_technician, warehouse_id, received_date, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
        `, {
            replacements: [
                repairJobId,
                jobNumber,
                customer_name || null,
                customer_phone || null,
                customer_email || null,
                customer_address || null,
                device_name || null,
                device_serial_number || null,
                device_imei || null,
                product_id || null,
                issue_description || null,
                priority || 'NORMAL',
                status || 'PENDING',
                cost_estimated || 0,
                assigned_technician || null,
                warehouse_id || null
            ],
            type: QueryTypes.INSERT
        });

        return { repair_job_id: repairJobId, job_number: jobNumber, success: true };
    }

    /**
     * Update repair job
     */
    async updateJob(id, updates) {
        const allowed = [
            'status', 'diagnosis', 'repair_notes', 'priority',
            'assigned_technician', 'cost_estimated', 'cost_labor',
            'cost_customer_charge', 'completion_date', 'tested_by',
            'test_results', 'quality_check_passed', 'warranty_months', 'warranty_expires_at'
        ];

        const updateFields = [];
        const replacements = [];

        allowed.forEach(f => {
            if (updates[f] !== undefined) {
                updateFields.push(`\`${f}\` = ?`);
                replacements.push(updates[f]);
            }
        });

        if (updates.status === 'COMPLETED' && !updates.completion_date) {
            updateFields.push('`completion_date` = ?');
            replacements.push(new Date());
        }

        if (updateFields.length === 0) return true;

        replacements.push(id, id); // For WHERE clause
        await sequelizeMaster.query(
            `UPDATE repair_jobs SET ${updateFields.join(', ')}, updated_at = NOW() WHERE repair_job_id = ? OR job_number = ?`,
            { replacements, type: QueryTypes.UPDATE }
        );

        return true;
    }

    /**
     * Cancel/Delete repair job
     */
    async deleteJob(id, force = false) {
        const job = await this.getJobById(id);
        if (!job) return { success: false, message: 'Repair job not found' };

        if (force) {
            await sequelizeMaster.transaction(async (t) => {
                await sequelizeMaster.query('DELETE FROM repair_job_parts WHERE repair_job_id = ?', {
                    replacements: [job.repair_job_id], type: QueryTypes.DELETE, transaction: t
                });
                await sequelizeMaster.query('DELETE FROM repair_jobs WHERE repair_job_id = ?', {
                    replacements: [job.repair_job_id], type: QueryTypes.DELETE, transaction: t
                });
            });
            return { success: true, message: 'Repair job permanently deleted' };
        } else {
            await this.updateJob(job.repair_job_id, { status: 'CANCELLED' });
            return { success: true, message: 'Repair job cancelled successfully' };
        }
    }

    /**
     * Add part to repair job
     */
    async addPartUsage(jobId, partData, userId) {
        const { spare_part_id, quantity_used, inventory_id, unit_cost, notes, warranty_months } = partData;
        const quantity = quantity_used || 1;

        return await sequelizeMaster.transaction(async (t) => {
            const [job] = await sequelizeMaster.query('SELECT repair_job_id FROM repair_jobs WHERE repair_job_id = ? OR job_number = ?', {
                replacements: [jobId, jobId],
                type: QueryTypes.SELECT,
                transaction: t
            });
            if (!job) throw new Error('Job not found');

            // Deduct stock from inventory table
            if (inventory_id) {
                const [inv] = await sequelizeMaster.query('SELECT quantity FROM inventory WHERE id = ? FOR UPDATE', {
                    replacements: [inventory_id], type: QueryTypes.SELECT, transaction: t
                });

                if (!inv || inv.quantity < quantity) {
                    throw new Error('Insufficient inventory stock for this part');
                }

                await sequelizeMaster.query('UPDATE inventory SET quantity = quantity - ? WHERE id = ?', {
                    replacements: [quantity, inventory_id], type: QueryTypes.UPDATE, transaction: t
                });
            }

            const partUsageId = generateId();
            const cost = Number(unit_cost || 0);

            await sequelizeMaster.query(`
                INSERT INTO repair_job_parts (
                    id, repair_job_id, spare_part_id, inventory_id, quantity_used,
                    unit_cost, total_cost, installed_date, installed_by, warranty_months, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
            `, {
                replacements: [
                    partUsageId, job.repair_job_id, spare_part_id, inventory_id || null, quantity,
                    cost, cost * quantity, userId || 1, warranty_months || 3, notes || ''
                ],
                type: QueryTypes.INSERT,
                transaction: t
            });

            // Update repair job costs
            await sequelizeMaster.query(`
                UPDATE repair_jobs SET cost_parts = cost_parts + ? WHERE repair_job_id = ?
            `, {
                replacements: [cost * quantity, job.repair_job_id],
                type: QueryTypes.UPDATE,
                transaction: t
            });

            return partUsageId;
        });
    }

    /**
     * Remove part usage from job (and restore stock if applicable)
     */
    async removePartUsage(usageId, _userId) {
        return await sequelizeMaster.transaction(async (t) => {
            const [usage] = await sequelizeMaster.query('SELECT * FROM repair_job_parts WHERE id = ?', {
                replacements: [usageId], type: QueryTypes.SELECT, transaction: t
            });
            if (!usage) return false;

            // Restore inventory stock
            if (usage.inventory_id) {
                await sequelizeMaster.query('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', {
                    replacements: [usage.quantity_used, usage.inventory_id],
                    type: QueryTypes.UPDATE,
                    transaction: t
                });
            }

            // Deduct repair job costs
            await sequelizeMaster.query(`
                UPDATE repair_jobs SET cost_parts = GREATEST(0, cost_parts - ?) WHERE repair_job_id = ?
            `, {
                replacements: [usage.total_cost, usage.repair_job_id],
                type: QueryTypes.UPDATE,
                transaction: t
            });

            await sequelizeMaster.query('DELETE FROM repair_job_parts WHERE id = ?', {
                replacements: [usageId], type: QueryTypes.DELETE, transaction: t
            });

            return true;
        });
    }

    /**
     * Get status change history from security_db.audit_log
     */
    async getStatusHistory(id) {
        const job = await this.getJobById(id);
        if (!job) return [];

        const sql = `
            SELECT * FROM security_db.audit_log 
            WHERE resource_type = 'repair_job' AND resource_id = ? 
            ORDER BY created_at DESC
        `;
        const rows = await sequelizeMaster.query(sql, { replacements: [job.id], type: QueryTypes.SELECT });

        return rows.map(r => ({
            timestamp: r.created_at,
            user_id: r.user_id,
            action: r.action,
            notes: r.details || ''
        }));
    }

    /**
     * Get customer repair history
     */
    async getCustomerHistory(name, email, phone) {
        let sql = `SELECT * FROM repair_jobs WHERE 1=0`;
        const params = [];
        if (name) { sql += ` OR customer_name = ?`; params.push(name); }
        if (email) { sql += ` OR customer_email = ?`; params.push(email); }
        if (phone) { sql += ` OR customer_phone = ?`; params.push(phone); }

        const jobs = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });

        const totalJobs = jobs.length;
        const totalSpent = jobs.reduce((sum, j) => sum + Number(j.cost_final || 0), 0);

        return {
            customer: {
                name: name || jobs[0]?.customer_name || 'Unknown',
                email: email || jobs[0]?.customer_email || '',
                phone: phone || jobs[0]?.customer_phone || ''
            },
            stats: {
                total_jobs: totalJobs,
                total_spent: totalSpent
            },
            jobs: jobs.map(this._mapRepairJob)
        };
    }

    /**
     * Get technician performance
     */
    async getTechnicianPerformance() {
        const query = `
            SELECT assigned_technician as technician,
                   COUNT(*) as total_jobs,
                   SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_jobs,
                   SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_jobs
            FROM repair_jobs
            WHERE assigned_technician IS NOT NULL
            GROUP BY assigned_technician
        `;
        const rows = await sequelizeMaster.query(query, { type: QueryTypes.SELECT });
        return rows;
    }

    /**
     * Bulk update status
     */
    async bulkUpdateStatus(ids, status, _userId) {
        const results = [];
        for (const id of ids) {
            try {
                await this.updateJob(id, { status });
                results.push({ jobId: id, success: true });
            } catch (e) {
                results.push({ jobId: id, success: false, error: e.message });
            }
        }
        return results;
    }

    /**
     * Bulk assign technician
     */
    async bulkAssignTechnician(ids, technicianId, _userId) {
        const results = [];
        for (const id of ids) {
            try {
                await this.updateJob(id, { assigned_technician: technicianId, assigned_at: new Date() });
                results.push({ jobId: id, success: true });
            } catch (e) {
                results.push({ jobId: id, success: false, error: e.message });
            }
        }
        return results;
    }

    /**
     * Bulk update priority
     */
    async bulkUpdatePriority(ids, priority, _userId) {
        const results = [];
        for (const id of ids) {
            try {
                await this.updateJob(id, { priority });
                results.push({ jobId: id, success: true });
            } catch (e) {
                results.push({ jobId: id, success: false, error: e.message });
            }
        }
        return results;
    }

    /**
     * Bulk cancel jobs
     */
    async bulkCancel(ids, reason, _userId) {
        const results = [];
        for (const id of ids) {
            try {
                await this.updateJob(id, { status: 'CANCELLED', repair_notes: reason });
                results.push({ jobId: id, success: true });
            } catch (e) {
                results.push({ jobId: id, success: false, error: e.message });
            }
        }
        return results;
    }

    /**
     * Create repair job from RMA item
     */
    async createFromRMAItem(rmaItemData, repairJobData, _userId) {
        const { rma_number, item_id } = rmaItemData;
        
        // Find RMA header & item
        const [rma] = await sequelizeMaster.query('SELECT * FROM rmas WHERE rma_id = ? OR id = ? LIMIT 1', {
            replacements: [rma_number, rma_number], type: QueryTypes.SELECT
        });
        if (!rma) throw new Error('RMA not found');

        const [item] = await sequelizeMaster.query('SELECT * FROM rma_items WHERE id = ? AND rma_table_id = ? LIMIT 1', {
            replacements: [item_id, rma.id], type: QueryTypes.SELECT
        });
        if (!item) throw new Error('RMA item not found');

        // Create repair job using customer and device details from RMA
        const jobData = {
            customer_name: rma.customer_name,
            customer_phone: rma.customer_phone,
            customer_email: rma.customer_email,
            device_name: repairJobData.device_name || `RMA Device (${item.product_id})`,
            device_serial_number: item.serial_number,
            device_imei: item.serial_number,
            product_id: item.product_id,
            issue_description: repairJobData.issue_description || rma.reason_description || 'RMA Repair request',
            priority: repairJobData.priority || 'NORMAL',
            status: 'PENDING',
            cost_estimated: repairJobData.cost_estimated || 0,
            warehouse_id: rma.warehouse_id
        };

        const result = await this.createJob(jobData);

        // Update RMA item with repair_job_id
        await sequelizeMaster.query(
            'UPDATE rma_items SET repair_job_id = ?, disposition = \'repair\' WHERE id = ?',
            { replacements: [result.repair_job_id, item.id], type: QueryTypes.UPDATE }
        );

        return result;
    }

    /**
     * Get linked RMAs for a repair job
     */
    async getLinkedRMAs(repairJobId) {
        const sql = `
            SELECT r.*, ri.id as item_id, ri.serial_number
            FROM rmas r
            JOIN rma_items ri ON r.id = ri.rma_table_id
            WHERE ri.repair_job_id = ?
        `;
        const rows = await sequelizeMaster.query(sql, { replacements: [repairJobId], type: QueryTypes.SELECT });
        return rows;
    }
}

module.exports = RepairService;
