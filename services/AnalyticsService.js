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
            // Get all analytics data in parallel for better performance
            const [
                revenueData,
                unitsSoldData,
                productsData,
                lowStockData,
                salesTrendData,
                topProductsData,
                inventoryStatusData,
                bestDayData,
                previousPeriodData,
                recentTransactionsData,
                supplierPerformanceData,
                inventoryValueData,
                categoryPerformanceData,
                profitabilityData,
                stockTurnoverData,
                marketTrendsData,
                seasonalAnalysisData,
                productLifecycleData,
                advancedInventoryMetrics,
                realTimePerformanceData,
                productSpecAnalytics,
                technologyTrendsData,
                inventoryEfficiencyData,
                pricingAnalyticsData,
                transactionPatternsData
            ] = await Promise.all([
                this.getRevenueData(conn, period),
                this.getUnitsSoldData(conn, period),
                this.getProductsData(conn),
                this.getLowStockData(conn),
                this.getSalesTrendData(conn, period),
                this.getTopProductsData(conn, period),
                this.getInventoryStatusData(conn),
                this.getBestSellingDayData(conn, period),
                this.getPreviousPeriodData(conn, period),
                this.getRecentTransactionsData(conn),
                this.getSupplierPerformanceData(suppliersConn, period),
                this.getInventoryValueData(conn),
                this.getCategoryPerformanceData(conn, period),
                this.getProfitabilityData(conn, period),
                this.getStockTurnoverData(conn, period),
                this.getMarketTrendsData(conn, period),
                this.getSeasonalAnalysisData(conn),
                this.getProductLifecycleData(conn, period),
                this.getAdvancedInventoryMetrics(conn, period),
                this.getRealTimePerformanceData(conn),
                this.getProductSpecAnalytics(conn),
                this.getTechnologyTrendsData(conn),
                this.getInventoryEfficiencyData(conn, period),
                this.getPricingAnalyticsData(conn, period),
                this.getTransactionPatternsData(conn, period)
            ]);

            const totalRevenue = revenueData.total_revenue || 0;
            const totalUnitsSold = unitsSoldData.units_sold || 0;
            const previousRevenue = previousPeriodData.previous_revenue || 0;
            const previousUnitsSold = previousPeriodData.previous_units || 0;

            // Calculate derived metrics
            const averageOrderValue = totalUnitsSold > 0 ? totalRevenue / totalUnitsSold : 0;
            const previousAverageOrderValue = previousUnitsSold > 0 ? previousRevenue / previousUnitsSold : 0;
            const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
            const inventoryTurnover = stockTurnoverData.average_turnover || 0;
            const profitMargin = profitabilityData.profit_margin || 0;

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
                
                // Chart data
                salesTrendData: this.formatSalesTrendData(salesTrendData),
                productPerformanceData: this.formatProductPerformanceData(topProductsData),
                inventoryStatusData: this.formatInventoryStatusData(inventoryStatusData),
                categoryPerformanceData: this.formatCategoryPerformanceData(categoryPerformanceData),
                
                // Product data
                topSellingProducts: topProductsData,
                topPerformingProducts: topProductsData, // Alias for compatibility
                brandPerformance: marketTrendsData, // Use market trends data for brand performance
                
                // Calculated metrics
                averageOrderValue: parseFloat(averageOrderValue).toFixed(2),
                previousAverageOrderValue: parseFloat(previousAverageOrderValue).toFixed(2),
                averageSaleValue: parseFloat(averageOrderValue).toFixed(2), // Alias for compatibility
                bestSellingDay: bestDayData.length > 0 ? bestDayData[0].day_name : 'N/A',
                growthRate: parseFloat(growthRate).toFixed(2),
                inventoryTurnover: parseFloat(inventoryTurnover).toFixed(2),
                profitMargin: parseFloat(profitMargin).toFixed(2),
                
                // Additional data
                recentTransactions: recentTransactionsData,
                supplierPerformance: supplierPerformanceData,
                inventoryValue: inventoryValueData,
                categoryPerformance: categoryPerformanceData,
                profitabilityAnalysis: profitabilityData,
                stockTurnoverAnalysis: stockTurnoverData,
                
                // New comprehensive analytics
                marketTrends: marketTrendsData,
                seasonalAnalysis: seasonalAnalysisData,
                productLifecycle: productLifecycleData,
                advancedInventoryMetrics: advancedInventoryMetrics,
                realTimePerformance: realTimePerformanceData,
                productSpecAnalytics: productSpecAnalytics,
                technologyTrends: technologyTrendsData,
                inventoryEfficiency: inventoryEfficiencyData,
                pricingAnalytics: pricingAnalyticsData,
                transactionPatterns: transactionPatternsData,
                
                // Additional chart data
                marketTrendsChartData: this.formatMarketTrendsData(marketTrendsData),
                seasonalChartData: this.formatSeasonalData(seasonalAnalysisData),
                lifecycleChartData: this.formatLifecycleData(productLifecycleData),
                technologyTrendsChartData: this.formatTechnologyTrendsData(technologyTrendsData),
                pricingAnalyticsChartData: this.formatPricingAnalyticsData(pricingAnalyticsData),
                transactionPatternsChartData: this.formatTransactionPatternsData(transactionPatternsData),
                
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
            SELECT COALESCE(SUM(ps.sm_price * ABS(il.quantity_changed)), 0) as total_revenue
            FROM inventory_log il
            JOIN phone_specs ps ON il.phone_id = ps.id
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
        const query = `SELECT COUNT(*) as total FROM phone_specs`;
        const result = await conn.query(query);
        return this.convertBigIntToNumber(result[0]);
    }

    /**
     * Get low stock products (stock <= threshold)
     */
    async getLowStockData(conn) {
        const query = `
            SELECT id, sm_name, sm_maker, sm_inventory, sm_price 
            FROM phone_specs 
            WHERE sm_inventory <= ? 
            ORDER BY sm_inventory ASC
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
                DATE(il.transaction_date) as sale_date,
                COALESCE(SUM(ps.sm_price * ABS(il.quantity_changed)), 0) as daily_revenue,
                COALESCE(SUM(ABS(il.quantity_changed)), 0) as daily_units
            FROM inventory_log il
            JOIN phone_specs ps ON il.phone_id = ps.id
            WHERE il.transaction_type = 'outgoing' 
            AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(il.transaction_date)
            ORDER BY sale_date ASC
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
                ps.id, ps.sm_name, ps.sm_maker, ps.sm_price, ps.sm_inventory,
                COALESCE(SUM(ABS(il.quantity_changed)), 0) as total_sold,
                COALESCE(SUM(ps.sm_price * ABS(il.quantity_changed)), 0) as revenue
            FROM phone_specs ps
            LEFT JOIN inventory_log il ON ps.id = il.phone_id AND il.transaction_type = 'outgoing'
            AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY ps.id, ps.sm_name, ps.sm_maker, ps.sm_price, ps.sm_inventory
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
                SUM(CASE WHEN sm_inventory > 5 THEN 1 ELSE 0 END) as in_stock,
                SUM(CASE WHEN sm_inventory > 0 AND sm_inventory <= 5 THEN 1 ELSE 0 END) as low_stock,
                SUM(CASE WHEN sm_inventory = 0 THEN 1 ELSE 0 END) as out_of_stock
            FROM phone_specs
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
                COALESCE(SUM(ps.sm_price * ABS(il.quantity_changed)), 0) as previous_revenue,
                COALESCE(SUM(ABS(il.quantity_changed)), 0) as previous_units
            FROM inventory_log il
            JOIN phone_specs ps ON il.phone_id = ps.id
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
                il.transaction_type, il.quantity_changed, il.notes,
                DATE_FORMAT(il.transaction_date, '%M %d, %Y at %h:%i %p') as formatted_date,
                ps.sm_name, ps.sm_maker, ps.sm_price
            FROM inventory_log il
            JOIN phone_specs ps ON il.phone_id = ps.id
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
                    AVG(ps.sm_price * il.quantity_changed) as avg_delivery_value,
                    MAX(il.transaction_date) as last_delivery_date
                FROM inventory_log il
                JOIN phone_specs ps ON il.phone_id = ps.id
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
                    supplier_id,
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
                COALESCE(SUM(sm_inventory * sm_price), 0) as total_inventory_value,
                COALESCE(SUM(sm_inventory), 0) as total_units_in_stock
            FROM phone_specs
        `;
        const result = await conn.query(query);
        return this.convertBigIntToNumber(result[0]);
    }

    /**
     * Get category performance data
     */
    async getCategoryPerformanceData(conn, period) {
        const query = `
            SELECT 
                ps.sm_maker as category,
                COUNT(DISTINCT ps.id) as product_count,
                COALESCE(SUM(ABS(il.quantity_changed)), 0) as total_sold,
                COALESCE(SUM(ps.sm_price * ABS(il.quantity_changed)), 0) as revenue,
                COALESCE(AVG(ps.sm_price), 0) as avg_price
            FROM phone_specs ps
            LEFT JOIN inventory_log il ON ps.id = il.phone_id 
                AND il.transaction_type = 'outgoing'
                AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY ps.sm_maker
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
                COALESCE(SUM(ps.sm_price * ABS(il.quantity_changed)), 0) as total_revenue,
                COALESCE(COUNT(DISTINCT il.phone_id), 0) as products_sold,
                COALESCE(AVG(ps.sm_price), 0) as avg_selling_price
            FROM inventory_log il
            JOIN phone_specs ps ON il.phone_id = ps.id
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
                ps.id,
                ps.sm_name,
                ps.sm_maker,
                ps.sm_inventory,
                COALESCE(SUM(ABS(il.quantity_changed)), 0) as total_sold,
                CASE 
                    WHEN ps.sm_inventory > 0 AND SUM(ABS(il.quantity_changed)) > 0 
                    THEN SUM(ABS(il.quantity_changed)) / ps.sm_inventory 
                    ELSE 0 
                END as turnover_ratio
            FROM phone_specs ps
            LEFT JOIN inventory_log il ON ps.id = il.phone_id 
                AND il.transaction_type = 'outgoing'
                AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY ps.id, ps.sm_name, ps.sm_maker, ps.sm_inventory
            HAVING total_sold > 0 OR ps.sm_inventory > 0
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
                ps.sm_maker as brand,
                COUNT(DISTINCT ps.id) as product_count,
                COALESCE(SUM(ps.sm_inventory), 0) as total_inventory,
                COALESCE(SUM(ps.sm_inventory * ps.sm_price), 0) as inventory_value,
                COALESCE(AVG(ps.sm_price), 0) as avg_price,
                COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE 0 END), 0) as units_sold,
                COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ps.sm_price * ABS(il.quantity_changed) ELSE 0 END), 0) as revenue
            FROM phone_specs ps
            LEFT JOIN inventory_log il ON ps.id = il.phone_id 
                AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY ps.sm_maker
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
                SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ps.sm_price * ABS(il.quantity_changed) ELSE 0 END) as revenue
            FROM inventory_log il
            JOIN phone_specs ps ON il.phone_id = ps.id
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
                ps.id,
                ps.sm_name,
                ps.sm_maker,
                ps.sm_price,
                ps.sm_inventory,
                lifecycle_data.days_since_first_sale,
                lifecycle_data.total_sold,
                lifecycle_data.sales_velocity,
                lifecycle_data.lifecycle_stage
            FROM phone_specs ps
            LEFT JOIN (
                SELECT 
                    il.phone_id,
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
                GROUP BY il.phone_id
            ) lifecycle_data ON ps.id = lifecycle_data.phone_id
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
                SUM(CASE WHEN sm_inventory = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
                SUM(CASE WHEN sm_inventory > 0 AND sm_inventory <= 5 THEN 1 ELSE 0 END) as low_stock_count,
                SUM(CASE WHEN sm_inventory > 50 THEN 1 ELSE 0 END) as overstock_count,
                AVG(sm_inventory) as avg_inventory_level,
                SUM(sm_inventory * sm_price) as total_inventory_value,
                AVG(sm_price) as avg_product_price,
                MAX(sm_price) as highest_price,
                MIN(sm_price) as lowest_price,
                STDDEV(sm_price) as price_standard_deviation
            FROM phone_specs
        `;
        const result = await conn.query(query);
        return this.convertBigIntToNumber(result[0]);
    }

    /**
     * Get real-time performance indicators
     */
    async getRealTimePerformanceData(conn) {
        const todayQuery = `
            SELECT 
                COUNT(CASE WHEN il.transaction_type = 'outgoing' THEN 1 END) as today_sales_count,
                COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE 0 END), 0) as today_units_sold,
                COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ps.sm_price * ABS(il.quantity_changed) ELSE 0 END), 0) as today_revenue,
                COUNT(CASE WHEN il.transaction_type = 'incoming' THEN 1 END) as today_receiving_count,
                COALESCE(SUM(CASE WHEN il.transaction_type = 'incoming' THEN il.quantity_changed ELSE 0 END), 0) as today_units_received
            FROM inventory_log il
            JOIN phone_specs ps ON il.phone_id = ps.id
            WHERE DATE(il.transaction_date) = CURDATE()
        `;
        
        const weeklyQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE 0 END), 0) as week_units_sold,
                COALESCE(SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ps.sm_price * ABS(il.quantity_changed) ELSE 0 END), 0) as week_revenue
            FROM inventory_log il
            JOIN phone_specs ps ON il.phone_id = ps.id
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
                    // Handle both string and Date objects, with better error handling
                    let date;
                    
                    if (!item.sale_date) {
                        console.warn('Missing sale_date in item:', item);
                        return 'Unknown Date';
                    }
                    
                    if (typeof item.sale_date === 'string') {
                        // Try to parse the string date
                        date = new Date(item.sale_date);
                    } else if (item.sale_date instanceof Date) {
                        date = item.sale_date;
                    } else if (typeof item.sale_date === 'object' && item.sale_date !== null) {
                        // Handle case where item.sale_date might be an empty object {}
                        console.warn('Invalid date object format:', item.sale_date);
                        return 'Invalid Date';
                    } else {
                        console.warn('Invalid date format:', typeof item.sale_date, item.sale_date);
                        return 'Unknown Date';
                    }
                    
                    // Check if the date is valid
                    if (!date || isNaN(date.getTime())) {
                        console.warn('Invalid date value after parsing:', item.sale_date, '-> parsed as:', date);
                        return 'Invalid Date';
                    }
                    
                    return date.toLocaleDateString('en-US', { 
                        year: 'numeric',
                        month: 'short', 
                        day: 'numeric' 
                    });
                } catch (error) {
                    console.error('Date formatting error:', error, 'for item:', item);
                    return 'Invalid Date';
                }
            }),
            revenue: salesTrendRaw.map(item => {
                const revenue = parseFloat(item.daily_revenue);
                return isNaN(revenue) ? 0 : revenue;
            }),
            units: salesTrendRaw.map(item => {
                const units = parseInt(item.daily_units);
                return isNaN(units) ? 0 : units;
            })
        };
    }

    /**
     * Format product performance data for Chart.js
     */
    formatProductPerformanceData(topProducts) {
        return {
            labels: topProducts.slice(0, 5).map(p => `${p.sm_maker} ${p.sm_name}`),
            values: topProducts.slice(0, 5).map(p => p.total_sold)
        };
    }

    /**
     * Format inventory status data for Chart.js
     */
    formatInventoryStatusData(inventoryStatus) {
        if (!inventoryStatus) {
            return {
                labels: ['In Stock', 'Low Stock', 'Out of Stock'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            };
        }

        return {
            labels: ['In Stock', 'Low Stock', 'Out of Stock'],
            datasets: [{
                data: [
                    parseInt(inventoryStatus.in_stock) || 0,
                    parseInt(inventoryStatus.low_stock) || 0,
                    parseInt(inventoryStatus.out_of_stock) || 0
                ],
                backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };
    }

    /**
     * Format category performance data for charts
     */
    formatCategoryPerformanceData(categoryData) {
        if (!categoryData || categoryData.length === 0) {
            return { labels: [], values: [], colors: [] };
        }

        const colors = [
            '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
            '#858796', '#5a5c69', '#6f42c1', '#e83e8c', '#fd7e14'
        ];

        return {
            labels: categoryData.map(item => item.category),
            values: categoryData.map(item => parseFloat(item.revenue)),
            colors: categoryData.map((_, index) => colors[index % colors.length])
        };
    }

    /**
     * Format market trends data for Chart.js
     */
    formatMarketTrendsData(marketData) {
        const labels = marketData.map(item => item.brand);
        const revenueData = marketData.map(item => parseFloat(item.revenue));
        const unitsData = marketData.map(item => parseInt(item.units_sold));
        const inventoryData = marketData.map(item => parseInt(item.total_inventory));

        return {
            labels,
            datasets: [
                {
                    label: 'Revenue ($)',
                    data: revenueData,
                    backgroundColor: 'rgba(78, 115, 223, 0.8)',
                    borderColor: 'rgba(78, 115, 223, 1)',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Units Sold',
                    data: unitsData,
                    backgroundColor: 'rgba(28, 200, 138, 0.8)',
                    borderColor: 'rgba(28, 200, 138, 1)',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        };
    }

    /**
     * Format seasonal data for Chart.js
     */
    formatSeasonalData(seasonalData) {
        const labels = seasonalData.map(item => `${item.month_name} ${item.year_num}`);
        const revenueData = seasonalData.map(item => parseFloat(item.revenue));
        const unitsData = seasonalData.map(item => parseInt(item.units_sold));

        return {
            labels: labels.slice(-12), // Last 12 months
            datasets: [
                {
                    label: 'Monthly Revenue ($)',
                    data: revenueData.slice(-12),
                    backgroundColor: 'rgba(246, 194, 62, 0.2)',
                    borderColor: 'rgba(246, 194, 62, 1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Monthly Units Sold',
                    data: unitsData.slice(-12),
                    backgroundColor: 'rgba(231, 74, 59, 0.2)',
                    borderColor: 'rgba(231, 74, 59, 1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }
            ]
        };
    }

    /**
     * Format product lifecycle data for Chart.js
     */
    formatLifecycleData(lifecycleData) {
        const stages = ['Introduction', 'Growth', 'Maturity', 'Decline'];
        const stageCounts = stages.map(stage => 
            lifecycleData.filter(item => item.lifecycle_stage === stage).length
        );

        return {
            labels: stages,
            datasets: [{
                label: 'Products by Lifecycle Stage',
                data: stageCounts,
                backgroundColor: [
                    'rgba(54, 185, 204, 0.8)',  // Introduction
                    'rgba(28, 200, 138, 0.8)',  // Growth  
                    'rgba(246, 194, 62, 0.8)',  // Maturity
                    'rgba(231, 74, 59, 0.8)'    // Decline
                ],
                borderColor: [
                    'rgba(54, 185, 204, 1)',
                    'rgba(28, 200, 138, 1)',
                    'rgba(246, 194, 62, 1)',
                    'rgba(231, 74, 59, 1)'
                ],
                borderWidth: 2
            }]
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
                    COALESCE(SUM(ps.sm_price * ABS(il.quantity_changed)), 0) as today_revenue
                FROM inventory_log il
                JOIN phone_specs ps ON il.phone_id = ps.id
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
                    message: `${topProduct.sm_maker} ${topProduct.sm_name} is your best-selling product with ${topProduct.total_sold} units sold.`
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
            csv.push(`${product.sm_maker},${product.sm_name},${product.total_sold},$${product.revenue},${product.sm_inventory}`);
        });
        csv.push('');
        
        // Low stock alerts section
        csv.push('LOW STOCK ALERTS');
        csv.push('Maker,Model,Current Stock,Price');
        data.low_stock_alerts.forEach(product => {
            csv.push(`${product.sm_maker},${product.sm_name},${product.sm_inventory},$${product.sm_price}`);
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
                    COALESCE(AVG(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE NULL END), 0) as avg_sale_quantity,
                    COUNT(CASE WHEN il.transaction_type = 'outgoing' THEN 1 END) as sale_transactions
                FROM phone_specs ps
                LEFT JOIN inventory_log il ON ps.id = il.phone_id
                    AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                WHERE ps.id = ?
                GROUP BY ps.id
            `;
            
            const salesTrendQuery = `
                SELECT 
                    DATE(il.transaction_date) as sale_date,
                    SUM(CASE WHEN il.transaction_type = 'outgoing' THEN ABS(il.quantity_changed) ELSE 0 END) as units_sold,
                    SUM(CASE WHEN il.transaction_type = 'incoming' THEN il.quantity_changed ELSE 0 END) as units_received
                FROM inventory_log il
                WHERE il.phone_id = ? 
                AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(il.transaction_date)
                ORDER BY sale_date ASC
            `;
            
            const [productResult, salesTrendResult] = await Promise.all([
                conn.query(productQuery, [period, productId]),
                conn.query(salesTrendQuery, [productId, period])
            ]);
            
            const product = this.convertBigIntToNumber(productResult[0]);
            const salesTrend = this.convertBigIntToNumber(salesTrendResult);
            
            // Calculate metrics
            const revenue = product.total_sold * product.sm_price;
            const stockTurnover = product.sm_inventory > 0 ? product.total_sold / product.sm_inventory : 0;
            const salesVelocity = salesTrend.length > 0 ? product.total_sold / salesTrend.length : 0;
            
            return {
                product,
                sales_trend: salesTrend,
                metrics: {
                    revenue: revenue.toFixed(2),
                    stock_turnover: stockTurnover.toFixed(2),
                    sales_velocity: salesVelocity.toFixed(2),
                    days_of_stock: salesVelocity > 0 ? Math.floor(product.sm_inventory / salesVelocity) : null
                }
            };
            
        } finally {
            conn.end();
        }
    }

    /**
     * Generate sales forecast using simple linear regression
     */
    async generateForecast(days, productId = null) {
        const conn = await this.pool.getConnection();
        
        try {
            let query;
            let params;
            
            if (productId) {
                query = `
                    SELECT 
                        DATE(il.transaction_date) as sale_date,
                        SUM(ABS(il.quantity_changed)) as daily_units,
                        SUM(ps.sm_price * ABS(il.quantity_changed)) as daily_revenue
                    FROM inventory_log il
                    JOIN phone_specs ps ON il.phone_id = ps.id
                    WHERE il.transaction_type = 'outgoing' 
                    AND il.phone_id = ?
                    AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                    GROUP BY DATE(il.transaction_date)
                    ORDER BY sale_date ASC
                `;
                params = [productId];
            } else {
                query = `
                    SELECT 
                        DATE(il.transaction_date) as sale_date,
                        SUM(ABS(il.quantity_changed)) as daily_units,
                        SUM(ps.sm_price * ABS(il.quantity_changed)) as daily_revenue
                    FROM inventory_log il
                    JOIN phone_specs ps ON il.phone_id = ps.id
                    WHERE il.transaction_type = 'outgoing' 
                    AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                    GROUP BY DATE(il.transaction_date)
                    ORDER BY sale_date ASC
                `;
                params = [];
            }
            
            const result = await conn.query(query, params);
            const salesData = this.convertBigIntToNumber(result);
            
            // Simple linear regression for forecasting
            const forecast = this.calculateLinearForecast(salesData, days);
            
            return {
                historical_data: salesData,
                forecast: forecast,
                forecast_period: days,
                confidence: 'Medium', // Simple confidence indicator
                generated_at: new Date().toISOString()
            };
            
        } finally {
            conn.end();
        }
    }

    /**
     * Calculate linear forecast using least squares method
     */
    calculateLinearForecast(salesData, days) {
        if (salesData.length < 2) {
            return Array(days).fill(0).map((_, i) => ({
                date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                predicted_units: 0,
                predicted_revenue: 0
            }));
        }

        // Convert dates to numeric values for regression
        const dataPoints = salesData.map((item, index) => ({
            x: index,
            y_units: item.daily_units,
            y_revenue: item.daily_revenue
        }));

        // Calculate linear regression coefficients
        const n = dataPoints.length;
        const sumX = dataPoints.reduce((sum, point) => sum + point.x, 0);
        const sumYUnits = dataPoints.reduce((sum, point) => sum + point.y_units, 0);
        const sumYRevenue = dataPoints.reduce((sum, point) => sum + point.y_revenue, 0);
        const sumXY_units = dataPoints.reduce((sum, point) => sum + point.x * point.y_units, 0);
        const sumXY_revenue = dataPoints.reduce((sum, point) => sum + point.x * point.y_revenue, 0);
        const sumXX = dataPoints.reduce((sum, point) => sum + point.x * point.x, 0);

        // Units forecast coefficients
        const slopeUnits = (n * sumXY_units - sumX * sumYUnits) / (n * sumXX - sumX * sumX);
        const interceptUnits = (sumYUnits - slopeUnits * sumX) / n;

        // Revenue forecast coefficients
        const slopeRevenue = (n * sumXY_revenue - sumX * sumYRevenue) / (n * sumXX - sumX * sumX);
        const interceptRevenue = (sumYRevenue - slopeRevenue * sumX) / n;

        // Generate forecast
        const forecast = [];
        for (let i = 1; i <= days; i++) {
            const futureX = n + i - 1;
            const predictedUnits = Math.max(0, slopeUnits * futureX + interceptUnits);
            const predictedRevenue = Math.max(0, slopeRevenue * futureX + interceptRevenue);
            
            forecast.push({
                date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                predicted_units: Math.round(predictedUnits),
                predicted_revenue: parseFloat(predictedRevenue.toFixed(2))
            });
        }

        return forecast;
    }

    /**
     * Get comprehensive product specifications analytics
     */
    async getProductSpecAnalytics(conn) {
        const query = `
            SELECT 
                sm_maker as brand,
                COUNT(*) as total_products,
                AVG(sm_price) as avg_price,
                MIN(sm_price) as min_price,
                MAX(sm_price) as max_price,
                AVG(CAST(REPLACE(ram, 'GB', '') AS DECIMAL(5,2))) as avg_ram,
                AVG(CAST(REPLACE(REPLACE(rom, 'GB', ''), 'TB', '000') AS DECIMAL(6,2))) as avg_storage,
                AVG(display_size) as avg_display_size,
                AVG(CAST(REPLACE(battery_capacity, 'mAh', '') AS DECIMAL(6,0))) as avg_battery,
                COUNT(CASE WHEN nfc = 'Yes' THEN 1 END) as nfc_enabled_count,
                COUNT(CASE WHEN fast_charging IS NOT NULL AND fast_charging != '' THEN 1 END) as fast_charging_count
            FROM phone_specs 
            WHERE sm_maker IS NOT NULL
            GROUP BY sm_maker
            ORDER BY total_products DESC
        `;
        const result = await conn.query(query);
        return this.convertBigIntToNumber(result);
    }

    /**
     * Get technology trends analytics
     */
    async getTechnologyTrendsData(conn) {
        const processorQuery = `
            SELECT 
                processor,
                COUNT(*) as product_count,
                AVG(sm_price) as avg_price,
                SUM(sm_inventory) as total_inventory
            FROM phone_specs 
            WHERE processor IS NOT NULL AND processor != ''
            GROUP BY processor
            ORDER BY product_count DESC
            LIMIT 10
        `;

        const osQuery = `
            SELECT 
                operating_system,
                COUNT(*) as product_count,
                AVG(sm_price) as avg_price,
                SUM(sm_inventory) as total_inventory
            FROM phone_specs 
            WHERE operating_system IS NOT NULL AND operating_system != ''
            GROUP BY operating_system
            ORDER BY product_count DESC
        `;

        const ramQuery = `
            SELECT 
                ram,
                COUNT(*) as product_count,
                AVG(sm_price) as avg_price,
                SUM(sm_inventory) as total_inventory
            FROM phone_specs 
            WHERE ram IS NOT NULL AND ram != ''
            GROUP BY ram
            ORDER BY CAST(REPLACE(ram, 'GB', '') AS DECIMAL(5,2)) DESC
        `;

        const [processorResult, osResult, ramResult] = await Promise.all([
            conn.query(processorQuery),
            conn.query(osQuery),
            conn.query(ramQuery)
        ]);

        return {
            processors: this.convertBigIntToNumber(processorResult),
            operating_systems: this.convertBigIntToNumber(osResult),
            ram_distribution: this.convertBigIntToNumber(ramResult)
        };
    }

    /**
     * Get inventory efficiency metrics
     */
    async getInventoryEfficiencyData(conn, period) {
        const query = `
            SELECT 
                ps.sm_maker as brand,
                ps.sm_name as product_name,
                ps.sm_price,
                ps.sm_inventory as current_stock,
                COALESCE(sold_data.units_sold, 0) as units_sold,
                COALESCE(received_data.units_received, 0) as units_received,
                CASE 
                    WHEN ps.sm_inventory > 0 AND sold_data.units_sold > 0 
                    THEN ROUND(sold_data.units_sold / ps.sm_inventory, 2)
                    ELSE 0 
                END as turnover_ratio,
                CASE 
                    WHEN sold_data.units_sold > 0 
                    THEN ROUND(? / sold_data.units_sold, 1)
                    ELSE NULL 
                END as days_to_sell_current_stock,
                (ps.sm_inventory * ps.sm_price) as inventory_value
            FROM phone_specs ps
            LEFT JOIN (
                SELECT 
                    phone_id,
                    SUM(ABS(quantity_changed)) as units_sold
                FROM inventory_log 
                WHERE transaction_type = 'outgoing' 
                AND transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY phone_id
            ) sold_data ON ps.id = sold_data.phone_id
            LEFT JOIN (
                SELECT 
                    phone_id,
                    SUM(quantity_changed) as units_received
                FROM inventory_log 
                WHERE transaction_type = 'incoming' 
                AND transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY phone_id
            ) received_data ON ps.id = received_data.phone_id
            ORDER BY turnover_ratio DESC, inventory_value DESC
        `;
        const result = await conn.query(query, [period, period, period]);
        return this.convertBigIntToNumber(result);
    }

    /**
     * Get pricing analytics
     */
    async getPricingAnalyticsData(conn, period) {
        const priceRangeQuery = `
            SELECT 
                CASE 
                    WHEN sm_price < 200 THEN 'Budget (<$200)'
                    WHEN sm_price BETWEEN 200 AND 500 THEN 'Mid-range ($200-$500)'
                    WHEN sm_price BETWEEN 500 AND 1000 THEN 'Premium ($500-$1000)'
                    ELSE 'Flagship (>$1000)'
                END as price_category,
                COUNT(*) as product_count,
                SUM(sm_inventory) as total_inventory,
                AVG(sm_price) as avg_price,
                COALESCE(SUM(sales_data.units_sold), 0) as total_sold,
                COALESCE(SUM(sales_data.revenue), 0) as total_revenue
            FROM phone_specs ps
            LEFT JOIN (
                SELECT 
                    il.phone_id,
                    SUM(ABS(il.quantity_changed)) as units_sold,
                    SUM(ps2.sm_price * ABS(il.quantity_changed)) as revenue
                FROM inventory_log il
                JOIN phone_specs ps2 ON il.phone_id = ps2.id
                WHERE il.transaction_type = 'outgoing' 
                AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY il.phone_id
            ) sales_data ON ps.id = sales_data.phone_id
            GROUP BY price_category
            ORDER BY avg_price ASC
        `;

        const profitabilityQuery = `
            SELECT 
                ps.sm_maker as brand,
                COUNT(*) as product_count,
                AVG(ps.sm_price) as avg_price,
                COALESCE(SUM(sales_data.revenue), 0) as total_revenue,
                COALESCE(SUM(sales_data.units_sold), 0) as total_units_sold,
                CASE 
                    WHEN SUM(sales_data.units_sold) > 0 
                    THEN ROUND(SUM(sales_data.revenue) / SUM(sales_data.units_sold), 2)
                    ELSE 0 
                END as avg_selling_price
            FROM phone_specs ps
            LEFT JOIN (
                SELECT 
                    il.phone_id,
                    SUM(ABS(il.quantity_changed)) as units_sold,
                    SUM(ps2.sm_price * ABS(il.quantity_changed)) as revenue
                FROM inventory_log il
                JOIN phone_specs ps2 ON il.phone_id = ps2.id
                WHERE il.transaction_type = 'outgoing' 
                AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY il.phone_id
            ) sales_data ON ps.id = sales_data.phone_id
            GROUP BY ps.sm_maker
            HAVING total_revenue > 0
            ORDER BY total_revenue DESC
        `;

        const [priceRangeResult, profitabilityResult] = await Promise.all([
            conn.query(priceRangeQuery, [period]),
            conn.query(profitabilityQuery, [period])
        ]);

        return {
            price_ranges: this.convertBigIntToNumber(priceRangeResult),
            brand_profitability: this.convertBigIntToNumber(profitabilityResult)
        };
    }

    /**
     * Get transaction patterns analytics
     */
    async getTransactionPatternsData(conn, period) {
        const hourlyPatternQuery = `
            SELECT 
                HOUR(transaction_date) as hour_of_day,
                COUNT(*) as transaction_count,
                SUM(CASE WHEN transaction_type = 'outgoing' THEN ABS(quantity_changed) ELSE 0 END) as units_sold,
                SUM(CASE WHEN transaction_type = 'incoming' THEN quantity_changed ELSE 0 END) as units_received
            FROM inventory_log
            WHERE transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY HOUR(transaction_date)
            ORDER BY hour_of_day
        `;

        const dailyPatternQuery = `
            SELECT 
                DAYNAME(transaction_date) as day_name,
                DAYOFWEEK(transaction_date) as day_number,
                COUNT(*) as transaction_count,
                SUM(CASE WHEN transaction_type = 'outgoing' THEN ABS(quantity_changed) ELSE 0 END) as units_sold,
                SUM(CASE WHEN transaction_type = 'incoming' THEN quantity_changed ELSE 0 END) as units_received
            FROM inventory_log
            WHERE transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DAYNAME(transaction_date), DAYOFWEEK(transaction_date)
            ORDER BY day_number
        `;

        const transactionTypeQuery = `
            SELECT 
                transaction_type,
                COUNT(*) as transaction_count,
                SUM(ABS(quantity_changed)) as total_quantity,
                AVG(ABS(quantity_changed)) as avg_quantity_per_transaction
            FROM inventory_log
            WHERE transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY transaction_type
        `;

        const [hourlyResult, dailyResult, typeResult] = await Promise.all([
            conn.query(hourlyPatternQuery, [period]),
            conn.query(dailyPatternQuery, [period]),
            conn.query(transactionTypeQuery, [period])
        ]);

        return {
            hourly_patterns: this.convertBigIntToNumber(hourlyResult),
            daily_patterns: this.convertBigIntToNumber(dailyResult),
            transaction_types: this.convertBigIntToNumber(typeResult)
        };
    }

    /**
     * Format technology trends data for charts
     */
    formatTechnologyTrendsData(technologyData) {
        if (!technologyData) return { processors: {}, operating_systems: {}, ram_distribution: {} };

        const colors = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796', '#5a5c69'];

        return {
            processors: {
                labels: (technologyData.processors || []).map(item => item.processor || 'Unknown'),
                datasets: [{
                    label: 'Product Count',
                    data: (technologyData.processors || []).map(item => parseInt(item.product_count) || 0),
                    backgroundColor: colors
                }]
            },
            operating_systems: {
                labels: (technologyData.operating_systems || []).map(item => item.operating_system || 'Unknown'),
                datasets: [{
                    label: 'Product Count',
                    data: (technologyData.operating_systems || []).map(item => parseInt(item.product_count) || 0),
                    backgroundColor: colors
                }]
            },
            ram_distribution: {
                labels: (technologyData.ram_distribution || []).map(item => item.ram || 'Unknown'),
                datasets: [{
                    label: 'Product Count',
                    data: (technologyData.ram_distribution || []).map(item => parseInt(item.product_count) || 0),
                    backgroundColor: colors
                }]
            }
        };
    }

    /**
     * Format pricing analytics data for charts
     */
    formatPricingAnalyticsData(pricingData) {
        if (!pricingData) return { price_ranges: {}, brand_profitability: {} };

        const colors = ['#28a745', '#17a2b8', '#ffc107', '#dc3545'];

        return {
            price_ranges: {
                labels: pricingData.price_ranges.map(item => item.price_category),
                datasets: [{
                    label: 'Units Sold',
                    data: pricingData.price_ranges.map(item => item.total_sold),
                    backgroundColor: colors,
                    yAxisID: 'y'
                }, {
                    label: 'Revenue ($)',
                    data: pricingData.price_ranges.map(item => parseFloat(item.total_revenue)),
                    backgroundColor: colors.map(color => color + '80'),
                    yAxisID: 'y1'
                }]
            },
            brand_profitability: {
                labels: pricingData.brand_profitability.map(item => item.brand),
                datasets: [{
                    label: 'Total Revenue ($)',
                    data: pricingData.brand_profitability.map(item => parseFloat(item.total_revenue)),
                    backgroundColor: '#4e73df'
                }]
            }
        };
    }

    /**
     * Format transaction patterns data for charts
     */
    formatTransactionPatternsData(patternsData) {
        if (!patternsData) return { hourly: {}, daily: {}, types: {} };

        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return {
            hourly: {
                labels: patternsData.hourly_patterns.map(item => `${item.hour_of_day}:00`),
                datasets: [{
                    label: 'Sales',
                    data: patternsData.hourly_patterns.map(item => item.units_sold),
                    borderColor: '#e74a3b',
                    backgroundColor: 'rgba(231, 74, 59, 0.1)',
                    fill: true
                }, {
                    label: 'Restocks',
                    data: patternsData.hourly_patterns.map(item => item.units_received),
                    borderColor: '#1cc88a',
                    backgroundColor: 'rgba(28, 200, 138, 0.1)',
                    fill: true
                }]
            },
            daily: {
                labels: daysOfWeek,
                datasets: [{
                    label: 'Sales',
                    data: daysOfWeek.map(day => {
                        const dayData = patternsData.daily_patterns.find(item => item.day_name === day);
                        return dayData ? dayData.units_sold : 0;
                    }),
                    backgroundColor: '#4e73df'
                }, {
                    label: 'Restocks',
                    data: daysOfWeek.map(day => {
                        const dayData = patternsData.daily_patterns.find(item => item.day_name === day);
                        return dayData ? dayData.units_received : 0;
                    }),
                    backgroundColor: '#1cc88a'
                }]
            },
            types: {
                labels: patternsData.transaction_types.map(item => item.transaction_type.charAt(0).toUpperCase() + item.transaction_type.slice(1)),
                datasets: [{
                    label: 'Transaction Count',
                    data: patternsData.transaction_types.map(item => item.transaction_count),
                    backgroundColor: ['#28a745', '#dc3545', '#ffc107']
                }]
            }
        };
    }
}

module.exports = AnalyticsService;
