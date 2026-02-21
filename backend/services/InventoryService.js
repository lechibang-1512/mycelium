/**
 * Inventory Service (Sequelize Version)
 * Unified interface for inventory operations.
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');
const { InsufficientStockError, ValidationError, NotFoundError } = require('../utils/errors');


class InventoryService {
    constructor() { }

    // =========================================================================
    // Helpers
    // =========================================================================



    // =========================================================================
    // Query Operations
    // =========================================================================

    async getAllInventory(filters = {}) {
        const { warehouse_id, bin_id, search, product_id, limit = 100, offset = 0, include_inactive } = filters;
        const showInactive = include_inactive === 'true' || include_inactive === true;

        let query = `
            SELECT 
                p.product_id, p.name as device_name, p.manufacturer as device_maker, p.unit_price as device_price, 
                NULL as color, NULL as ram, NULL as rom, p.is_active,
                COALESCE(inv.total, 0) as total_inventory
            FROM master_db.products p
            LEFT JOIN (
                SELECT product_id, SUM(quantity) as total 
                FROM inventory 
                WHERE inventory_type = 'bulk'
        `;

        const invParams = [];
        if (warehouse_id) {
            query += ` AND warehouse_id = ?`;
            invParams.push(warehouse_id);
        }
        if (bin_id) {
            query += ` AND bin_id = ?`;
            invParams.push(bin_id);
        }

        query += ` GROUP BY product_id ) inv ON p.product_id = inv.product_id WHERE 1=1`;

        const mainParams = [];

        if (!showInactive) {
            query += ` AND p.is_active = 1`;
        }
        if (product_id) {
            query += ` AND p.product_id = ?`;
            mainParams.push(product_id);
        }
        if (search) {
            query += ` AND (p.name LIKE ? OR p.manufacturer LIKE ?)`;
            mainParams.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY p.manufacturer ASC, p.name ASC LIMIT ? OFFSET ?`;
        mainParams.push(parseInt(limit), parseInt(offset));

        return await sequelizeMaster.query(query, {
            replacements: [...invParams, ...mainParams],
            type: QueryTypes.SELECT
        });
    }

    async getWarehouseInventory(warehouseId) {
        const rows = await sequelizeMaster.query(`
            SELECT i.*, p.name as device_name, sp.name as part_name
            FROM master_db.inventory i
            LEFT JOIN master_db.products p ON i.product_id = p.product_id
            LEFT JOIN master_db.products sp ON i.spare_part_id = sp.product_id
            WHERE i.warehouse_id = ? AND i.quantity > 0
        `, {
            replacements: [warehouseId],
            type: QueryTypes.SELECT
        });

        return rows.map(r => ({
            id: r.id,
            inventory_id: r.id,
            product_id: r.product_id,
            spare_part_id: r.spare_part_id,
            quantity: r.quantity,
            product_name: r.device_name || r.part_name,
            inventory_type: r.inventory_type
        }));
    }

    async getProductById(productId) {
        if (!productId) return null;

        const [product] = await sequelizeMaster.query('SELECT * FROM master_db.products WHERE product_id = ?', {
            replacements: [productId], type: QueryTypes.SELECT
        });
        if (!product) return null;

        const inventoryDocs = await sequelizeMaster.query(`
            SELECT i.*, w.name as warehouse_name
            FROM inventory i
            LEFT JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            WHERE i.product_id = ? AND i.inventory_type = 'bulk'
        `, { replacements: [productId], type: QueryTypes.SELECT });

        const locations = inventoryDocs.map(inv => ({
            ...inv,
            warehouse_name: inv.warehouse_name || 'Unknown',
            quantity_on_hand: inv.quantity
        }));

        const assets = await sequelizeMaster.query(`
            SELECT * FROM inventory 
            WHERE product_id = ? AND inventory_type = 'serialized' AND status = 'available'
        `, { replacements: [productId], type: QueryTypes.SELECT });

        const total_inventory = locations.reduce((sum, loc) => sum + (loc.quantity || 0), 0);

        return { ...product, locations, assets, total_inventory };
    }

    async getProductPrice(productId, _options = {}) {
        const [product] = await sequelizeMaster.query(`
            SELECT product_id, name as device_name, unit_price as device_price 
            FROM master_db.products WHERE product_id = ?
        `, { replacements: [productId], type: QueryTypes.SELECT });

        if (!product) return null;

        return {
            product_id: product.product_id,
            device_name: product.device_name,
            base_price: Number(product.device_price),
            currency: 'USD'
        };
    }

    async getInventoryLevel(productId, warehouseId = null, binId = null) {
        let sql = `SELECT SUM(quantity) as level FROM inventory WHERE product_id = ? AND inventory_type = 'bulk'`;
        const params = [productId];

        if (warehouseId) {
            sql += ` AND warehouse_id = ?`;
            params.push(warehouseId);
        }
        if (binId) {
            sql += ` AND bin_id = ?`;
            params.push(binId);
        }

        const [result] = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        return result?.level ? Number(result.level) : 0;
    }

    async getTransactionHistory(productId, filters = {}) {
        const { limit = 100, warehouse_id, transaction_type } = filters;

        let sql = `
            SELECT t.id as transaction_id, t.transaction_type, t.transaction_date,
                   t.warehouse_id, t.bin_id, t.supplier_id, t.user_id, t.notes,
                   t.product_id, t.spare_part_id, t.quantity_changed, t.condition_status,
                   t.unit_cost, t.total_value, t.item_notes,
                   t.transaction_group_id,
                   w.name as warehouse_name
            FROM transactions t
            LEFT JOIN warehouses w ON t.warehouse_id = w.warehouse_id
            WHERE t.product_id = ?
        `;
        const params = [productId];

        if (warehouse_id) {
            sql += ` AND t.warehouse_id = ?`;
            params.push(warehouse_id);
        }
        if (transaction_type) {
            sql += ` AND t.transaction_type = ?`;
            params.push(transaction_type);
        }

        sql += ` ORDER BY t.transaction_date DESC LIMIT ?`;
        params.push(parseInt(limit));

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });

        return rows.map(row => ({
            log_id: row.transaction_id.toString(),
            product_id: row.product_id,
            transaction_type: row.transaction_type,
            quantity_changed: row.quantity_changed,
            transaction_date: row.transaction_date,
            warehouse_id: row.warehouse_id,
            bin_id: row.bin_id,
            unit_cost: row.unit_cost,
            total_value: row.total_value,
            notes: row.item_notes || row.notes,
            supplier_id: row.supplier_id,
            user_id: row.user_id
        }));
    }

    async getProductLogs(productId, filters = {}) {
        const { start_date, end_date, limit = 100 } = typeof filters === 'number' ? { limit: filters } : filters;

        let sql = `
            SELECT id as transaction_id, transaction_type, transaction_date,
                   warehouse_id, bin_id, from_warehouse_id,
                   user_id, subtotal, tax_amount, total_amount,
                   product_id, quantity_changed, condition_status,
                   unit_cost, total_value, item_notes as notes,
                   from_bin_id, transaction_group_id
            FROM transactions
            WHERE product_id = ?
        `;
        const params = [productId];

        if (start_date) {
            sql += ` AND transaction_date >= ?`;
            params.push(new Date(start_date));
        }
        if (end_date) {
            sql += ` AND transaction_date <= ?`;
            params.push(new Date(end_date));
        }

        sql += ` ORDER BY transaction_date DESC LIMIT ?`;
        params.push(parseInt(limit));

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        return rows.map(row => ({
            log_id: row.transaction_id.toString(),
            product_id: row.product_id,
            transaction_type: row.transaction_type,
            quantity_changed: row.quantity_changed,
            transaction_date: row.transaction_date,
            warehouse_id: row.warehouse_id,
            bin_id: row.bin_id,
            from_warehouse_id: row.from_warehouse_id,
            from_bin_id: row.from_bin_id,
            unit_cost: row.unit_cost,
            total_value: row.total_value,
            notes: row.notes,
            user_id: row.user_id,
            transaction_group_id: row.transaction_group_id,
            subtotal: row.subtotal,
            tax_amount: row.tax_amount,
            total_amount: row.total_amount
        }));
    }

    async getTransactionLogs(filters = {}) {
        const {
            warehouse_id, _bin_id, transaction_type, product_id,
            start_date, end_date, limit = 100, offset = 0
        } = filters;

        let sql = `
            SELECT t.id as transaction_id, t.transaction_type, t.transaction_date,
                   t.warehouse_id, t.zone_id, t.bin_id, t.from_warehouse_id,
                   t.user_id, t.notes, t.item_notes,
                   t.product_id, t.spare_part_id, t.quantity_changed, t.condition_status,
                   t.unit_cost, t.total_value,
                   t.from_bin_id, t.transaction_group_id,
                   p.name as device_name, p.manufacturer as device_maker
            FROM transactions t
            LEFT JOIN master_db.products p ON t.product_id = p.product_id
            WHERE 1=1
        `;
        const params = [];

        if (warehouse_id) {
            sql += ` AND (t.warehouse_id = ? OR t.from_warehouse_id = ?)`;
            params.push(warehouse_id, warehouse_id);
        }
        if (transaction_type) {
            sql += ` AND t.transaction_type = ?`;
            params.push(transaction_type);
        }
        if (product_id) {
            sql += ` AND t.product_id = ?`;
            params.push(product_id);
        }
        if (start_date) {
            sql += ` AND t.transaction_date >= ?`;
            params.push(new Date(start_date));
        }
        if (end_date) {
            sql += ` AND t.transaction_date <= ?`;
            params.push(new Date(end_date));
        }

        sql += ` ORDER BY t.transaction_date DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        return rows.map(row => ({
            log_id: row.transaction_id.toString(),
            product_id: row.product_id,
            spare_part_id: row.spare_part_id,
            transaction_type: row.transaction_type,
            quantity_changed: row.quantity_changed,
            transaction_date: row.transaction_date,
            warehouse_id: row.warehouse_id,
            bin_id: row.bin_id,
            zone_id: row.zone_id,
            from_warehouse_id: row.from_warehouse_id,
            from_bin_id: row.from_bin_id,
            notes: row.item_notes || row.notes,
            condition: row.condition_status,
            user_id: row.user_id,
            product_name: row.device_name,
            product_maker: row.device_maker
        }));
    }

    async getReceiptDetails(receiptId) {
        const rows = await sequelizeMaster.query(`
            SELECT t.*, w.name as warehouse_name, w.location as warehouse_location,
                   p.name as device_name, p.manufacturer as device_maker, s.name as part_name
            FROM transactions t
            LEFT JOIN warehouses w ON t.warehouse_id = w.warehouse_id
            LEFT JOIN master_db.products p ON t.product_id = p.product_id
            LEFT JOIN master_db.products s ON t.spare_part_id = s.product_id
            WHERE t.transaction_group_id = ? OR t.receipt_id = ?
            ORDER BY t.created_at ASC
        `, { replacements: [receiptId, receiptId], type: QueryTypes.SELECT });

        if (!rows.length) return null;

        const first = rows[0];
        return {
            receipt_id: first.receipt_id || first.transaction_group_id,
            transaction_type: first.transaction_type,
            transaction_date: first.transaction_date,
            warehouse_id: first.warehouse_id,
            warehouse_name: first.warehouse_name || 'Unknown',
            warehouse_location: first.warehouse_location,
            user_name: null,
            notes: first.notes,
            invoice_number: first.external_doc_no,
            items: rows.map(item => ({
                log_id: item.id.toString(),
                product_id: item.product_id,
                spare_part_id: item.spare_part_id,
                product_name: item.device_name || item.part_name || 'Unknown',
                product_maker: item.device_maker,
                quantity: item.quantity_changed,
                unit_cost: item.unit_cost,
                subtotal: item.total_value,
                tax_amount: 0,
                total_amount: item.total_value,
                condition: item.condition_status,
                warehouse_name: first.warehouse_name,
                bin_id: item.to_bin_id
            })),
            totals: {
                subtotal: first.subtotal,
                tax_amount: first.tax_amount,
                total_amount: first.total_amount
            }
        };
    }

    // =========================================================================
    // Zone inventory status
    // =========================================================================

    async getZoneInventoryStatus() {
        const phones = await sequelizeMaster.query(`
            SELECT 
                w.name AS warehouse_name,
                COALESCE(b.bin_code, 'Unassigned') AS bin_code,
                i.status,
                COUNT(*) AS count
            FROM inventory i
            LEFT JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            LEFT JOIN warehouse_bins b ON i.bin_id = b.bin_id
            WHERE i.inventory_type IN ('bulk', 'serialized')
              AND i.product_id IS NOT NULL
            GROUP BY w.name, b.bin_code, i.status
            ORDER BY w.name, b.bin_code
        `, { type: QueryTypes.SELECT });

        const parts = await sequelizeMaster.query(`
            SELECT 
                w.name AS warehouse_name,
                COALESCE(b.bin_code, 'Unassigned') AS bin_code,
                i.condition_status AS status,
                SUM(i.quantity) AS count
            FROM inventory i
            LEFT JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            LEFT JOIN warehouse_bins b ON i.bin_id = b.bin_id
            WHERE i.inventory_type = 'spare_part'
              AND i.spare_part_id IS NOT NULL
              AND i.quantity > 0
            GROUP BY w.name, b.bin_code, i.condition_status
            ORDER BY w.name, b.bin_code
        `, { type: QueryTypes.SELECT });

        return {
            phones: phones.map(r => ({
                warehouse_name: r.warehouse_name || 'Unknown',
                bin_code: r.bin_code,
                status: r.status,
                count: Number(r.count) || 0
            })),
            parts: parts.map(r => ({
                warehouse_name: r.warehouse_name || 'Unknown',
                bin_code: r.bin_code,
                status: r.status,
                count: Number(r.count) || 0
            }))
        };
    }

    // =========================================================================
    // Legacy Transaction Logic removed: receiveStock, dispenseStock
    // These operations are now handled exclusively by InventoryTransactionService
    // =========================================================================


    async transferStock(transferData) {
        const { items, from_warehouse_id, to_warehouse_id, user_id, notes } = transferData;
        const results = [];
        for (const item of items) {
            await this.warehouseTransfer({
                productId: item.product_id,
                fromWarehouseId: from_warehouse_id,
                toWarehouseId: to_warehouse_id,
                quantity: item.quantity,
                notes,
                userId: user_id
            });
            results.push({ product_id: item.product_id, status: 'transferred' });
        }
        return { success: true, items: results };
    }


    // =========================================================================
    // Warehouse Transfer
    // =========================================================================

    async warehouseTransfer(data) {
        const {
            productId, fromWarehouseId, toWarehouseId,
            fromBinId, toBinId, quantity, notes, userId
        } = data;

        if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
            throw new ValidationError('missing required fields');
        }

        const quantityNum = parseInt(quantity, 10);

        return await sequelizeMaster.transaction(async (t) => {
            const [product] = await sequelizeMaster.query('SELECT device_name, device_maker, device_price FROM master_db.products WHERE product_id = ?', {
                replacements: [productId], type: QueryTypes.SELECT, transaction: t
            });
            if (!product) throw new NotFoundError('product not found');

            const devicePrice = parseFloat(product.device_price) || 0;
            const transferValue = devicePrice * quantityNum;

            const [sourceStock] = await sequelizeMaster.query(`
                    SELECT quantity FROM inventory 
                    WHERE product_id = ? AND warehouse_id = ? AND ${fromBinId ? 'bin_id = ?' : 'bin_id IS NULL'} AND inventory_type = 'bulk'
                    FOR UPDATE
                `, {
                replacements: fromBinId ? [productId, fromWarehouseId, fromBinId] : [productId, fromWarehouseId],
                type: QueryTypes.SELECT,
                transaction: t
            });

            const currentQty = sourceStock ? sourceStock.quantity : 0;

            if (currentQty < quantityNum) {
                throw new InsufficientStockError(`Insufficient stock. Available: ${currentQty}, Requested: ${quantityNum}`);
            }

            await sequelizeMaster.query(`
                    UPDATE inventory SET quantity = quantity - ?, last_movement_at = NOW(), last_movement_type = 'transfer'
                    WHERE product_id = ? AND warehouse_id = ? AND ${fromBinId ? 'bin_id = ?' : 'bin_id IS NULL'} AND inventory_type = 'bulk'
                `, {
                replacements: fromBinId ? [quantityNum, productId, fromWarehouseId, fromBinId] : [quantityNum, productId, fromWarehouseId],
                type: QueryTypes.UPDATE,
                transaction: t
            });

            const destInvId = generateId();
            await sequelizeMaster.query(`
                    INSERT INTO inventory (id, product_id, warehouse_id, bin_id, quantity, inventory_type, condition_status, last_movement_at, last_movement_type)
                    VALUES (?, ?, ?, ?, ?, 'bulk', 'NEW', NOW(), 'transfer')
                    ON DUPLICATE KEY UPDATE quantity = quantity + ?, last_movement_at = NOW(), last_movement_type = 'transfer'
                `, {
                replacements: [destInvId, productId, toWarehouseId, toBinId || null, quantityNum, quantityNum],
                type: QueryTypes.INSERT,
                transaction: t
            });

            const transId = generateId();
            await sequelizeMaster.query(`
                    INSERT INTO transactions (
                        id, transaction_group_id, transaction_type, transaction_date,
                        warehouse_id, from_warehouse_id, user_id, notes,
                        subtotal, total_amount,
                        product_id, quantity_changed, unit_cost, total_value,
                        from_bin_id, to_warehouse_id, to_bin_id
                    ) VALUES (?, ?, 'transfer', NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, {
                replacements: [
                    transId, `TRF-${Date.now()}`, toWarehouseId, fromWarehouseId, userId, notes,
                    transferValue, transferValue,
                    productId, quantityNum, devicePrice, transferValue,
                    fromBinId, toWarehouseId, toBinId
                ],
                type: QueryTypes.INSERT,
                transaction: t
            });

            return {
                productId,
                quantity: quantityNum,
                transferValue,
                success: true
            };
        });
    }
}

module.exports = InventoryService;
