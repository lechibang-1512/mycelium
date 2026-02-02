/**
 * Authentication Service
 * Focused strictly on Authentication (login, logout, session management)
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');

class AuthService {
    /**
     * @param {Object} pool - Legacy DB pool (ignored)
     */
    constructor(pool = null) {
        // Pool is legacy, we don't use it anymore
        this.MAX_FAILED_ATTEMPTS = 5;
        this.LOCKOUT_DURATION_MINUTES = 15;
        this.SESSION_DURATION_HOURS = 24;
    }

    /**
     * Authenticate user and create session
     * @param {string} username 
     * @param {string} password 
     * @param {string} ipAddress 
     * @returns {Object} Login result
     */
    async login(username, password, ipAddress = null) {
        try {
            // Find user
            const user = await User.findOne({ username });

            if (!user) {
                return { success: false, error: 'Invalid username or password' };
            }

            if (!user.is_active) {
                return { success: false, error: 'Account is deactivated' };
            }

            // Verify password
            // User model instance method comparePassword handles the bcrypt check
            const valid = await user.comparePassword(password);

            if (!valid) {
                await user.recordFailedLogin();
                return { success: false, error: 'Invalid username or password' };
            }

            // Check lockout
            if (user.isLocked()) {
                return { success: false, error: 'Account is locked. Try again later.' };
            }

            // Reset failed attempts on success
            await user.resetFailedLogins();

            // Create session
            const sessionId = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + (this.SESSION_DURATION_HOURS * 60 * 60 * 1000));

            await Session.create({
                session_id: sessionId,
                user_id: user.user_id, // Store legacy integer ID for compatibility if needed, or ObjectId
                expires: expires,
                ip_address: ipAddress,
                user_agent: 'Legacy/Unknown', // Could pass this in if needed
                is_active: true
            });

            // Update last login
            // Using save() trigger or explicit update via User model method
            // The resetFailedLogins already updates last_login

            // Remove password from user object
            const userObj = user.toObject();
            delete userObj.password;

            return {
                success: true,
                user: userObj,
                sessionId
            };

        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Internal server error' };
        }
    }

    /**
     * Validate session and return user
     * @param {string} sessionId 
     * @param {string} ipAddress 
     * @returns {Object|null} User object or null
     */
    async validateSession(sessionId, _ipAddress = null) {
        try {
            const session = await Session.findOne({
                session_id: sessionId,
                expires: { $gt: new Date() }
            });

            if (!session) return null;

            // Find user by integer user_id (as stored in Session)
            const user = await User.findOne({ user_id: session.user_id });

            if (!user) return null;

            const userObj = user.toObject();
            delete userObj.password;

            // Populate roles if needed (not in legacy query but good for future)
            // await user.populate('roles');

            return userObj;

        } catch (error) {
            console.error('Session validation error:', error);
            return null;
        }
    }

    /**
     * Invalidate session
     * @param {string} sessionId 
     */
    async logout(sessionId) {
        try {
            await Session.deleteOne({ session_id: sessionId });
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    }

    /**
     * Get user permissions from Casbin
     * @param {number} userId - User ID
     * @returns {Promise<{roles: Object[], permissions: Object[]}>}
     */
    async getUserPermissions(userId) {
        const CasbinService = require('./CasbinService');
        return CasbinService.getUserPermissions(userId);
    }
}

module.exports = AuthService;