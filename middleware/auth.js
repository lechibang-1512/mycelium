/**
 * Middleware to check if a user is authenticated
 * If not, redirects to the login page and stores the original URL for later redirect
 */
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
};

/**
 * Middleware to check if a user has admin privileges
 * If not, returns a 403 Forbidden error
 */
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).render('error', {
        error: 'Access denied. Admin privileges required.'
    });
};

/**
 * Middleware to check if a user has staff or admin privileges
 * If not, returns a 403 Forbidden error
 */
const isStaffOrAdmin = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'staff')) {
        return next();
    }
    res.status(403).render('error', {
        error: 'Access denied. Staff privileges required.'
    });
};

// Middleware to make user data available to all templates
const setUserLocals = (req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isAdmin = req.session.user && req.session.user.role === 'admin';
    res.locals.isAuthenticated = !!req.session.user;
    next();
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isStaffOrAdmin,
    setUserLocals
};
