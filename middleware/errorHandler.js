/**
 * Centralized error handling middleware
 * Handles CSRF errors, database errors, and general application errors
 */

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // Handle CSRF token errors
    if (err.code === 'EBADCSRFTOKEN') {
        req.flash('error', 'Invalid form submission. Please try again.');
        return res.redirect(req.get('Referer') || '/');
    }

    // Handle database connection errors
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('Database access denied:', err.message);
        return res.status(500).render('error', {
            title: 'Database Error',
            error: 'Database connection failed. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? err.stack : '',
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    }

    // Handle database timeout errors
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
        console.error('Database timeout:', err.message);
        return res.status(503).render('error', {
            title: 'Service Unavailable',
            error: 'Service temporarily unavailable. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? err.stack : '',
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    }

    // Handle SQL syntax errors
    if (err.code && err.code.startsWith('ER_')) {
        console.error('SQL Error:', err.message);
        return res.status(500).render('error', {
            title: 'Database Error',
            error: process.env.NODE_ENV === 'development' ? err.message : 'A database error occurred.',
            details: process.env.NODE_ENV === 'development' ? err.stack : '',
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).render('error', {
            title: 'Validation Error',
            error: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : '',
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    }

    // Handle 404 errors
    if (err.status === 404) {
        return res.status(404).render('error', {
            title: 'Page Not Found',
            error: 'The page you are looking for does not exist.',
            details: '',
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    }

    // Handle authorization errors
    if (err.status === 403) {
        return res.status(403).render('error', {
            title: 'Access Denied',
            error: 'You do not have permission to access this resource.',
            details: '',
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    }

    // Centralized error rendering for all other errors
    res.status(err.status || 500).render('error', {
        title: 'Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
        details: process.env.NODE_ENV === 'development' ? err.stack : '',
        csrfToken: req.csrfToken ? req.csrfToken() : '' // Ensure token is available on error pages too
    });
};

// 404 handler - should be used before the general error handler
const notFoundHandler = (req, res, next) => {
    const err = new Error(`Page not found: ${req.originalUrl}`);
    err.status = 404;
    next(err);
};

module.exports = {
    errorHandler,
    notFoundHandler
};
