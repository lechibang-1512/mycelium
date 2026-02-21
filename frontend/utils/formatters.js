/**
 * Shared Utility Functions (Vanilla JS)
 * Ported from frontend/utils/formatters.js — no React, no dayjs dependency
 */

/**
 * Format a date string for display (date + time)
 * @param {string|Date} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format a date to show only the date part (no time)
 * @param {string|Date} dateString
 * @returns {string}
 */
export function formatDateOnly(dateString) {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format a date string with full date and 12-hour time
 * @param {string|Date} dateString
 * @returns {string}
 */
export function formatDateTime(dateString) {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}


/**
 * Format a number with locale-aware thousands separators
 * @param {number|string} amount
 * @param {string} locale
 * @param {number} maxDecimals
 * @returns {string}
 */
export function formatNumber(amount, locale = 'vi-VN', maxDecimals = 2) {
    const n = Number(amount);
    if (isNaN(n)) return '0';
    return n.toLocaleString(locale, {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDecimals
    });
}

/**
 * Format a currency value
 * @param {number|string} amount
 * @param {string} currency
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'USD') {
    const n = Number(amount);
    if (isNaN(n)) return '$0.00';
    return n.toLocaleString('en-US', { style: 'currency', currency });
}

/**
 * Format a large number as a compact abbreviation (K / M)
 * @param {number|string} n
 * @returns {string}
 */
export function formatKPI(n) {
    const num = Number(n) || 0;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
}

/**
 * Map a status string to a semantic color variant
 * @param {string} status
 * @returns {string}
 */
export function getStatusColor(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('pending') || s.includes('waiting')) return 'warning';
    if (s.includes('progress') || s.includes('diagnosed') || s.includes('inspecting')) return 'info';
    if (s.includes('complete') || s.includes('resolved') || s.includes('closed')) return 'success';
    if (s.includes('cancelled') || s.includes('rejected')) return 'danger';
    return 'secondary';
}

/**
 * Escape HTML to prevent XSS when inserting dynamic text
 * @param {string} str
 * @returns {string}
 * @public
 */
export function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

/**
 * Maps general statuses to Badge variant names.
 * @param {string} status 
 * @returns {string}
 */
export function getStatusVariant(status) {
    const s = (status || '').toLowerCase();
    const m = {
        draft: 'secondary',
        pending: 'warning',
        planned: 'warning',
        reserved: 'warning',
        awaiting_return: 'warning',
        partially_received: 'warning',
        approved: 'info',
        issued: 'info',
        in_repair: 'info',
        paid: 'success',
        completed: 'success',
        resolved: 'success',
        closed: 'success',
        available: 'success',
        received: 'success',
        cancelled: 'danger',
        disposed: 'danger',
        in_progress: 'primary',
        processing: 'primary'
    };
    if (m[s] !== undefined) return m[s];
    if (s.includes('pending')) return 'secondary';
    if (s.includes('progress') || s.includes('processing')) return 'primary';
    if (s.includes('completed') || s.includes('resolved') || s.includes('closed')) return 'success';
    if (s.includes('ordered')) return 'warning';
    return 'secondary';
}

/**
 * Maps priority values to Badge variant names.
 * @param {string} priority 
 * @returns {string}
 */
export function getPriorityVariant(priority) {
    const p = (priority || '').toLowerCase();
    if (p === 'low') return 'secondary';
    if (p === 'medium' || p === 'normal') return 'info';
    if (p === 'high') return 'warning';
    if (p === 'urgent' || p === 'critical') return 'danger';
    return 'secondary';
}

/**
 * Maps condition states for receipts to Badge variant names.
 * @param {string} condition 
 * @returns {string}
 */
export function getConditionVariant(condition) {
    const c = (condition || '').toLowerCase();
    const m = { 
        new: 'success', 
        used_good: 'info', 
        used_fair: 'warning', 
        poor: 'danger' 
    };
    return m[c] || 'secondary';
}

/**
 * Maps condition states for device inventory to Badge variant names.
 * @param {string} condition 
 * @returns {string}
 */
export function getDeviceConditionVariant(condition) {
    const c = (condition || '').toLowerCase();
    if (c === 'new') return 'primary';
    if (c === 'used') return 'info';
    if (c === 'refurbished') return 'warning';
    if (c === 'testing') return 'secondary';
    return 'secondary';
}

