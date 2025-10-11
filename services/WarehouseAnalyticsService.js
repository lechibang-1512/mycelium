/**
 * Warehouse Analytics Service Extension
 * Extends the main AnalyticsService with warehouse-specific analytics
 */

class WarehouseAnalyticsService {
    constructor(pool, convertBigIntToNumber) {
        this.pool = pool;
        this.convertBigIntToNumber = convertBigIntToNumber;
    }

    /**
     * Get warehouse performance data
     */
    async getWarehousePerformanceData(period = 30) {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                SELECT 
                    w.warehouse_id,
                    w.name as warehouse_name,
                    COUNT(DISTINCT il.product_id) as unique_products_moved,
                    SUM(CASE WHEN il.transaction_type = 'incoming' THEN ABS(il.quantity_changed) ELSE 0 END) as total_received,
                    SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE 0 END) as total_shipped,
                    COUNT(CASE WHEN il.transaction_type = 'incoming' THEN 1 END) as receiving_transactions,
                    COUNT(CASE WHEN il.transaction_type = 'outgoing' THEN 1 END) as shipping_transactions,
                    COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ps.device_price * ABS(il.quantity_changed) ELSE 0 END), 0) as revenue_generated
                FROM warehouses w
                LEFT JOIN inventory_log il ON w.warehouse_id = il.warehouse_id
                    AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                LEFT JOIN specs_db ps ON il.product_id = ps.product_id
                WHERE w.is_active = TRUE
                GROUP BY w.warehouse_id, w.name
                ORDER BY revenue_generated DESC
            `;
            const result = await conn.query(query, [period]);
            return this.convertBigIntToNumber(result);
        } finally {
            conn.end();
        }
    }

    /**
     * Get zone utilization data
     */
    async getZoneUtilizationData(warehouseId = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `
                SELECT 
                    wz.zone_id,
                    wz.name as zone_name,
                    wz.zone_type,
                    w.name as warehouse_name,
                    COUNT(DISTINCT wpl.product_id) as unique_products,
                    COALESCE(SUM(wpl.quantity), 0) as total_inventory,
                    COALESCE(SUM(wpl.reserved_quantity), 0) as reserved_inventory,
                    COALESCE(SUM(wpl.quantity - wpl.reserved_quantity), 0) as available_inventory
                FROM warehouse_zones wz
                JOIN warehouses w ON wz.warehouse_id = w.warehouse_id
                LEFT JOIN warehouse_product_locations wpl ON wz.zone_id = wpl.zone_id
                WHERE wz.is_active = TRUE AND w.is_active = TRUE
            `;
            const params = [];

            if (warehouseId) {
                query += ' AND w.warehouse_id = ?';
                params.push(warehouseId);
            }

            query += ' GROUP BY wz.zone_id, wz.name, wz.zone_type, w.name ORDER BY w.name, wz.zone_type, wz.name';

            const result = await conn.query(query, params);
            return this.convertBigIntToNumber(result);
        } finally {
            conn.end();
        }
    }

    /**
     * Get batch expiry analytics
     */
    async getBatchExpiryAnalytics(daysAhead = 90) {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_batches,
                    SUM(CASE WHEN DATEDIFF(expiry_date, CURRENT_DATE) <= 7 THEN 1 ELSE 0 END) as expiring_week,
                    SUM(CASE WHEN DATEDIFF(expiry_date, CURRENT_DATE) <= 30 THEN 1 ELSE 0 END) as expiring_month,
                    SUM(CASE WHEN DATEDIFF(expiry_date, CURRENT_DATE) <= 90 THEN 1 ELSE 0 END) as expiring_quarter,
                    SUM(quantity_remaining) as total_quantity_at_risk,
                    COUNT(DISTINCT product_id) as unique_products_at_risk
                FROM batch_tracking
                WHERE status = 'active' 
                    AND expiry_date IS NOT NULL
                    AND DATEDIFF(expiry_date, CURRENT_DATE) <= ?
            `;
            const result = await conn.query(query, [daysAhead]);
            return this.convertBigIntToNumber(result[0]);
        } finally {
            conn.end();
        }
    }

    /**
     * Get serialized inventory analytics
     */
    async getSerializedInventoryAnalytics(warehouseId = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_serialized_items,
                    COUNT(CASE WHEN status = 'in_stock' THEN 1 END) as in_stock,
                    COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold,
                    COUNT(CASE WHEN status = 'damaged' THEN 1 END) as damaged,
                    COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned,
                    COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved,
                    COUNT(DISTINCT product_id) as unique_products_serialized
                FROM serialized_inventory
                WHERE 1=1
            `;
            const params = [];

            if (warehouseId) {
                query += ' AND warehouse_id = ?';
                params.push(warehouseId);
            }

            const result = await conn.query(query, params);
            return this.convertBigIntToNumber(result[0]);
        } finally {
            conn.end();
        }
    }

    /**
     * Get inventory turnover by warehouse
     */
    async getInventoryTurnoverByWarehouse(period = 30) {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                SELECT 
                    w.warehouse_id,
                    w.name as warehouse_name,
                    COALESCE(SUM(ABS(il.quantity_changed)), 0) as total_movement,
                    COALESCE(AVG(wpl.quantity), 0) as avg_inventory_level,
                    CASE 
                        WHEN AVG(wpl.quantity) > 0 THEN 
                            ROUND(SUM(ABS(il.quantity_changed)) / AVG(wpl.quantity), 2)
                        ELSE 0 
                    END as turnover_ratio
                FROM warehouses w
                LEFT JOIN inventory_log il ON w.warehouse_id = il.warehouse_id
                    AND il.transaction_type = 'outgoing'
                    AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                LEFT JOIN warehouse_product_locations wpl ON w.warehouse_id = wpl.warehouse_id
                WHERE w.is_active = TRUE
                GROUP BY w.warehouse_id, w.name
                ORDER BY turnover_ratio DESC
            `;
            const result = await conn.query(query, [period]);
            return this.convertBigIntToNumber(result);
        } finally {
            conn.end();
        }
    }

    /**
     * Get top performing zones by revenue
     */
    async getTopPerformingZones(period = 30, limit = 10) {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                SELECT 
                    wz.zone_id,
                    wz.name as zone_name,
                    wz.zone_type,
                    w.name as warehouse_name,
                    COUNT(DISTINCT il.product_id) as unique_products,
                    COALESCE(SUM(ABS(il.quantity_changed)), 0) as total_units_moved,
                    COALESCE(SUM(ps.device_price * ABS(il.quantity_changed)), 0) as revenue_generated
                FROM warehouse_zones wz
                JOIN warehouses w ON wz.warehouse_id = w.warehouse_id
                LEFT JOIN inventory_log il ON wz.zone_id = il.zone_id
                    AND il.transaction_type = 'outgoing'
                    AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                LEFT JOIN specs_db ps ON il.product_id = ps.product_id
                WHERE wz.is_active = TRUE AND w.is_active = TRUE
                GROUP BY wz.zone_id, wz.name, wz.zone_type, w.name
                ORDER BY revenue_generated DESC
                LIMIT ?
            `;
            const result = await conn.query(query, [period, limit]);
            return this.convertBigIntToNumber(result);
        } finally {
            conn.end();
        }
    }

    /**
     * Get low stock alerts by warehouse
     */
    async getLowStockByWarehouse(lowStockThreshold = 5) {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                SELECT 
                    w.warehouse_id,
                    w.name as warehouse_name,
                    wz.zone_id,
                    wz.name as zone_name,
                    sd.product_id,
                    sd.device_name,
                    sd.device_maker,
                    sd.device_price,
                    COALESCE(wpl.quantity, 0) as current_stock,
                    COALESCE(wpl.reserved_quantity, 0) as reserved_stock,
                    COALESCE(wpl.quantity - wpl.reserved_quantity, 0) as available_stock
                FROM warehouses w
                CROSS JOIN specs_db sd
                LEFT JOIN warehouse_zones wz ON w.warehouse_id = wz.warehouse_id
                LEFT JOIN warehouse_product_locations wpl ON w.warehouse_id = wpl.warehouse_id 
                    AND sd.product_id = wpl.product_id
                    AND (wz.zone_id = wpl.zone_id OR wpl.zone_id IS NULL)
                WHERE w.is_active = TRUE
                    AND COALESCE(wpl.quantity - wpl.reserved_quantity, 0) <= ?
                    AND COALESCE(wpl.quantity - wpl.reserved_quantity, 0) >= 0
                ORDER BY available_stock ASC, w.name, sd.device_name
            `;
            const result = await conn.query(query, [lowStockThreshold]);
            return this.convertBigIntToNumber(result);
        } finally {
            conn.end();
        }
    }

    /**
     * Get expiring batches details
     */
    async getExpiringBatchesDetails(daysAhead = 30) {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                SELECT *
                FROM expiring_batches
                WHERE days_until_expiry <= ?
                ORDER BY days_until_expiry ASC
            `;
            const result = await conn.query(query, [daysAhead]);
            return this.convertBigIntToNumber(result);
        } finally {
            conn.end();
        }
    }

    /**
     * Get warehouse inventory summary
     */
    async getWarehouseInventorySummary(warehouseId = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `
                SELECT 
                    w.warehouse_id,
                    w.name as warehouse_name,
                    COUNT(DISTINCT wpl.product_id) as unique_products,
                    SUM(wpl.quantity) as total_items,
                    SUM(wpl.reserved_quantity) as total_reserved,
                    SUM(wpl.quantity - wpl.reserved_quantity) as total_available,
                    COUNT(DISTINCT wz.zone_id) as total_zones,
                    SUM(wpl.quantity * ps.device_price) as total_inventory_value
                FROM warehouses w
                LEFT JOIN warehouse_product_locations wpl ON w.warehouse_id = wpl.warehouse_id
                LEFT JOIN warehouse_zones wz ON w.warehouse_id = wz.warehouse_id AND wz.is_active = TRUE
                LEFT JOIN specs_db ps ON wpl.product_id = ps.product_id
                WHERE w.is_active = TRUE
            `;
            const params = [];

            if (warehouseId) {
                query += ' AND w.warehouse_id = ?';
                params.push(warehouseId);
            }

            query += ' GROUP BY w.warehouse_id, w.name ORDER BY w.name';

            const result = await conn.query(query, params);
            return this.convertBigIntToNumber(result);
        } finally {
            conn.end();
        }
    }

    /**
     * Get batch tracking summary
     */
    async getBatchTrackingSummary(status = 'active') {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_batches,
                    COUNT(DISTINCT product_id) as unique_products,
                    SUM(quantity_received) as total_quantity_received,
                    SUM(quantity_remaining) as total_quantity_remaining,
                    COUNT(CASE WHEN expiry_date IS NOT NULL THEN 1 END) as batches_with_expiry,
                    COUNT(CASE WHEN DATEDIFF(expiry_date, CURRENT_DATE) <= 30 THEN 1 END) as expiring_soon
                FROM batch_tracking
                WHERE status = ?
            `;
            const result = await conn.query(query, [status]);
            return this.convertBigIntToNumber(result[0]);
        } finally {
            conn.end();
        }
    }
}

module.exports = WarehouseAnalyticsService;
