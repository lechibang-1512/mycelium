/**
 * Unified Response Utilities
 * Combines response formatting and Express response helpers.
 */


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
    sendError
};
