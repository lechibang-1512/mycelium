/**
 * Unified API Response Handler
 * Standardizes success and error responses across the application.
 */

const apiResponse = (res, data, statusCode = 200, meta = {}) => {
    return res.status(statusCode).json({
        success: true,
        data,
        meta: Object.keys(meta).length > 0 ? meta : undefined,
        timestamp: new Date().toISOString()
    });
};

const apiError = (res, error, statusCode = 500) => {
    console.error('API Error:', error);

    // Mongoose Validation Error
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
        }));
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: errors,
            timestamp: new Date().toISOString()
        });
    }

    // Mongoose Duplicate Key Error
    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(409).json({
            success: false,
            error: 'Duplicate Entry',
            message: `${field} already exists.`,
            timestamp: new Date().toISOString()
        });
    }

    // CastError (invalid ObjectId)
    if (error.name === 'CastError') {
        return res.status(400).json({
            success: false,
            error: 'Invalid ID Format',
            message: `Invalid ${error.path}: ${error.value}`,
            timestamp: new Date().toISOString()
        });
    }

    const message = error.message || 'Internal Server Error';
    const isProduction = process.env.NODE_ENV === 'production';

    return res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? 'Internal Server Error' : 'Request Failed',
        message: isProduction && statusCode === 500 ? 'Something went wrong.' : message,
        timestamp: new Date().toISOString()
    });
};

// Async handler wrapper to avoid try-catch blocks in routes
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    apiResponse,
    apiError,
    asyncHandler
};
