/**
 * Unified Response Utilities
 * Combines response formatting and Express response helpers.
 * Includes automatic BigInt to Number conversion for all responses.
 */

const SanitizationService = require('../services/SanitizationService');
const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

const ERROR_CODES = {
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    BAD_REQUEST: 'BAD_REQUEST',
    CONFLICT: 'CONFLICT',
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS'
};

const ERROR_STATUS = {
    NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    INTERNAL_ERROR: 500,
    BAD_REQUEST: 400,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429
};

/**
 * Format a successful response object (internal use or for returning object directly)
 */
function success(data, meta = {}) {
    return {
        success: true,
        data,
        ...meta
    };
}

/**
 * Format an error response object (internal use)
 */
function error(message, code = 'INTERNAL_ERROR', details = null) {
    const response = {
        success: false,
        error: {
            message,
            code
        }
    };
    if (details) {
        response.error.details = details;
    }
    return response;
}

/**
 * Format a paginated response object
 */
function paginated(data, page, pageSize, totalCount) {
    return {
        success: true,
        data,
        pagination: {
            page,
            pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
            hasMore: page * pageSize < totalCount
        }
    };
}

/**
 * Format a list response object
 */
function list(items, itemsKey = 'items') {
    return {
        success: true,
        [itemsKey]: items,
        count: items.length
    };
}

/**
 * Send a success response (Express helper)
 * Automatically converts BigInt values to Numbers
 */
function sendSuccess(res, data = {}, message = null, status = 200) {
    const response = {
        success: true,
        ...convertBigIntToNumber(data)
    };
    if (message) {
        response.message = message;
    }
    return res.status(status).json(response);
}

/**
 * Send an error response (Express helper)
 * Automatically converts BigInt values to Numbers
 */
function sendError(res, message, status = 500, details = null) {
    // Log internal server errors
    if (status >= 500) {
        console.error(`SERVER ERROR: ${message}`, details || '');
    }

    const response = {
        success: false,
        error: message
    };

    if (details && process.env.NODE_ENV !== 'production') {
        response.details = convertBigIntToNumber(details);
    }

    return res.status(status).json(response);
}

module.exports = {
    // Formatters
    success,
    // Express Helpers
    sendSuccess,
    sendError,
    // BigInt utilities
    convertBigIntToNumber,
    // Constants
    ERROR_CODES,
    ERROR_STATUS
};
