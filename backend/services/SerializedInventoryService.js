/**
 * Serialized Inventory Service (Sequelize Version)
 * Manages individual serialized items (Devices with IMEI, Spare Parts with Serial/UUID)
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { Inventory } = require('../models/master');
const { generateId } = require('../utils/generateId');
const { NotFoundError } = require('../utils/errors');


class SerializedInventoryService {
    constructor() { }

    // =========================================================================
    // Query Operations
    // =========================================================================

    async getAll(filters = {}) {
        const { type, status, warehouseId, search, limit = 100, offset = 0 } = filters;

        let query = `
            SELECT 
                i.id, i.inventory_type, i.product_id, i.spare_part_id, 
                i.serial_number, i.imei_1, i.imei_2, 
                i.status, i.condition_grade, i.warehouse_id, i.bin_id,
                i.notes, i.created_at, i.updated_at,
                w.name as warehouse_name,
                p.device_name, p.device_maker, p.color, p.rom as storage,
                sp.part_name, sp.manufacturer_part_number as part_number
            FROM inventory i
            LEFT JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            LEFT JOIN phone_specs p ON i.product_id = p.product_id
            LEFT JOIN spare_parts sp ON i.spare_part_id = sp.spare_part_id
            WHERE i.inventory_type IN ('serialized', 'spare_part')
        `;

        const params = [];

        if (type === 'device') {
            query += ` AND (i.inventory_type = 'serialized' OR i.imei_1 IS NOT NULL)`;
        } else if (type === 'spare_part') {
            query += ` AND i.inventory_type = 'spare_part'`;
        }

        if (status) {
            query += ` AND i.status = ?`;
            params.push(status);
        }

        if (warehouseId) {
            query += ` AND i.warehouse_id = ?`;
            params.push(warehouseId);
        }

        if (search) {
            query += ` AND (
                i.serial_number LIKE ? OR 
                i.imei_1 LIKE ? OR 
                i.imei_2 LIKE ? OR 
                p.device_name LIKE ? OR 
                sp.part_name LIKE ?
            )`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        return sequelizeMaster.query(query, { replacements: params, type: QueryTypes.SELECT });
    }

    async getById(id) {
        const query = `
            SELECT 
                i.*,
                w.name as warehouse_name,
                p.device_name, p.device_maker, p.color, p.rom as storage,
                sp.part_name, sp.manufacturer_part_number as part_number
            FROM inventory i
            LEFT JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            LEFT JOIN phone_specs p ON i.product_id = p.product_id
            LEFT JOIN spare_parts sp ON i.spare_part_id = sp.spare_part_id
            WHERE i.id = ?
        `;

        const [item] = await sequelizeMaster.query(query, { replacements: [id], type: QueryTypes.SELECT });
        return item || null;
    }

    // =========================================================================
    // Mutation Operations
    // =========================================================================

    async update(id, data) {
        const { serial_number, imei_1, imei_2, condition_grade, notes } = data;

        await Inventory.update({
            serial_number, imei_1, imei_2, condition_grade, notes
        }, { where: { id } });

        return this.getById(id);
    }

    async updateStatus(id, status, notes) {
        await Inventory.update({
            status, notes
        }, { where: { id } });

        return this.getById(id);
    }

    async transfer(id, data) {
        const { warehouseId, binId, notes } = data;
        const userId = 1;

        return await sequelizeMaster.transaction(async (t) => {
            const [item] = await sequelizeMaster.query('SELECT * FROM inventory WHERE id = ? FOR UPDATE', {
                replacements: [id], type: QueryTypes.SELECT, transaction: t
            });
            if (!item) throw new NotFoundError('item not found');

            const fromWarehouseId = item.warehouse_id;
            const fromBinId = item.bin_id;

            await sequelizeMaster.query(`
                    UPDATE inventory 
                    SET warehouse_id = ?, bin_id = ?, updated_at = NOW(), last_movement_at = NOW(), last_movement_type = 'transfer'
                    WHERE id = ?
                `, { replacements: [warehouseId, binId, id], type: QueryTypes.UPDATE, transaction: t });

            const transId = generateId();
            const groupId = `TRF-${Date.now()}`;

            let unitCost = 0;
            if (item.product_id) {
                const [product] = await sequelizeMaster.query('SELECT device_price FROM phone_specs WHERE product_id = ?', {
                    replacements: [item.product_id], type: QueryTypes.SELECT, transaction: t
                });
                if (product) unitCost = parseFloat(product.device_price) || 0;
            }

            await sequelizeMaster.query(`
                    INSERT INTO transactions (
                        id, transaction_group_id, transaction_type, transaction_date,
                        warehouse_id, from_warehouse_id, user_id, notes,
                        product_id, spare_part_id, serial_number, quantity_changed,
                        unit_cost, total_value,
                        from_bin_id, to_warehouse_id, to_bin_id
                    )
                    VALUES (?, ?, 'transfer', NOW(), ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
                `, {
                replacements: [
                    transId, groupId, warehouseId, fromWarehouseId, userId, notes,
                    item.product_id, item.spare_part_id, item.serial_number,
                    unitCost, unitCost,
                    fromBinId, warehouseId, binId
                ],
                type: QueryTypes.INSERT,
                transaction: t
            });

            return this.getById(id);
        });
    }

    async delete(id) {
        await Inventory.update({
            status: 'disposed', quantity: 0
        }, { where: { id } });

        return { id, status: 'disposed' };
    }
}

module.exports = SerializedInventoryService;
