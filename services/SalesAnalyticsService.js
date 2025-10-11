/**
 * Sales Analytics Service
 * Follows Single Responsibility Principle - focused only on sales-related analytics
 */

class SalesAnalyticsService {
    constructor(pool, convertBigIntToNumber) {
        this.pool = pool;
        this.convertBigIntToNumber = convertBigIntToNumber;
    }

    /**
     * Get sales trends for a specific period
     * @param {string} period - Time period ('today', 'week', 'month', 'year')
     * @returns {Promise<Object>} Sales trend data
     */
    async getSalesTrends(period = 'month') {
        const conn = await this.pool.getConnection();
        
        try {
            const { query, params } = this.buildSalesTrendQuery(period);
            const result = await conn.query(query, params);
            return this.convertBigIntToNumber(result);
        } finally {
            conn.release();
        }
    }

    /**
     * Build sales trend query based on period
     * @param {string} period - Time period
     * @returns {Object} Query and parameters
     */
    buildSalesTrendQuery(period) {
        let dateCondition = '';
        let groupBy = '';
        let params = [];

        switch (period) {
            case 'today':
                dateCondition = 'DATE(il.transaction_date) = CURDATE()';
                groupBy = 'HOUR(il.transaction_date)';
                break;
            case 'week':
                dateCondition = 'il.transaction_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                groupBy = 'DATE(il.transaction_date)';
                break;
            case 'month':
                dateCondition = 'il.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                groupBy = 'DATE(il.transaction_date)';
                break;
            case 'year':
                dateCondition = 'YEAR(il.transaction_date) = YEAR(NOW())';
                groupBy = 'MONTH(il.transaction_date)';
                break;
            default:
                dateCondition = 'il.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                groupBy = 'DATE(il.transaction_date)';
        }

        const query = `
            SELECT 
                ${groupBy} as period,
                COUNT(*) as total_transactions,
                SUM(ABS(il.quantity_changed)) as units_sold,
                SUM(ps.device_price * ABS(il.quantity_changed)) as revenue
            FROM inventory_log il
            JOIN specs_db ps ON il.product_id = ps.product_id
            WHERE il.transaction_type = 'outgoing' 
            AND ${dateCondition}
            GROUP BY ${groupBy}
            ORDER BY period ASC
        `;

        return { query, params };
    }

    /**
     * Get top selling products
     * @param {number} limit - Number of products to return
     * @param {string} period - Time period for analysis
     * @returns {Promise<Array>} Top selling products
     */
    async getTopSellingProducts(limit = 10, period = 'month') {
        const conn = await this.pool.getConnection();
        
        try {
            const { dateCondition } = this.getPeriodCondition(period);
            
            const query = `
                SELECT 
                    ps.product_id,
                    ps.device_name,
                    ps.device_maker,
                    ps.device_price,
                    SUM(ABS(il.quantity_changed)) as units_sold,
                    SUM(ps.device_price * ABS(il.quantity_changed)) as revenue
                FROM inventory_log il
                JOIN specs_db ps ON il.product_id = ps.product_id
                WHERE il.transaction_type = 'outgoing' 
                AND ${dateCondition}
                GROUP BY ps.product_id, ps.device_name, ps.device_maker, ps.device_price
                ORDER BY units_sold DESC
                LIMIT ?
            `;

            const result = await conn.query(query, [limit]);
            return this.convertBigIntToNumber(result);
        } finally {
            conn.release();
        }
    }

    /**
     * Get sales summary for dashboard
     * @param {string} period - Time period
     * @returns {Promise<Object>} Sales summary
     */
    async getSalesSummary(period = 'month') {
        const conn = await this.pool.getConnection();
        
        try {
            const { dateCondition } = this.getPeriodCondition(period);
            
            const query = `
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(ABS(il.quantity_changed)) as total_units_sold,
                    SUM(ps.device_price * ABS(il.quantity_changed)) as total_revenue,
                    AVG(ps.device_price * ABS(il.quantity_changed)) as avg_transaction_value,
                    COUNT(DISTINCT il.product_id) as unique_products_sold
                FROM inventory_log il
                JOIN specs_db ps ON il.product_id = ps.product_id
                WHERE il.transaction_type = 'outgoing' 
                AND ${dateCondition}
            `;

            const result = await conn.query(query);
            return this.convertBigIntToNumber(result[0] || {});
        } finally {
            conn.release();
        }
    }

    /**
     * Calculate growth rate compared to previous period
     * @param {string} period - Current period
     * @returns {Promise<Object>} Growth rate data
     */
    async getGrowthRate(period = 'month') {
        const conn = await this.pool.getConnection();
        
        try {
            const { currentQuery, previousQuery } = this.buildGrowthQueries(period);
            
            const [currentResult, previousResult] = await Promise.all([
                conn.query(currentQuery),
                conn.query(previousQuery)
            ]);

            const current = this.convertBigIntToNumber(currentResult[0] || {});
            const previous = this.convertBigIntToNumber(previousResult[0] || {});

            const growthRate = this.calculateGrowthPercentage(
                current.total_revenue || 0,
                previous.total_revenue || 0
            );

            return {
                current,
                previous,
                growthRate,
                trend: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'stable'
            };
        } finally {
            conn.release();
        }
    }

    /**
     * Get period condition for queries
     * @param {string} period - Time period
     * @returns {Object} Date condition
     */
    getPeriodCondition(period) {
        switch (period) {
            case 'today':
                return { dateCondition: 'DATE(il.transaction_date) = CURDATE()' };
            case 'week':
                return { dateCondition: 'il.transaction_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)' };
            case 'month':
                return { dateCondition: 'il.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)' };
            case 'year':
                return { dateCondition: 'YEAR(il.transaction_date) = YEAR(NOW())' };
            default:
                return { dateCondition: 'il.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)' };
        }
    }

    /**
     * Build queries for growth rate calculation
     * @param {string} period - Time period
     * @returns {Object} Current and previous period queries
     */
    buildGrowthQueries(period) {
        let currentCondition, previousCondition;

        switch (period) {
            case 'today':
                currentCondition = 'DATE(il.transaction_date) = CURDATE()';
                previousCondition = 'DATE(il.transaction_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
                break;
            case 'week':
                currentCondition = 'il.transaction_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                previousCondition = 'il.transaction_date >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND il.transaction_date < DATE_SUB(NOW(), INTERVAL 7 DAY)';
                break;
            case 'month':
                currentCondition = 'il.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                previousCondition = 'il.transaction_date >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND il.transaction_date < DATE_SUB(NOW(), INTERVAL 30 DAY)';
                break;
            case 'year':
                currentCondition = 'YEAR(il.transaction_date) = YEAR(NOW())';
                previousCondition = 'YEAR(il.transaction_date) = YEAR(NOW()) - 1';
                break;
            default:
                currentCondition = 'il.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                previousCondition = 'il.transaction_date >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND il.transaction_date < DATE_SUB(NOW(), INTERVAL 30 DAY)';
        }

        const baseQuery = `
            SELECT 
                SUM(ps.device_price * ABS(il.quantity_changed)) as total_revenue,
                SUM(ABS(il.quantity_changed)) as total_units
            FROM inventory_log il
            JOIN specs_db ps ON il.product_id = ps.product_id
            WHERE il.transaction_type = 'outgoing' 
        `;

        return {
            currentQuery: `${baseQuery} AND ${currentCondition}`,
            previousQuery: `${baseQuery} AND ${previousCondition}`
        };
    }

    /**
     * Calculate growth percentage
     * @param {number} current - Current value
     * @param {number} previous - Previous value
     * @returns {number} Growth percentage
     */
    calculateGrowthPercentage(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    }
}

module.exports = SalesAnalyticsService;
