/**
 * RMA Service (Sequelize Version)
 * Handles Returns using merged `rmas` table
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { Rma } = require('../models/master');
const { generateId } = require('../utils/generateId');

class RMAService {
    constructor() { }

    async getRMAs(filters = {}) {
        let sql = `
            SELECT rma_id,
                   MIN(id) as id,
                   MIN(customer_name) as customer_name,
                   MIN(customer_email) as customer_email,
                   MIN(original_receipt_id) as original_receipt_id,
                   MIN(reason_code) as reason_code,
                   MIN(reason_description) as reason_description,
                   MIN(status) as status,
                   MIN(warehouse_id) as warehouse_id,
                   MIN(created_at) as created_at,
                   COUNT(*) as item_count
            FROM rmas
            WHERE 1=1
        `;
        const params = [];

        if (filters.status) {
            sql += ` AND status = ?`;
            params.push(filters.status);
        }
        if (filters.search) {
            sql += ` AND (rma_id LIKE ? OR customer_email LIKE ? OR original_receipt_id LIKE ?)`;
            params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }

        sql += ` GROUP BY rma_id ORDER BY MIN(created_at) DESC`;

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        return rows.map(this._mapRMA);
    }

    async getRMAById(id) {
        const rows = await sequelizeMaster.query(
            'SELECT * FROM rmas WHERE rma_id = ? OR id = ? ORDER BY created_at ASC',
            { replacements: [id, id], type: QueryTypes.SELECT }
        );
        if (!rows.length) return null;

        const first = rows[0];
        return {
            ...this._mapRMA(first),
            items: rows.map(this._mapRMAItem)
        };
    }

    async createRMA(data) {
        return await sequelizeMaster.transaction(async (t) => {
            const rmaId = `RMA-${Date.now()}`;
            const {
                customer_name, customer_email, customer_phone,
                original_receipt_id, reason_code, reason_description,
                status = 'pending', warehouse_id, items
            } = data;

            if (items && items.length > 0) {
                for (const item of items) {
                    await Rma.create({
                        id: generateId(), rma_id: rmaId, customer_name, customer_email, customer_phone,
                        original_receipt_id, reason_code, reason_description,
                        status, warehouse_id,
                        product_id: item.product_id, spare_part_id: item.spare_part_id, serial_number: item.serial_number,
                        quantity: item.quantity || 1, condition_detail: item.condition_detail, disposition: item.disposition, item_notes: item.notes
                    }, { transaction: t });
                }
            } else {
                await Rma.create({
                    id: generateId(), rma_id: rmaId, customer_name, customer_email, customer_phone,
                    original_receipt_id, reason_code, reason_description,
                    status, warehouse_id
                }, { transaction: t });
            }

            return { rma_id: rmaId, success: true };
        });
    }

    async updateRMA(id, updates) {
        const allowed = ['status', 'priority', 'assigned_to', 'completion_date', 'notes', 'refund_amount'];
        const updateData = {};
        allowed.forEach(f => {
            if (updates[f] !== undefined) updateData[f] = updates[f];
        });
        if (Object.keys(updateData).length === 0) return { success: true };

        await Rma.update(updateData, { where: { rma_id: id } });
        return { success: true };
    }

    _mapRMA(r) {
        return {
            id: r.id,
            rma_id: r.rma_id,
            customer: {
                name: r.customer_name,
                email: r.customer_email
            },
            original_receipt: r.original_receipt_id,
            reason: {
                code: r.reason_code,
                description: r.reason_description
            },
            status: r.status,
            warehouse_id: r.warehouse_id,
            created_at: r.created_at
        };
    }
    _mapRMAItem(i) {
        return {
            id: i.id,
            product_id: i.product_id,
            serial: i.serial_number,
            quantity: i.quantity,
            condition: i.condition_detail,
            disposition: i.disposition
        };
    }
}

module.exports = RMAService;
