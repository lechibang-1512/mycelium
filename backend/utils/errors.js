/**
 * Custom error classes for better error handling
 */

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
    }
}

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConflictError';
        this.statusCode = 409;
    }
}

class CapacityError extends ValidationError {
    constructor(messageOrZoneName, limit, current, adding) {
        // Support both single message and 4-param format
        if (limit === undefined) {
            // Single message format
            super(messageOrZoneName);
            this.details = { message: messageOrZoneName };
        } else {
            // 4-param format (zoneName, limit, current, adding)
            super(`Zone '${messageOrZoneName}' capacity exceeded. Limit: ${limit}, Current: ${current}, Adding: ${adding}`);
            this.details = {
                zoneName: messageOrZoneName,
                limit,
                current,
                adding,
                available: Math.max(0, (limit || 0) - (current || 0))
            };
        }
        this.name = 'CapacityError';
        this.statusCode = 422; // Unprocessable Entity
    }
}

class InsufficientStockError extends ValidationError {
    constructor(message, available = null) {
        super(message);
        this.name = 'InsufficientStockError';
        this.statusCode = 422;
        if (available !== null) {
            this.details = { available };
        }
    }
}

module.exports = {
    ValidationError,
    NotFoundError,
    ConflictError,
    CapacityError,
    InsufficientStockError
};
