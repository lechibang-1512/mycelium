/**
 * Authentication Service (Sequelize Version)
 * Focused strictly on Authentication (login, logout, session management)
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Session } = require('../models/security');
const { sequelizeSecurity } = require('../config/sequelize');
const RBACService = require('./RBACService');

class AuthService {
    constructor() {
        this.MAX_FAILED_ATTEMPTS = 5;
        this.LOCKOUT_DURATION_MINUTES = 15;
        this.SESSION_DURATION_HOURS = 24;
    }

    async login(username, password, ipAddress = null) {
        try {
            // Find user
            const user = await User.findOne({ where: { username } });

            if (!user) {
                return { success: false, error: 'Invalid username or password' };
            }

            if (!user.is_active) {
                return { success: false, error: 'Account is deactivated' };
            }

            // Check lockout
            if (user.is_locked) {
                return { success: false, error: 'Account is locked. Contact admin.' };
            }

            // Verify password
            const valid = await bcrypt.compare(password, user.password);

            if (!valid) {
                // RC-09: Atomic increment + conditional lock in a single transaction
                await sequelizeSecurity.transaction(async (t) => {
                    // Update failed_login_attempts
                    await user.increment('failed_login_attempts', { by: 1, transaction: t });
                    await user.reload({ transaction: t });
                    if (user.failed_login_attempts >= this.MAX_FAILED_ATTEMPTS) {
                        await user.update({ is_locked: 1 }, { transaction: t });
                    }
                });
                return { success: false, error: 'Invalid username or password' };
            }

            // Reset failed attempts & Update last login
            await user.update({
                failed_login_attempts: 0,
                is_locked: 0,
                last_login: new Date()
            });

            // Create session
            const sessionId = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + (this.SESSION_DURATION_HOURS * 60 * 60 * 1000));

            await Session.create({
                session_id: sessionId,
                user_id: user.user_id,
                expires: expiresAt,
                ip_address: ipAddress,
                is_active: 1,
                created_at: new Date()
            });

            const userObj = {
                id: user.user_id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                full_name: user.full_name,
                is_active: user.is_active,
                last_login: user.last_login
            };

            return {
                success: true,
                user: userObj,
                sessionId
            };

        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Internal server error: ' + error.message };
        }
    }

    async validateSession(sessionId, _ipAddress = null) {
        try {
            const session = await Session.findOne({
                where: {
                    session_id: sessionId
                }
            });

            // Ensure session is not expired
            if (!session || new Date() > new Date(session.expires)) return null;

            const user = await User.findOne({
                where: { user_id: session.user_id }
            });

            if (!user) return null;

            // Fetch user roles for the session
            const rbacService = new RBACService();
            const { roles, permissions } = await rbacService.getUserPermissions(user.user_id);

            return {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                is_active: user.is_active,
                roles: roles.map(r => r.name),
                permissions: permissions.map(p => p.name)
            };
        } catch (error) {
            console.error('Session validation error:', error);
            return null;
        }
    }

    async logout(sessionId) {
        try {
            await Session.destroy({ where: { session_id: sessionId } });
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    }

    async getUserPermissions(userId) {
        const rbacService = new RBACService();
        return rbacService.getUserPermissions(userId);
    }
}

module.exports = AuthService;