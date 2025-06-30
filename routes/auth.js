const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { isAdmin, isAuthenticated } = require('../middleware/auth');

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
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }
        });
    });

    // Login process
    router.post('/login', async (req, res) => {
        try {
            const { username, password, rememberMe } = req.body;
            
            // Add debug logging
            console.log('=== LOGIN ATTEMPT ===');
            console.log('Username:', username);
            console.log('Password provided:', password ? 'Yes' : 'No');
            console.log('Remember Me:', rememberMe);
            
            const conn = await authPool.getConnection();
            
            // Find user by username
            const result = await conn.query('SELECT * FROM users WHERE username = ?', [username]);
            console.log('User query result length:', result.length);
            
            conn.end();
            
            if (result.length === 0) {
                console.log('No user found with username:', username);
                req.flash('error', 'Invalid username or password');
                return res.redirect('/login');
            }
            
            const user = convertBigIntToNumber(result[0]);
            console.log('Found user:', user.username, 'Role:', user.role);
            
            // Check password
            console.log('Comparing password with hash...');
            const passwordMatch = await bcrypt.compare(password, user.password);
            console.log('Password match result:', passwordMatch);
            
            if (!passwordMatch) {
                console.log('Password does not match for user:', username);
                req.flash('error', 'Invalid username or password');
                return res.redirect('/login');
            }
            
            console.log('Login successful for user:', username);
            
            // Store user in session (without password)
            delete user.password;
            req.session.user = user;
            
            // Set session expiration based on "Remember me" option
            if (rememberMe) {
                // If "Remember me" is checked, set session to expire in 30 days
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            } else {
                // Otherwise, use the default session expiration (usually browser close)
                req.session.cookie.expires = false;
            }
            
            // Redirect to returnTo URL if it exists, otherwise to home
            const returnTo = req.session.returnTo || '/';
            delete req.session.returnTo;
            
            console.log('Redirecting to:', returnTo);
            res.redirect(returnTo);
        } catch (err) {
            console.error('Login error:', err);
            req.flash('error', 'An error occurred during login');
            res.redirect('/login');
        }
    });

    // Logout route
    router.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/login?logout=true');
    });

    // Forgot password route
    router.get('/forgot-password', (req, res) => {
        res.render('forgot-password', {
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }
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
                
                // Check if new passwords match
                if (newPassword !== confirmPassword) {
                    conn.end();
                    req.flash('error', 'New passwords do not match');
                    return res.redirect('/profile');
                }
                
                // Hash and save new password
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                await conn.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
            }
            
            conn.end();
            
            // Update session data
            req.session.user.fullName = fullName;
            req.session.user.email = email;
            
            req.flash('success', 'Profile updated successfully');
            res.redirect('/profile');
        } catch (err) {
            console.error('Profile update error:', err);
            req.flash('error', 'An error occurred while updating your profile');
            res.redirect('/profile');
        }
    });

    // ===============================================
    // USER MANAGEMENT ROUTES (ADMIN ONLY)
    // ===============================================

    // User listing page (admin only)
    router.get('/users', isAdmin, async (req, res) => {
        try {
            const conn = await authPool.getConnection();
            const usersResult = await conn.query('SELECT id, username, fullName, email, role, createdAt FROM users');
            const users = convertBigIntToNumber(usersResult);
            conn.end();
            
            res.render('user-management', {
                users,
                messages: {
                    success: req.flash('success'),
                    error: req.flash('error')
                }
            });
        } catch (err) {
            console.error('User management error:', err);
            req.flash('error', 'Failed to retrieve user list');
            res.redirect('/');
        }
    });

    // Create user form (admin only)
    router.get('/users/add', isAdmin, (req, res) => {
        res.render('user-form', {
            user: null,
            title: 'Create New User',
            messages: {
                error: req.flash('error')
            }
        });
    });

    // Edit user form (admin only)
    router.get('/users/edit/:id', isAdmin, async (req, res) => {
        try {
            const conn = await authPool.getConnection();
            const userResult = await conn.query('SELECT id, username, fullName, email, role FROM users WHERE id = ?', [req.params.id]);
            conn.end();
            
            if (userResult.length === 0) {
                req.flash('error', 'User not found');
                return res.redirect('/users');
            }
            
            const user = convertBigIntToNumber(userResult[0]);
            
            res.render('user-form', {
                user,
                title: 'Edit User',
                messages: {
                    error: req.flash('error')
                }
            });
        } catch (err) {
            console.error('Edit user error:', err);
            req.flash('error', 'Failed to retrieve user information');
            res.redirect('/users');
        }
    });

    // Create user (admin only)
    router.post('/users', isAdmin, async (req, res) => {
        try {
            const { username, password, fullName, email, role } = req.body;
            
            // Check if username already exists
            const conn = await authPool.getConnection();
            const existingUser = await conn.query('SELECT * FROM users WHERE username = ?', [username]);
            
            if (existingUser.length > 0) {
                conn.end();
                req.flash('error', 'Username already exists');
                return res.redirect('/users/add');
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Create new user
            await conn.query(
                'INSERT INTO users (username, password, fullName, email, role) VALUES (?, ?, ?, ?, ?)',
                [username, hashedPassword, fullName, email, role]
            );
            
            conn.end();
            
            req.flash('success', 'User created successfully');
            res.redirect('/users');
        } catch (err) {
            console.error('Create user error:', err);
            req.flash('error', 'Failed to create user');
            res.redirect('/users/add');
        }
    });

    // Update user (admin only)
    router.post('/users/:id', isAdmin, async (req, res) => {
        try {
            const userId = req.params.id;
            const { fullName, email, role, password } = req.body;
            
            const conn = await authPool.getConnection();
            
            // If password is provided, update it
            if (password && password.trim() !== '') {
                const hashedPassword = await bcrypt.hash(password, 10);
                await conn.query(
                    'UPDATE users SET fullName = ?, email = ?, role = ?, password = ? WHERE id = ?',
                    [fullName, email, role, hashedPassword, userId]
                );
            } else {
                // Otherwise just update the other fields
                await conn.query(
                    'UPDATE users SET fullName = ?, email = ?, role = ? WHERE id = ?',
                    [fullName, email, role, userId]
                );
            }
            
            conn.end();
            
            req.flash('success', 'User updated successfully');
            res.redirect('/users');
        } catch (err) {
            console.error('Update user error:', err);
            req.flash('error', 'Failed to update user');
            res.redirect(`/users/edit/${req.params.id}`);
        }
    });

    // Delete user (admin only)
    router.post('/users/:id/delete', isAdmin, async (req, res) => {
        try {
            const userId = req.params.id;
            
            // Don't allow deleting yourself
            if (parseInt(userId) === req.session.user.id) {
                req.flash('error', 'You cannot delete your own account');
                return res.redirect('/users');
            }
            
            const conn = await authPool.getConnection();
            await conn.query('DELETE FROM users WHERE id = ?', [userId]);
            conn.end();
            
            req.flash('success', 'User deleted successfully');
            res.redirect('/users');
        } catch (err) {
            console.error('Delete user error:', err);
            req.flash('error', 'Failed to delete user');
            res.redirect('/users');
        }
    });

    return router;
};
