const { generateId } = require('./generateId');

function roundCurrency(num) {
    return Math.round((parseFloat(num) || 0) * 100) / 100;
}

function sanitizeDate(date) {
    if (!date || date === '' || date === 'NaN' || date === 'undefined') return null;
    return new Date(date);
}

function generateReceiptId(type) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = type === 'IN' ? 'IN' : 'OUT';
    const uniqueSuffix = generateId().slice(-8);
    return `${prefix}-${dateStr}-${uniqueSuffix}`;
}

module.exports = {
    roundCurrency,
    sanitizeDate,
    generateReceiptId
};
