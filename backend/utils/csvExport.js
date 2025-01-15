/**
 * CSV Export Utility
 * Generates CSV strings from column definitions and row data.
 * No external dependencies — pure string generation with proper escaping.
 */

/**
 * Generate a CSV string from columns and rows
 * @param {Array<{key: string, label: string}>} columns - Column definitions
 * @param {Array<Object>} rows - Array of row objects
 * @returns {string} CSV content
 */
function generateCSV(columns, rows) {
    const header = columns.map(c => escapeCSVField(c.label)).join(',');
    const body = rows.map(row =>
        columns.map(c => {
            const val = row[c.key];
            return escapeCSVField(formatValue(val));
        }).join(',')
    ).join('\n');
    return header + '\n' + body;
}

/**
 * Escape a single CSV field per RFC 4180
 */
function escapeCSVField(value) {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Format a value for CSV output
 */
function formatValue(val) {
    if (val === null || val === undefined) return '';
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
}

/**
 * Send CSV response with appropriate headers
 * @param {import('express').Response} res - Express response object
 * @param {string} filename - Suggested download filename
 * @param {Array<{key: string, label: string}>} columns - Column definitions
 * @param {Array<Object>} rows - Array of row objects
 */
function sendCSVResponse(res, filename, columns, rows) {
    const csv = generateCSV(columns, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
}

module.exports = { generateCSV, sendCSVResponse };
