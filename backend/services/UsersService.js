/**
 * Users Service
 * Handles user queries - MongoDB/Mongoose version
 */

const User = require('../models/User');

class UsersService {
    constructor(_pool) {
        // Pool parameter kept for backward compatibility but not used
    }

    /**
     * Get all users
     * @returns {Array} List of users (excluding passwords)
     */
    async getAllUsers() {
        const users = await User.find()
            .select('-password')
            .sort({ created_at: -1 })
            .lean();

        // Map user_id to id for API compatibility
        return users.map(u => ({
            id: u.user_id,
            username: u.username,
            email: u.email,
            role: u.role,
            fullName: u.fullName,
            is_active: u.is_active,
            created_at: u.created_at,
            updated_at: u.updated_at,
            last_login: u.last_login
        }));
    }

    /**
     * Get user by ID
     * @param {number} userId - User ID (legacy integer ID)
     * @returns {Object|null} User object or null if not found
     */
    async getUserById(userId) {
        const user = await User.findOne({ user_id: userId })
            .select('-password')
            .lean();

        if (!user) {
            return null;
        }

        return {
            id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at,
            last_login: user.last_login
        };
    }

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @returns {Object} Created user
     */
    async createUser(userData) {
        const { username, password, email, role, fullName, is_active } = userData;

        // Check if username or email already exists
        const existing = await User.findOne({
            $or: [
                { username },
                { email: email || null }
            ]
        });

        if (existing) {
            return { error: 'Username or email already exists' };
        }

        // Create user - password hashing handled by User model pre-save hook
        const user = await User.create({
            username,
            password,
            email,
            role: role || 'user',
            fullName,
            is_active: is_active !== undefined ? is_active : true
        });

        return {
            id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            is_active: user.is_active
        };
    }

    /**
     * Update a user
     * @param {number} userId - User ID
     * @param {Object} userData - User data to update
     * @returns {Object} Updated user
     */
    async updateUser(userId, userData) {
        const { username, email, role, fullName, password, is_active } = userData;

        // Check if user exists
        const user = await User.findOne({ user_id: userId });

        if (!user) {
            return { error: 'User not found' };
        }

        // Check duplicate username/email if changed
        if (username || email) {
            const duplicate = await User.findOne({
                $or: [
                    { username: username || '' },
                    { email: email || '' }
                ],
                user_id: { $ne: userId }
            });
            if (duplicate) {
                return { error: 'Username or email already in use' };
            }
        }

        // Update fields
        if (username) user.username = username;
        if (email) user.email = email;
        if (role) user.role = role;
        if (fullName) user.fullName = fullName;
        if (is_active !== undefined) user.is_active = is_active;
        if (password) user.password = password; // Will be hashed by pre-save hook

        await user.save();

        return { success: true };
    }

    /**
     * Delete a user
     * @param {number} userId - User ID
     * @returns {Object} Success status
     */
    async deleteUser(userId) {
        const result = await User.deleteOne({ user_id: userId });

        if (result.deletedCount === 0) {
            return { error: 'User not found' };
        }

        return { success: true };
    }
}

module.exports = UsersService;
