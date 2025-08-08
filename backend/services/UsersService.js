/**
 * Users Service (Sequelize Version)
 * Handles user queries and management
 */

const { Op } = require('sequelize');
const { User, Role, UserRole } = require('../models/security');
const bcrypt = require('bcryptjs');
const { generateId } = require('../utils/generateId');
const { ValidationError } = require('../utils/errors');


class UsersService {
    constructor() { }

    async getAllUsers() {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'fullName', 'is_active', 'last_login', 'created_at', 'updated_at'],
            include: [{
                model: Role,
                attributes: ['name'],
                through: { attributes: [] }
            }],
            order: [['created_at', 'DESC']]
        });

        return users.map((u) => ({
            id: u.id,
            user_id: u.id,
            username: u.username,
            email: u.email,
            roles: u.Roles ? u.Roles.map(r => r.name) : [],
            fullName: u.fullName,
            full_name: u.fullName,
            is_active: !!u.is_active,
            created_at: u.created_at,
            updated_at: u.updated_at,
            last_login: u.last_login
        }));
    }

    async getUserById(userId) {
        if (!userId) return null;

        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'email', 'fullName', 'is_active', 'last_login', 'created_at', 'updated_at'],
            include: [{
                model: Role,
                attributes: ['name'],
                through: { attributes: [] }
            }]
        });

        if (!user) return null;

        return {
            id: user.id,
            user_id: user.id,
            username: user.username,
            email: user.email,
            roles: user.Roles ? user.Roles.map(r => r.name) : [],
            fullName: user.fullName,
            full_name: user.fullName,
            is_active: !!user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at,
            last_login: user.last_login
        };
    }

    async createUser(userData) {
        const { username, password, email, fullName, is_active } = userData;

        if (!username || !password) throw new ValidationError('username and password are required');

        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const userId = generateId();
            await User.create({
                id: userId,
                username,
                password: hashedPassword,
                email,
                fullName,
                is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1
            });

            // Assign default 'user' role if it exists
            const defaultRole = await Role.findOne({ where: { name: 'user' } });
            if (defaultRole) {
                await UserRole.create({ user_id: userId, role_id: defaultRole.role_id });
            }

            return {
                id: userId,
                user_id: userId,
                username,
                email,
                roles: defaultRole ? ['user'] : [],
                fullName,
                full_name: fullName,
                is_active: is_active !== undefined ? is_active : true
            };
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062 || (err.original && err.original.errno === 1062)) {
                return { error: 'Username or email already exists' };
            }
            throw err;
        }
    }

    async updateUser(userId, userData) {
        const { username, email, fullName, password, is_active } = userData;

        const user = await User.findByPk(userId, { attributes: ['id'] });
        if (!user) return { error: 'User not found' };

        if (username || email) {
            const dup = await User.findOne({
                where: {
                    [Op.or]: [{ username: username || '' }, { email: email || '' }],
                    id: { [Op.ne]: userId }
                },
                attributes: ['id']
            });
            if (dup) return { error: 'Username or email already in use' };
        }

        const updateData = {};

        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (fullName) updateData.fullName = fullName;
        if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        if (Object.keys(updateData).length === 0) return { success: true };

        await User.update(updateData, { where: { id: userId } });
        return { success: true };
    }

    async deleteUser(userId) {
        await User.destroy({ where: { id: userId } });
        return { success: true };
    }
}

module.exports = UsersService;
