/**
 * Simplified Analytics Configuration
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
        TOP_PRODUCTS_LIMIT: 10,
        RECENT_TRANSACTIONS_LIMIT: 10
    },

    // Simple thresholds
    THRESHOLDS: {
        STRONG_GROWTH: 10, // percentage
        REVENUE_DECLINE: -10, // percentage
        LOW_STOCK_ALERT: 5
    },

    // API endpoints
    ENDPOINTS: {
        ANALYTICS: '/analytics',
        EXPORT: '/api/analytics/export'
    }
};

module.exports = AnalyticsConfig;
