/**
 * Recommendation Helper Utilities
 * Functions for CSV export, calculations, and data transformations
 */

/**
 * Export recommendations to CSV
 * @param {Array} recommendations - Array of recommendation objects
 * @param {string} type - 'products' or 'spare-parts'
 */
export const exportRecommendationsToCSV = (recommendations, type = 'products') => {
    // Check if running in browser environment
    if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
        console.warn('exportRecommendationsToCSV is not supported in this environment');
        return;
    }

    if (!recommendations || recommendations.length === 0) {
        alert('No recommendations to export');
        return;
    }

    const headers = type === 'products'
        ? ['Product', 'Warehouse', 'Current Stock', 'Reorder Point', 'Recommended Qty', 'Urgency', 'Stockout Date', 'Reason']
        : ['Part Name', 'Part Code', 'Warehouse', 'Current Stock', 'Reorder Point', 'Recommended Qty', 'Urgency', 'Stockout Date'];

    const rows = recommendations.map(rec => {
        if (type === 'products') {
            return [
                `${rec.device_maker || ''} ${rec.device_name || ''}`.trim(),
                rec.warehouse_name || 'N/A',
                rec.current_stock || 0,
                rec.reorder_point || 0,
                rec.recommended_quantity || 0,
                rec.urgency_level || 'N/A',
                rec.estimated_stockout_date || 'N/A',
                (rec.recommendation_reason || '').replace(/,/g, ';') // Escape commas
            ];
        } else {
            return [
                rec.part_name || 'N/A',
                rec.part_code || 'N/A',
                rec.warehouse_name || 'N/A',
                rec.current_stock || 0,
                rec.reorder_point || 0,
                rec.recommended_quantity || 0,
                rec.urgency_level || 'N/A',
                rec.estimated_stockout_date || 'N/A'
            ];
        }
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `recommendations_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


/**
 * Calculate total value at risk
 * @param {Array} recommendations - Array of recommendations
 * @returns {number} Total value
 */
export const calculateTotalValueAtRisk = (recommendations) => {
    return recommendations.reduce((total, rec) => {
        const price = parseFloat(rec.device_price || rec.unit_price || 0);
        const qty = parseFloat(rec.current_stock || 0);
        return total + (price * qty);
    }, 0);
};

/**
 * Get urgency distribution for charts
 * @param {Array} recommendations - Array of recommendations
 * @returns {Array} Chart data
 */
export const getUrgencyDistribution = (recommendations) => {
    const distribution = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0
    };

    recommendations.forEach(rec => {
        const urgency = rec.urgency_level || 'LOW';
        distribution[urgency] = (distribution[urgency] || 0) + 1;
    });

    return [
        { name: 'Critical', value: distribution.CRITICAL, color: '#dc3545' },
        { name: 'High', value: distribution.HIGH, color: '#ffc107' },
        { name: 'Medium', value: distribution.MEDIUM, color: '#17a2b8' },
        { name: 'Low', value: distribution.LOW, color: '#6c757d' }
    ].filter(item => item.value > 0);
};

/**
 * Get warehouse distribution for charts
 * @param {Array} recommendations - Array of recommendations
 * @returns {Array} Chart data
 */
export const getWarehouseDistribution = (recommendations) => {
    const distribution = {};

    recommendations.forEach(rec => {
        const warehouse = rec.warehouse_name || 'Unknown';
        distribution[warehouse] = (distribution[warehouse] || 0) + 1;
    });

    return Object.entries(distribution).map(([name, value]) => ({
        name,
        value
    }));
};

/**
 * Sort recommendations by various criteria
 * @param {Array} recommendations - Array of recommendations
 * @returns {Array} Sorted recommendations
 */
export const sortRecommendations = (recommendations, sortBy, sortOrder = 'desc') => {
    const sorted = [...recommendations].sort((a, b) => {
        let aVal, bVal;

        switch (sortBy) {
            case 'urgency': {
                const urgencyOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
                aVal = urgencyOrder[a.urgency_level] || 0;
                bVal = urgencyOrder[b.urgency_level] || 0;
                break;
            }
            case 'stockout_date':
                aVal = new Date(a.estimated_stockout_date || '9999-12-31').getTime();
                bVal = new Date(b.estimated_stockout_date || '9999-12-31').getTime();
                break;
            case 'quantity':
                aVal = parseFloat(a.recommended_quantity || 0);
                bVal = parseFloat(b.recommended_quantity || 0);
                break;
            case 'current_stock':
                aVal = parseFloat(a.current_stock || 0);
                bVal = parseFloat(b.current_stock || 0);
                break;
            case 'name':
                aVal = (a.device_name || a.part_name || '').toLowerCase();
                bVal = (b.device_name || b.part_name || '').toLowerCase();
                break;
            default:
                return 0;
        }

        if (sortOrder === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });

    return sorted;
};

/**
 * Filter recommendations by search term
 * @param {Array} recommendations - Array of recommendations
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered recommendations
 */
export const filterBySearch = (recommendations, searchTerm) => {
    if (!searchTerm) return recommendations;

    const term = searchTerm.toLowerCase();
    return recommendations.filter(rec => {
        const productName = (rec.device_name || rec.part_name || '').toLowerCase();
        const manufacturer = (rec.device_maker || '').toLowerCase();
        const partCode = (rec.part_code || '').toLowerCase();
        const warehouse = (rec.warehouse_name || '').toLowerCase();

        return productName.includes(term) ||
            manufacturer.includes(term) ||
            partCode.includes(term) ||
            warehouse.includes(term);
    });
};

/**
 * Format currency
 * @param {number} value - Value to format
 * @returns {string} Formatted currency
 */
export const formatCurrency = (value) => {
    if (typeof Intl === 'undefined') return `$${value}`;
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(value);
};

