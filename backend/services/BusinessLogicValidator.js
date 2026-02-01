/**
 * Business Logic Validation Service for Warehouse Operations
 * Handles product type isolation, storage type validation, and business rules
 */

const { ValidationError, NotFoundError, CapacityError } = require('../utils/errors');
const { withConnection } = require('../utils/queryHelper');

class BusinessLogicValidator {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * Validates that a bin can store a specific product type
     * Enforces single product type per bin rule
     */
    async validateBinProductType(binId, productType) {
        return withConnection(this.pool, async (conn) => {
            // Check current bin inventory
            const [inventory] = await conn.query(`
                SELECT DISTINCT 
                    CASE 
                        WHEN pi.serial_number IS NOT NULL THEN 'smartphone'
                        ELSE 'spare_part' 
                    END as existing_product_type
                FROM product_inventory pi
                WHERE pi.bin_id = ? AND pi.quantity_on_hand > 0
            `, [binId]);

            // Check bin restrictions
            const [bin] = await conn.query(
                'SELECT product_type FROM bin_locations WHERE bin_id = ? AND is_active = 1',
                [binId]
            );

            if (!bin) {
                throw new NotFoundError(`Bin ${binId} not found or inactive`);
            }

            // If bin has inventory, enforce existing product type
            if (inventory && inventory.existing_product_type) {
                if (inventory.existing_product_type !== productType) {
                    throw new ValidationError(
                        `Bin ${binId} already contains ${inventory.existing_product_type}, cannot add ${productType}`
                    );
                }
            }

            // If bin has product type restriction, enforce it
            if (bin.product_type && bin.product_type !== productType) {
                throw new ValidationError(
                    `Bin ${binId} is restricted to ${bin.product_type}, cannot add ${productType}`
                );
            }

            return true;
        });
    }

    /**
     * Validates Column-Row-Bin addressing format
     * All three positions (column, row, bin) are required
     */
    validateColumnRowBin(binData) {
        const { column_position, row_position, bin_position } = binData;

        if (!column_position || !row_position || !bin_position) {
            throw new ValidationError('Column-Row-Bin addressing requires column_position, row_position, and bin_position');
        }

        return 'hierarchical';
    }

    /**
     * Generates and validates hierarchical codes
     */
    async validateHierarchicalCode(binId, column, row, bin, excludeBinId = null) {
        const hierarchicalCode = `C${column.toString().padStart(2, '0')}-R${row.toString().padStart(2, '0')}-B${bin.toString().padStart(2, '0')}`;

        return withConnection(this.pool, async (conn) => {
            const query = excludeBinId
                ? 'SELECT bin_id FROM bin_locations WHERE bin_id = ? AND hierarchical_code = ? AND bin_id != ?'
                : 'SELECT bin_id FROM bin_locations WHERE bin_id = ? AND hierarchical_code = ?';

            const params = excludeBinId ? [binId, hierarchicalCode, excludeBinId] : [binId, hierarchicalCode];
            const [existing] = await conn.query(query, params);

            if (existing) {
                throw new CapacityError(`Position ${hierarchicalCode} already exists in this zone`);
            }

            return hierarchicalCode;
        });
    }

    /**
     * Calculates accurate bin utilization
     */
    async calculateZoneUtilization(binId) {
        return withConnection(this.pool, async (conn) => {
            const [binStats] = await conn.query(`
                SELECT 
                    bl.max_capacity as bin_capacity,
                    COALESCE(SUM(pi.quantity_on_hand), 0) as total_quantity
                FROM bin_locations bl
                LEFT JOIN product_inventory pi ON bl.bin_id = pi.bin_id
                WHERE bl.bin_id = ?
                GROUP BY bl.bin_id
            `, [binId]);

            if (!binStats) {
                throw new NotFoundError(`Bin ${binId} not found`);
            }

            const effectiveCapacity = parseInt(binStats.bin_capacity) || 0;
            const totalQuantity = parseInt(binStats.total_quantity) || 0;
            const utilization = effectiveCapacity > 0 ? (totalQuantity / effectiveCapacity) * 100 : 0;

            return {
                bin_id: binId,
                total_quantity: totalQuantity,
                effective_capacity: effectiveCapacity,
                utilization_percent: Math.round(utilization * 100) / 100,
                status: utilization >= 90 ? 'critical' : utilization >= 70 ? 'warning' : 'normal'
            };
        });
    }

    /**
     * Validates product type consistency across warehouse operations
     */
    validateProductType(productType) {
        const validTypes = ['smartphone', 'spare_part'];
        if (productType && !validTypes.includes(productType)) {
            throw new ValidationError(`Invalid product type '${productType}'. Must be one of: ${validTypes.join(', ')}`);
        }
        return productType;
    }

    /**
     * Enforces bin capacity constraints
     */
    async validateBinCapacity(binId, additionalQuantity = 0) {
        return withConnection(this.pool, async (conn) => {
            const [binInfo] = await conn.query(`
                SELECT 
                    bl.max_capacity,
                    COALESCE(SUM(pi.quantity_on_hand), 0) as current_quantity
                FROM bin_locations bl
                LEFT JOIN product_inventory pi ON bl.bin_id = pi.bin_id
                WHERE bl.bin_id = ? AND bl.is_active = 1
                GROUP BY bl.bin_id, bl.max_capacity
            `, [binId]);

            if (!binInfo) {
                throw new NotFoundError(`Bin ${binId} not found or inactive`);
            }

            const newTotal = parseInt(binInfo.current_quantity) + additionalQuantity;
            if (newTotal > parseInt(binInfo.max_capacity)) {
                throw new CapacityError(
                    `Bin ${binId} capacity exceeded. Current: ${binInfo.current_quantity}, ` +
                    `Max: ${binInfo.max_capacity}, Attempted to add: ${additionalQuantity}`
                );
            }

            return {
                current_quantity: parseInt(binInfo.current_quantity),
                max_capacity: parseInt(binInfo.max_capacity),
                available_capacity: parseInt(binInfo.max_capacity) - parseInt(binInfo.current_quantity)
            };
        });
    }
}

module.exports = BusinessLogicValidator;