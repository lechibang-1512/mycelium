/**
 * Analytics Service Module
 * Contains business logic for analytics calculations and data processing
 */

const AnalyticsConfig = require('../config/analytics');

class AnalyticsService {
    constructor(pool, suppliersPool, convertBigIntToNumber) {
        this.pool = pool;
        this.suppliersPool = suppliersPool;
        this.convertBigIntToNumber = convertBigIntToNumber;
        this.config = AnalyticsConfig;
    }

    /**
     * Get comprehensive analytics data for a given period
     * @param {number} period - Number of days to analyze
     * @returns {Object} Complete analytics data
     */
    async getAnalyticsData(period = this.config.DEFAULTS.PERIOD, options = {}) {
        const conn = await this.pool.getConnection();
        const suppliersConn = await this.suppliersPool.getConnection();
        try {
            // Get core analytics data in parallel for better performance
            const [
                revenueData,
                unitsSoldData,
                productsData,
                lowStockData,
                topProductsData,
                previousPeriodData,
                recentTransactionsData,
                inventoryValueData
            ] = await Promise.all([
                this.getRevenueData(conn, period),
                this.getUnitsSoldData(conn, period),
                this.getProductsData(conn),
                this.getLowStockData(conn),
                this.getTopProductsData(conn, period),
                this.getPreviousPeriodData(conn, period),
                this.getRecentTransactionsData(conn),
                this.getInventoryValueData(conn)
            ]);

            const totalRevenue = revenueData.total_revenue || 0;
            const totalUnitsSold = unitsSoldData.units_sold || 0;
            const previousRevenue = previousPeriodData.previous_revenue || 0;
            const previousUnitsSold = previousPeriodData.previous_units || 0;

            // Calculate derived metrics
            const averageOrderValue = totalUnitsSold > 0 ? totalRevenue / totalUnitsSold : 0;
            const previousAverageOrderValue = previousUnitsSold > 0 ? previousRevenue / previousUnitsSold : 0;
            const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

            return {
                // Basic metrics
                totalRevenue: parseFloat(totalRevenue).toFixed(2),
                totalUnitsSold,
                totalProducts: productsData.total,
                lowStockCount: lowStockData.length,
                lowStockProducts: lowStockData,
                
                // Previous period metrics
                previousRevenue: parseFloat(previousRevenue).toFixed(2),
                previousUnitsSold: previousUnitsSold,
                
                // Product data
                topSellingProducts: topProductsData,
                
                // Calculated metrics
                averageOrderValue: parseFloat(averageOrderValue).toFixed(2),
                previousAverageOrderValue: parseFloat(previousAverageOrderValue).toFixed(2),
                growthRate: parseFloat(growthRate).toFixed(2),
                
                // Additional data
                recentTransactions: recentTransactionsData,
                inventoryValue: inventoryValueData,
                
                // Filters
                selectedPeriod: period,
                options
            };

        } finally {
            conn.end();
            suppliersConn.end();
        }
    }

    /**
     * Get revenue data for the specified period
     */
    async getRevenueData(conn, period) {
        const query = `
            SELECT COALESCE(SUM(ps.device_price * ABS(il.quantity_changed)), 0) as total_revenue
            FROM inventory_log il
            JOIN specs_db ps ON il.product_id = ps.product_id
            WHERE il.transaction_type = 'outgoing' 
            AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        const result = await conn.query(query, [period]);
        return this.convertBigIntToNumber(result[0]);
    }

    /**
     * Get units sold data for the specified period
     */
    async getUnitsSoldData(conn, period) {
        const query = `
            SELECT COALESCE(SUM(ABS(quantity_changed)), 0) as units_sold
            FROM inventory_log 
            WHERE transaction_type = 'outgoing' 
            AND transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        const result = await conn.query(query, [period]);
        return this.convertBigIntToNumber(result[0]);
    }

    /**
     * Get total products count
     */
    async getProductsData(conn) {
        const query = `SELECT COUNT(*) as total FROM specs_db`;
        const result = await conn.query(query);
        return this.convertBigIntToNumber(result[0]);
    }

    /**
     * Get low stock products (stock <= threshold)
     */
    async getLowStockData(conn) {
        const query = `
            SELECT product_id, device_name, device_maker, device_inventory, device_price 
            FROM specs_db 
            WHERE device_inventory <= ? 
            ORDER BY device_inventory ASC
        `;
        const result = await conn.query(query, [this.config.DEFAULTS.LOW_STOCK_THRESHOLD]);
        return this.convertBigIntToNumber(result);
    }

    /**
     * Get sales trend data for chart
     */
    async getSalesTrendData(conn, period) {
        const query = `
            SELECT 
                DATE_FORMAT(il.transaction_date, '%Y-%m-%d') as sale_date,
                COALESCE(SUM(ps.device_price * ABS(il.quantity_changed)), 0) as daily_revenue,
                COALESCE(SUM(ABS(il.quantity_changed)), 0) as daily_units
            FROM inventory_log il
            JOIN specs_db ps ON il.product_id = ps.product_id
            WHERE il.transaction_type = 'outgoing' 
            AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(il.transaction_date)
            ORDER BY DATE(il.transaction_date) ASC
        `;
        const result = await conn.query(query, [period]);
        return this.convertBigIntToNumber(result);
    }

    /**
     * Get top selling products
     */
    async getTopProductsData(conn, period) {
        const query = `
            SELECT 
                ps.product_id, ps.device_name, ps.device_maker, ps.device_price, ps.device_inventory,
                COALESCE(SUM(ABS(il.quantity_changed)), 0) as total_sold,
                COALESCE(SUM(ps.device_price * ABS(il.quantity_changed)), 0) as revenue
            FROM specs_db ps
            LEFT JOIN inventory_log il ON ps.product_id = il.product_id AND il.transaction_type = 'outgoing'
            AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY ps.product_id, ps.device_name, ps.device_maker, ps.device_price, ps.device_inventory
            ORDER BY total_sold DESC
            LIMIT ?
        `;
        const result = await conn.query(query, [period, this.config.DEFAULTS.TOP_PRODUCTS_LIMIT]);
        return this.convertBigIntToNumber(result);
    }

    /**
     * Get inventory status distribution
     */
    async getInventoryStatusData(conn) {
        const query = `
            SELECT 
                SUM(CASE WHEN device_inventory > 5 THEN 1 ELSE 0 END) as in_stock,
                SUM(CASE WHEN device_inventory > 0 AND device_inventory <= 5 THEN 1 ELSE 0 END) as low_stock,
                SUM(CASE WHEN device_inventory = 0 THEN 1 ELSE 0 END) as out_of_stock
            FROM specs_db
        `;
        const result = await conn.query(query);
        return this.convertBigIntToNumber(result[0]);
    }

    /**
     * Get best selling day data
     */
    async getBestSellingDayData(conn, period) {
        const query = `
            SELECT 
                DAYNAME(il.transaction_date) as day_name,
                COUNT(*) as transaction_count,
                COALESCE(SUM(ABS(il.quantity_changed)), 0) as units_sold
            FROM inventory_log il
            WHERE il.transaction_type = 'outgoing' 
            AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DAYNAME(il.transaction_date), DAYOFWEEK(il.transaction_date)
            ORDER BY units_sold DESC
            LIMIT 1
        `;
        const result = await conn.query(query, [period]);
        return this.convertBigIntToNumber(result);
    }

    /**
     * Get previous period data for growth calculation
     */
    async getPreviousPeriodData(conn, period) {
        const query = `
            SELECT 
                COALESCE(SUM(ps.device_price * ABS(il.quantity_changed)), 0) as previous_revenue,
                COALESCE(SUM(ABS(il.quantity_changed)), 0) as previous_units
            FROM inventory_log il
            JOIN specs_db ps ON il.product_id = ps.product_id
            WHERE il.transaction_type = 'outgoing' 
            AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND il.transaction_date < DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        const result = await conn.query(query, [period * 2, period]);
        return this.convertBigIntToNumber(result[0]);
    }

    /**
     * Get recent transactions
     */
    async getRecentTransactionsData(conn) {
        const query = `
            SELECT 
                il.transaction_type, 
                il.quantity_changed, 
                il.notes,
                il.transaction_date,
                DATE_FORMAT(il.transaction_date, '%M %d, %Y at %h:%i %p') as formatted_date,
                ps.device_name, 
                ps.device_maker, 
                ps.device_price
            FROM inventory_log il
            JOIN specs_db ps ON il.product_id = ps.product_id
            ORDER BY il.transaction_date DESC
            LIMIT ?
        `;
        const result = await conn.query(query, [this.config.DEFAULTS.RECENT_TRANSACTIONS_LIMIT]);
        return this.convertBigIntToNumber(result);
    }

    /**
     * Get comprehensive supplier performance data
     */
    async getSupplierPerformanceData(suppliersConn, period) {
        try {
            // Get inventory data from master_specs_db
            const conn = await this.pool.getConnection();
            
            // First get supplier transaction data from master_specs_db
            const inventoryQuery = `
                SELECT 
                    il.supplier_id,
                    SUM(il.quantity_changed) as total_received,
                    COUNT(*) as transaction_count,
                    AVG(ps.device_price * il.quantity_changed) as avg_delivery_value,
                    MAX(il.transaction_date) as last_delivery_date
                FROM inventory_log il
                JOIN specs_db ps ON il.product_id = ps.product_id
                WHERE il.transaction_type = 'incoming'
                AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND il.supplier_id IS NOT NULL
                GROUP BY il.supplier_id
            `;
            
            const inventoryResult = await conn.query(inventoryQuery, [period]);
            const inventoryData = this.convertBigIntToNumber(inventoryResult);
            conn.end();
            
            // Then get supplier details from suppliers_db
            const suppliersQuery = `
                SELECT 
                    id as supplier_id,
                    name as supplier_name,
                    category,
                    is_active,
                    contact_person,
                    phone,
                    email
                FROM suppliers
                WHERE is_active = 1
            `;
            
            const suppliersResult = await suppliersConn.query(suppliersQuery);
            const suppliersData = this.convertBigIntToNumber(suppliersResult);
            
            // Combine the data
            const combinedData = suppliersData.map(supplier => {
                const inventoryInfo = inventoryData.find(inv => inv.supplier_id === supplier.supplier_id) || {
                    total_received: 0,
                    transaction_count: 0,
                    avg_delivery_value: 0,
                    last_delivery_date: null
                };
                
                return {
                    ...supplier,
                    total_stock_received: inventoryInfo.total_received,
                    transaction_count: inventoryInfo.transaction_count,
                    avg_delivery_value: inventoryInfo.avg_delivery_value,
                    last_delivery_date: inventoryInfo.last_delivery_date
                };
            });
            
            // Sort by total stock received and limit results
            return combinedData
                .sort((a, b) => b.total_stock_received - a.total_stock_received)
                .slice(0, 10);
                
        } catch (error) {
            console.warn('Supplier performance query failed, returning empty array:', error.message);
            return [];
        }
    }

    /**
     * Get inventory value data
     */
    async getInventoryValueData(conn) {
        const query = `
            SELECT 
                COALESCE(SUM(device_inventory * device_price), 0) as total_inventory_value,
                COALESCE(SUM(device_inventory), 0) as total_units_in_stock,
                COALESCE(AVG(device_inventory * device_price), 0) as avg_inventory_value
            FROM specs_db
            WHERE device_inventory > 0
        `;
        const result = await conn.query(query);
        const data = this.convertBigIntToNumber(result[0]);
        
        // Round down financial values for display
        if (data.avg_inventory_value) {
            data.avg_inventory_value = Math.floor(data.avg_inventory_value);
        }
        
        return data;
    }

    /**
     * Get category performance data
     */
    async getCategoryPerformanceData(conn, period) {
        const query = `
            SELECT 
                ps.device_maker as category,
                COUNT(DISTINCT ps.product_id) as product_count,
                COALESCE(SUM(ABS(il.quantity_changed)), 0) as total_sold,
                COALESCE(SUM(ps.device_price * ABS(il.quantity_changed)), 0) as revenue,
                COALESCE(AVG(ps.device_price), 0) as avg_price
            FROM specs_db ps
            LEFT JOIN inventory_log il ON ps.product_id = il.product_id 
                AND il.transaction_type = 'outgoing'
                AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY ps.device_maker
            ORDER BY revenue DESC
            LIMIT 10
        `;
        const result = await conn.query(query, [period]);
        return this.convertBigIntToNumber(result);
    }

    /**
     * Get profitability analysis
     */
    async getProfitabilityData(conn, period) {
        const query = `
            SELECT 
                COALESCE(SUM(ps.device_price * ABS(il.quantity_changed)), 0) as total_revenue,
                COALESCE(COUNT(DISTINCT il.product_id), 0) as products_sold,
                COALESCE(AVG(ps.device_price), 0) as avg_selling_price
            FROM inventory_log il
            JOIN specs_db ps ON il.product_id = ps.product_id
            WHERE il.transaction_type = 'outgoing' 
            AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        const result = await conn.query(query, [period]);
        const data = this.convertBigIntToNumber(result[0]);
        
        // Calculate estimated profit margin (assuming 30% cost)
        const estimatedCost = data.total_revenue * 0.7;
        const profit = data.total_revenue - estimatedCost;
        const profit_margin = data.total_revenue > 0 ? (profit / data.total_revenue) * 100 : 0;
        
        return {
            ...data,
            estimated_profit: profit,
            profit_margin
        };
    }

    /**
     * Get stock turnover analysis
     */
    async getStockTurnoverData(conn, period) {
        const query = `
            SELECT 
                ps.product_id,
                ps.device_name,
                ps.device_maker,
                ps.device_inventory,
                COALESCE(SUM(ABS(il.quantity_changed)), 0) as total_sold,
                CASE 
                    WHEN ps.device_inventory > 0 AND SUM(ABS(il.quantity_changed)) > 0 
                    THEN SUM(ABS(il.quantity_changed)) / ps.device_inventory 
                    ELSE 0 
                END as turnover_ratio
            FROM specs_db ps
            LEFT JOIN inventory_log il ON ps.product_id = il.product_id 
                AND il.transaction_type = 'outgoing'
                AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY ps.product_id, ps.device_name, ps.device_maker, ps.device_inventory
            HAVING total_sold > 0 OR ps.device_inventory > 0
            ORDER BY turnover_ratio DESC
        `;
        const result = await conn.query(query, [period]);
        const data = this.convertBigIntToNumber(result);
        
        const avgTurnover = data.length > 0 ? 
            data.reduce((sum, item) => sum + item.turnover_ratio, 0) / data.length : 0;
        
        return {
            products: data,
            average_turnover: avgTurnover
        };
    }

    /**
     * Get market trends analysis
     */
    async getMarketTrendsData(conn, period) {
        const query = `
            SELECT 
                ps.device_maker as brand,
                COUNT(DISTINCT ps.product_id) as product_count,
                COALESCE(SUM(ps.device_inventory), 0) as total_inventory,
                COALESCE(SUM(ps.device_inventory * ps.device_price), 0) as inventory_value,
                COALESCE(AVG(ps.device_price), 0) as avg_price,
                COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE 0 END), 0) as units_sold,
                COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ps.device_price * ABS(il.quantity_changed) ELSE 0 END), 0) as revenue
            FROM specs_db ps
            LEFT JOIN inventory_log il ON ps.product_id = il.product_id 
                AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY ps.device_maker
            HAVING product_count > 0
            ORDER BY revenue DESC, units_sold DESC
        `;
        const result = await conn.query(query, [period]);
        return this.convertBigIntToNumber(result);
    }

    /**
     * Get seasonal analysis data
     */
    async getSeasonalAnalysisData(conn) {
        const query = `
            SELECT 
                MONTH(il.transaction_date) as month_num,
                MONTHNAME(il.transaction_date) as month_name,
                YEAR(il.transaction_date) as year_num,
                COUNT(*) as transaction_count,
                SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE 0 END) as units_sold,
                SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ps.device_price * ABS(il.quantity_changed) ELSE 0 END) as revenue
            FROM inventory_log il
            JOIN specs_db ps ON il.product_id = ps.product_id
            WHERE il.transaction_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY YEAR(il.transaction_date), MONTH(il.transaction_date)
            ORDER BY year_num DESC, month_num DESC
        `;
        const result = await conn.query(query);
        return this.convertBigIntToNumber(result);
    }

    /**
     * Get product lifecycle analysis
     */
    async getProductLifecycleData(conn, period) {
        const query = `
            SELECT 
                ps.product_id,
                ps.device_name,
                ps.device_maker,
                ps.device_price,
                ps.device_inventory,
                lifecycle_data.days_since_first_sale,
                lifecycle_data.total_sold,
                lifecycle_data.sales_velocity,
                lifecycle_data.lifecycle_stage
            FROM specs_db ps
            LEFT JOIN (
                SELECT 
                    il.product_id,
                    DATEDIFF(NOW(), MIN(il.transaction_date)) as days_since_first_sale,
                    SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE 0 END) as total_sold,
                    SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE 0 END) / 
                        GREATEST(DATEDIFF(NOW(), MIN(il.transaction_date)), 1) as sales_velocity,
                    CASE 
                        WHEN DATEDIFF(NOW(), MIN(il.transaction_date)) <= 30 THEN 'Introduction'
                        WHEN DATEDIFF(NOW(), MAX(il.transaction_date)) <= 7 AND 
                             SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE 0 END) > 10 THEN 'Growth'
                        WHEN DATEDIFF(NOW(), MAX(il.transaction_date)) <= 30 THEN 'Maturity'
                        ELSE 'Decline'
                    END as lifecycle_stage
                FROM inventory_log il
                WHERE il.transaction_type = 'outgoing'
                GROUP BY il.product_id
            ) lifecycle_data ON ps.product_id = lifecycle_data.product_id
            ORDER BY lifecycle_data.sales_velocity DESC
        `;
        const result = await conn.query(query);
        return this.convertBigIntToNumber(result);
    }

    /**
     * Get advanced inventory metrics
     */
    async getAdvancedInventoryMetrics(conn, period) {
        const query = `
            SELECT 
                COUNT(*) as total_products,
                SUM(CASE WHEN device_inventory = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
                SUM(CASE WHEN device_inventory > 0 AND device_inventory <= 5 THEN 1 ELSE 0 END) as low_stock_count,
                SUM(CASE WHEN device_inventory > 50 THEN 1 ELSE 0 END) as overstock_count,
                AVG(device_inventory) as avg_inventory_level,
                SUM(device_inventory * device_price) as total_inventory_value,
                AVG(device_price) as avg_product_price,
                AVG(device_inventory * device_price) as avg_inventory_value,
                MAX(device_price) as highest_price,
                MIN(device_price) as lowest_price,
                STDDEV(device_price) as price_standard_deviation
            FROM specs_db
            WHERE device_inventory > 0
        `;
        const result = await conn.query(query);
        const data = this.convertBigIntToNumber(result[0]);
        
        // Round down average financial values for display
        if (data.avg_product_price) {
            data.avg_product_price = Math.floor(data.avg_product_price);
        }
        if (data.avg_inventory_value) {
            data.avg_inventory_value = Math.floor(data.avg_inventory_value);
        }
        
        return data;
    }

    /**
     * Get real-time performance indicators
     */
    async getRealTimePerformanceData(conn) {
        const todayQuery = `
            SELECT 
                COUNT(CASE WHEN il.transaction_type = 'outgoing' THEN 1 END) as today_sales_count,
                COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE 0 END), 0) as today_units_sold,
                COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ps.device_price * ABS(il.quantity_changed) ELSE 0 END), 0) as today_revenue,
                COUNT(CASE WHEN il.transaction_type = 'incoming' THEN 1 END) as today_receiving_count,
                COALESCE(SUM(CASE WHEN il.transaction_type = 'incoming' THEN il.quantity_changed ELSE 0 END), 0) as today_units_received
            FROM inventory_log il
            JOIN specs_db ps ON il.product_id = ps.product_id
            WHERE DATE(il.transaction_date) = CURDATE()
        `;
        
        const weeklyQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE 0 END), 0) as week_units_sold,
                COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ps.device_price * ABS(il.quantity_changed) ELSE 0 END), 0) as week_revenue
            FROM inventory_log il
            JOIN specs_db ps ON il.product_id = ps.product_id
            WHERE il.transaction_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `;

        const [todayResult, weeklyResult] = await Promise.all([
            conn.query(todayQuery),
            conn.query(weeklyQuery)
        ]);

        return {
            today: this.convertBigIntToNumber(todayResult[0]),
            week: this.convertBigIntToNumber(weeklyResult[0])
        };
    }

    /**
     * Format sales trend data for tables (not charts)
     */
    formatSalesTrendData(salesTrendRaw) {
        if (!salesTrendRaw || !Array.isArray(salesTrendRaw) || salesTrendRaw.length === 0) {
            return {
                labels: [],
                revenue: [],
                units: []
            };
        }

        return {
            labels: salesTrendRaw.map(item => {
                try {
                    // Since we're now using DATE_FORMAT, sale_date should be a string
                    if (!item.sale_date) {
                        console.warn('Missing sale_date in item:', item);
                        return 'Unknown Date';
                    }
                    
                    // Handle string dates (YYYY-MM-DD format from DATE_FORMAT)
                    if (typeof item.sale_date === 'string') {
                        const date = new Date(item.sale_date + 'T00:00:00Z');
                        if (isNaN(date.getTime())) {
                            console.warn('Invalid date string:', item.sale_date);
                            return 'Invalid Date';
                        }
                        return date.toLocaleDateString('en-US', { 
                            year: 'numeric',
                            month: 'short', 
                            day: 'numeric',
                            timeZone: 'UTC'
                        });
                    }
                    
                    // Handle Date objects (fallback)
                    if (item.sale_date instanceof Date) {
                        return item.sale_date.toLocaleDateString('en-US', { 
                            year: 'numeric',
                            month: 'short', 
                            day: 'numeric'
                        });
                    }
                    
                    // Handle unexpected formats
                    console.warn('Unexpected date format:', typeof item.sale_date, item.sale_date);
                    return 'Invalid Date';
                    
                } catch (error) {
                    console.error('Date formatting error:', error, 'for item:', item);
                    return 'Invalid Date';
                }
            }),
            revenue: salesTrendRaw.map(item => {
                const revenue = parseFloat(item.daily_revenue || 0);
                return isNaN(revenue) ? 0 : revenue;
            }),
            units: salesTrendRaw.map(item => {
                const units = parseInt(item.daily_units || 0);
                return isNaN(units) ? 0 : units;
            })
        };
    }

    /**
     * Get real-time analytics data (today's performance)
     */
    async getRealTimeData() {
        const conn = await this.pool.getConnection();
        
        try {
            // Get today's sales
            const todayQuery = `
                SELECT 
                    COALESCE(SUM(ABS(quantity_changed)), 0) as today_units,
                    COALESCE(SUM(ps.device_price * ABS(il.quantity_changed)), 0) as today_revenue
                FROM inventory_log il
                JOIN specs_db ps ON il.product_id = ps.product_id
                WHERE il.transaction_type = 'outgoing' 
                AND DATE(il.transaction_date) = CURDATE()
            `;
            const todayResult = await conn.query(todayQuery);
            const todayStats = this.convertBigIntToNumber(todayResult[0]);
            
            // Get hourly sales for today
            const hourlyQuery = `
                SELECT 
                    HOUR(il.transaction_date) as hour,
                    COALESCE(SUM(ABS(quantity_changed)), 0) as units_sold
                FROM inventory_log il
                WHERE il.transaction_type = 'outgoing' 
                AND DATE(il.transaction_date) = CURDATE()
                GROUP BY HOUR(il.transaction_date)
                ORDER BY hour
            `;
            const hourlyResult = await conn.query(hourlyQuery);
            const hourlySales = this.convertBigIntToNumber(hourlyResult);
            
            return {
                today: todayStats,
                hourly: hourlySales
            };
            
        } finally {
            conn.end();
        }
    }

    /**
     * Generate analytics insights and recommendations
     */
    generateInsights(analyticsData) {
        const insights = [];
        
        // Revenue insights
        if (parseFloat(analyticsData.growthRate) > 10) {
            insights.push({
                type: 'success',
                title: 'Strong Growth',
                message: `Revenue increased by ${analyticsData.growthRate}% compared to the previous period.`
            });
        } else if (parseFloat(analyticsData.growthRate) < -10) {
            insights.push({
                type: 'warning',
                title: 'Revenue Decline',
                message: `Revenue decreased by ${Math.abs(analyticsData.growthRate)}% compared to the previous period. Consider reviewing pricing or marketing strategies.`
            });
        }

        // Low stock insights
        if (analyticsData.lowStockCount > 0) {
            insights.push({
                type: 'warning',
                title: 'Low Stock Alert',
                message: `${analyticsData.lowStockCount} products are running low on stock. Consider restocking soon.`
            });
        }

        // Best performers insights
        if (analyticsData.topSellingProducts.length > 0) {
            const topProduct = analyticsData.topSellingProducts[0];
            if (topProduct.total_sold > 0) {
                insights.push({
                    type: 'info',
                    title: 'Top Performer',
                    message: `${topProduct.device_maker} ${topProduct.device_name} is your best-selling product with ${topProduct.total_sold} units sold.`
                });
            }
        }

        return insights;
    }

    /**
     * Get analytics data for export
     */
    async getExportData(period) {
        const analyticsData = await this.getAnalyticsData(period);
        
        return {
            period: period,
            generated_at: new Date().toISOString(),
            summary: {
                total_revenue: analyticsData.totalRevenue,
                total_units_sold: analyticsData.totalUnitsSold,
                total_products: analyticsData.totalProducts,
                growth_rate: analyticsData.growthRate,
                profit_margin: analyticsData.profitMargin
            },
            top_products: analyticsData.topSellingProducts,
            low_stock_alerts: analyticsData.lowStockProducts,
            recent_transactions: analyticsData.recentTransactions,
            sales_trend: analyticsData.salesTrendData,
            category_performance: analyticsData.categoryPerformance
        };
    }

    /**
     * Convert analytics data to CSV format
     */
    async convertToCSV(data) {
        const csv = [];
        
        // Summary section
        csv.push('SUMMARY');
        csv.push('Metric,Value');
        csv.push(`Total Revenue,$${data.summary.total_revenue}`);
        csv.push(`Total Units Sold,${data.summary.total_units_sold}`);
        csv.push(`Total Products,${data.summary.total_products}`);
        csv.push(`Growth Rate,${data.summary.growth_rate}%`);
        csv.push(`Profit Margin,${data.summary.profit_margin}%`);
        csv.push('');
        
        // Top products section
        csv.push('TOP SELLING PRODUCTS');
        csv.push('Maker,Model,Units Sold,Revenue,Current Stock');
        data.top_products.forEach(product => {
            csv.push(`${product.device_maker},${product.device_name},${product.total_sold},$${product.revenue},${product.device_inventory}`);
        });
        csv.push('');
        
        // Low stock alerts section
        csv.push('LOW STOCK ALERTS');
        csv.push('Maker,Model,Current Stock,Price');
        data.low_stock_alerts.forEach(product => {
            csv.push(`${product.device_maker},${product.device_name},${product.device_inventory},$${product.device_price}`);
        });
        
        return csv.join('\n');
    }

    /**
     * Get detailed analytics for a specific product
     */
    async getProductAnalytics(productId, period) {
        const conn = await this.pool.getConnection();
        
        try {
            // Product details and sales history
            const productQuery = `
                SELECT ps.*, 
                    COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE 0 END), 0) as total_sold,
                    COALESCE(SUM(CASE WHEN il.transaction_type = 'incoming' THEN il.quantity_changed ELSE 0 END), 0) as total_received,
                    COALESCE(SUM(ps.device_price * ABS(il.quantity_changed)), 0) as total_revenue
                FROM specs_db ps
                LEFT JOIN inventory_log il ON ps.product_id = il.product_id 
                    AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                WHERE ps.product_id = ?
                GROUP BY ps.product_id
            `;
            
            const productResult = await conn.query(productQuery, [period, productId]);
            const product = this.convertBigIntToNumber(productResult[0]);
            
            if (!product) {
                return null;
            }
            
            return product;
            
        } finally {
            conn.end();
        }
    }
}

module.exports = AnalyticsService;