/**
 * User Management Routes
 * Comprehensive CRUD operations for user management
 * Enhanced with advanced security, search, filtering, and bulk operations
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { isAdmin, isAuthenticated, SessionSecurity } = require('../middleware/auth');
const InputValidator = require('../middleware/inputValidation');
const PasswordValidator = require('../services/PasswordValidator');

// Initialize password validator
const passwordValidator = new PasswordValidator();

module.exports = (authPool, convertBigIntToNumber) => {
    // ===============================================
    // USER LISTING AND SEARCH
    // ===============================================
    
    // User listing page with search, pagination, and filtering
    router.get('/users', isAdmin, async (req, res, next) => {
        try {
            const conn = await authPool.getConnection();
            
            // Get query parameters with defaults
            const search = req.query.search || '';
            const role = req.query.role || '';
            const status = req.query.status || '';
            const sortBy = req.query.sortBy || 'created_at';
            const sortOrder = req.query.sortOrder || 'DESC';
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;

            // Build query with filters
            let query = `
                SELECT id, username, fullName, email, role, created_at, updated_at, 
                       last_login, failed_login_attempts, is_active,
                       CASE WHEN locked_until > NOW() THEN 1 ELSE 0 END as is_locked
                FROM users 
                WHERE 1=1
            `;
            let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
            let params = [];
            let countParams = [];

            // Add search filter
            if (search) {
                const searchCondition = ' AND (username LIKE ? OR fullName LIKE ? OR email LIKE ?)';
                const searchParam = `%${search}%`;
                query += searchCondition;
                countQuery += searchCondition;
                params.push(searchParam, searchParam, searchParam);
                countParams.push(searchParam, searchParam, searchParam);
            }

            // Add role filter
            if (role) {
                query += ' AND role = ?';
                countQuery += ' AND role = ?';
                params.push(role);
                countParams.push(role);
            }

            // Add status filter
            if (status === 'active') {
                query += ' AND is_active = 1 AND (locked_until IS NULL OR locked_until <= NOW())';
                countQuery += ' AND is_active = 1 AND (locked_until IS NULL OR locked_until <= NOW())';
            } else if (status === 'inactive') {
                query += ' AND is_active = 0';
                countQuery += ' AND is_active = 0';
            } else if (status === 'locked') {
                query += ' AND locked_until > NOW()';
                countQuery += ' AND locked_until > NOW()';
            }

            // Add sorting
            const allowedSortFields = ['username', 'fullName', 'email', 'role', 'created_at', 'last_login'];
            const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
            const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
            
            query += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
            params.push(limit, offset);

            // Execute queries
            const users = await conn.query(query, params);
            const totalResult = await conn.query(countQuery, countParams);
            const total = totalResult[0].total;

            // Calculate pagination
            const totalPages = Math.ceil(total / limit);
            const hasNext = page < totalPages;
            const hasPrev = page > 1;

            // Get user statistics
            const statsResult = await conn.query(`
                SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
                    SUM(CASE WHEN role = 'staff' THEN 1 ELSE 0 END) as staff_count,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
                    SUM(CASE WHEN locked_until > NOW() THEN 1 ELSE 0 END) as locked_count,
                    SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active_30_days
                FROM users
            `);

            conn.end();

            res.render('users/index', {
                title: 'User Management',
                users: convertBigIntToNumber(users),
                stats: convertBigIntToNumber(statsResult[0]),
                pagination: {
                    current: page,
                    total: totalPages,
                    hasNext,
                    hasPrev,
                    totalRecords: total
                },
                filters: {
                    search,
                    role,
                    status,
                    sortBy: safeSortBy,
                    sortOrder: safeSortOrder,
                    limit
                },
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error'),
                    warning: req.flash('warning')
                },
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('User listing error:', err);
            next(err);
        }
    });

    // ===============================================
    // CREATE USER
    // ===============================================
    
    // Create user form
    router.get('/users/new', isAdmin, (req, res) => {
        res.render('users/form', {
            title: 'Create New User',
            user: null,
            action: 'create',
            messages: {
                error: req.flash('error'),
                warning: req.flash('warning')
            },
            csrfToken: req.csrfToken()
        });
    });

    // ===============================================
    // USER DETAILS VIEW
    // ===============================================
    
    // View individual user details
    router.get('/users/:id', isAdmin, async (req, res, next) => {
        try {
            const conn = await authPool.getConnection();
            const userId = req.params.id;

            // Get user details
            const userResult = await conn.query(`
                SELECT id, username, fullName, email, role, created_at, updated_at, 
                       last_login, failed_login_attempts, is_active, locked_until
                FROM users 
                WHERE id = ?
            `, [userId]);

            if (userResult.length === 0) {
                req.flash('error', 'User not found');
                return res.redirect('/users');
            }

            const user = convertBigIntToNumber(userResult[0]);

            // Get user's recent security events
            const securityEvents = await conn.query(`
                SELECT event_type, ip_address, user_agent, details, risk_level, created_at
                FROM security_events 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 20
            `, [userId]);

            // Get user's session information if available
            const { SessionSecurity } = require('../middleware/auth');
            const sessionService = SessionSecurity.sessionManagementService;
            let userSessions = [];
            
            if (sessionService) {
                userSessions = sessionService.getUserSessions(parseInt(userId)) || [];
            }

            conn.end();

            res.render('users/details', {
                title: `User Details - ${user.fullName}`,
                user,
                securityEvents: convertBigIntToNumber(securityEvents),
                userSessions,
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error'),
                    warning: req.flash('warning')
                },
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('User details error:', err);
            req.flash('error', 'Failed to retrieve user details');
            res.redirect('/users');
        }
    });

    // Process user creation
    router.post('/users', isAdmin, InputValidator.validateUserRegistration, async (req, res) => {
        try {
            const { username, password, fullName, email, role } = req.body;

            // Additional password validation
            const passwordValidation = passwordValidator.validatePassword(password, username, email);
            
            if (!passwordValidation.valid) {
                req.flash('error', passwordValidation.errors.join('. '));
                return res.redirect('/users/new');
            }
            
            if (passwordValidation.warnings.length > 0) {
                req.flash('warning', passwordValidation.warnings.join('. '));
            }

            const conn = await authPool.getConnection();

            // Check for duplicate username
            const existingUser = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
            if (existingUser.length > 0) {
                conn.end();
                req.flash('error', 'Username already exists');
                return res.redirect('/users/new');
            }

            // Check for duplicate email
            const existingEmail = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
            if (existingEmail.length > 0) {
                conn.end();
                req.flash('error', 'Email address already exists');
                return res.redirect('/users/new');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create user
            const result = await conn.query(`
                INSERT INTO users (username, password, fullName, email, role, is_active) 
                VALUES (?, ?, ?, ?, ?, 1)
            `, [username, hashedPassword, fullName, email, role]);

            conn.end();

            // Log user creation
            console.log(`✅ New user created: ${username} (${role}) by admin: ${req.session.user.username}`);
            
            if (SessionSecurity.securityLogger) {
                await SessionSecurity.securityLogger.logSecurityEvent('user_created', {
                    userId: req.session.user.id,
                    username: req.session.user.username,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    additionalData: {
                        createdUserId: convertBigIntToNumber(result.insertId),
                        createdUsername: username,
                        createdRole: role,
                        riskScore: 0
                    }
                });
            }

            req.flash('success', `User "${fullName}" created successfully`);
            res.redirect(`/users/${convertBigIntToNumber(result.insertId)}`);
        } catch (err) {
            console.error('Create user error:', err);
            req.flash('error', 'Failed to create user');
            res.redirect('/users/new');
        }
    });

    // ===============================================
    // UPDATE USER
    // ===============================================
    
    // Edit user form
    router.get('/users/:id/edit', isAdmin, async (req, res, next) => {
        try {
            const conn = await authPool.getConnection();
            const userResult = await conn.query(`
                SELECT id, username, fullName, email, role, is_active 
                FROM users 
                WHERE id = ?
            `, [req.params.id]);
            
            conn.end();

            if (userResult.length === 0) {
                req.flash('error', 'User not found');
                return res.redirect('/users');
            }

            const user = convertBigIntToNumber(userResult[0]);

            res.render('users/form', {
                title: `Edit User - ${user.fullName}`,
                user,
                action: 'edit',
                messages: {
                    error: req.flash('error'),
                    warning: req.flash('warning')
                },
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Edit user form error:', err);
            req.flash('error', 'Failed to load user for editing');
            res.redirect('/users');
        }
    });

    // Process user update (POST route to match the form action)
    router.post('/users/:id/update', isAdmin, async (req, res) => {
        try {
            const userId = req.params.id;
            const { fullName, email, role, password, isActive } = req.body;

            const conn = await authPool.getConnection();

            // Check if user exists
            const userResult = await conn.query('SELECT username, email FROM users WHERE id = ?', [userId]);
            if (userResult.length === 0) {
                conn.end();
                req.flash('error', 'User not found');
                return res.redirect('/users');
            }

            const currentUser = userResult[0];
            let updateFields = [];
            let updateValues = [];

            // Always update basic fields
            updateFields.push('fullName = ?', 'email = ?', 'role = ?', 'is_active = ?');
            updateValues.push(fullName, email, role, isActive ? 1 : 0);

            // Handle password update if provided
            if (password && password.trim() !== '') {
                const passwordValidation = passwordValidator.validatePassword(
                    password, 
                    currentUser.username, 
                    email || currentUser.email
                );

                if (!passwordValidation.valid) {
                    conn.end();
                    req.flash('error', passwordValidation.errors.join('. '));
                    return res.redirect(`/users/${userId}/edit`);
                }

                if (passwordValidation.warnings.length > 0) {
                    req.flash('warning', passwordValidation.warnings.join('. '));
                }

                const hashedPassword = await bcrypt.hash(password, 12);
                updateFields.push('password = ?');
                updateValues.push(hashedPassword);
                
                console.log(`🔄 Password updated for user ID: ${userId} by admin: ${req.session.user.username}`);
            }

            // Check for duplicate email (excluding current user)
            if (email !== currentUser.email) {
                const existingEmail = await conn.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
                if (existingEmail.length > 0) {
                    conn.end();
                    req.flash('error', 'Email address already exists');
                    return res.redirect(`/users/${userId}/edit`);
                }
            }

            updateValues.push(userId);

            // Update user
            await conn.query(
                `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                updateValues
            );

            conn.end();

            // Log user update
            if (SessionSecurity.securityLogger) {
                await SessionSecurity.securityLogger.logSecurityEvent('user_updated', {
                    userId: req.session.user.id,
                    username: req.session.user.username,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    additionalData: {
                        updatedUserId: userId,
                        updatedFields: updateFields,
                        passwordChanged: password && password.trim() !== '',
                        riskScore: 10
                    }
                });
            }

            req.flash('success', 'User updated successfully');
            res.redirect(`/users/${userId}`);
        } catch (err) {
            console.error('Update user error:', err);
            req.flash('error', 'Failed to update user');
            res.redirect(`/users/${req.params.id}/edit`);
        }
    });

    // ===============================================
    // DELETE USER
    // ===============================================
    
    // Delete user
    router.delete('/users/:id', isAdmin, async (req, res) => {
        try {
            const userId = req.params.id;

            // Prevent self-deletion
            if (parseInt(userId) === req.session.user.id) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'You cannot delete your own account' 
                });
            }

            const conn = await authPool.getConnection();

            // Get user info before deletion
            const userResult = await conn.query('SELECT username, fullName FROM users WHERE id = ?', [userId]);
            if (userResult.length === 0) {
                conn.end();
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }

            const user = userResult[0];

            // Force logout user if they have active sessions
            const { SessionSecurity } = require('../middleware/auth');
            const sessionService = SessionSecurity.sessionManagementService;
            if (sessionService) {
                sessionService.forceLogoutUser(parseInt(userId));
            }

            // Delete user
            await conn.query('DELETE FROM users WHERE id = ?', [userId]);
            conn.end();

            // Log user deletion
            console.log(`🗑️ User deleted: ${user.username} by admin: ${req.session.user.username}`);
            
            if (SessionSecurity.securityLogger) {
                await SessionSecurity.securityLogger.logSecurityEvent('user_deleted', {
                    userId: req.session.user.id,
                    username: req.session.user.username,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    additionalData: {
                        deletedUserId: userId,
                        deletedUsername: user.username,
                        deletedFullName: user.fullName,
                        riskScore: 30
                    }
                });
            }

            res.json({ 
                success: true, 
                message: `User "${user.fullName}" deleted successfully` 
            });
        } catch (err) {
            console.error('Delete user error:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to delete user' 
            });
        }
    });

    // ===============================================
    // USER ACCOUNT MANAGEMENT
    // ===============================================
    
    // Toggle user active status
    router.post('/users/:id/toggle-status', isAdmin, async (req, res) => {
        try {
            const userId = req.params.id;

            // Prevent deactivating own account
            if (parseInt(userId) === req.session.user.id) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'You cannot deactivate your own account' 
                });
            }

            const conn = await authPool.getConnection();

            // Get current status
            const userResult = await conn.query('SELECT username, fullName, is_active FROM users WHERE id = ?', [userId]);
            if (userResult.length === 0) {
                conn.end();
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }

            const user = userResult[0];
            const newStatus = !user.is_active;

            // Update status
            await conn.query('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, userId]);
            conn.end();

            // Force logout if deactivating
            if (!newStatus) {
                const { SessionSecurity } = require('../middleware/auth');
                const sessionService = SessionSecurity.sessionManagementService;
                if (sessionService) {
                    sessionService.forceLogoutUser(parseInt(userId));
                }
            }

            // Log status change
            if (SessionSecurity.securityLogger) {
                await SessionSecurity.securityLogger.logSecurityEvent('user_status_changed', {
                    userId: req.session.user.id,
                    username: req.session.user.username,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    additionalData: {
                        targetUserId: userId,
                        targetUsername: user.username,
                        newStatus: newStatus ? 'active' : 'inactive',
                        riskScore: 20
                    }
                });
            }

            res.json({ 
                success: true, 
                newStatus,
                message: `User "${user.fullName}" ${newStatus ? 'activated' : 'deactivated'} successfully`
            });
        } catch (err) {
            console.error('Toggle user status error:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to update user status' 
            });
        }
    });

    // Reset user failed login attempts
    router.post('/users/:id/reset-failed-attempts', isAdmin, async (req, res) => {
        try {
            const userId = req.params.id;

            const conn = await authPool.getConnection();

            // Get user info
            const userResult = await conn.query('SELECT username, fullName FROM users WHERE id = ?', [userId]);
            if (userResult.length === 0) {
                conn.end();
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }

            const user = userResult[0];

            // Reset failed attempts and unlock account
            await conn.query(`
                UPDATE users 
                SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [userId]);
            
            conn.end();

            // Log reset action
            if (SessionSecurity.securityLogger) {
                await SessionSecurity.securityLogger.logSecurityEvent('user_unlocked', {
                    userId: req.session.user.id,
                    username: req.session.user.username,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    additionalData: {
                        unlockedUserId: userId,
                        unlockedUsername: user.username,
                        riskScore: 10
                    }
                });
            }

            res.json({ 
                success: true, 
                message: `Account unlocked for "${user.fullName}"` 
            });
        } catch (err) {
            console.error('Reset failed attempts error:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to reset failed login attempts' 
            });
        }
    });

    // ===============================================
    // BULK OPERATIONS
    // ===============================================
    
    // Bulk user operations
    router.post('/users/bulk-action', isAdmin, async (req, res) => {
        try {
            const { action, userIds } = req.body;

            if (!userIds || userIds.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'No users selected' 
                });
            }

            // Prevent operations on own account
            const currentUserId = req.session.user.id;
            if (userIds.includes(currentUserId.toString())) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Cannot perform bulk operations on your own account' 
                });
            }

            const conn = await authPool.getConnection();
            let result = { success: true, message: '', affected: 0 };

            switch (action) {
                case 'activate':
                    const activateResult = await conn.query(`
                        UPDATE users 
                        SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
                        WHERE id IN (${userIds.map(() => '?').join(',')})
                    `, userIds);
                    result.affected = activateResult.affectedRows;
                    result.message = `${result.affected} user(s) activated successfully`;
                    break;

                case 'deactivate':
                    const deactivateResult = await conn.query(`
                        UPDATE users 
                        SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
                        WHERE id IN (${userIds.map(() => '?').join(',')})
                    `, userIds);
                    result.affected = deactivateResult.affectedRows;
                    result.message = `${result.affected} user(s) deactivated successfully`;
                    
                    // Force logout deactivated users
                    const { SessionSecurity } = require('../middleware/auth');
                    const sessionService = SessionSecurity.sessionManagementService;
                    if (sessionService) {
                        userIds.forEach(userId => {
                            sessionService.forceLogoutUser(parseInt(userId));
                        });
                    }
                    break;

                case 'unlock':
                    const unlockResult = await conn.query(`
                        UPDATE users 
                        SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP 
                        WHERE id IN (${userIds.map(() => '?').join(',')})
                    `, userIds);
                    result.affected = unlockResult.affectedRows;
                    result.message = `${result.affected} user(s) unlocked successfully`;
                    break;

                default:
                    conn.end();
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Invalid action' 
                    });
            }

            conn.end();

            // Log bulk action
            if (SessionSecurity.securityLogger) {
                await SessionSecurity.securityLogger.logSecurityEvent('users_bulk_action', {
                    userId: req.session.user.id,
                    username: req.session.user.username,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    additionalData: {
                        action,
                        targetUserIds: userIds,
                        affectedCount: result.affected,
                        riskScore: 25
                    }
                });
            }

            res.json(result);
        } catch (err) {
            console.error('Bulk user action error:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to perform bulk action' 
            });
        }
    });

    return router;
};
