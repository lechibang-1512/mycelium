/**
 * StocktakeService (Sequelize Version)
 * Provides stocktake CRUD, status management, item counting, and reporting.
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { Stocktake, StocktakeItem, StocktakeStatusHistory } = require('../models/master');
const { generateId } = require('../utils/generateId');
const { ValidationError, NotFoundError, ConflictError, InsufficientStockError, CapacityError } = require('../utils/errors');


class StocktakeService {

    // =========================================================================
    // List / Query
    // =========================================================================

    static async listStocktakes({ warehouse_id, status, count_type, limit = 100 } = {}) {
        let sql = `
            SELECT s.*, w.name AS warehouse_name
            FROM stocktakes s
            LEFT JOIN warehouses w ON s.warehouse_id = w.warehouse_id
            WHERE 1=1
        `;
        const params = [];

        if (warehouse_id) {
            sql += ` AND s.warehouse_id = ?`;
            params.push(warehouse_id);
        }
        if (status) {
            sql += ` AND s.status = ?`;
            params.push(status);
        }
        if (count_type) {
            sql += ` AND s.count_type = ?`;
            params.push(count_type);
        }

        sql += ` ORDER BY s.created_at DESC LIMIT ?`;
        params.push(parseInt(limit));

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        // Attach items count for each stocktake
        for (const row of rows) {
            const [countResult] = await sequelizeMaster.query(
                'SELECT COUNT(*) AS cnt FROM stocktake_items WHERE stocktake_id = ?',
                { replacements: [row.stocktake_id], type: QueryTypes.SELECT }
            );
            row.item_count = Number(countResult?.cnt ?? 0);
        }
        return rows;
    }

    // =========================================================================
    // Get by ID
    // =========================================================================

    static async getStocktakeById(stocktakeId, transaction = null) {
        const queryOpts = { replacements: [stocktakeId], type: QueryTypes.SELECT };
        if (transaction) queryOpts.transaction = transaction;

        const [stocktake] = await sequelizeMaster.query(`
            SELECT s.*, w.name AS warehouse_name
            FROM stocktakes s
            LEFT JOIN warehouses w ON s.warehouse_id = w.warehouse_id
            WHERE s.stocktake_id = ?
        `, queryOpts);

        if (!stocktake) return null;

        stocktake.items = await sequelizeMaster.query(`
            SELECT si.*, ps.device_name AS product_name
            FROM stocktake_items si
            LEFT JOIN phone_specs ps ON si.product_id = ps.product_id
            WHERE si.stocktake_id = ?
            ORDER BY si.created_at ASC
        `, queryOpts);

        return stocktake;
    }

    // =========================================================================
    // Create
    // =========================================================================

    static async createStocktake({ warehouse_id, initiated_by, notes, count_type = 'full', items = [] }) {
        return await sequelizeMaster.transaction(async (t) => {
            const stocktakeId = generateId();
            const stocktakeNumber = `ST-${Date.now()}`;

            await Stocktake.create({
                stocktake_id: stocktakeId, stocktake_uuid: generateId(), stocktake_number: stocktakeNumber, warehouse_id, count_type, status: 'PLANNED', initiated_by, notes: notes || null
            }, { transaction: t });

            for (const item of items) {
                await StocktakeItem.create({
                    id: generateId(), stocktake_id: stocktakeId, product_id: item.product_id, bin_location: item.bin_location || null, system_quantity: item.system_quantity || 0, counted_quantity: item.counted_quantity || null, notes: item.notes || null
                }, { transaction: t });
            }

            await StocktakeStatusHistory.create({
                id: generateId(), stocktake_id: stocktakeId, old_status: null, new_status: 'PLANNED', changed_by: initiated_by, notes: 'Stocktake created'
            }, { transaction: t });

            return await StocktakeService.getStocktakeById(stocktakeId, t);
        });
    }

    // =========================================================================
    // Update metadata
    // =========================================================================

    static async updateStocktake(stocktakeId, { notes, warehouse_id, count_type }) {
        const updateData = {};

        if (notes !== undefined) updateData.notes = notes;
        if (warehouse_id !== undefined) updateData.warehouse_id = warehouse_id;
        if (count_type !== undefined) updateData.count_type = count_type;

        if (Object.keys(updateData).length === 0) return;

        await Stocktake.update(updateData, { where: { stocktake_id: stocktakeId } });
    }

    // =========================================================================
    // Delete
    // =========================================================================

    static async deleteStocktake(stocktakeId) {
        return await sequelizeMaster.transaction(async (t) => {
            const existing = await Stocktake.findByPk(stocktakeId, { attributes: ['stocktake_id'], transaction: t });
            if (!existing) return false;

            await StocktakeItem.destroy({ where: { stocktake_id: stocktakeId }, transaction: t });
            await StocktakeStatusHistory.destroy({ where: { stocktake_id: stocktakeId }, transaction: t });
            await Stocktake.destroy({ where: { stocktake_id: stocktakeId }, transaction: t });

            return true;
        });
    }

    // =========================================================================
    // Status management
    // =========================================================================

    static async updateStatus(stocktakeId, newStatus, changedBy, notes) {
        return await sequelizeMaster.transaction(async (t) => {
            const current = await Stocktake.findByPk(stocktakeId, { attributes: ['status', 'started_at'], transaction: t });
            if (!current) throw new NotFoundError('stocktake not found');

            const oldStatus = current.status;

            const updateData = { status: newStatus };

            if (newStatus === 'IN_PROGRESS' && !current.started_at) {
                updateData.started_at = new Date();
            }
            if (newStatus === 'COMPLETED') {
                updateData.completed_at = new Date();
            }
            if (newStatus === 'APPROVED') {
                updateData.approved_at = new Date();
                updateData.approved_by = changedBy;
            }

            const [affectedRows] = await Stocktake.update(updateData, { 
                where: { stocktake_id: stocktakeId, status: oldStatus }, 
                transaction: t 
            });
            if (affectedRows === 0) {
                throw new ConflictError(`Stocktake status has been changed by another process (expected: ${oldStatus})`);
            }

            await StocktakeStatusHistory.create({
                id: generateId(), stocktake_id: stocktakeId, old_status: oldStatus, new_status: newStatus, changed_by: changedBy, notes: notes || null
            }, { transaction: t });

            return await StocktakeService.getStocktakeById(stocktakeId, t);
        });
    }

    // =========================================================================
    // Item management
    // =========================================================================

    static async addItem(stocktakeId, { product_id, bin_location, system_quantity, counted_quantity, notes }) {
        const itemId = generateId();
        await StocktakeItem.create({
            id: itemId, stocktake_id: stocktakeId, product_id, bin_location: bin_location || null, system_quantity: system_quantity || 0, counted_quantity: counted_quantity || null, notes: notes || null
        });

        // Sequelize return values usually don't match the original raw SQL output precisely for mapped models,
        // but since we just created it, we can return the instance via findByPk to get all attributes formatted
        const item = await StocktakeItem.findByPk(itemId);
        // Returns the toJSON() output since services typically return raw JS objects
        return item ? item.toJSON() : null;
    }

    static async updateItem(itemId, { counted_quantity, counted_by, notes }) {
        const item = await StocktakeItem.findByPk(itemId);
        if (!item) throw new NotFoundError('item not found');

        const systemQty = Number(item.system_quantity) || 0;
        const variance = counted_quantity - systemQty;
        const variancePct = systemQty > 0 ? ((variance / systemQty) * 100) : (counted_quantity > 0 ? 100 : 0);

        const updateData = {
            counted_quantity, variance, variance_pct: variancePct,
            counted_by, counted_at: new Date()
        };
        if (notes !== undefined) updateData.notes = notes;

        await StocktakeItem.update(updateData, { where: { id: itemId } });

        const updated = await StocktakeItem.findByPk(itemId);
        return updated ? updated.toJSON() : null;
    }

    static async deleteItem(itemId) {
        await StocktakeItem.destroy({ where: { id: itemId } });
        return true;
    }

    // =========================================================================
    // Stats and reporting
    // =========================================================================

    static async getStats(stocktakeId) {
        const [stats] = await sequelizeMaster.query(`
            SELECT 
                COUNT(*) AS total_items,
                SUM(CASE WHEN counted_quantity IS NOT NULL THEN 1 ELSE 0 END) AS counted_items,
                SUM(CASE WHEN variance != 0 AND variance IS NOT NULL THEN 1 ELSE 0 END) AS discrepancy_items,
                SUM(ABS(COALESCE(variance, 0))) AS total_variance,
                AVG(ABS(COALESCE(variance_pct, 0))) AS avg_variance_pct
            FROM stocktake_items
            WHERE stocktake_id = ?
        `, { replacements: [stocktakeId], type: QueryTypes.SELECT });

        return {
            total_items: Number(stats?.total_items) || 0,
            counted_items: Number(stats?.counted_items) || 0,
            discrepancy_items: Number(stats?.discrepancy_items) || 0,
            total_variance: Number(stats?.total_variance) || 0,
            avg_variance_pct: Number(stats?.avg_variance_pct) || 0,
            progress: stats?.total_items > 0
                ? Math.round((Number(stats.counted_items) / Number(stats.total_items)) * 100)
                : 0
        };
    }

    static async getAccuracyStats() {
        const [stats] = await sequelizeMaster.query(`
            SELECT 
                COUNT(DISTINCT s.stocktake_id) AS total_stocktakes,
                COUNT(si.id) AS total_items_counted,
                SUM(CASE WHEN si.variance = 0 OR si.variance IS NULL THEN 1 ELSE 0 END) AS accurate_items,
                AVG(ABS(COALESCE(si.variance_pct, 0))) AS avg_variance_pct
            FROM stocktakes s
            LEFT JOIN stocktake_items si ON s.stocktake_id = si.stocktake_id
            WHERE s.status IN ('COMPLETED', 'APPROVED')
        `, { type: QueryTypes.SELECT });

        const totalItems = Number(stats?.total_items_counted) || 0;
        const accurateItems = Number(stats?.accurate_items) || 0;

        return {
            total_stocktakes: Number(stats?.total_stocktakes) || 0,
            total_items_counted: totalItems,
            accurate_items: accurateItems,
            accuracy_rate: totalItems > 0 ? Math.round((accurateItems / totalItems) * 100) : 100,
            avg_variance_pct: Number(stats?.avg_variance_pct) || 0
        };
    }

    // =========================================================================
    // Due items (items not counted recently)
    // =========================================================================

    static async getDueItems({ warehouse_id, limit = 50 } = {}) {
        let sql = `
            SELECT p.product_id, p.device_name, p.device_maker,
                   i.warehouse_id, w.name AS warehouse_name,
                   i.last_counted_at,
                   DATEDIFF(NOW(), COALESCE(i.last_counted_at, i.created_at)) AS days_since_count
            FROM phone_specs p
            JOIN inventory i ON p.product_id = i.product_id AND i.inventory_type = 'bulk' AND i.quantity > 0
            LEFT JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            WHERE p.is_active = 1
        `;
        const params = [];

        if (warehouse_id) {
            sql += ` AND i.warehouse_id = ?`;
            params.push(warehouse_id);
        }

        sql += ` ORDER BY days_since_count DESC, p.device_name ASC LIMIT ?`;
        params.push(parseInt(limit));

        return sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
    }

    // =========================================================================
    // Warehouse products (for creating stocktakes)
    // =========================================================================

    static async getWarehouseProducts({ warehouse_id, search }) {
        let sql = `
            SELECT p.product_id, p.device_name, p.device_maker,
                   COALESCE(SUM(i.quantity), 0) AS system_quantity
            FROM phone_specs p
            JOIN inventory i ON p.product_id = i.product_id AND i.inventory_type = 'bulk'
            WHERE i.warehouse_id = ? AND p.is_active = 1
        `;
        const params = [warehouse_id];

        if (search) {
            sql += ` AND (p.device_name LIKE ? OR p.device_maker LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ` GROUP BY p.product_id, p.device_name, p.device_maker ORDER BY p.device_name ASC`;

        return sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
    }

    // =========================================================================
    // Cycle count (auto-create from warehouse products)
    // =========================================================================

    static async createCycleCount({ warehouse_id, limit = 50, notes, initiated_by }) {
        const products = await StocktakeService.getDueItems({ warehouse_id, limit });

        const items = products.map(p => ({
            product_id: p.product_id,
            system_quantity: p.total_inventory || 0,
            bin_location: null,
            notes: null
        }));

        return await StocktakeService.createStocktake({
            warehouse_id,
            initiated_by,
            notes: notes || 'Cycle count',
            count_type: 'cycle',
            items
        });
    }
}

module.exports = StocktakeService;
