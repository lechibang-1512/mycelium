/**
 * Location/Bins API - Data Access Layer
 * SQL queries for bin and location operations
 * Extracted from routes/location.js for SOLID compliance
 */

const { withConnection, withTransaction } = require('../utils/queryHelper');

const locationApi = (pool) => ({
    /**
     * List all bins with optional filters
     * Extracted from GET /api/bins/
     */
    listAllBins: async (filters = {}) => {
        return withConnection(pool, async (conn) => {
            const { active = true, product_type } = filters;

            const query = `
                SELECT b.*, w.name as warehouse_name
                FROM bin_locations b
                JOIN warehouses w ON b.warehouse_id = w.warehouse_id
                WHERE 1=1
                ${active ? 'AND b.is_active = 1' : ''}
                ${product_type ? 'AND b.product_type = ?' : ''}
                ORDER BY w.name, b.column_position, b.row_position, b.bin_position
                LIMIT 500
            `;
            const params = product_type ? [product_type] : [];
            return conn.query(query, params);
        });
    },

    /**
     * Get detailed bin contents (aggregate + serialized items)
     * Extracted from GET /api/bins/:binId/contents
     */
    getBinContentsDetailed: async (binId) => {
        return withConnection(pool, async (conn) => {
            // Get aggregate inventory items (non-serialized)
            const aggregateItems = await conn.query(`
                SELECT 
                    pi.inventory_id as assignment_id,
                    pi.quantity_on_hand as quantity,
                    pi.product_id,
                    NULL as spare_part_id,
                    pi.batch_number as batch_id,
                    NULL as asset_id,
                    p.name as product_name,
                    p.brand,
                    p.model,
                    p.sku,
                    NULL as spare_part_name,
                    NULL as part_code,
                    NULL as part_category,
                    'aggregate' as item_type
                FROM product_inventory pi
                LEFT JOIN products p ON pi.product_id = p.product_id
                WHERE pi.bin_id = ? AND pi.quantity_on_hand > 0
                  AND pi.product_id NOT IN (SELECT spare_part_uuid FROM smartphone_spare_parts)
                ORDER BY p.name
            `, [binId]);

            // Get spare parts inventory
            const sparePartsItems = await conn.query(`
                SELECT 
                    pi.inventory_id as assignment_id,
                    pi.quantity_on_hand as quantity,
                    NULL as product_id,
                    pi.product_id as spare_part_id,
                    pi.batch_number as batch_id,
                    NULL as asset_id,
                    NULL as product_name,
                    NULL as brand,
                    NULL as model,
                    NULL as sku,
                    sp.part_name as spare_part_name,
                    sp.part_code,
                    sp.part_category,
                    pi.serial_number,
                    pi.condition_status,
                    'spare_part' as item_type
                FROM product_inventory pi
                LEFT JOIN smartphone_spare_parts sp ON pi.product_id = sp.spare_part_uuid
                WHERE pi.bin_id = ? AND pi.quantity_on_hand > 0
                  AND pi.product_id IN (SELECT spare_part_uuid FROM smartphone_spare_parts)
                ORDER BY sp.part_name
            `, [binId]);

            // Get serialized items (devices with serial numbers)
            const serializedItems = await conn.query(`
                SELECT 
                    pi.inventory_id as tracking_id,
                    pi.product_id,
                    pi.serial_number as imei_1,
                    NULL as imei_2,
                    pi.serial_number,
                    pi.status,
                    pi.condition_status as condition_grade,
                    pi.created_at as received_at,
                    p.name as product_name,
                    p.brand,
                    p.model,
                    p.sku,
                    'serialized' as item_type
                FROM product_inventory pi
                LEFT JOIN products p ON pi.product_id = p.product_id
                WHERE pi.bin_id = ? AND pi.status IN ('AVAILABLE', 'RESERVED')
                  AND pi.serial_number IS NOT NULL
                  AND pi.product_id IN (SELECT product_id FROM products)
                ORDER BY p.name, pi.serial_number
            `, [binId]);

            return {
                aggregateItems: [...aggregateItems, ...sparePartsItems],
                serializedItems
            };
        });
    },

    /**
     * Transfer items between bins with full transaction support
     * Extracted from POST /api/bins/move
     */
    transferBetweenBins: async (transferData) => {
        const { from_bin_id, to_bin_id, product_id, spare_part_id, quantity, batch_id } = transferData;

        return withTransaction(pool, async (conn) => {
            const transferType = spare_part_id ? 'spare_part' : 'product';

            // Check destination bin contents for product type isolation
            const [destBinProducts] = await conn.query(
                `SELECT COUNT(*) as count FROM product_inventory WHERE bin_id = ? AND quantity_on_hand > 0`,
                [to_bin_id]
            );

            const hasProducts = (destBinProducts?.count || 0) > 0;

            if (transferType === 'spare_part' && hasProducts) {
                throw new Error('Cannot transfer spare part to this bin: destination bin contains products/devices.');
            }

            // Handle spare part transfer
            if (spare_part_id) {
                const updateResult = await conn.query(`
                    UPDATE product_inventory 
                    SET bin_id = ?, last_movement_at = NOW(), last_movement_type = 'TRANSFER'
                    WHERE product_id = ? AND bin_id = ? AND quantity_on_hand >= ?
                    LIMIT ?
                `, [to_bin_id, spare_part_id, from_bin_id, quantity, quantity]);

                if (updateResult.affectedRows === 0) {
                    throw new Error('Spare part not found in source bin or insufficient quantity');
                }

                return { success: true, message: 'Spare part transferred between bins successfully' };
            }

            // Handle product transfer
            const sourceInventory = await conn.query(`
                SELECT inventory_id, quantity_on_hand as quantity 
                FROM product_inventory 
                WHERE bin_id = ? AND product_id = ? AND quantity_on_hand >= ?
                LIMIT 1
                FOR UPDATE
            `, [from_bin_id, product_id, quantity]);

            if (!sourceInventory || sourceInventory.length === 0) {
                throw new Error('Product not found in source bin or insufficient quantity');
            }

            const sourceAssignment = sourceInventory[0];

            // Reduce from source
            if (sourceAssignment.quantity === quantity) {
                await conn.query(`DELETE FROM product_inventory WHERE inventory_id = ?`, [sourceAssignment.inventory_id]);
            } else {
                await conn.query(`UPDATE product_inventory SET quantity_on_hand = quantity_on_hand - ? WHERE inventory_id = ?`,
                    [quantity, sourceAssignment.inventory_id]);
            }

            // Add to destination
            const destInventory = await conn.query(`
                SELECT inventory_id FROM product_inventory 
                WHERE bin_id = ? AND product_id = ? AND (batch_number = ? OR (batch_number IS NULL AND ? IS NULL))
                LIMIT 1
                FOR UPDATE
            `, [to_bin_id, product_id, batch_id, batch_id]);

            if (destInventory && destInventory.length > 0) {
                await conn.query(`UPDATE product_inventory SET quantity_on_hand = quantity_on_hand + ? WHERE inventory_id = ?`,
                    [quantity, destInventory[0].inventory_id]);
            } else {
                const [binInfo] = await conn.query('SELECT warehouse_id FROM bin_locations WHERE bin_id = ?', [to_bin_id]);
                await conn.query(`
                    INSERT INTO product_inventory (bin_id, warehouse_id, product_id, quantity_on_hand, batch_number, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                `, [to_bin_id, binInfo?.warehouse_id, product_id, quantity, batch_id || null]);
            }

            return { success: true, message: 'Product moved between bins successfully' };
        });
    }
});

module.exports = locationApi;
