const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { isAdmin, isAuthenticated, SessionSecurity } = require('../middleware/auth');
const PasswordValidator = require('../services/PasswordValidator');

// Initialize password validator
const passwordValidator = new PasswordValidator();

module.exports = (authPool, convertBigIntToNumber) => {
    // ===============================================
    // AUTHENTICATION ROUTES
    // ===============================================

    // Login form
    router.get('/login', (req, res) => {
        // If user is already logged in, redirect to home page
        if (req.session.user) {
            return res.redirect('/');
        }
        
        res.render('login', {
            title: 'Login',
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            },
            isAuthenticated: false,
            csrfToken: req.csrfToken()
        });
    });

    // Login process
    router.post('/login', async (req, res) => {
        try {
            const { username, password, rememberMe } = req.body;
            
            const conn = await authPool.getConnection();
            
            // Find user by username
            const result = await conn.query('SELECT * FROM users WHERE username = ?', [username]);
            
            conn.end();
            
            if (result.length === 0) {
                // Log failed login attempt
                if (SessionSecurity.securityLogger) {
                    await SessionSecurity.securityLogger.logSecurityEvent('login_failed', {
                        userId: null,
                        username: username,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        additionalData: { 
                            reason: 'user_not_found',
                            riskScore: 30
                        }
                    });
                }
                
                req.flash('error', 'Invalid username or password');
                return res.redirect('/login');
            }
            
            const user = convertBigIntToNumber(result[0]);
            
            // Check if user account is active
            if (!user.is_active) {
                // Log account lockout attempt
                if (SessionSecurity.securityLogger) {
                    await SessionSecurity.securityLogger.logSecurityEvent('account_lockout', {
                        userId: user.id,
                        username: username,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        additionalData: { 
                            reason: 'inactive_account',
                            riskScore: 70
                        }
                    });
                }
                
                req.flash('error', 'Your account has been deactivated. Please contact an administrator.');
                return res.redirect('/login');
            }
            
            // Check password
            const passwordMatch = await bcrypt.compare(password, user.password);
            
            if (!passwordMatch) {
                // Log failed login attempt
                if (SessionSecurity.securityLogger) {
                    await SessionSecurity.securityLogger.logSecurityEvent('login_failed', {
                        userId: user.id,
                        username: username,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        additionalData: { 
                            reason: 'incorrect_password',
                            riskScore: 50
                        }
                    });
                }
                
                req.flash('error', 'Invalid username or password');
                return res.redirect('/login');
            }
            
            // Store user in session (without password) using enhanced security
            delete user.password;
            const sessionTokens = SessionSecurity.initializeSecureSession(req, user);
            
            // Log successful login
            if (SessionSecurity.securityLogger) {
                await SessionSecurity.securityLogger.logSecurityEvent('login_success', {
                    userId: user.id,
                    username: username,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    additionalData: { 
                        rememberMe: !!rememberMe,
                        sessionToken: sessionTokens.sessionToken.substring(0, 8) + '...',
                        riskScore: 0
                    }
                });
            }
            
            // Set session expiration based on "Remember me" option
            if (rememberMe) {
                // If "Remember me" is checked, set session to expire in 30 days
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
                req.session.user.sessionExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
            } else {
                // Otherwise, use the default session expiration (usually browser close)
                req.session.cookie.expires = false;
                req.session.user.sessionExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours default
            }
            
            // Redirect to returnTo URL if it exists, otherwise to home
            const returnTo = req.session.returnTo || '/';
            delete req.session.returnTo;
            
            // Add success parameter for login notification
            const separator = returnTo.includes('?') ? '&' : '?';
            res.redirect(`${returnTo}${separator}success=login`);
        } catch (err) {
            console.error('Login error:', err);
            
            // Log login error
            if (SessionSecurity.securityLogger) {
                await SessionSecurity.securityLogger.logSecurityEvent('login_error', {
                    userId: null,
                    username: req.body.username || 'unknown',
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    additionalData: { 
                        error: err.message,
                        riskScore: 70
                    }
                });
            }
            
            req.flash('error', 'An error occurred during login');
            res.redirect('/login');
        }
    });

    // Enhanced logout route with secure session clearing
    router.get('/logout', async (req, res) => {
        try {
            const sessionInfo = await SessionSecurity.clearSession(req);
            
            if (sessionInfo) {
                console.log('User logged out:', {
                    userId: sessionInfo.userId,
                    username: sessionInfo.username,
                    sessionToken: sessionInfo.sessionToken.substring(0, 8) + '...'
                });
                
                // Log logout event
                if (SessionSecurity.securityLogger) {
                    await SessionSecurity.securityLogger.logSecurityEvent('logout', {
                        userId: sessionInfo.userId,
                        username: sessionInfo.username,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        additionalData: { 
                            sessionToken: sessionInfo.sessionToken.substring(0, 8) + '...',
                            invalidated: true,
                            riskScore: 0
                        }
                    });
                }
            }
            
            res.redirect('/login?success=logout');
        } catch (err) {
            console.error('Logout error:', err);
            
            // Log logout error but still redirect
            if (SessionSecurity.securityLogger) {
                await SessionSecurity.securityLogger.logSecurityEvent('logout_error', {
                    userId: req.session?.user?.id || null,
                    username: req.session?.user?.username || 'unknown',
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    additionalData: { 
                        error: err.message,
                        riskScore: 40
                    }
                });
            }
            
            // Clear session anyway
            req.session.destroy();
            res.redirect('/login?success=logout');
        }
    });

    // Forgot password route
    router.get('/forgot-password', (req, res) => {
        res.render('forgot-password', {
            title: 'Forgot Password',
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            },
            isAuthenticated: false,
            csrfToken: req.csrfToken()
        });
    });

    // Process forgot password request
    router.post('/forgot-password', async (req, res) => {
        const { email } = req.body;
        
        try {
            const conn = await authPool.getConnection();
            const result = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
            conn.end();
            
            if (result.length === 0) {
                req.flash('error', 'No user found with that email address');
                return res.redirect('/forgot-password');
            }
            
            // In a real application, you would:
            // 1. Generate a reset token
            // 2. Save it to the database with an expiration date
            // 3. Send an email to the user with a reset link
            
            // For now, just show a success message
            req.flash('success', 'If your email is registered in our system, you will receive password reset instructions shortly.');
            res.redirect('/login');
        } catch (err) {
            console.error('Forgot password error:', err);
            req.flash('error', 'An error occurred while processing your request');
            res.redirect('/forgot-password');
        }
    });

    // User profile page
    router.get('/profile', isAuthenticated, (req, res) => {
        res.render('profile', {
            title: 'Profile',
            user: req.session.user,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    });

    // Update user profile
    router.post('/profile/update', isAuthenticated, async (req, res) => {
        const { fullName, email, currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user.id;
        
        try {
            const conn = await authPool.getConnection();
            
            // Update name and email
            await conn.query('UPDATE users SET fullName = ?, email = ? WHERE id = ?', 
                [fullName, email, userId]);
            
            // If user is trying to change password
            if (currentPassword && newPassword && confirmPassword) {
                // Verify current password
                const userResult = await conn.query('SELECT password FROM users WHERE id = ?', [userId]);
                const storedHash = userResult[0].password;
                
                const passwordMatch = await bcrypt.compare(currentPassword, storedHash);
                
                if (!passwordMatch) {
                    conn.end();
                    req.flash('error', 'Current password is incorrect');
                    return res.redirect('/profile');
                }
                
                // Validate password change with enhanced security
                const passwordValidation = passwordValidator.validatePasswordChange(
                    currentPassword, 
                    newPassword, 
                    confirmPassword, 
                    req.session.user.username, 
                    email
                );
                
                if (!passwordValidation.valid) {
                    conn.end();
                    req.flash('error', passwordValidation.errors.join('. '));
                    return res.redirect('/profile');
                }
                
                // Show warnings if any
                if (passwordValidation.warnings.length > 0) {
                    req.flash('warning', passwordValidation.warnings.join('. '));
                }
                
                // Hash and save new password
                const hashedPassword = await bcrypt.hash(newPassword, 12); // Increased from 10 to 12 for better security
                await conn.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
            }
            
            conn.end();
            
            // Update session data
            req.session.user.fullName = fullName;
            req.session.user.email = email;
            
            res.redirect('/profile?success=profile_updated');
        } catch (err) {
            console.error('Profile update error:', err);
            req.flash('error', 'An error occurred while updating your profile');
            res.redirect('/profile');
        }
    });

    // ===============================================
    // NOTE: User management routes moved to /routes/users.js
    // to avoid conflicts and provide more comprehensive functionality
    // ===============================================

    // Session management routes (admin only)
    router.get('/admin/sessions', isAdmin, async (req, res) => {
        try {
            const { SessionSecurity } = require('../middleware/auth');
            const sessionService = SessionSecurity.sessionManagementService;
            
            if (!sessionService) {
                req.flash('error', 'Session management service not available');
                return res.redirect('/');
            }

            const sessionStats = sessionService.getSessionStats();
            const sessionReport = sessionService.generateSessionReport();

            res.render('session-management', {
                title: 'Session Management',
                sessionStats,
                sessionReport,
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error')
                }
            });
        } catch (err) {
            console.error('Session management error:', err);
            req.flash('error', 'Failed to retrieve session information');
            res.redirect('/');
        }
    });

    // Force logout user (admin only)
    router.post('/admin/sessions/logout-user/:userId', isAdmin, async (req, res) => {
        try {
            const { SessionSecurity } = require('../middleware/auth');
            const sessionService = SessionSecurity.sessionManagementService;
            const userId = parseInt(req.params.userId);
            
            if (!sessionService) {
                req.flash('error', 'Session management service not available');
                return res.redirect('/admin/sessions');
            }

            const loggedOutSessions = sessionService.forceLogoutUser(userId);
            
            req.flash('success', `Successfully logged out user from ${loggedOutSessions} sessions`);
            res.redirect('/admin/sessions');
        } catch (err) {
            console.error('Force logout error:', err);
            req.flash('error', 'Failed to logout user sessions');
            res.redirect('/admin/sessions');
        }
    });

    // View user sessions (admin only)
    router.get('/admin/sessions/user/:userId', isAdmin, async (req, res) => {
        try {
            const { SessionSecurity } = require('../middleware/auth');
            const sessionService = SessionSecurity.sessionManagementService;
            const userId = parseInt(req.params.userId);
            
            if (!sessionService) {
                req.flash('error', 'Session management service not available');
                return res.redirect('/admin/sessions');
            }

            // Get user information
            const conn = await authPool.getConnection();
            const userResult = await conn.query('SELECT id, username, fullName, email, role FROM users WHERE id = ?', [userId]);
            conn.end();
            
            if (userResult.length === 0) {
                req.flash('error', 'User not found');
                return res.redirect('/admin/sessions');
            }

            const user = convertBigIntToNumber(userResult[0]);
            const userSessions = sessionService.getUserSessions(userId);

            res.render('user-sessions', {
                title: `Sessions for ${user.username}`,
                user,
                userSessions,
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error')
                }
            });
        } catch (err) {
            console.error('User sessions error:', err);
            req.flash('error', 'Failed to retrieve user session information');
            res.redirect('/admin/sessions');
        }
    });

    return router;
};
