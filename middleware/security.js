/**
 * Security Middleware for API Response Sanitization
 * 
 * Prevents sensitive information from being exposed in API responses
 */

/**
 * Middleware to sanitize API responses and prevent secret exposure
 */
function sanitizeApiResponse(req, res, next) {
    // Store original res.json method
    const originalJson = res.json;
    
    // Override res.json to sanitize responses
    res.json = function(obj) {
        // Sanitize the response object
        const sanitized = sanitizeObject(obj);
        
        // Call original json method with sanitized data
        return originalJson.call(this, sanitized);
    };
    
    next();
}

/**
 * Recursively sanitize an object to remove sensitive information
 */
function sanitizeObject(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    
    // Handle objects
    if (typeof obj === 'object') {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(obj)) {
            // Check for sensitive field names
            if (isSensitiveField(key)) {
                sanitized[key] = sanitizeSecretValue(value);
            } else if (typeof value === 'object') {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }
    
    return obj;
}

/**
 * Check if a field name indicates sensitive information
 */
function isSensitiveField(fieldName) {
    const sensitiveFields = [
        'secret',
        'password',
        'token',
        'key',
        'credential',
        'auth',
        'currentSecret',
        'previousSecret',
        'sessionSecret',
        'sessionToken',
        'csrfToken'
    ];
    
    const lowerFieldName = fieldName.toLowerCase();
    return sensitiveFields.some(sensitive => lowerFieldName.includes(sensitive));
}

/**
 * Sanitize a secret value to show only partial information
 */
function sanitizeSecretValue(value) {
    if (typeof value !== 'string') {
        return '[REDACTED]';
    }
    
    if (value.length <= 8) {
        return '[REDACTED]';
    }
    
    return value.substring(0, 4) + '***[REDACTED]***';
}

/**
 * Middleware to add security headers
 */
function securityHeaders(req, res, next) {
    // Prevent caching of sensitive responses
    if (req.path.includes('/admin/session') || req.path.includes('/auth')) {
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });
    }
    
    // Add comprehensive security headers
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=(), vibrate=(), fullscreen=(self)',
        'Strict-Transport-Security': process.env.NODE_ENV === 'production' ? 'max-age=31536000; includeSubDomains; preload' : undefined
    });

    // Content Security Policy
    const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "media-src 'self'"
    ];

    res.set('Content-Security-Policy', cspDirectives.join('; '));
    
    next();
}

/**
 * Middleware to log and prevent secret exposure attempts
 */
function preventSecretExposure(req, res, next) {
    // Monitor for potential secret exposure in query parameters
    const queryString = req.url.split('?')[1];
    if (queryString) {
        const suspiciousPatterns = ['secret', 'password', 'token', 'key'];
        const lowerQuery = queryString.toLowerCase();
        
        for (const pattern of suspiciousPatterns) {
            if (lowerQuery.includes(pattern)) {
                console.warn(`🚨 Potential secret exposure attempt: ${req.method} ${req.path} from ${req.ip}`);
                console.warn(`Query parameters contain sensitive field names: ${pattern}`);
                break;
            }
        }
    }
    
    next();
}

module.exports = {
    sanitizeApiResponse,
    securityHeaders,
    preventSecretExposure,
    sanitizeObject
};
