/**
 * Unified Response Utilities
 * Combines response formatting and Express response helpers.
 */

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
 * Send a success response (Express helper)
 */
function sendSuccess(res, data = {}, message = null, status = 200) {
    const response = {
        success: true,
        ...data
    };
    if (message) {
        response.message = message;
    }
    return res.status(status).json(response);
}

/**
 * Send an error response (Express helper)
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
        response.details = details;
    }

    return res.status(status).json(response);
}

module.exports = {
    // Formatters
    success,
    // Express Helpers
    sendSuccess,
    sendError,
    // Constants
    ERROR_CODES,
    ERROR_STATUS
};
