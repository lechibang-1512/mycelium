/**
 * Date and Time Formatting Utilities
 * Centralized formatting functions to ensure consistency across the application
 */

/**
 * Format a date string for display
 * @param {string|Date} dateString - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string or 'N/A' if invalid
 */
export const formatDate = (dateString, options = {}) => {
    if (!dateString) return 'N/A';

    const defaultOptions = {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };

    try {
        return new Date(dateString).toLocaleDateString('en-US', defaultOptions);
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'N/A';
    }
};

/**
 * Format a date to show only the date part (no time)
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';

    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'N/A';
    }
};

/**
 * Format a date to show only the time part
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted time string
 */
export const formatTimeOnly = (dateString) => {
    if (!dateString) return 'N/A';

    try {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'N/A';
    }
};

/**
 * Format a currency value
 * @param {number|string} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD') => {
    const numAmount = Number(amount);

    if (isNaN(numAmount)) return '$0.00';

    return numAmount.toLocaleString('en-US', {
        style: 'currency',
        currency: currency
    });
};

/**
 * Format a quantity/number with thousands separators
 * @param {number|string} quantity - Number to format
 * @returns {string} Formatted number string
 */
export const formatQuantity = (quantity) => {
    const num = Number(quantity);

    if (isNaN(num)) return '0';

    return num.toLocaleString('en-US');
};

/**
 * Format a percentage value
 * @param {number} value - Value to format as percentage (0-1 or 0-100)
 * @param {number} decimals - Number of decimal places
 * @param {boolean} isDecimal - Whether value is decimal (0-1) or percentage (0-100)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1, isDecimal = true) => {
    const num = Number(value);

    if (isNaN(num)) return '0%';

    const percentage = isDecimal ? num * 100 : num;
    return `${percentage.toFixed(decimals)}%`;
};

/**
 * Format bytes to human readable format
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted size string
 */
export const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

