const { randomUUID } = require('crypto');

/**
 * RecommendationService
 * Analyzes stock levels against reorder points and daily usage trends to generate purchase recommendations.
 */
class RecommendationService {
    static pool = null;
    static recommendations = [];

    /**
     * Set the database connection pool
     * @param {object} pool
     */
    static setPool(pool) {
        this.pool = pool;
    }

    static getPool() {
        if (!this.pool) {
            const mariadb = require('mariadb');
            const dbConfig = {
                host: process.env.DB_HOST || '127.0.0.1',
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME || 'master_db',
                connectionLimit: 10
            };
            this.pool = mariadb.createPool(dbConfig);
        }
        return this.pool;
    }

    /**
     * Generate purchase recommendations for products and spare parts below reorder levels
     * @param {object} options
     * @returns {Promise<Array>}
     */
    static async generateRecommendations(_options = {}) {
        const pool = this.getPool();
        let conn;
        try {
            conn = await pool.getConnection();

            // 1. Get products below reorder point
            const productsQuery = `
                SELECT 
                    p.product_id, p.name as device_name, p.manufacturer as device_maker, p.part_code as sku,
                    p.reorder_point, NULL as reorder_quantity, NULL as safety_stock,
                    COALESCE(SUM(i.quantity), 0) as current_stock,
                    NULL as supplier_name
                FROM products p
                LEFT JOIN inventory i ON p.product_id = i.product_id
                WHERE p.is_active = 1
                GROUP BY p.product_id, p.name, p.manufacturer, p.part_code, p.reorder_point
                HAVING current_stock < p.reorder_point
            `;
            const products = await conn.query(productsQuery);

            // 2. Get spare parts below reorder point
            const partsQuery = `
                SELECT 
                    p.product_id as spare_part_id, p.name as part_name, p.part_code, sps.part_category,
                    p.reorder_point, NULL as reorder_quantity, NULL as min_stock_level,
                    COALESCE(SUM(i.quantity), 0) as current_stock,
                    NULL as supplier_name
                FROM products p
                LEFT JOIN spare_part_specs sps ON p.product_id = sps.product_id
                LEFT JOIN inventory i ON p.product_id = i.spare_part_id
                WHERE p.product_type = 'SPARE_PART' AND p.is_active = 1
                GROUP BY p.product_id, p.name, p.part_code, sps.part_category, p.reorder_point
                HAVING current_stock < p.reorder_point
            `;
            const parts = await conn.query(partsQuery);

            // 3. Get 30d product usage
            const productUsageQuery = `
                SELECT ti.product_id, COALESCE(SUM(ABS(ti.quantity_changed)), 0) as total_outgoing
                FROM transaction_items ti
                JOIN transactions t ON ti.transaction_id = t.id
                WHERE t.transaction_type = 'outgoing'
                  AND t.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY ti.product_id
            `;
            const productUsage = await conn.query(productUsageQuery);
            const productUsageMap = {};
            for (const row of productUsage) {
                productUsageMap[row.product_id] = Number(row.total_outgoing);
            }

            // 4. Get 30d spare parts usage
            const partUsageQuery = `
                SELECT ti.spare_part_id, COALESCE(SUM(ABS(ti.quantity_changed)), 0) as total_outgoing
                FROM transaction_items ti
                JOIN transactions t ON ti.transaction_id = t.id
                WHERE t.transaction_type = 'outgoing'
                  AND t.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY ti.spare_part_id
            `;
            const partUsage = await conn.query(partUsageQuery);
            const partUsageMap = {};
            for (const row of partUsage) {
                partUsageMap[row.spare_part_id] = Number(row.total_outgoing);
            }

            const recs = [];

            // Add product recommendations
            for (const p of products) {
                const currentStock = Number(p.current_stock);
                const reorderPoint = Number(p.reorder_point);
                const reorderQuantity = Number(p.reorder_quantity || 20);
                const safetyStock = Number(p.safety_stock || 0);

                const totalOutgoing = productUsageMap[p.product_id] || 0;
                const avgDailyUsage = parseFloat((totalOutgoing / 30).toFixed(2));

                let estimatedStockoutDays = 999;
                let estimatedStockoutDate = null;
                if (avgDailyUsage > 0) {
                    estimatedStockoutDays = Math.round(currentStock / avgDailyUsage);
                    const date = new Date();
                    date.setDate(date.getDate() + estimatedStockoutDays);
                    estimatedStockoutDate = date.toISOString();
                }

                // Priority
                let priority = 'HIGH';
                if (currentStock <= safetyStock || currentStock <= (reorderPoint * 0.5)) {
                    priority = 'CRITICAL';
                } else if (currentStock > reorderPoint * 0.8) {
                    priority = 'MEDIUM';
                }

                recs.push({
                    recommendation_id: randomUUID(),
                    product_id: p.product_id,
                    device_name: p.device_name,
                    device_maker: p.device_maker,
                    sku: p.sku,
                    warehouse_name: 'All Warehouses',
                    current_stock: currentStock,
                    reorder_point: reorderPoint,
                    recommended_quantity: reorderQuantity,
                    urgency_level: priority,
                    priority: priority,
                    avg_daily_usage: avgDailyUsage,
                    estimated_stockout_days: estimatedStockoutDays,
                    estimated_stockout_date: estimatedStockoutDate,
                    supplier_name: p.supplier_name,
                    status: 'PENDING',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }

            // Add spare parts recommendations
            for (const sp of parts) {
                const currentStock = Number(sp.current_stock);
                const reorderPoint = Number(sp.reorder_point);
                const reorderQuantity = Number(sp.reorder_quantity || 20);
                const minStockLevel = Number(sp.min_stock_level || 5);

                const totalOutgoing = partUsageMap[sp.spare_part_id] || 0;
                const avgDailyUsage = parseFloat((totalOutgoing / 30).toFixed(2));

                let estimatedStockoutDays = 999;
                let estimatedStockoutDate = null;
                if (avgDailyUsage > 0) {
                    estimatedStockoutDays = Math.round(currentStock / avgDailyUsage);
                    const date = new Date();
                    date.setDate(date.getDate() + estimatedStockoutDays);
                    estimatedStockoutDate = date.toISOString();
                }

                // Priority
                let priority = 'HIGH';
                if (currentStock <= minStockLevel || currentStock <= (reorderPoint * 0.5)) {
                    priority = 'CRITICAL';
                } else if (currentStock > reorderPoint * 0.8) {
                    priority = 'MEDIUM';
                }

                recs.push({
                    recommendation_id: randomUUID(),
                    spare_part_id: sp.spare_part_id,
                    part_name: sp.part_name,
                    part_code: sp.part_code,
                    part_category: sp.part_category,
                    warehouse_name: 'All Warehouses',
                    current_stock: currentStock,
                    reorder_point: reorderPoint,
                    recommended_quantity: reorderQuantity,
                    urgency_level: priority,
                    priority: priority,
                    avg_daily_usage: avgDailyUsage,
                    estimated_stockout_days: estimatedStockoutDays,
                    estimated_stockout_date: estimatedStockoutDate,
                    supplier_name: sp.supplier_name,
                    status: 'PENDING',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }

            this.recommendations = recs;
            return recs;
        } finally {
            if (conn) conn.release();
        }
    }

    /**
     * Get statistics for the current batch of recommendations
     * @param {object} options
     * @returns {Promise<object>}
     */
    static async getRecommendationStats(_options = {}) {
        const count = this.recommendations.length;
        const crit = this.recommendations.filter(r => r.urgency_level === 'CRITICAL').length;
        const high = this.recommendations.filter(r => r.urgency_level === 'HIGH').length;
        const med = this.recommendations.filter(r => r.urgency_level === 'MEDIUM').length;
        const reqQty = this.recommendations.reduce((sum, r) => sum + r.recommended_quantity, 0);

        return {
            pending_count: count,
            pendingCount: count,
            critical_count: crit,
            criticalCount: crit,
            high_count: high,
            highCount: high,
            medium_count: med,
            mediumCount: med,
            total_recommended_quantity: reqQty,
            totalRecommendedQuantity: reqQty
        };
    }
}

module.exports = RecommendationService;
