const asyncHandler = require('../utils/asyncHandler');
const express = require('express');
const router = express.Router();
const UsersService = require('../services/UsersService');
const SanitizationService = require('../services/SanitizationService');
const { requirePermission } = require('../middleware/rbacMiddleware');

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
    const usersService = new UsersService();

    /**
     * Get all users
     * AUTHENTICATION DISABLED - Direct DB access enabled
     */
    router.get('/', requirePermission('users:read'), asyncHandler(async (req, res) => {
        try {
            const users = await usersService.getAllUsers();

            res.json({
                success: true,
                users: convertBigIntToNumber(users)
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({
                error: 'Failed to fetch users',
                message: error.message
            });
        }
    }));

    /**
     * Get user by ID
     * AUTHENTICATION DISABLED - Direct DB access enabled
     */
    router.get('/:id', requirePermission('users:read'), asyncHandler(async (req, res) => {
        try {
            const userId = req.params.id;

            if (!userId) {
                return res.status(400).json({
                    error: 'Invalid user ID',
                    message: 'User ID is required'
                });
            }

            const result = await usersService.getUserById(userId);

            if (!result) {
                return res.status(404).json({
                    error: 'User not found',
                    message: `No user found with ID ${userId}`
                });
            }

            res.json({
                user: result
            });
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({
                error: 'Failed to fetch user',
                message: error.message
            });
        }
    }));

    /**
         * Create user
         * Validates required fields and password strength
         */
    router.post('/', requirePermission('users:write'), asyncHandler(async (req, res) => {
        try {
            const { username, password, email, fullName, role } = req.body;

            // Validate required fields
            if (!username || typeof username !== 'string' || username.trim().length < 3) {
                return res.status(400).json({
                    error: 'Invalid username',
                    message: 'Username is required and must be at least 3 characters'
                });
            }

            if (!password || typeof password !== 'string') {
                return res.status(400).json({
                    error: 'Invalid password',
                    message: 'Password is required'
                });
            }

            // Password strength validation
            if (password.length < 8) {
                return res.status(400).json({
                    error: 'Weak password',
                    message: 'Password must be at least 8 characters long'
                });
            }

            if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
                return res.status(400).json({
                    error: 'Weak password',
                    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
                });
            }

            // Validate email format if provided
            if (email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                return res.status(400).json({
                    error: 'Invalid email',
                    message: 'Please provide a valid email address'
                });
            }

            // Sanitize input - only allow expected fields
            const sanitizedData = {
                username: username.trim(),
                password,
                email: email ? email.trim() : undefined,
                fullName: fullName ? fullName.trim() : undefined,
                role: role || 'user' // Default to 'user' role
            };

            // Prevent privilege escalation - only admin can create admin users
            // This should be enhanced with proper auth context check
            if (sanitizedData.role === 'admin') {
                // For now, log a warning - proper implementation needs auth context
                console.warn('User creation with admin role requested - ensure proper authorization');
            }

            const result = await usersService.createUser(sanitizedData);
            if (result.error) {
                return res.status(400).json(result);
            }

            // Remove password from response
            const { password: _, ...userWithoutPassword } = result;

            res.status(201).json({
                success: true,
                user: convertBigIntToNumber(userWithoutPassword)
            });
        } catch (error) {
            console.error('Error creating user:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    error: 'Username or email already exists',
                    message: 'A user with this username or email already exists'
                });
            }
            res.status(500).json({ error: 'Failed to create user', message: error.message });
        }
    }));

    /**
     * Update user
     */
    router.put('/:id', requirePermission('users:write'), asyncHandler(async (req, res) => {
        try {
            const userId = req.params.id;
            const result = await usersService.updateUser(userId, req.body);
            if (result.error) {
                const status = result.error === 'User not found' ? 404 : 400;
                return res.status(status).json(result);
            }
            res.json(result);
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ error: 'Failed to update user', message: error.message });
        }
    }));

    /**
     * Delete user
     */
    router.delete('/:id', requirePermission('users:delete'), asyncHandler(async (req, res) => {
        try {
            const userId = req.params.id;
            const result = await usersService.deleteUser(userId);
            if (result.error) {
                return res.status(404).json(result);
            }
            res.json(result);
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ error: 'Failed to delete user', message: error.message });
        }
    }));

    return router;
};
