const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');

class PCInventoryService {
    /**
     * Get stock level for a specific component
     */
    async getStock(type, id) {
        return sequelizeMaster.query(
            'SELECT * FROM pc_components.component_inventory WHERE component_type = ? AND component_id = ?',
            { replacements: [type, id], type: QueryTypes.SELECT }
        );
    }

    /**
     * Update stock level (Upsert)
     */
    async updateStock(type, id, quantity, warehouseId = null, location = null) {
        return sequelizeMaster.transaction(async (t) => {
            const existing = await sequelizeMaster.query(
                'SELECT id FROM pc_components.component_inventory WHERE component_type = ? AND component_id = ? AND warehouse_id <=> ?',
                { replacements: [type, id, warehouseId], type: QueryTypes.SELECT, transaction: t }
            );

            if (existing.length > 0) {
                await sequelizeMaster.query(
                    'UPDATE pc_components.component_inventory SET quantity = ?, location = ? WHERE id = ?',
                    { replacements: [quantity, location, existing[0].id], type: QueryTypes.UPDATE, transaction: t }
                );
            } else {
                await sequelizeMaster.query(
                    'INSERT INTO pc_components.component_inventory (id, component_type, component_id, quantity, warehouse_id, location) VALUES (?, ?, ?, ?, ?, ?)',
                    { replacements: [generateId(), type, id, quantity, warehouseId, location], type: QueryTypes.INSERT, transaction: t }
                );
            }
            return { success: true };
        });
    }

    /**
     * Get all components with their stock levels
     */
    async getAllStock() {
        return sequelizeMaster.query('SELECT * FROM pc_components.component_inventory ORDER BY updated_at DESC', {
            type: QueryTypes.SELECT
        });
    }
}

module.exports = new PCInventoryService();
