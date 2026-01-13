/**
 * Consolidated Warehouse Management Service (Sequelize Version)
 * Handles multi-warehouse operations with normalized zones and bins
 */

const { QueryTypes, Op } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { Warehouse, WarehouseZone, WarehouseBin, Inventory, Transaction } = require('../models/master');
const { generateId } = require('../utils/generateId');
const { ValidationError, NotFoundError, ConflictError, InsufficientStockError } = require('../utils/errors');


class WarehouseService {
    constructor() { }

    // ==========================================
    // WAREHOUSE MANAGEMENT
    // ==========================================

    async getWarehouses(activeOnly = true) {
        const where = activeOnly ? { is_active: 1 } : {};
        const warehouses = await Warehouse.findAll({
            attributes: ['warehouse_id', 'name', 'location', 'is_active', 'created_at', 'updated_at'],
            where,
            order: [['name', 'ASC']]
        });
        return warehouses.map(w => ({ ...w.toJSON(), is_active: !!w.is_active }));
    }

    async createWarehouse(warehouseData) {
        const { name, location, description, isActive } = warehouseData;
        if (!name) throw new ValidationError('name is required');

        const newId = generateId();
        const phone = typeof warehouseData.contactInfo === 'string' ? warehouseData.contactInfo : warehouseData.contactInfo?.phone;
        const email = warehouseData.contactInfo?.email;
        const manager = warehouseData.contactInfo?.manager;

        await sequelizeMaster.transaction(async (t) => {
            await Warehouse.create({
                warehouse_id: newId,
                name, location, description,
                contact_phone: phone, contact_email: email, contact_manager: manager,
                is_active: isActive !== false ? 1 : 0
            }, { transaction: t });

            const zoneUuid = generateId();
            await WarehouseZone.create({
                id: zoneUuid,
                warehouse_id: newId,
                zone_id: 1,
                name: 'Default Zone'
            }, { transaction: t });
        });

        return { warehouse_id: newId, success: true };
    }

    async updateWarehouse(warehouseId, warehouseData) {
        const allowed = ['name', 'location', 'description', 'contactInfo', 'isActive'];
        const mapping = { contactInfo: 'contact_info', isActive: 'is_active' };
        const updateData = {};

        for (const key of Object.keys(warehouseData)) {
            if (allowed.includes(key)) {
                const dbCol = mapping[key] || key;
                updateData[dbCol] = warehouseData[key];
            }
        }

        if (Object.keys(updateData).length === 0) return { success: true };

        await Warehouse.update(updateData, { where: { warehouse_id: warehouseId } });
        return { success: true };
    }

    async activateWarehouse(warehouseId) {
        return this._toggleWarehouse(warehouseId, 1);
    }

    async deactivateWarehouse(warehouseId) {
        return this._toggleWarehouse(warehouseId, 0);
    }

    async _toggleWarehouse(warehouseId, status) {
        await Warehouse.update({ is_active: status }, { where: { warehouse_id: warehouseId } });
        return { success: true, message: `Warehouse ${status ? 'activated' : 'deactivated'} successfully` };
    }

    async deleteWarehouse(warehouseId) {
        return await sequelizeMaster.transaction(async (t) => {
            const invCount = await Inventory.count({
                where: { warehouse_id: warehouseId, quantity: { [Op.gt]: 0 } },
                transaction: t
            });

            if (invCount > 0) {
                await Transaction.create({
                    id: generateId(),
                    transaction_group_id: `WH-DEL-${Math.floor(Date.now() / 1000)}`,
                    transaction_type: 'outgoing',
                    transaction_date: new Date(),
                    warehouse_id: warehouseId,
                    notes: 'Warehouse deleted - inventory removed'
                }, { transaction: t });
            }

            await Inventory.destroy({ where: { warehouse_id: warehouseId }, transaction: t });

            const zones = await WarehouseZone.findAll({
                where: { warehouse_id: warehouseId },
                attributes: ['zone_id'],
                transaction: t
            });
            const zoneIds = zones.map(z => z.zone_id);

            if (zoneIds.length > 0) {
                await WarehouseBin.destroy({ where: { zone_id: zoneIds }, transaction: t });
                await WarehouseZone.destroy({ where: { warehouse_id: warehouseId }, transaction: t });
            }

            await Warehouse.destroy({ where: { warehouse_id: warehouseId }, transaction: t });

            return { success: true, message: 'Warehouse deleted' };
        });
    }

    async getWarehouseSummary(warehouseId = null) {
        let sql = `SELECT * FROM warehouses WHERE is_active = 1`;
        const params = [];
        if (warehouseId) {
            sql += ` AND warehouse_id = ?`;
            params.push(warehouseId);
        }

        const warehouses = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        const result = [];

        for (const w of warehouses) {
            const [stats] = await sequelizeMaster.query(`
                SELECT 
                    COUNT(DISTINCT product_id) as unique_products,
                    SUM(quantity) as total_items,
                    SUM(reserved_quantity) as total_reserved
                FROM inventory 
                WHERE warehouse_id = ? AND inventory_type = 'bulk'
            `, { replacements: [w.warehouse_id], type: QueryTypes.SELECT });

            const [bins] = await sequelizeMaster.query(`
                SELECT 
                    COUNT(*) as total_bins,
                    COUNT(DISTINCT column_position) as cols,
                    COUNT(DISTINCT row_position) as rows
                FROM warehouse_bins b
                JOIN warehouse_zones z ON b.zone_id = z.zone_id
                WHERE z.warehouse_id = ?
            `, { replacements: [w.warehouse_id], type: QueryTypes.SELECT });

            result.push({
                warehouse_id: w.warehouse_id,
                warehouse_name: w.name,
                unique_products: Number(stats?.unique_products || 0),
                total_items: Number(stats?.total_items || 0),
                total_reserved: Number(stats?.total_reserved || 0),
                total_available: Number(stats?.total_items || 0) - Number(stats?.total_reserved || 0),
                total_bins: Number(bins?.total_bins || 0),
                total_columns: Number(bins?.cols || 0),
                total_rows: Number(bins?.rows || 0)
            });
        }
        return result;
    }

    // ==========================================
    // BIN MANAGEMENT
    // ==========================================

    async getBinsByWarehouseWithItems(warehouseId, activeOnly = true) {
        let sql = `
            SELECT b.*, z.name as zone_name
            FROM warehouse_bins b
            JOIN warehouse_zones z ON b.zone_id = z.zone_id
            WHERE z.warehouse_id = ?
        `;
        if (activeOnly) sql += ` AND b.is_active = 1`;

        const bins = await sequelizeMaster.query(sql, { replacements: [warehouseId], type: QueryTypes.SELECT });

        for (const bin of bins) {
            const items = await sequelizeMaster.query(`
                SELECT i.quantity, i.product_id, i.inventory_type, i.condition_status, 
                       prod.name as device_name, prod.manufacturer as device_maker,
                       i.serial_number, i.status
                FROM inventory i
                LEFT JOIN products prod ON i.product_id = prod.product_id
                WHERE i.bin_id = ? AND i.quantity > 0
            `, { replacements: [bin.bin_id], type: QueryTypes.SELECT });

            bin.items = items.map(i => ({
                quantity: i.quantity,
                product_id: i.product_id,
                product_name: i.device_name,
                item_condition: i.condition_status,
                item_type: i.inventory_type === 'serialized' ? 'serialized' : 'aggregate',
                serial_number: i.serial_number,
                status: i.status
            }));

            bin.current_quantity = items.reduce((sum, i) => sum + i.quantity, 0);
        }

        return bins;
    }

    async createBin(binData) {
        const {
            warehouse_id, zone_id, bin_code,
            column_position, row_position, bin_position,
            max_capacity = 100, notes = null, product_type = null
        } = binData;

        try {
            return await sequelizeMaster.transaction(async (t) => {
                let targetZone = zone_id;
                if (!targetZone) {
                    const [z] = await sequelizeMaster.query('SELECT zone_id FROM warehouse_zones WHERE warehouse_id = ? LIMIT 1', {
                        replacements: [warehouse_id], type: QueryTypes.SELECT, transaction: t
                    });
                    if (z) targetZone = z.zone_id;
                    else {
                        const newZoneId = generateId();
                        await sequelizeMaster.query('INSERT INTO warehouse_zones (id, warehouse_id, zone_id, name) VALUES (?, ?, 1, ?)', {
                            replacements: [newZoneId, warehouse_id, 'Default Zone'], type: QueryTypes.INSERT, transaction: t
                        });
                        targetZone = 1;
                    }
                }

                const [dup] = await sequelizeMaster.query(
                    'SELECT bin_id FROM warehouse_bins WHERE zone_id = ? AND bin_code = ? FOR UPDATE',
                    { replacements: [targetZone, bin_code], type: QueryTypes.SELECT, transaction: t }
                );
                if (dup) throw new ConflictError(`bin code ${bin_code} exists in zone`);

                const binId = generateId();
                const hierarchical_code = (column_position && row_position && bin_position) ?
                    `C${column_position}-R${row_position}-B${bin_position}` : null;

                await sequelizeMaster.query(`
                    INSERT INTO warehouse_bins (
                        id, bin_id, warehouse_id, zone_id, bin_code, column_position, row_position, bin_position,
                        hierarchical_code, max_capacity, notes, product_type, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                `, {
                    replacements: [
                        generateId(), binId, warehouse_id, targetZone, bin_code, column_position, row_position, bin_position,
                        hierarchical_code, max_capacity, notes, product_type
                    ],
                    type: QueryTypes.INSERT,
                    transaction: t
                });

                return binId;
            });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062 || (err.original && err.original.errno === 1062)) {
                throw new ConflictError(`bin code ${bin_code} exists in zone`);
            }
            throw err;
        }
    }

    async getBinById(binId) {
        const [bin] = await sequelizeMaster.query(`
            SELECT b.*, z.name as zone_name, w.name as warehouse_name
            FROM warehouse_bins b
            JOIN warehouse_zones z ON b.zone_id = z.zone_id
            JOIN warehouses w ON z.warehouse_id = w.warehouse_id
            WHERE b.bin_id = ?
        `, { replacements: [binId], type: QueryTypes.SELECT });
        return bin;
    }

    async updateBin(binId, updateData) {
        const fields = [];
        const params = [];
        const allowed = ['bin_code', 'column_position', 'row_position', 'bin_position', 'max_capacity', 'notes', 'is_active', 'product_type'];

        allowed.forEach(f => {
            if (updateData[f] !== undefined) {
                fields.push(`${f} = ?`);
                params.push(updateData[f]);
            }
        });

        if (fields.length === 0) return false;

        params.push(binId);
        await sequelizeMaster.query(`UPDATE warehouse_bins SET ${fields.join(', ')} WHERE bin_id = ?`, {
            replacements: params, type: QueryTypes.UPDATE
        });
        return true;
    }

    async deleteBin(binId) {
        return await sequelizeMaster.transaction(async (t) => {
            await sequelizeMaster.query('UPDATE inventory SET bin_id = NULL WHERE bin_id = ?', {
                replacements: [binId], type: QueryTypes.UPDATE, transaction: t
            });
            await sequelizeMaster.query('DELETE FROM warehouse_bins WHERE bin_id = ?', {
                replacements: [binId], type: QueryTypes.DELETE, transaction: t
            });
            return { success: true };
        });
    }

    async getInventoryByLocation(warehouseId = null, binId = null) {
        let sqlPhones = `
            SELECT i.*, prod.name as device_name, prod.manufacturer as device_maker, w.name as warehouse_name
            FROM inventory i
            LEFT JOIN products prod ON i.product_id = prod.product_id
            LEFT JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            WHERE i.quantity > 0 AND i.inventory_type = 'bulk'
        `;
        const paramsPhones = [];
        if (warehouseId) { sqlPhones += ` AND i.warehouse_id = ?`; paramsPhones.push(warehouseId); }
        if (binId) { sqlPhones += ` AND i.bin_id = ?`; paramsPhones.push(binId); }

        const phones = await sequelizeMaster.query(sqlPhones, { replacements: paramsPhones, type: QueryTypes.SELECT });

        let sqlParts = `
            SELECT i.*, prod.name as part_name, prod.part_code as part_number, w.name as warehouse_name
            FROM inventory i
            LEFT JOIN products prod ON i.spare_part_id = prod.product_id
            LEFT JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            WHERE i.quantity > 0 AND i.inventory_type = 'spare_part'
        `;
        const paramsParts = [];
        if (warehouseId) { sqlParts += ` AND i.warehouse_id = ?`; paramsParts.push(warehouseId); }
        if (binId) { sqlParts += ` AND i.bin_id = ?`; paramsParts.push(binId); }

        const parts = await sequelizeMaster.query(sqlParts, { replacements: paramsParts, type: QueryTypes.SELECT });

        const mappedPhones = phones.map(i => ({
            product_id: i.product_id,
            warehouse_quantity: i.quantity,
            available_quantity: i.quantity - (i.reserved_quantity || 0),
            product_name: i.device_name,
            brand: i.device_maker,
            warehouse_id: i.warehouse_id,
            warehouse_name: i.warehouse_name,
            bins_used: i.bin_id ? 1 : 0
        }));

        const mappedParts = parts.map(i => ({
            spare_part_id: i.spare_part_id,
            product_name: i.part_name,
            part_number: i.part_number,
            warehouse_quantity: i.quantity,
            available_quantity: i.quantity - (i.reserved_quantity || 0),
            warehouse_id: i.warehouse_id,
            warehouse_name: i.warehouse_name,
            brand: 'Spare Part',
            bins_used: i.bin_id ? 1 : 0
        }));

        return [...mappedPhones, ...mappedParts];
    }

    async getWarehouseZones(warehouseId, activeOnly = true) {
        const where = { warehouse_id: warehouseId };
        if (activeOnly) where.is_active = 1;
        
        const zones = await WarehouseZone.findAll({ where });
        return zones.map(z => z.toJSON());
    }

    async getExpiringBatches(days = 30) {
        try {
            const sql = `
                SELECT 
                    b.batch_id, b.batch_no, b.expiry_date,
                    DATEDIFF(b.expiry_date, NOW()) as days_until_expiry
                FROM batches b
                WHERE b.expiry_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
                ORDER BY b.expiry_date ASC
            `;
            return await sequelizeMaster.query(sql, { replacements: [days], type: QueryTypes.SELECT });
        } catch (err) {
            if (err.original && err.original.code === 'ER_NO_SUCH_TABLE') return [];
            throw err;
        }
    }

    // ==========================================
    // MISSING METHODS - Required by routes
    // ==========================================

    async getBinsByWarehouse(warehouseId, activeOnly = true) {
        let sql = `
            SELECT b.*, z.name as zone_name
            FROM warehouse_bins b
            JOIN warehouse_zones z ON b.zone_id = z.zone_id AND z.warehouse_id = b.warehouse_id
            WHERE z.warehouse_id = ?
        `;
        if (activeOnly) sql += ` AND b.is_active = 1`;
        sql += ` ORDER BY b.column_position, b.row_position, b.bin_position`;

        return sequelizeMaster.query(sql, { replacements: [warehouseId], type: QueryTypes.SELECT });
    }

    async getWarehouseStatistics(warehouseId) {
        const [warehouse] = await sequelizeMaster.query('SELECT * FROM warehouses WHERE warehouse_id = ?', {
            replacements: [warehouseId], type: QueryTypes.SELECT
        });
        if (!warehouse) throw new NotFoundError('warehouse not found');

        const [invStats] = await sequelizeMaster.query(`
            SELECT 
                COUNT(DISTINCT product_id) as unique_products,
                COALESCE(SUM(quantity), 0) as total_quantity,
                COALESCE(SUM(reserved_quantity), 0) as total_reserved
            FROM inventory 
            WHERE warehouse_id = ?
        `, { replacements: [warehouseId], type: QueryTypes.SELECT });

        const [binStats] = await sequelizeMaster.query(`
            SELECT 
                COUNT(*) as total_bins,
                SUM(CASE WHEN b.is_active = 1 THEN 1 ELSE 0 END) as active_bins,
                SUM(CASE WHEN b.is_active = 0 THEN 1 ELSE 0 END) as inactive_bins
            FROM warehouse_bins b
            JOIN warehouse_zones z ON b.zone_id = z.zone_id AND z.warehouse_id = b.warehouse_id
            WHERE z.warehouse_id = ?
        `, { replacements: [warehouseId], type: QueryTypes.SELECT });

        const [zoneStats] = await sequelizeMaster.query(`
            SELECT COUNT(*) as total_zones
            FROM warehouse_zones
            WHERE warehouse_id = ?
        `, { replacements: [warehouseId], type: QueryTypes.SELECT });

        return {
            warehouse_id: warehouseId,
            warehouse_name: warehouse.name,
            unique_products: Number(invStats?.unique_products || 0),
            total_quantity: Number(invStats?.total_quantity || 0),
            total_reserved: Number(invStats?.total_reserved || 0),
            total_available: Number(invStats?.total_quantity || 0) - Number(invStats?.total_reserved || 0),
            total_bins: Number(binStats?.total_bins || 0),
            active_bins: Number(binStats?.active_bins || 0),
            inactive_bins: Number(binStats?.inactive_bins || 0),
            total_zones: Number(zoneStats?.total_zones || 0)
        };
    }

    async getWarehouseColumns(warehouseId) {
        const bins = await sequelizeMaster.query(`
            SELECT b.*, z.name as zone_name
            FROM warehouse_bins b
            JOIN warehouse_zones z ON b.zone_id = z.zone_id AND z.warehouse_id = b.warehouse_id
            WHERE z.warehouse_id = ? AND b.is_active = 1
            ORDER BY b.column_position, b.row_position, b.bin_position
        `, { replacements: [warehouseId], type: QueryTypes.SELECT });

        const columns = {};
        for (const bin of bins) {
            const col = bin.column_position || 'unassigned';
            if (!columns[col]) columns[col] = [];
            columns[col].push(bin);
        }

        return { columns, flat: bins };
    }

    async getBinsHierarchical(warehouseId, activeOnly = true) {
        let sql = `
            SELECT b.*, z.name as zone_name
            FROM warehouse_bins b
            JOIN warehouse_zones z ON b.zone_id = z.zone_id AND z.warehouse_id = b.warehouse_id
            WHERE z.warehouse_id = ?
        `;
        if (activeOnly) sql += ` AND b.is_active = 1`;
        sql += ` ORDER BY b.column_position, b.row_position, b.bin_position`;

        const bins = await sequelizeMaster.query(sql, { replacements: [warehouseId], type: QueryTypes.SELECT });

        const hierarchical = {};
        for (const bin of bins) {
            const col = bin.column_position || 'unassigned';
            const row = bin.row_position || 'unassigned';
            const pos = bin.bin_position || 'unassigned';

            if (!hierarchical[col]) hierarchical[col] = {};
            if (!hierarchical[col][row]) hierarchical[col][row] = {};
            hierarchical[col][row][pos] = bin;
        }

        return {
            hierarchical,
            flat: bins,
            summary: {
                total_bins: bins.length,
                columns: Object.keys(hierarchical).length,
                rows: new Set(bins.map(b => b.row_position).filter(Boolean)).size
            }
        };
    }

    async getProductBinDistribution(productId, warehouseId) {
        return sequelizeMaster.query(`
            SELECT b.bin_id, b.bin_code, b.column_position, b.row_position, b.bin_position,
                   i.quantity, i.reserved_quantity, i.condition_status
            FROM inventory i
            JOIN warehouse_bins b ON i.bin_id = b.bin_id
            WHERE i.product_id = ? AND i.warehouse_id = ? AND i.quantity > 0
            ORDER BY b.column_position, b.row_position, b.bin_position
        `, { replacements: [productId, warehouseId], type: QueryTypes.SELECT });
    }

    async getWarehouseDistributionOverview() {
        return sequelizeMaster.query(`
            SELECT w.warehouse_id, w.name as warehouse_name, w.location,
                   COUNT(DISTINCT i.product_id) as unique_products,
                   COALESCE(SUM(i.quantity), 0) as total_quantity
            FROM warehouses w
            LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id AND i.quantity > 0
            WHERE w.is_active = 1
            GROUP BY w.warehouse_id, w.name, w.location
            ORDER BY w.name
        `, { type: QueryTypes.SELECT });
    }

    async getLowStockAlerts(options = {}) {
        const {
            lowStockThreshold = 10,
            criticalStockThreshold = 5,
            highStockThreshold = 50
        } = options;

        return sequelizeMaster.query(`
            SELECT i.product_id, prod.name as device_name, prod.manufacturer as device_maker,
                   w.name as warehouse_name, w.warehouse_id,
                   SUM(i.quantity) as total_quantity,
                   SUM(i.reserved_quantity) as total_reserved,
                   i.min_stock_level,
                   CASE
                       WHEN SUM(i.quantity) <= ? THEN 'critical'
                       WHEN SUM(i.quantity) <= ? THEN 'low'
                       WHEN SUM(i.quantity) >= ? THEN 'overstock'
                       ELSE 'normal'
                   END as stock_level
            FROM inventory i
            LEFT JOIN products prod ON i.product_id = prod.product_id
            LEFT JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            WHERE i.inventory_type = 'bulk' AND i.quantity > 0
            GROUP BY i.product_id, i.warehouse_id, prod.name, prod.manufacturer,
                     w.name, w.warehouse_id, i.min_stock_level
            HAVING stock_level IN ('critical', 'low')
            ORDER BY total_quantity ASC
        `, { replacements: [criticalStockThreshold, lowStockThreshold, highStockThreshold], type: QueryTypes.SELECT });
    }

    async assignProductToBin(binId, productId, quantity, batchId = null, sparePartId = null) {
        return await sequelizeMaster.transaction(async (t) => {
            const [bin] = await sequelizeMaster.query(`
                    SELECT b.bin_id, z.warehouse_id
                    FROM warehouse_bins b
                    JOIN warehouse_zones z ON b.zone_id = z.zone_id AND z.warehouse_id = b.warehouse_id
                    WHERE b.bin_id = ?
                `, { replacements: [binId], type: QueryTypes.SELECT, transaction: t });
            if (!bin) throw new NotFoundError('bin not found');

            const [existing] = await sequelizeMaster.query(`
                    SELECT id FROM inventory
                    WHERE bin_id = ? AND product_id <=> ? AND spare_part_id <=> ? AND batch_id <=> ?
                    FOR UPDATE
                `, { replacements: [binId, productId, sparePartId, batchId], type: QueryTypes.SELECT, transaction: t });

            let resultId;
            if (existing) {
                await sequelizeMaster.query('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', {
                    replacements: [quantity, existing.id], type: QueryTypes.UPDATE, transaction: t
                });
                resultId = existing.id;
            } else {
                const newId = generateId();
                await sequelizeMaster.query(`
                        INSERT INTO inventory (id, inventory_type, product_id, spare_part_id, warehouse_id, bin_id, quantity, batch_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, {
                    replacements: [newId, sparePartId ? 'spare_part' : 'bulk', productId, sparePartId, bin.warehouse_id, binId, quantity, batchId],
                    type: QueryTypes.INSERT,
                    transaction: t
                });
                resultId = newId;
            }

            return resultId;
        });
    }

    async removeProductFromBin(binId, productId, quantity, batchId = null) {
        return await sequelizeMaster.transaction(async (t) => {
            const [inv] = await sequelizeMaster.query(`
                    SELECT id, quantity FROM inventory
                    WHERE bin_id = ? AND product_id = ? AND batch_id <=> ?
                    FOR UPDATE
                `, { replacements: [binId, productId, batchId], type: QueryTypes.SELECT, transaction: t });

            if (!inv) throw new NotFoundError('product not found in this bin');
            if (Number(inv.quantity) < quantity) throw new InsufficientStockError('insufficient quantity in bin');

            if (Number(inv.quantity) === quantity) {
                await sequelizeMaster.query('DELETE FROM inventory WHERE id = ?', {
                    replacements: [inv.id], type: QueryTypes.DELETE, transaction: t
                });
            } else {
                await sequelizeMaster.query(
                    'UPDATE inventory SET quantity = quantity - ? WHERE id = ? AND quantity >= ?',
                    { replacements: [quantity, inv.id, quantity], type: QueryTypes.UPDATE, transaction: t }
                );
            }
        });
    }

    async getWarehouseBinUtilization(warehouseId) {
        return sequelizeMaster.query(`
            SELECT b.bin_id, b.bin_code, b.max_capacity,
                   b.column_position, b.row_position, b.bin_position,
                   COALESCE(SUM(i.quantity), 0) as current_quantity,
                   CASE WHEN b.max_capacity > 0 
                        THEN ROUND(COALESCE(SUM(i.quantity), 0) / b.max_capacity * 100, 1)
                        ELSE 0 END as utilization_percent
            FROM warehouse_bins b
            JOIN warehouse_zones z ON b.zone_id = z.zone_id AND z.warehouse_id = b.warehouse_id
            LEFT JOIN inventory i ON b.bin_id = i.bin_id AND i.quantity > 0
            WHERE z.warehouse_id = ? AND b.is_active = 1
            GROUP BY b.bin_id, b.bin_code, b.max_capacity, b.column_position, b.row_position, b.bin_position
            ORDER BY utilization_percent DESC
        `, { replacements: [warehouseId], type: QueryTypes.SELECT });
    }

    async findAvailableBins(warehouseId, requiredCapacity = 1, limit = 10) {
        return sequelizeMaster.query(`
            SELECT b.bin_id, b.bin_code, b.max_capacity,
                   b.column_position, b.row_position, b.bin_position,
                   COALESCE(SUM(i.quantity), 0) as current_quantity,
                   (b.max_capacity - COALESCE(SUM(i.quantity), 0)) as available_capacity
            FROM warehouse_bins b
            JOIN warehouse_zones z ON b.zone_id = z.zone_id AND z.warehouse_id = b.warehouse_id
            LEFT JOIN inventory i ON b.bin_id = i.bin_id AND i.quantity > 0
            WHERE z.warehouse_id = ? AND b.is_active = 1
            GROUP BY b.bin_id, b.bin_code, b.max_capacity, b.column_position, b.row_position, b.bin_position
            HAVING available_capacity >= ?
            ORDER BY available_capacity DESC
            LIMIT ?
        `, { replacements: [warehouseId, requiredCapacity, limit], type: QueryTypes.SELECT });
    }

    async getProductBinLocations(productId, warehouseId = null) {
        let sql = `
            SELECT b.bin_id, b.bin_code, b.column_position, b.row_position, b.bin_position,
                   w.warehouse_id, w.name as warehouse_name,
                   i.quantity, i.reserved_quantity, i.condition_status
            FROM inventory i
            JOIN warehouse_bins b ON i.bin_id = b.bin_id
            JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            WHERE i.product_id = ? AND i.quantity > 0
        `;
        const params = [productId];
        if (warehouseId) {
            sql += ` AND i.warehouse_id = ?`;
            params.push(warehouseId);
        }
        sql += ` ORDER BY w.name, b.column_position, b.row_position`;

        return sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
    }

    async autoGenerateBins(warehouseId, config = {}) {
        const {
            columns = 3,
            rows_per_column = 4,
            bins_per_row = 5,
            max_capacity = 100,
            prefix = 'BIN'
        } = config;

        return await sequelizeMaster.transaction(async (t) => {
            let [zone] = await sequelizeMaster.query('SELECT zone_id FROM warehouse_zones WHERE warehouse_id = ? LIMIT 1', {
                replacements: [warehouseId], type: QueryTypes.SELECT, transaction: t
            });
            let zoneId;
            if (zone) {
                zoneId = zone.zone_id;
            } else {
                const zoneUuid = generateId();
                await sequelizeMaster.query('INSERT INTO warehouse_zones (id, warehouse_id, zone_id, name) VALUES (?, ?, 1, ?)', {
                    replacements: [zoneUuid, warehouseId, 'Default Zone'], type: QueryTypes.INSERT, transaction: t
                });
                zoneId = 1;
            }

            let created = 0;
            for (let c = 1; c <= columns; c++) {
                for (let r = 1; r <= rows_per_column; r++) {
                    for (let b = 1; b <= bins_per_row; b++) {
                        const binId = generateId();
                        const binCode = `${prefix}-C${c}R${r}B${b}`;
                        const hierarchicalCode = `C${c}-R${r}-B${b}`;

                        await sequelizeMaster.query(`
                                INSERT INTO warehouse_bins (
                                    id, bin_id, warehouse_id, zone_id, bin_code, column_position, row_position, bin_position,
                                    hierarchical_code, max_capacity, is_active
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                            `, {
                            replacements: [generateId(), binId, warehouseId, zoneId, binCode, String(c), String(r), String(b), hierarchicalCode, max_capacity],
                            type: QueryTypes.INSERT,
                            transaction: t
                        });
                        created++;
                    }
                }
            }

            return { bins_created: created, columns, rows_per_column, bins_per_row };
        });
    }

    async getNextBinCode(warehouseId) {
        const [result] = await sequelizeMaster.query(`
            SELECT bin_code FROM warehouse_bins b
            JOIN warehouse_zones z ON b.zone_id = z.zone_id AND z.warehouse_id = b.warehouse_id
            WHERE z.warehouse_id = ?
            ORDER BY bin_code DESC LIMIT 1
        `, { replacements: [warehouseId], type: QueryTypes.SELECT });

        if (!result) return { next_code: 'BIN-001', current_count: 0 };

        const match = result.bin_code.match(/(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10) + 1;
            const prefix = result.bin_code.slice(0, -match[1].length);
            return {
                next_code: prefix + String(num).padStart(match[1].length, '0'),
                current_count: num - 1
            };
        }

        return { next_code: result.bin_code + '-2', current_count: 1 };
    }

    async updateBinMetadata(binId, metadata) {
        const fields = [];
        const params = [];
        const allowed = ['notes', 'priority_level', 'accessibility_level', 'temperature_controlled',
            'temperature_min', 'temperature_max', 'product_type'];

        for (const key of Object.keys(metadata)) {
            if (allowed.includes(key)) {
                fields.push(`${key} = ?`);
                params.push(metadata[key]);
            }
        }

        if (fields.length === 0) return false;

        params.push(binId);
        await sequelizeMaster.query(`UPDATE warehouse_bins SET ${fields.join(', ')} WHERE bin_id = ?`, {
            replacements: params, type: QueryTypes.UPDATE
        });
        return true;
    }

    async getBinsByPriority(warehouseId, priorityLevel) {
        return sequelizeMaster.query(`
            SELECT b.*, z.name as zone_name
            FROM warehouse_bins b
            JOIN warehouse_zones z ON b.zone_id = z.zone_id AND z.warehouse_id = b.warehouse_id
            WHERE z.warehouse_id = ? AND b.priority_level = ? AND b.is_active = 1
            ORDER BY b.column_position, b.row_position, b.bin_position
        `, { replacements: [warehouseId, priorityLevel], type: QueryTypes.SELECT });
    }

    async getBinsRequiringAttention(warehouseId = null) {
        let sql = `
            SELECT b.bin_id, b.bin_code, b.max_capacity, b.is_active,
                   b.column_position, b.row_position, b.bin_position,
                   z.warehouse_id, w.name as warehouse_name,
                   COALESCE(SUM(i.quantity), 0) as current_quantity,
                   CASE
                       WHEN b.is_active = 0 AND COALESCE(SUM(i.quantity), 0) > 0 THEN 'inactive_with_inventory'
                       WHEN b.max_capacity > 0 AND COALESCE(SUM(i.quantity), 0) > b.max_capacity THEN 'over_capacity'
                       WHEN b.max_capacity > 0 AND COALESCE(SUM(i.quantity), 0) > b.max_capacity * 0.9 THEN 'near_capacity'
                       ELSE 'ok'
                   END as attention_reason
            FROM warehouse_bins b
            JOIN warehouse_zones z ON b.zone_id = z.zone_id AND z.warehouse_id = b.warehouse_id
            JOIN warehouses w ON z.warehouse_id = w.warehouse_id
            LEFT JOIN inventory i ON b.bin_id = i.bin_id AND i.quantity > 0
        `;
        const params = [];
        if (warehouseId) {
            sql += ` WHERE z.warehouse_id = ?`;
            params.push(warehouseId);
        }
        sql += ` GROUP BY b.bin_id, b.bin_code, b.max_capacity, b.is_active,
                 b.column_position, b.row_position, b.bin_position,
                 z.warehouse_id, w.name
                 HAVING attention_reason != 'ok'
                 ORDER BY FIELD(attention_reason, 'over_capacity', 'inactive_with_inventory', 'near_capacity')`;

        return sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
    }

    async cloneBin(sourceBinId, overrides = {}) {
        const [source] = await sequelizeMaster.query(`
            SELECT b.*, z.warehouse_id
            FROM warehouse_bins b
            JOIN warehouse_zones z ON b.zone_id = z.zone_id AND z.warehouse_id = b.warehouse_id
            WHERE b.bin_id = ?
        `, { replacements: [sourceBinId], type: QueryTypes.SELECT });
        if (!source) throw new NotFoundError('source bin not found');

        const newBinId = generateId();
        const binCode = overrides.new_bin_code || source.bin_code + '-copy';
        const colPos = overrides.column_position || source.column_position;
        const rowPos = overrides.row_position || source.row_position;
        const binPos = overrides.bin_position || source.bin_position;
        const hierarchicalCode = (colPos && rowPos && binPos) ? `C${colPos}-R${rowPos}-B${binPos}` : source.hierarchical_code;

        await sequelizeMaster.query(`
            INSERT INTO warehouse_bins (
                id, bin_id, warehouse_id, zone_id, bin_code, bin_type, product_type,
                column_position, row_position, bin_position, hierarchical_code,
                max_capacity, weight_capacity, height_cm, width_cm, depth_cm,
                temperature_controlled, temperature_min, temperature_max,
                priority_level, accessibility_level, is_active, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `, {
            replacements: [
                generateId(), newBinId, source.warehouse_id, source.zone_id, binCode, source.bin_type, source.product_type,
                colPos, rowPos, binPos, hierarchicalCode,
                source.max_capacity, source.weight_capacity, source.height_cm, source.width_cm, source.depth_cm,
                source.temperature_controlled, source.temperature_min, source.temperature_max,
                source.priority_level, source.accessibility_level, source.notes
            ],
            type: QueryTypes.INSERT
        });

        return { bin_id: newBinId, bin_code: binCode };
    }

    async bulkCreateBins(warehouseId, bins) {
        return await sequelizeMaster.transaction(async (t) => {
            let [zone] = await sequelizeMaster.query('SELECT zone_id FROM warehouse_zones WHERE warehouse_id = ? LIMIT 1', {
                replacements: [warehouseId], type: QueryTypes.SELECT, transaction: t
            });
            let zoneId;
            if (zone) {
                zoneId = zone.zone_id;
            } else {
                const zoneUuid = generateId();
                await sequelizeMaster.query('INSERT INTO warehouse_zones (id, warehouse_id, zone_id, name) VALUES (?, ?, 1, ?)', {
                    replacements: [zoneUuid, warehouseId, 'Default Zone'], type: QueryTypes.INSERT, transaction: t
                });
                zoneId = 1;
            }

            const binIds = [];
            for (const bin of bins) {
                const binId = generateId();
                const hierarchicalCode = (bin.column_position && bin.row_position && bin.bin_position)
                    ? `C${bin.column_position}-R${bin.row_position}-B${bin.bin_position}` : null;

                await sequelizeMaster.query(`
                        INSERT INTO warehouse_bins (
                            id, bin_id, warehouse_id, zone_id, bin_code, column_position, row_position, bin_position,
                            hierarchical_code, max_capacity, notes, product_type, is_active
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                    `, {
                    replacements: [
                        generateId(), binId, warehouseId, zoneId, bin.bin_code,
                        bin.column_position || null, bin.row_position || null, bin.bin_position || null,
                        hierarchicalCode, bin.max_capacity || 100, bin.notes || null, bin.product_type || null
                    ],
                    type: QueryTypes.INSERT,
                    transaction: t
                });
                binIds.push(binId);
            }

            return binIds;
        });
    }
}

module.exports = WarehouseService;
