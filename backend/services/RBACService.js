/**
 * RBAC Service
 * Manages roles, permissions, and user-role assignments
 * Uses Sequelize ORM exclusively — no raw SQL queries.
 */

const { Op } = require('sequelize');
const { Role, Permission, RolePermission, UserRole, User } = require('../models/security');
const { generateId } = require('../utils/generateId');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

class RBACService {
    constructor() { }

    // ========================================================================
    // ROLES
    // ========================================================================

    async getAllRoles() {
        const roles = await Role.findAll({
            include: [{
                model: Permission,
                attributes: ['permission_id'],
                through: { attributes: [] }
            }],
            order: [['name', 'ASC']]
        });


        return roles.map(r => ({
            role_id: r.role_id,
            name: r.name,
            description: r.description,
            created_at: r.created_at,
            updated_at: r.updated_at,
            permission_count: r.Permissions ? r.Permissions.length : 0
        }));
    }

    async getRoleById(roleId) {
        if (!roleId) throw new ValidationError('Role ID is required');

        const role = await Role.findByPk(roleId, {
            include: [{
                model: Permission,
                attributes: ['permission_id', 'name', 'description', 'resource', 'action'],
                through: { attributes: [] }
            }]
        });

        if (!role) throw new NotFoundError('Role not found');

        return {
            role_id: role.role_id,
            name: role.name,
            description: role.description,
            created_at: role.created_at,
            updated_at: role.updated_at,
            permissions: role.Permissions.map(p => ({
                permission_id: p.permission_id,
                name: p.name,
                description: p.description,
                category: p.resource,
                resource: p.resource,
                action: p.action,
            }))
        };
    }

    async createRole({ name, description }) {
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            throw new ValidationError('Role name is required and must be at least 2 characters');
        }

        const existing = await Role.findOne({ where: { name: name.trim() } });
        if (existing) throw new ConflictError('A role with this name already exists');

        const role = await Role.create({
            role_id: generateId(),
            name: name.trim(),
            description: description || null,
        });

        return {
            role_id: role.role_id,
            name: role.name,
            description: role.description,
        };
    }

    async updateRole(roleId, { name, description }) {
        if (!roleId) throw new ValidationError('Role ID is required');

        const role = await Role.findByPk(roleId);
        if (!role) throw new NotFoundError('Role not found');

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length < 2) {
                throw new ValidationError('Role name must be at least 2 characters');
            }
            const dup = await Role.findOne({
                where: { name: name.trim(), role_id: { [Op.ne]: roleId } }
            });
            if (dup) throw new ConflictError('A role with this name already exists');
            role.name = name.trim();
        }

        if (description !== undefined) {
            role.description = description;
        }

        await role.save();
        return { success: true };
    }

    async deleteRole(roleId) {
        if (!roleId) throw new ValidationError('Role ID is required');

        const role = await Role.findByPk(roleId);
        if (!role) throw new NotFoundError('Role not found');

        await role.destroy();
        return { success: true };
    }

    // ========================================================================
    // PERMISSIONS
    // ========================================================================

    async getAllPermissions() {
        const permissions = await Permission.findAll({
            order: [['resource', 'ASC'], ['name', 'ASC']]
        });

        return permissions.map(p => ({
            ...p.get({ plain: true }),
            permission_id: p.permission_id,
            category: p.category
        }));
    }

    async getPermissionsByCategory() {
        const permissions = await this.getAllPermissions();

        const grouped = {};
        for (const perm of permissions) {
            const cat = perm.category || 'other';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(perm);
        }

        return grouped;
    }

    // ========================================================================
    // ROLE-PERMISSION ASSIGNMENTS
    // ========================================================================

    async assignPermissionToRole(roleId, permissionId) {
        if (!roleId || !permissionId) throw new ValidationError('Role ID and Permission ID are required');

        const role = await Role.findByPk(roleId);
        if (!role) throw new NotFoundError('Role not found');

        const perm = await Permission.findByPk(permissionId);
        if (!perm) throw new NotFoundError('Permission not found');

        const existing = await RolePermission.findOne({
            where: { role_id: roleId, permission_id: permissionId }
        });
        if (existing) throw new ConflictError('Permission already assigned to this role');

        await RolePermission.create({ role_id: roleId, permission_id: permissionId });
        return { success: true };
    }

    async removePermissionFromRole(roleId, permissionId) {
        if (!roleId || !permissionId) throw new ValidationError('Role ID and Permission ID are required');

        const existing = await RolePermission.findOne({
            where: { role_id: roleId, permission_id: permissionId }
        });
        if (!existing) throw new NotFoundError('Permission not assigned to this role');

        await existing.destroy();
        return { success: true };
    }

    async getRolePermissions(roleId) {
        if (!roleId) throw new ValidationError('Role ID is required');

        const role = await Role.findByPk(roleId, {
            include: [{
                model: Permission,
                attributes: ['permission_id', 'name', 'description', 'resource', 'action'],
                through: { attributes: [] }
            }]
        });

        if (!role) throw new NotFoundError('Role not found');

        return role.Permissions.map(p => ({
            permission_id: p.permission_id,
            name: p.name,
            description: p.description,
            category: p.resource,
            resource: p.resource,
            action: p.action,
        }));
    }

    // ========================================================================
    // USER-ROLE ASSIGNMENTS
    // ========================================================================

    async assignRoleToUser(userId, roleId) {
        if (!userId || !roleId) throw new ValidationError('User ID and Role ID are required');

        const user = await User.findByPk(userId);
        if (!user) throw new NotFoundError('User not found');

        const role = await Role.findByPk(roleId);
        if (!role) throw new NotFoundError('Role not found');

        const existing = await UserRole.findOne({
            where: { user_id: userId, role_id: roleId }
        });
        if (existing) throw new ConflictError('Role already assigned to this user');

        await UserRole.create({ user_id: userId, role_id: roleId });
        return { success: true };
    }

    async removeRoleFromUser(userId, roleId) {
        if (!userId || !roleId) throw new ValidationError('User ID and Role ID are required');

        const existing = await UserRole.findOne({
            where: { user_id: userId, role_id: roleId }
        });
        if (!existing) throw new NotFoundError('Role not assigned to this user');

        await existing.destroy();
        return { success: true };
    }

    async getUserRoles(userId) {
        if (!userId) throw new ValidationError('User ID is required');

        const user = await User.findByPk(userId, {
            include: [{
                model: Role,
                attributes: ['role_id', 'name', 'description'],
                through: { attributes: ['assigned_at'] }
            }]
        });

        if (!user) throw new NotFoundError('User not found');

        return user.Roles.map(r => ({
            role_id: r.role_id,
            name: r.name,
            description: r.description,
            assigned_at: r.UserRole.assigned_at
        }));
    }

    // ========================================================================
    // AGGREGATED PERMISSIONS (for auth)
    // ========================================================================

    async getUserPermissions(userId) {
        if (!userId) return { roles: [], permissions: [] };

        const user = await User.findByPk(userId, {
            include: [{
                model: Role,
                attributes: ['role_id', 'name', 'description'],
                through: { attributes: [] },
                include: [{
                    model: Permission,
                    attributes: ['permission_id', 'name', 'description', 'resource', 'action'],
                    through: { attributes: [] }
                }]
            }]
        });

        if (!user) return { roles: [], permissions: [] };

        const roles = user.Roles.map(r => ({
            role_id: r.role_id,
            name: r.name,
            description: r.description
        }));

        // Deduplicate permissions across roles
        const permMap = new Map();
        for (const role of user.Roles) {
            for (const p of role.Permissions) {
                if (!permMap.has(p.permission_id)) {
                    permMap.set(p.permission_id, {
                        permission_id: p.permission_id,
                        name: p.name,
                        description: p.description,
                        category: p.resource,
                        resource: p.resource,
                        action: p.action,
                    });
                }
            }
        }

        const permissions = [...permMap.values()].sort((a, b) => {
            const catCmp = (a.resource || '').localeCompare(b.resource || '');
            return catCmp !== 0 ? catCmp : a.name.localeCompare(b.name);
        });

        return { roles, permissions };
    }
}

module.exports = RBACService;
