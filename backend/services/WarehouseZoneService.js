/**
 * WarehouseZoneService
 * Calculates efficiency, utilization, activity, and turnover ratios for warehouse zones.
 */
class WarehouseZoneService {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * Get efficiency metrics for all active zones of a warehouse
     * @param {string} warehouseId
     * @returns {Promise<Array>}
     */
    async getWarehouseZoneEfficiency(warehouseId) {
        let conn;
        try {
            conn = await this.pool.getConnection();
            const zones = await conn.query(
                `SELECT zone_id, name as zone_name, zone_type, capacity_limit 
                 FROM warehouse_zones 
                 WHERE warehouse_id = ? AND is_active = 1`,
                [warehouseId]
            );

            const efficiencyData = [];
            for (const zone of zones) {
                const zoneId = zone.zone_id;
                
                // Get current stock
                const [stockRes] = await conn.query(
                    `SELECT COALESCE(SUM(quantity), 0) as current_stock 
                     FROM inventory 
                     WHERE zone_id = ? AND warehouse_id = ?`,
                    [zoneId, warehouseId]
                );
                const currentStock = Number(stockRes ? stockRes.current_stock : 0);

                // Get movements 30d
                const [movementsRes] = await conn.query(
                    `SELECT COUNT(*) as count 
                     FROM transaction_items ti
                     JOIN transactions t ON ti.transaction_id = t.id
                     WHERE (
                       (ti.to_zone_id = ? AND ti.to_warehouse_id = ?)
                       OR (ti.from_zone_id = ? AND ti.from_warehouse_id = ?)
                     ) AND t.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
                    [zoneId, warehouseId, zoneId, warehouseId]
                );
                const movements30d = Number(movementsRes ? movementsRes.count : 0);

                // Get unique products handled 30d
                const [productsRes] = await conn.query(
                    `SELECT COUNT(DISTINCT ti.product_id) as count 
                     FROM transaction_items ti
                     JOIN transactions t ON ti.transaction_id = t.id
                     WHERE (
                       (ti.to_zone_id = ? AND ti.to_warehouse_id = ?)
                       OR (ti.from_zone_id = ? AND ti.from_warehouse_id = ?)
                     ) AND t.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND ti.product_id IS NOT NULL`,
                    [zoneId, warehouseId, zoneId, warehouseId]
                );
                const productsHandled30d = Number(productsRes ? productsRes.count : 0);

                // Calculations
                const capLimit = zone.capacity_limit ? Number(zone.capacity_limit) : null;
                const utilizationPercent = capLimit ? Math.round((currentStock / capLimit) * 100) : null;

                let capacityStatus = 'Normal';
                if (utilizationPercent !== null) {
                    if (utilizationPercent >= 90) capacityStatus = 'Full';
                    else if (utilizationPercent >= 75) capacityStatus = 'Near Capacity';
                    else if (utilizationPercent >= 30) capacityStatus = 'Normal';
                    else if (utilizationPercent > 0) capacityStatus = 'Under-utilized';
                    else capacityStatus = 'Empty';
                } else {
                    capacityStatus = currentStock > 0 ? 'Normal' : 'Empty';
                }

                const turnoverRatio = currentStock > 0 
                    ? parseFloat((movements30d / currentStock).toFixed(2)) 
                    : parseFloat(movements30d.toFixed(2));

                // Efficiency Score Heuristic
                let score = 50;
                if (utilizationPercent === null) {
                    score += 10;
                } else {
                    if (utilizationPercent >= 40 && utilizationPercent <= 80) score += 20;
                    else if ((utilizationPercent >= 20 && utilizationPercent < 40) || (utilizationPercent > 80 && utilizationPercent <= 90)) score += 10;
                }
                
                if (movements30d > 50) score += 20;
                else if (movements30d > 20) score += 15;
                else if (movements30d > 5) score += 10;

                if (productsHandled30d > 5) score += 10;
                else if (productsHandled30d > 2) score += 5;

                score = Math.max(10, Math.min(100, score));

                efficiencyData.push({
                    zone_name: zone.zone_name,
                    zone_type: zone.zone_type,
                    efficiency_score: score,
                    utilization_percent: utilizationPercent,
                    capacity_status: capacityStatus,
                    movements_30d: movements30d,
                    products_handled_30d: productsHandled30d,
                    turnover_ratio: turnoverRatio
                });
            }

            return efficiencyData;
        } finally {
            if (conn) conn.release();
        }
    }
}

module.exports = WarehouseZoneService;
