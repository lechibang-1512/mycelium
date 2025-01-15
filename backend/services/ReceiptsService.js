/**
 * Receipts Service (Sequelize Version)
 * Handles receipt queries and CRUD operations
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { ValidationError, NotFoundError, ConflictError, InsufficientStockError, CapacityError } = require('../utils/errors');


class ReceiptsService {
    constructor(_pool) { }

    async getReceiptsList(filters = {}) {
        let sql = `
            SELECT transaction_group_id,
                   MIN(transaction_type) as transaction_type,
                   MIN(transaction_date) as transaction_date,
                   MIN(warehouse_id) as warehouse_id,
                   MIN(external_doc_no) as external_doc_no,
                   MIN(invoice_id) as invoice_id,
                   MIN(document_reference) as document_reference,
                   MIN(notes) as notes,
                   MIN(total_amount) as total_amount,
                   COUNT(*) as item_count
            FROM transactions
            WHERE 1=1
        `;
        const params = [];

        if (filters.transaction_type) {
            sql += ` AND transaction_type = ?`;
            params.push(filters.transaction_type);
        }
        if (filters.warehouse_id) {
            sql += ` AND warehouse_id = ?`;
            params.push(filters.warehouse_id);
        }
        if (filters.start_date) {
            sql += ` AND transaction_date >= ?`;
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            sql += ` AND transaction_date <= ?`;
            params.push(filters.end_date);
        }

        sql += ` GROUP BY transaction_group_id ORDER BY MIN(transaction_date) DESC LIMIT ?`;
        params.push(parseInt(filters.limit || 100));

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        return rows.map(t => ({
            transaction_id: t.transaction_group_id,
            transaction_type: t.transaction_type,
            transaction_date: t.transaction_date,
            warehouse_id: t.warehouse_id,
            reference_id: t.external_doc_no || t.invoice_id,
            reference_type: t.document_reference,
            notes: t.notes,
            total_amount: Number(t.total_amount || 0),
            item_count: Number(t.item_count || 0)
        }));
    }

    async getReceiptDetail(receiptId) {
        const rows = await sequelizeMaster.query(`
            SELECT t.*, p.device_name, sp.part_name
            FROM transactions t
            LEFT JOIN phone_specs p ON t.product_id = p.product_id
            LEFT JOIN spare_parts sp ON t.spare_part_id = sp.spare_part_id
            WHERE t.transaction_group_id = ? OR t.receipt_id = ?
            ORDER BY t.created_at ASC
        `, { replacements: [receiptId, receiptId], type: QueryTypes.SELECT });

        if (!rows.length) return null;
        const first = rows[0];

        return {
            transaction_id: first.transaction_group_id,
            transaction_type: first.transaction_type,
            transaction_date: first.transaction_date,
            warehouse_id: first.warehouse_id,
            reference_id: first.external_doc_no,
            notes: first.notes,
            total_amount: Number(first.total_amount || 0),
            items: rows.map(i => ({
                ...i,
                product_name: i.device_name || i.part_name,
                sku: null,
                quantity: i.quantity_changed,
                unit_price: Number(i.unit_cost || 0),
                total_price: Number(i.total_value || 0)
            }))
        };
    }

    async getAnalytics(_filters = {}) {
        return { byType: [], byDay: [], summary: {} };
    }

    async getPhones() {
        return sequelizeMaster.query("SELECT product_id, device_name, device_maker FROM phone_specs WHERE device_type IN ('smartphone')", {
            type: QueryTypes.SELECT
        });
    }

    // Legacy aliases
    async getAllReceipts(f) { return this.getReceiptsList(f); }
    async getReceiptById(id) { return this.getReceiptDetail(id); }

    // Stubs for missing endpoints
    async createReceipt(_data) {
        throw new ValidationError('not implemented: receipt creation should be handled through valid workflows.');
    }
    
    async deleteReceipt(_id) {
        throw new ValidationError('not implemented: receipt deletion is not supported.');
    }
}

module.exports = new ReceiptsService();
