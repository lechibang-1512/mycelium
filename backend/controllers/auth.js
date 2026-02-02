/**
 * Authentication Routes
 * Handles login, logout, and current user endpoints
 */

const express = require('express');
const router = express.Router();
const AuthService = require('../services/AuthService');

module.exports = () => {
    const authService = new AuthService();

    /**
     * POST /api/auth/login
     * Authenticate user and create session
     */
    router.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Username and password are required'
                });
            }

            const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
            const result = await authService.login(username, password, ipAddress);

            if (!result.success) {
                return res.status(401).json(result);
            }

            // Fetch user permissions on login
            let userPermissions = { roles: [], permissions: [] };
            try {
                userPermissions = await authService.getUserPermissions(result.user.id);
            } catch (permErr) {
                console.warn('Could not fetch permissions on login:', permErr.message);
            }

            // Set session cookie
            res.cookie('session_id', result.sessionId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });

            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    ...result.user,
                    roles: userPermissions.roles,
                    permissions: userPermissions.permissions.map(p => p.name)
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Login failed',
                message: error.message
            });
        }
    });

    /**
     * POST /api/auth/logout
     * Invalidate session and clear cookie
     */
    router.post('/logout', async (req, res) => {
        try {
            const sessionId = req.cookies?.session_id;

            if (sessionId) {
                await authService.logout(sessionId);
            }

            // Clear cookie
            res.clearCookie('session_id');

            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                error: 'Logout failed',
                message: error.message
            });
        }
    });

    /**
     * GET /api/auth/me
     * Get current authenticated user with permissions
     */
    router.get('/me', async (req, res) => {
        try {
            const sessionId = req.cookies?.session_id;

            if (!sessionId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }

            // Pass IP address for session fingerprint validation
            const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
            const user = await authService.validateSession(sessionId, ipAddress);

            if (!user) {
                res.clearCookie('session_id');
                return res.status(401).json({
                    success: false,
                    error: 'Session expired or invalid'
                });
            }

            // Fetch user permissions
            let userPermissions = { roles: [], permissions: [] };
            try {
                userPermissions = await authService.getUserPermissions(user.user_id);
            } catch (permErr) {
                console.warn('Could not fetch permissions:', permErr.message);
            }

            res.json({
                success: true,
                user: {
                    ...user,
                    roles: userPermissions.roles,
                    permissions: userPermissions.permissions.map(p => p.name)
                }
            });
        } catch (error) {
            console.error('Auth check error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check authentication',
                message: error.message
            });
        }
    });

    return router;
};
