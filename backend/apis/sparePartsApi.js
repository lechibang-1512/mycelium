/**
 * Spare Parts API - Data Access Layer
 * SQL queries for spare parts inventory operations
 * Extracted from routes/spare-parts.js for SOLID compliance
 */

const { withConnection, withTransaction } = require('../utils/queryHelper');

const sparePartsApi = (pool) => ({
    /**
     * Get spare parts inventory with search/filters
     * Extracted from GET /api/spare-parts/inventory
     */
    getSparePartsInventory: async (filters = {}) => {
        return withConnection(pool, async (conn) => {
            const { search, status, limit = 50, offset = 0, showInactive = false } = filters;

            let query = `
                SELECT 
                    pi.inventory_id,
                    pi.product_id as spare_part_uuid,
                    sp.spare_part_uuid as uuid,
                    sp.part_name as product_name,
                    sp.part_category as category,
                    sp.part_code,
                    sp.is_active,
                    pi.serial_number,
                    pi.batch_number as batch_no,
                    pi.condition_status as condition_grade,
                    pi.quantity_on_hand,
                    pi.warehouse_id,
                    pi.bin_id,
                    w.name AS warehouse_name,
                    bl.bin_code AS bin_code,
                    pi.created_at
                FROM product_inventory pi
                INNER JOIN smartphone_spare_parts sp ON pi.product_id = sp.spare_part_uuid
                LEFT JOIN warehouses w ON pi.warehouse_id = w.warehouse_id
                LEFT JOIN bin_locations bl ON pi.bin_id = bl.bin_id
                WHERE 1=1
                ${showInactive ? '' : 'AND sp.is_active = 1'}
            `;
            const params = [];

            if (search) {
                query += ` AND (sp.part_name LIKE ? OR sp.part_code LIKE ? OR pi.serial_number LIKE ?)`;
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            if (status) {
                query += ` AND pi.condition_status = ?`;
                params.push(status.toUpperCase());
            }

            query += ` ORDER BY pi.created_at DESC LIMIT ? OFFSET ?`;
            params.push(parseInt(limit, 10), parseInt(offset, 10));

            return conn.query(query, params);
        });
    },

    /**
     * Get spare parts available in a specific warehouse
     * Extracted from GET /api/spare-parts/warehouse/:warehouseId
     */
    getWarehouseSparePartStock: async (warehouseId, options = {}) => {
        return withConnection(pool, async (conn) => {
            const { showInactive = false } = options;

            return conn.query(`
                SELECT 
                    pi.product_id as spare_part_uuid,
                    sp.spare_part_uuid as uuid,
                    sp.part_name,
                    sp.part_code,
                    sp.part_category,
                    sp.unit_price,
                    sp.is_active,
                    pi.quantity_on_hand,
                    pi.quantity_reserved,
                    (pi.quantity_on_hand - COALESCE(pi.quantity_reserved, 0)) AS available_quantity,
                    pi.warehouse_id,
                    pi.bin_id,
                    w.name AS warehouse_name,
                    bl.bin_code,
                    pi.condition_status,
                    pi.batch_number as batch_no,
                    pi.serial_number,
                    pi.expiry_date
                FROM product_inventory pi
                INNER JOIN smartphone_spare_parts sp ON pi.product_id = sp.spare_part_uuid
                INNER JOIN warehouses w ON pi.warehouse_id = w.warehouse_id
                LEFT JOIN bin_locations bl ON pi.bin_id = bl.bin_id
                WHERE pi.warehouse_id = ?
                    AND (pi.quantity_on_hand - COALESCE(pi.quantity_reserved, 0)) > 0
                    AND w.is_active = 1
                    ${showInactive ? '' : 'AND sp.is_active = 1'}
                ORDER BY sp.part_name, sp.part_code
            `, [warehouseId]);
        });
    },

    /**
     * Receive spare parts into inventory with transaction support
     * Extracted from POST /api/spare-parts/receive
     * @param {Object} data - Receive data
     * @returns {Promise<Object>} Receive result with receipt_id
     */
    receiveSparePartsStock: async (data) => {
        const {
            spare_part_uuid,
            quantity,
            unit_cost,
            warehouse_id,
            bin_id,
            condition_status = 'NEW',
            supplier_id,
            notes,
            batch_no,
            expiry_date,
            user_id
        } = data;

        return withTransaction(pool, async (conn) => {
            // 1. Verify spare part exists
            const [sparePart] = await conn.query(
                'SELECT spare_part_uuid, part_name FROM smartphone_spare_parts WHERE spare_part_uuid = ?',
                [spare_part_uuid]
            );

            if (!sparePart) {
                const error = new Error('Spare part not found');
                error.statusCode = 404;
                throw error;
            }

            // 2. Verify warehouse exists
            const [warehouse] = await conn.query(
                'SELECT warehouse_id FROM warehouses WHERE warehouse_id = ?',
                [warehouse_id]
            );
            if (!warehouse) {
                const error = new Error('Warehouse not found');
                error.statusCode = 404;
                throw error;
            }

            // 3. Verify bin if provided
            if (bin_id) {
                const [bin] = await conn.query(
                    'SELECT bin_id FROM bin_locations WHERE bin_id = ? AND warehouse_id = ?',
                    [bin_id, warehouse_id]
                );
                if (!bin) {
                    const error = new Error('Bin not found or does not belong to the specified warehouse');
                    error.statusCode = 404;
                    throw error;
                }
            }

            // 4. Update or insert into product_inventory
            const existingInventory = await conn.query(`
                SELECT inventory_id, quantity_on_hand 
                FROM product_inventory 
                WHERE product_id = ? 
                AND warehouse_id = ? 
                AND (bin_id = ? OR (bin_id IS NULL AND ? IS NULL))
                AND condition_status = ?
            `, [spare_part_uuid, warehouse_id, bin_id, bin_id, condition_status]);

            if (existingInventory && existingInventory.length > 0) {
                await conn.query(`
                    UPDATE product_inventory 
                    SET quantity_on_hand = quantity_on_hand + ?,
                        updated_at = NOW()
                    WHERE inventory_id = ?
                `, [quantity, existingInventory[0].inventory_id]);
            } else {
                await conn.query(`
                    INSERT INTO product_inventory 
                    (product_id, warehouse_id, bin_id, quantity_on_hand, condition_status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                `, [spare_part_uuid, warehouse_id, bin_id || null, quantity, condition_status]);
            }

            // 5. Log the transaction
            const receiptId = `SP-RCV-${Date.now()}`;
            await conn.query(`
                INSERT INTO inventory_log 
                (spare_part_uuid, transaction_type, quantity_changed, \`condition\`, warehouse_id, bin_id, 
                 supplier_id, unit_cost, total_value, notes, batch_no, expiry_date, receipt_id, user_id, created_at)
                VALUES (?, 'incoming', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                spare_part_uuid,
                quantity,
                condition_status,
                warehouse_id,
                bin_id || null,
                supplier_id || null,
                unit_cost || 0,
                (unit_cost || 0) * quantity,
                notes || null,
                batch_no || null,
                expiry_date || null,
                receiptId,
                user_id || null
            ]);

            return {
                receipt_id: receiptId,
                spare_part_uuid,
                spare_part_name: sparePart.part_name,
                quantity,
                condition: condition_status,
                warehouse_id,
                bin_id: bin_id || null
            };
        });
    }
});

module.exports = sparePartsApi;
