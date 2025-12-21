const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');

class PCInventoryService {
    /**
     * Get stock level for a specific component
     */
    async getStock(type, id) {
        // 'type' is no longer strictly needed for querying since product_id is unique globally
        return sequelizeMaster.query(
            'SELECT SUM(quantity) as quantity, product_id as component_id, warehouse_id, bin_id FROM master_db.inventory WHERE product_id = ? AND inventory_type = \'bulk\' GROUP BY warehouse_id, bin_id',
            { replacements: [id], type: QueryTypes.SELECT }
        );
    }

    /**
     * Update stock level (Upsert)
     */
    async updateStock(type, id, quantity, warehouseId = null, location = null) {
        return sequelizeMaster.transaction(async (t) => {
            // Note: location maps to notes or bin_id. Here we store it in notes if bin_id is not resolvable.
            const existing = await sequelizeMaster.query(
                'SELECT id FROM master_db.inventory WHERE product_id = ? AND warehouse_id <=> ? AND inventory_type = \'bulk\' AND condition_status = \'NEW\'',
                { replacements: [id, warehouseId], type: QueryTypes.SELECT, transaction: t }
            );

            if (existing.length > 0) {
                await sequelizeMaster.query(
                    'UPDATE master_db.inventory SET quantity = ?, notes = ?, last_movement_at = NOW(), last_movement_type = \'adjustment\' WHERE id = ?',
                    { replacements: [quantity, location, existing[0].id], type: QueryTypes.UPDATE, transaction: t }
                );
            } else {
                await sequelizeMaster.query(
                    'INSERT INTO master_db.inventory (id, inventory_type, product_id, quantity, condition_status, warehouse_id, notes, last_movement_at, last_movement_type) VALUES (?, \'bulk\', ?, ?, \'NEW\', ?, ?, NOW(), \'adjustment\')',
                    { replacements: [generateId(), id, quantity, warehouseId, location], type: QueryTypes.INSERT, transaction: t }
                );
            }
            return { success: true };
        });
    }

    /**
     * Get all components with their stock levels
     */
    async getAllStock() {
        return sequelizeMaster.query(`
            SELECT i.product_id as component_id, SUM(i.quantity) as quantity, p.product_type as component_type
            FROM master_db.inventory i
            JOIN master_db.products p ON i.product_id = p.product_id
            WHERE i.inventory_type = 'bulk' AND p.product_type NOT IN ('PHONE', 'SPARE_PART')
            GROUP BY i.product_id, p.product_type
            ORDER BY p.name ASC
        `, {
            type: QueryTypes.SELECT
        });
    }
}

module.exports = new PCInventoryService();
