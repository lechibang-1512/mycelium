const crypto = require('crypto');

/**
 * Enhanced session security utilities
 */
const SessionSecurity = {
    // Session Management Service instance (will be set by server)
    sessionManagementService: null,
    
    // Token Invalidation Service instance (will be set by server)
    tokenInvalidationService: null,
    
    // Security Logger instance (will be set by server)
    securityLogger: null,

    /**
     * Set the session management service instance
     */
    setSessionManagementService(service) {
        this.sessionManagementService = service;
    },

    /**
     * Set the token invalidation service instance
     */
    setTokenInvalidationService(service) {
        this.tokenInvalidationService = service;
    },

    /**
     * Set the security logger instance
     */
    setSecurityLogger(service) {
        this.securityLogger = service;
    },

    /**
     * Generate a unique session token for each login
     */
    generateSessionToken() {
        return crypto.randomBytes(32).toString('hex');
    },

    /**
     * Generate a secure session ID
     */
    generateSessionId() {
        return crypto.randomBytes(16).toString('hex');
    },

    /**
     * Validate session integrity and security with enhanced token checking
     */
    async validateSession(req) {
        if (!req.session.user) {
            return { valid: false, reason: 'No user session' };
        }

        // Check if session has required security tokens
        if (!req.session.user.sessionToken || !req.session.user.sessionId) {
            return { valid: false, reason: 'Missing security tokens' };
        }

        // Check if session token is invalidated
        if (this.tokenInvalidationService) {
            const isInvalidated = await this.tokenInvalidationService.isTokenInvalidated(req.session.user.sessionToken);
            if (isInvalidated) {
                return { valid: false, reason: 'Session token invalidated' };
            }

            // Check if all user tokens are invalidated
            if (req.session.user && req.session.user.id && req.session.user.sessionStart) {
                const userTokensInvalidated = await this.tokenInvalidationService.areUserTokensInvalidated(
                    req.session.user.id, 
                    req.session.user.sessionStart
                );
                if (userTokensInvalidated) {
                    return { valid: false, reason: 'All user sessions invalidated' };
                }
            }
        }

        // Check session expiration
        if (req.session.user && req.session.user.sessionExpiry && Date.now() > req.session.user.sessionExpiry) {
            return { valid: false, reason: 'Session expired' };
        }

        // Check for idle timeout (30 minutes of inactivity)
        const idleTimeout = 30 * 60 * 1000; // 30 minutes
        if (req.session.user && req.session.user.lastActivity && (Date.now() - req.session.user.lastActivity) > idleTimeout) {
            return { valid: false, reason: 'Session idle timeout' };
        }

        // Check for session hijacking by validating user agent consistency
        if (req.session.userAgent && req.session.userAgent !== req.get('User-Agent')) {
            return { valid: false, reason: 'Session security violation - User agent mismatch' };
        }

        // Check for maximum session duration (24 hours for regular sessions, 30 days for "remember me")
        const maxSessionDuration = req.session.cookie.maxAge || (24 * 60 * 60 * 1000);
        if (req.session.user.sessionStart && (Date.now() - req.session.user.sessionStart) > maxSessionDuration) {
            return { valid: false, reason: 'Maximum session duration exceeded' };
        }

        return { valid: true };
    },

    /**
     * Initialize secure session data
     */
    initializeSecureSession(req, user) {
        const sessionToken = this.generateSessionToken();
        const sessionId = this.generateSessionId();
        const sessionStart = Date.now();
        
        // Store security information in session
        req.session.user = {
            ...user,
            sessionToken,
            sessionId,
            sessionStart,
            lastActivity: sessionStart
        };

        // Store user agent for session validation
        req.session.userAgent = req.get('User-Agent');
        
        // Store IP address for security logging
        req.session.ipAddress = req.ip || req.connection.remoteAddress;

        // Track session in management service
        if (this.sessionManagementService) {
            this.sessionManagementService.trackSession(sessionId, {
                userId: user.id,
                username: user.username,
                sessionToken,
                sessionStart,
                lastActivity: sessionStart,
                ipAddress: req.session.ipAddress,
                userAgent: req.session.userAgent
            });
        }

        return { sessionToken, sessionId };
    },

    /**
     * Update session activity timestamp
     */
    updateSessionActivity(req) {
        if (req.session.user) {
            req.session.user.lastActivity = Date.now();
            
            // Update in session management service
            if (this.sessionManagementService && req.session.user.sessionId) {
                this.sessionManagementService.updateSessionActivity(req.session.user.sessionId);
            }
        }
    },

    /**
     * Enhanced secure session clearing with token invalidation
     */
    async clearSession(req, reason = 'logout') {
        const sessionInfo = req.session.user ? {
            userId: req.session.user.id,
            username: req.session.user.username,
            sessionToken: req.session.user.sessionToken,
            sessionId: req.session.user.sessionId
        } : null;

        // Invalidate session token if token invalidation service is available
        if (sessionInfo && this.tokenInvalidationService && sessionInfo.sessionToken) {
            await this.tokenInvalidationService.invalidateToken(
                sessionInfo.sessionToken, 
                'session', 
                sessionInfo.userId, 
                reason
            );
        }

        // Remove from session management service
        if (sessionInfo && this.sessionManagementService && sessionInfo.sessionId) {
            this.sessionManagementService.removeSession(sessionInfo.sessionId);
        }

        // Only destroy session if user exists, otherwise just clear user data
        if (req.session && req.session.user) {
            req.session.destroy();
        } else if (req.session) {
            // Clear any existing session data but don't destroy the session itself
            delete req.session.user;
            delete req.session.userAgent;
            delete req.session.ipAddress;
        }
        
        return sessionInfo;
    },

    /**
     * Force invalidate all user sessions (for security incidents)
     */
    async forceInvalidateAllUserSessions(userId, reason = 'security_action') {
        if (this.tokenInvalidationService) {
            await this.tokenInvalidationService.invalidateAllUserTokens(userId, reason);
        }
        
        if (this.sessionManagementService) {
            this.sessionManagementService.forceLogoutUser(userId);
        }
        
        console.log(`🚫 All sessions force invalidated for user ${userId}: ${reason}`);
    }
};

/**
 * Middleware to check if a user is authenticated
 * If not, redirects to the login page and stores the original URL for later redirect
 */
const isAuthenticated = async (req, res, next) => {
    try {
        // Update session activity
        SessionSecurity.updateSessionActivity(req);
        
        // Validate session security (now async)
        const validation = await SessionSecurity.validateSession(req);
        
        if (!validation.valid) {
            console.log(`Session validation failed: ${validation.reason}`);
            
            // Log session validation failure
            if (SessionSecurity.securityLogger && req.session?.user) {
                await SessionSecurity.securityLogger.logSecurityEvent({
                    eventType: 'session_validation_failed',
                    userId: req.session.user.id,
                    username: req.session.user.username,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    details: { 
                        reason: validation.reason,
                        sessionToken: req.session.user.sessionToken?.substring(0, 8) + '...'
                    },
                    riskScore: 60
                });
            }
            
            // Clear invalid session safely
            if (req.session && req.session.user) {
                await SessionSecurity.clearSession(req);
            }
            
            // Store original URL for redirect after login (ensure session exists)
            if (!req.session) {
                // This shouldn't happen in normal express-session flow, but handle it safely
                return res.redirect('/login');
            }
            req.session.returnTo = req.originalUrl;
            
            return res.redirect('/login');
        }
        
        return next();
    } catch (err) {
        console.error('Authentication middleware error:', err);
        
        // Log authentication error
        if (SessionSecurity.securityLogger) {
            await SessionSecurity.securityLogger.logSecurityEvent({
                eventType: 'authentication_error',
                userId: req.session?.user?.id || null,
                username: req.session?.user?.username || 'unknown',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                details: { error: err.message },
                riskScore: 80
            });
        }
        
        // Clear session and redirect to login
        if (req.session && req.session.user) {
            await SessionSecurity.clearSession(req);
        }
        res.redirect('/login');
    }
};

/**
 * Enhanced middleware to check if a user has admin privileges with session validation
 * If not, returns a 403 Forbidden error
 */
const isAdmin = (req, res, next) => {
    // First validate session security
    const validation = SessionSecurity.validateSession(req);
    
    if (!validation.valid) {
        console.log(`Admin access denied - Session validation failed: ${validation.reason}`);
        SessionSecurity.clearSession(req);
        return res.redirect('/login');
    }
    
    if (req.session.user && req.session.user.role === 'admin') {
        SessionSecurity.updateSessionActivity(req);
        return next();
    }
    
    res.status(403).render('error', {
        error: 'Access denied. Admin privileges required.'
    });
};

/**
 * Enhanced middleware to check if a user has staff or admin privileges with session validation
 * If not, returns a 403 Forbidden error
 */
const isStaffOrAdmin = (req, res, next) => {
    // First validate session security
    const validation = SessionSecurity.validateSession(req);
    
    if (!validation.valid) {
        console.log(`Staff access denied - Session validation failed: ${validation.reason}`);
        SessionSecurity.clearSession(req);
        return res.redirect('/login');
    }
    
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'staff')) {
        SessionSecurity.updateSessionActivity(req);
        return next();
    }
    
    res.status(403).render('error', {
        error: 'Access denied. Staff privileges required.'
    });
};

// Enhanced middleware to make user data available to all templates with session validation
const setUserLocals = (req, res, next) => {
    // Validate session if user exists
    if (req.session.user) {
        const validation = SessionSecurity.validateSession(req);
        
        if (!validation.valid) {
            console.log(`Template access denied - Session validation failed: ${validation.reason}`);
            SessionSecurity.clearSession(req);
            res.locals.user = null;
            res.locals.isAdmin = false;
            res.locals.isStaffOrAdmin = false;
            res.locals.isAuthenticated = false;
            return next();
        }
        
        SessionSecurity.updateSessionActivity(req);
    }
    
    res.locals.user = req.session.user || null;
    res.locals.isAdmin = req.session.user && req.session.user.role === 'admin';
    res.locals.isStaffOrAdmin = req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'staff');
    res.locals.isAuthenticated = !!req.session.user;
    
    // Add session security information for templates
    if (req.session.user) {
        res.locals.sessionInfo = {
            sessionId: req.session.user.sessionId,
            sessionStart: req.session.user.sessionStart,
            lastActivity: req.session.user.lastActivity
        };
    }
    
    next();
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isStaffOrAdmin,
    setUserLocals,
    SessionSecurity
};
