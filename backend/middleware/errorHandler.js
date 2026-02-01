/**
 * Centralized error handling middleware
 * Handles database errors and general application errors
 */

/**
 * General error handler middleware
 * - Short-circuits 404s to return clean JSON (avoid noisy stack traces for missing API routes)
 * - Logs stack traces for server/DB errors
 */
const errorHandler = (err, req, res, _next) => {
    // For 404 errors return a clean JSON response and avoid noisy stack traces
    if (err && err.status === 404) {
        return res.status(404).json({
            error: 'Page Not Found',
            message: 'The page you are looking for does not exist.',
            path: req.originalUrl
        });
    }

    // Log stack for non-404 errors only
    if (err && err.stack) console.error(err.stack);

    // Handle database connection errors
    if (err && err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('Database access denied:', err.message);
        return res.status(500).json({
            error: 'Database Error',
            message: 'Database connection failed. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }

    // Handle database timeout errors
    if (err && (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET')) {
        console.error('Database timeout:', err.message);
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Service temporarily unavailable. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }

    // Handle SQL syntax errors
    if (err && err.code && String(err.code).startsWith('ER_')) {
        console.error('SQL Error:', err.message);
        return res.status(500).json({
            error: 'Database Error',
            message: process.env.NODE_ENV === 'development' ? err.message : 'A database error occurred.',
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }

    // Handle validation errors
    if (err && err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }

    // Handle authorization errors
    if (err && err.status === 403) {
        return res.status(403).json({
            error: 'Access Denied',
            message: 'You do not have permission to access this resource.'
        });
    }

    // Centralized error response for all other errors
    res.status(err && err.status ? err.status : 500).json({
        error: 'Error',
        message: process.env.NODE_ENV === 'development' ? (err && err.message) : 'Something went wrong!',
        details: process.env.NODE_ENV === 'development' ? (err && err.stack) : undefined
    });
};

// 404 handler - should be used before the general error handler
const notFoundHandler = (req, res, next) => {
    // Handle favicon first
    if (req.path === '/favicon.ico') {
        return res.status(204).end();
    }

    // Don't log common browser requests that are expected to be missing
    const commonMissingFiles = ['/robots.txt', '/sitemap.xml', '/apple-touch-icon.png', '/back'];
    const isCommonMissing = commonMissingFiles.includes(req.path) ||
        req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)\.map$/);

    // Handle /back as a browser back action
    if (req.path === '/back') {
        return res.status(200).send(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                                <title>Going Back</title>
                                <meta http-equiv="refresh" content="0;url=javascript:window.history.back()">
                        </head>
                        <body>
                                <script>window.history.back();</script>
                                <p>Going back...</p>
                        </body>
                        </html>
                `);
    }

    if (!isCommonMissing) {
        console.warn(`404 - Page not found: ${req.originalUrl}`);
    }

    const err = new Error(`Page not found: ${req.originalUrl}`);
    err.status = 404;
    next(err);
};

module.exports = {
    errorHandler,
    notFoundHandler
};
