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
                stockTurnoverData
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
                this.getStockTurnoverData(conn, period)
            ]);

            const totalRevenue = revenueData.total_revenue || 0;
            const totalUnitsSold = unitsSoldData.units_sold || 0;
            const previousRevenue = previousPeriodData.previous_revenue || 0;

            // Calculate derived metrics
            const averageSaleValue = totalUnitsSold > 0 ? totalRevenue / totalUnitsSold : 0;
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
                
                // Chart data
                salesTrendData: this.formatSalesTrendData(salesTrendData),
                productPerformanceData: this.formatProductPerformanceData(topProductsData),
                inventoryStatusData: this.formatInventoryStatusData(inventoryStatusData),
                categoryPerformanceData: this.formatCategoryPerformanceData(categoryPerformanceData),
                
                // Product data
                topSellingProducts: topProductsData,
                
                // Calculated metrics
                averageSaleValue: parseFloat(averageSaleValue).toFixed(2),
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
            SELECT COALESCE(SUM(ps.sm_price * ABS(il.quantity_changed)), 0) as previous_revenue
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
     * Get supplier performance data (simplified for now)
     */
    async getSupplierPerformanceData(suppliersConn, period) {
        try {
            const query = `
                SELECT 
                    name as supplier_name,
                    category,
                    is_active,
                    1 as products_supplied,
                    0 as total_stock_received
                FROM suppliers
                WHERE is_active = 1
                ORDER BY name ASC
                LIMIT 5
            `;
            const result = await suppliersConn.query(query);
            return this.convertBigIntToNumber(result);
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
     * Format sales trend data for Chart.js
     */
    formatSalesTrendData(salesTrendRaw) {
        return {
            labels: salesTrendRaw.map(item => {
                const date = new Date(item.sale_date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }),
            revenue: salesTrendRaw.map(item => item.daily_revenue),
            units: salesTrendRaw.map(item => item.daily_units)
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
        return {
            labels: ['In Stock', 'Low Stock', 'Out of Stock'],
            values: [
                inventoryStatus.in_stock || 0,
                inventoryStatus.low_stock || 0,
                inventoryStatus.out_of_stock || 0
            ],
            colors: ['#28a745', '#ffc107', '#dc3545']
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
}

module.exports = AnalyticsService;
