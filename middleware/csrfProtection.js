const csrf = require('@dr.pogodin/csurf');

/**
 * CSRF Protection Configuration
 * Configures CSRF protection middleware and makes tokens available to views
 */

// Initialize CSRF protection with session-based storage
const csrfProtection = csrf({ 
    cookie: false // Use session-based storage instead of cookies
});

/**
 * Safely validate and sanitize redirect URLs to prevent open redirect attacks.
 * Only allows relative paths or same-origin URLs.
 */
function safeRedirect(referer, fallback = '/') {
    if (!referer) return fallback;
    
    try {
        // If referer is a relative path, validate it starts with /
        if (referer.startsWith('/') && !referer.startsWith('//')) {
            return referer;
        }
        
        // If referer is a full URL, check if it's same-origin
        const refererUrl = new URL(referer);
        const currentOrigin = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const currentUrl = new URL(currentOrigin);
        
        if (refererUrl.origin === currentUrl.origin) {
            return refererUrl.pathname + refererUrl.search;
        }
        
        // External URL - reject and use fallback
        console.warn(`Rejected external redirect to: ${referer}`);
        return fallback;
    } catch (e) {
        // Invalid URL - use fallback
        console.warn(`Invalid redirect URL: ${referer}`, e.message);
        return fallback;
    }
}

// Middleware to make CSRF token available to all views and handle CSRF errors
const csrfMiddleware = (req, res, next) => {
    // Make CSRF token available to all templates
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
    
    // Add CSRF token to response locals for view rendering
    if (req.csrfToken) {
        res.locals.csrfToken = req.csrfToken();
    }

    next();
};

// Enhanced CSRF error handler
const csrfErrorHandler = (err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        console.warn(`CSRF token validation failed for ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
        
        // Log the error for security monitoring
        console.warn('CSRF Error Details:', {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer'),
            user: req.session?.user?.username || 'anonymous'
        });

        // Handle AJAX requests differently
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(403).json({
                error: 'Invalid CSRF token',
                message: 'Your session may have expired. Please refresh the page and try again.'
            });
        }

        // For regular form submissions, flash message and redirect safely
        req.flash('error', 'Invalid form submission. Your session may have expired. Please try again.');
        return res.redirect(safeRedirect(req.get('Referer'), '/'));
    }

    // Pass other errors to the next error handler
    next(err);
};

module.exports = {
    csrfProtection,
    csrfMiddleware,
    csrfErrorHandler,
    safeRedirect
};
