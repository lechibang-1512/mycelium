/**
 * BigInt Handler Middleware
 * Automatically converts BigInt values to Numbers in all JSON responses
 * This ensures consistent handling across the entire API without manual conversion
 */

const SanitizationService = require('../services/SanitizationService');

/**
 * Recursively convert BigInt values to Numbers in an object
 * Delegates to SanitizationService.convertBigIntToNumber for consistency
 */
const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

/**
 * Express middleware that overrides res.json() to automatically
 * convert BigInt values before sending the response
 */
function bigintHandler(req, res, next) {
    // Store the original json method
    const originalJson = res.json.bind(res);

    // Override res.json to convert BigInt values
    res.json = function (data) {
        const converted = convertBigIntToNumber(data);
        return originalJson(converted);
    };

    next();
}

/**
 * Alternative: Custom JSON replacer for BigInt serialization
 * Can be used with express.json() or JSON.stringify()
 */
function bigintReplacer(key, value) {
    if (typeof value === 'bigint') {
        // Convert to number if within safe integer range, else string
        if (value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER) {
            return Number(value);
        }
        return value.toString();
    }
    return value;
}

/**
 * Safe BigInt-aware JSON.stringify
 */
function safeStringify(data, space = undefined) {
    return JSON.stringify(data, bigintReplacer, space);
}

module.exports = {
    bigintHandler,
    bigintReplacer,
    safeStringify,
    convertBigIntToNumber
};
