/**
 * Analytics Configuration
 * Centralized configuration for analytics settings
 */

const AnalyticsConfig = {
    // Time periods available for analysis
    TIME_PERIODS: {
        WEEK: 7,
        MONTH: 30,
        QUARTER: 90,
        YEAR: 365
    },

    // Default settings
    DEFAULTS: {
        PERIOD: 30,
        LOW_STOCK_THRESHOLD: 5,
        CRITICAL_STOCK_THRESHOLD: 1,
        TOP_PRODUCTS_LIMIT: 10,
        RECENT_TRANSACTIONS_LIMIT: 10,
        SUPPLIER_PERFORMANCE_LIMIT: 5,
        CATEGORY_LIMIT: 10,
        FORECAST_DAYS: 30
    },

    // Insight thresholds
    INSIGHTS: {
        STRONG_GROWTH_THRESHOLD: 10, // percentage
        REVENUE_DECLINE_THRESHOLD: -10, // percentage
        HIGH_INVENTORY_THRESHOLD: 100, // units
        LOW_STOCK_ALERT_THRESHOLD: 5,
        CRITICAL_STOCK_ALERT_THRESHOLD: 1,
        HIGH_TURNOVER_THRESHOLD: 2, // turnover ratio
        LOW_TURNOVER_THRESHOLD: 0.5 // turnover ratio
    },

    // Performance thresholds
    PERFORMANCE: {
        EXCELLENT_PROFIT_MARGIN: 40, // percentage
        GOOD_PROFIT_MARGIN: 25, // percentage
        POOR_PROFIT_MARGIN: 10, // percentage
        HIGH_SALES_VELOCITY: 5, // units per day
        LOW_SALES_VELOCITY: 1, // units per day
        OPTIMAL_STOCK_DAYS: 30, // days
        CRITICAL_STOCK_DAYS: 7 // days
    },

    // API endpoints
    ENDPOINTS: {
        ANALYTICS: '/analytics',
        REALTIME: '/api/analytics/realtime',
        EXPORT: '/api/analytics/export',
        PRODUCT_ANALYTICS: '/api/analytics/product',
        FORECAST: '/api/analytics/forecast'
    },

    // Database query limits
    QUERY_LIMITS: {
        MAX_RESULTS: 1000,
        TIMEOUT: 30000, // 30 seconds
        MAX_EXPORT_RECORDS: 10000
    },

    // Export formats
    EXPORT_FORMATS: {
        JSON: 'json',
        CSV: 'csv',
        EXCEL: 'xlsx'
    },

    // Forecast settings
    FORECAST: {
        MIN_DATA_POINTS: 7, // minimum historical data points needed
        DEFAULT_CONFIDENCE: 'Medium',
        MAX_FORECAST_DAYS: 90
    },

    // Cache settings
    CACHE: {
        REALTIME_TTL: 60, // 1 minute
        ANALYTICS_TTL: 300, // 5 minutes
        FORECAST_TTL: 3600 // 1 hour
    }
};

module.exports = AnalyticsConfig;
