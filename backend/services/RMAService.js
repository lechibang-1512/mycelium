/**
 * RMAService
 * Handles Return Merchandise Authorization operations using consolidated MariaDB master_db
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');

class RMAService {
    constructor() {
        // Bind methods to preserve "this" context
        this._mapRMA = this._mapRMA.bind(this);
        this._mapRMAItem = this._mapRMAItem.bind(this);
    }

    /**
     * Map database RMA row to API format
     */
    _mapRMA(r) {
        if (!r) return null;
        let statusHistory = [];
        let attachments = [];
        try {
            statusHistory = r.status_history ? (typeof r.status_history === 'string' ? JSON.parse(r.status_history) : r.status_history) : [];
        } catch (e) { console.error('Error parsing status_history:', e); }
        try {
            attachments = r.attachments ? (typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments) : [];
        } catch (e) { console.error('Error parsing attachments:', e); }

        return {
            id: r.id,
            rma_id: r.rma_id,
            customer_name: r.customer_name,
            customer_email: r.customer_email,
            customer_phone: r.customer_phone,
            customer: {
                name: r.customer_name,
                email: r.customer_email,
                phone: r.customer_phone
            },
            original_receipt_id: r.original_receipt_id,
            original_transaction_date: r.original_transaction_date,
            reason_code: r.reason_code,
            reason_description: r.reason_description,
            status: r.status,
            priority: r.priority,
            warehouse_id: r.warehouse_id,
            quarantine_zone_id: r.quarantine_zone_id,
            requested_by: r.requested_by,
            assigned_to: r.assigned_to,
            expected_return_date: r.expected_return_date,
            actual_return_date: r.actual_return_date,
            inspection_date: r.inspection_date,
            completion_date: r.completion_date,
            total_value: Number(r.total_value || 0),
            refund_amount: Number(r.refund_amount || 0),
            restocking_fee: Number(r.restocking_fee || 0),
            notes: r.notes,
            internal_notes: r.internal_notes,
            created_at: r.created_at,
            updated_at: r.updated_at,
            item_count: r.item_count ? Number(r.item_count) : 0,
            status_history: statusHistory,
            attachments: attachments
        };
    }

    /**
     * Map database RMA Item row to API format
     */
    _mapRMAItem(i) {
        if (!i) return null;
        return {
            item_id: i.id,
            id: i.id,
            product_id: i.product_id,
            spare_part_id: i.spare_part_id,
            serial_number: i.serial_number,
            device_identifier: i.serial_number,
            quantity: Number(i.quantity || 1),
            condition_detail: i.condition_detail,
            disposition: i.disposition,
            unit_value: Number(i.unit_value || 0),
            notes: i.notes,
            rma_table_id: i.rma_table_id,
            repair_job_id: i.repair_job_id
        };
    }

    /**
     * List RMA requests with filters
     */
    async getRMAs(filters = {}) {
        let sql = `
            SELECT r.*,
                   (SELECT COUNT(*) FROM rma_items ri WHERE ri.rma_table_id = r.id) as item_count
            FROM rmas r
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
        if (filters.warehouse_id) {
            sql += ` AND r.warehouse_id = ?`;
            params.push(filters.warehouse_id);
        }
        if (filters.assigned_to) {
            sql += ` AND r.assigned_to = ?`;
            params.push(filters.assigned_to);
        }
        if (filters.customer_search) {
            sql += ` AND (r.customer_name LIKE ? OR r.customer_email LIKE ? OR r.customer_phone LIKE ? OR r.rma_id LIKE ?)`;
            params.push(`%${filters.customer_search}%`, `%${filters.customer_search}%`, `%${filters.customer_search}%`, `%${filters.customer_search}%`);
        }
        if (filters.device_imei) {
            sql += ` AND EXISTS (SELECT 1 FROM rma_items ri WHERE ri.rma_table_id = r.id AND ri.serial_number = ?)`;
            params.push(filters.device_imei);
        }
        if (filters.date_from) {
            sql += ` AND r.created_at >= ?`;
            params.push(filters.date_from);
        }
        if (filters.date_to) {
            sql += ` AND r.created_at <= ?`;
            params.push(filters.date_to);
        }

        sql += ` ORDER BY r.created_at DESC`;

        if (filters.limit) {
            sql += ` LIMIT ?`;
            params.push(parseInt(filters.limit, 10));
            if (filters.offset) {
                sql += ` OFFSET ?`;
                params.push(parseInt(filters.offset, 10));
            }
        }

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        return rows.map(this._mapRMA);
    }

    /**
     * Get RMA request details by ID or Public RMA number
     */
    async getRMAById(id) {
        const [rma] = await sequelizeMaster.query(
            'SELECT * FROM rmas WHERE rma_id = ? OR id = ? LIMIT 1',
            { replacements: [id, id], type: QueryTypes.SELECT }
        );
        if (!rma) return null;

        const items = await sequelizeMaster.query(
            'SELECT * FROM rma_items WHERE rma_table_id = ?',
            { replacements: [rma.id], type: QueryTypes.SELECT }
        );

        return {
            ...this._mapRMA(rma),
            items: items.map(this._mapRMAItem)
        };
    }

    /**
     * Create a new RMA Request and its line items
     */
    async createRMARequest(rmaData, items, userId) {
        return await sequelizeMaster.transaction(async (t) => {
            const rmaId = rmaData.rma_id || generateId();
            const headerId = generateId();
            
            const initialHistory = [{
                status: rmaData.status || 'pending',
                timestamp: new Date().toISOString(),
                user_id: userId,
                notes: 'RMA Request Created'
            }];

            await sequelizeMaster.query(`
                INSERT INTO rmas (
                    id, rma_id, customer_name, customer_email, customer_phone,
                    original_receipt_id, reason_code, reason_description,
                    status, priority, warehouse_id, created_at, updated_at,
                    status_history, attachments
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, '[]')
            `, {
                replacements: [
                    headerId,
                    rmaId,
                    rmaData.customer_name || null,
                    rmaData.customer_email || null,
                    rmaData.customer_phone || null,
                    rmaData.original_receipt_id || null,
                    rmaData.reason_code || null,
                    rmaData.reason_description || null,
                    rmaData.status || 'pending',
                    rmaData.priority || 'medium',
                    rmaData.warehouse_id || null,
                    JSON.stringify(initialHistory)
                ],
                type: QueryTypes.INSERT,
                transaction: t
            });

            const savedItems = [];
            if (items && Array.isArray(items)) {
                for (const item of items) {
                    const itemId = generateId();
                    await sequelizeMaster.query(`
                        INSERT INTO rma_items (
                            id, rma_table_id, product_id, spare_part_id, serial_number,
                            quantity, condition_detail, disposition, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, {
                        replacements: [
                            itemId, headerId, item.product_id || null, item.spare_part_id || null, item.serial_number || null,
                            item.quantity || 1, item.condition_detail || null, item.disposition || 'pending', item.notes || null
                        ],
                        type: QueryTypes.INSERT,
                        transaction: t
                    });

                    savedItems.push({
                        item_id: itemId,
                        id: itemId,
                        product_id: item.product_id,
                        spare_part_id: item.spare_part_id,
                        serial_number: item.serial_number,
                        device_identifier: item.serial_number,
                        quantity: item.quantity,
                        condition_detail: item.condition_detail,
                        disposition: item.disposition || 'pending',
                        notes: item.notes
                    });
                }
            }

            return {
                id: headerId,
                rma_id: rmaId,
                ...rmaData,
                status_history: initialHistory,
                attachments: [],
                items: savedItems
            };
        });
    }

    /**
     * Update RMA Request header info
     */
    async updateRMARequest(rmaNumber, updates, _userId) {
        const allowed = [
            'priority', 'assigned_to', 'expected_return_date', 'actual_return_date',
            'inspection_date', 'completion_date', 'refund_amount', 'restocking_fee',
            'notes', 'internal_notes', 'customer_name', 'customer_email', 'customer_phone'
        ];
        
        const updateFields = [];
        const replacements = [];
        
        allowed.forEach(field => {
            if (updates[field] !== undefined) {
                updateFields.push(`\`${field}\` = ?`);
                replacements.push(updates[field]);
            }
        });

        if (updateFields.length === 0) {
            return await this.getRMAById(rmaNumber);
        }

        replacements.push(rmaNumber, rmaNumber); // For WHERE clause
        await sequelizeMaster.query(
            `UPDATE rmas SET ${updateFields.join(', ')}, updated_at = NOW() WHERE rma_id = ? OR id = ?`,
            { replacements, type: QueryTypes.UPDATE }
        );

        return await this.getRMAById(rmaNumber);
    }

    /**
     * Delete RMA request (hard delete)
     */
    async deleteRMA(rmaNumber) {
        const rma = await this.getRMAById(rmaNumber);
        if (!rma) return false;

        await sequelizeMaster.transaction(async (t) => {
            await sequelizeMaster.query('DELETE FROM rma_items WHERE rma_table_id = ?', {
                replacements: [rma.id], type: QueryTypes.DELETE, transaction: t
            });
            await sequelizeMaster.query('DELETE FROM rmas WHERE id = ?', {
                replacements: [rma.id], type: QueryTypes.DELETE, transaction: t
            });
        });
        return true;
    }

    /**
     * Update RMA status and log in status history JSON column
     */
    async updateRMAStatus(rmaNumber, status, userId, reason = '') {
        const rma = await this.getRMAById(rmaNumber);
        if (!rma) throw new Error('RMA not found');

        const newHistory = [...rma.status_history, {
            status,
            timestamp: new Date().toISOString(),
            user_id: userId,
            notes: reason || `Status updated to ${status}`
        }];

        await sequelizeMaster.query(
            `UPDATE rmas SET status = ?, status_history = ?, updated_at = NOW() WHERE id = ?`,
            {
                replacements: [status, JSON.stringify(newHistory), rma.id],
                type: QueryTypes.UPDATE
            }
        );

        return await this.getRMAById(rma.id);
    }

    /**
     * Receive RMA items
     */
    async receiveRMAItems(rmaNumber, itemsData, userId) {
        const rma = await this.getRMAById(rmaNumber);
        if (!rma) throw new Error('RMA not found');

        await sequelizeMaster.transaction(async (t) => {
            for (const item of itemsData) {
                await sequelizeMaster.query(
                    `UPDATE rma_items SET disposition = 'received', notes = ? WHERE id = ? AND rma_table_id = ?`,
                    {
                        replacements: [item.notes || 'Received at warehouse', item.item_id || item.id, rma.id],
                        type: QueryTypes.UPDATE,
                        transaction: t
                    }
                );
            }
        });

        return await this.updateRMAStatus(rma.id, 'received', userId, 'Items received at warehouse quarantine');
    }

    /**
     * Inspect a specific RMA item
     */
    async inspectRMAItem(rmaNumber, itemId, inspectionData, _userId) {
        const rma = await this.getRMAById(rmaNumber);
        if (!rma) throw new Error('RMA not found');

        await sequelizeMaster.query(
            `UPDATE rma_items SET condition_detail = ?, disposition = ?, notes = ? WHERE id = ? AND rma_table_id = ?`,
            {
                replacements: [
                    inspectionData.condition_detail || '',
                    inspectionData.disposition || 'inspected',
                    inspectionData.inspection_notes || inspectionData.notes || '',
                    itemId, rma.id
                ],
                type: QueryTypes.UPDATE
            }
        );

        return await this.getRMAById(rma.id);
    }

    /**
     * Set disposition on a specific RMA item
     */
    async setItemDisposition(rmaNumber, itemId, disposition, notes, _userId) {
        const rma = await this.getRMAById(rmaNumber);
        if (!rma) throw new Error('RMA not found');

        await sequelizeMaster.query(
            `UPDATE rma_items SET disposition = ?, notes = ? WHERE id = ? AND rma_table_id = ?`,
            {
                replacements: [disposition, notes || '', itemId, rma.id],
                type: QueryTypes.UPDATE
            }
        );

        return await this.getRMAById(rma.id);
    }

    /**
     * Process disposition actions: restocked, scrapped, sent_to_repair, etc.
     */
    async processDispositionAction(rmaNumber, itemId, actionData, _userId) {
        const rma = await this.getRMAById(rmaNumber);
        if (!rma) throw new Error('RMA not found');

        const item = rma.items.find(i => i.id === itemId);
        if (!item) throw new Error('RMA item not found');

        const { action_type, warehouse_id, bin_id, notes } = actionData;

        await sequelizeMaster.transaction(async (t) => {
            // Update item status/disposition
            await sequelizeMaster.query(
                `UPDATE rma_items SET disposition = ?, notes = ? WHERE id = ?`,
                { replacements: [action_type, notes || `Processed: ${action_type}`, itemId], type: QueryTypes.UPDATE, transaction: t }
            );

            // Action: restocked -> add back to inventory
            if (action_type === 'restocked') {
                const targetWarehouse = warehouse_id || rma.warehouse_id;
                if (!targetWarehouse) throw new Error('Warehouse ID required for restocking');

                // Upsert to inventory bulk
                const existing = await sequelizeMaster.query(
                    'SELECT id FROM inventory WHERE product_id = ? AND warehouse_id = ? AND bin_id <=> ? AND inventory_type = \'bulk\' AND condition_status = \'NEW\'',
                    { replacements: [item.product_id, targetWarehouse, bin_id || null], type: QueryTypes.SELECT, transaction: t }
                );

                if (existing.length > 0) {
                    await sequelizeMaster.query(
                        'UPDATE inventory SET quantity = quantity + ? WHERE id = ?',
                        { replacements: [item.quantity, existing[0].id], type: QueryTypes.UPDATE, transaction: t }
                    );
                } else {
                    await sequelizeMaster.query(
                        'INSERT INTO inventory (id, inventory_type, product_id, quantity, condition_status, warehouse_id, bin_id, notes, last_movement_at, last_movement_type) VALUES (?, \'bulk\', ?, ?, \'NEW\', ?, ?, ?, NOW(), \'incoming\')',
                        { replacements: [generateId(), item.product_id, item.quantity, targetWarehouse, bin_id || null, 'RMA Restocked'], type: QueryTypes.INSERT, transaction: t }
                    );
                }
            }
        });

        return await this.getRMAById(rma.id);
    }

    /**
     * Add attachment metadata to RMA
     */
    async addAttachment(rmaNumber, attachmentData, userId) {
        const rma = await this.getRMAById(rmaNumber);
        if (!rma) throw new Error('RMA not found');

        const attachments = rma.attachments || [];
        const newAttachment = {
            id: generateId(),
            file_name: attachmentData.file_name,
            file_path: attachmentData.file_path,
            mime_type: attachmentData.mime_type || '',
            uploaded_by: userId,
            uploaded_at: new Date().toISOString()
        };
        attachments.push(newAttachment);

        await sequelizeMaster.query(
            `UPDATE rmas SET attachments = ? WHERE id = ?`,
            {
                replacements: [JSON.stringify(attachments), rma.id],
                type: QueryTypes.UPDATE
            }
        );

        return newAttachment;
    }

    /**
     * List attachments for RMA
     */
    async getAttachments(rmaNumber) {
        const rma = await this.getRMAById(rmaNumber);
        if (!rma) return [];
        return rma.attachments || [];
    }

    /**
     * Bulk update statuses
     */
    async bulkUpdateStatus(numbers, status, userId, reason = '') {
        const results = [];
        for (const num of numbers) {
            try {
                await this.updateRMAStatus(num, status, userId, reason);
                results.push({ rmaNumber: num, success: true });
            } catch (e) {
                results.push({ rmaNumber: num, success: false, error: e.message });
            }
        }
        return results;
    }

    /**
     * Bulk assign RMAs
     */
    async bulkAssign(numbers, assignedTo, userId) {
        const results = [];
        for (const num of numbers) {
            try {
                await this.updateRMARequest(num, { assigned_to: assignedTo }, userId);
                results.push({ rmaNumber: num, success: true });
            } catch (e) {
                results.push({ rmaNumber: num, success: false, error: e.message });
            }
        }
        return results;
    }

    /**
     * Link RMA item to a repair job
     */
    async linkToRepairJob(rmaNumber, itemId, repairJobId, linkReason, userId, notes) {
        const rma = await this.getRMAById(rmaNumber);
        if (!rma) throw new Error('RMA not found');

        await sequelizeMaster.query(
            `UPDATE rma_items SET repair_job_id = ?, notes = ? WHERE id = ? AND rma_table_id = ?`,
            {
                replacements: [repairJobId, notes || `Linked to repair job: ${repairJobId} (${linkReason})`, itemId, rma.id],
                type: QueryTypes.UPDATE
            }
        );

        return await this.getRMAById(rma.id);
    }

    /**
     * Get repair jobs linked to this RMA
     */
    async getLinkedRepairJobs(rmaNumber) {
        const rma = await this.getRMAById(rmaNumber);
        if (!rma) return [];

        const jobIds = rma.items.map(i => i.repair_job_id).filter(id => id);
        if (jobIds.length === 0) return [];

        const jobs = await sequelizeMaster.query(
            'SELECT * FROM repair_jobs WHERE repair_job_id IN (?)',
            { replacements: [jobIds], type: QueryTypes.SELECT }
        );
        return jobs;
    }

    /**
     * Unlink RMA item from its repair job
     */
    async unlinkRepairJob(rmaNumber, itemId) {
        const rma = await this.getRMAById(rmaNumber);
        if (!rma) return false;

        await sequelizeMaster.query(
            `UPDATE rma_items SET repair_job_id = NULL WHERE id = ? AND rma_table_id = ?`,
            { replacements: [itemId, rma.id], type: QueryTypes.UPDATE }
        );
        return true;
    }

    /**
     * Find matching repair jobs by serial number or product name
     */
    async getMatchingRepairJobs(item) {
        const query = `
            SELECT * FROM repair_jobs
            WHERE (device_serial_number = ? OR device_imei = ? OR device_name LIKE ?)
            LIMIT 10
        `;
        const params = [
            item.serial_number || '',
            item.serial_number || '',
            `%${item.product_id ? 'device' : ''}%`
        ];

        const jobs = await sequelizeMaster.query(query, { replacements: params, type: QueryTypes.SELECT });
        return jobs;
    }
}

module.exports = RMAService;
