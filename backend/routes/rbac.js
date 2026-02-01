/**
 * RBAC (Role-Based Access Control) Consolidated Routes
 * Combines: roles.js, permissions.js, user-roles.js
 * 
 * All routes maintain original URL paths for backward compatibility.
 */

const express = require('express');
const router = express.Router();
const RBACService = require('../services/RBACService');
const asyncHandler = require('../utils/asyncHandler');
const SanitizationService = require('../services/SanitizationService');

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
    const rbacService = new RBACService();

    // ========================================================================
    // ROLES ENDPOINTS (/api/roles)
    // ========================================================================
    const rolesRouter = express.Router();

    /**
     * Get all roles with their permissions
     * @route GET /api/roles
     */
    rolesRouter.get('/', asyncHandler(async (req, res) => {
        const roles = await rbacService.getAllRoles();
        res.json({
            success: true,
            roles: roles.map(r => convertBigIntToNumber(r)),
            total: roles.length
        });
    }));

    /**
     * Get role by ID
     * @route GET /api/roles/:id
     */
    rolesRouter.get('/:id', asyncHandler(async (req, res) => {
        const roleId = parseInt(req.params.id);
        if (isNaN(roleId)) {
            return res.status(400).json({ success: false, error: 'Invalid role ID' });
        }

        const role = await rbacService.getRoleById(roleId);
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }

        res.json({ success: true, role: convertBigIntToNumber(role) });
    }));

    /**
     * Create a new role
     * @route POST /api/roles
     */
    rolesRouter.post('/', asyncHandler(async (req, res) => {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Role name is required' });
        }

        const role = await rbacService.createRole({ name, description });
        res.status(201).json({
            success: true,
            role: convertBigIntToNumber(role),
            message: 'Role created successfully'
        });
    }));

    /**
     * Update a role
     * @route PUT /api/roles/:id
     */
    rolesRouter.put('/:id', asyncHandler(async (req, res) => {
        const roleId = parseInt(req.params.id);
        const { name, description } = req.body;

        if (isNaN(roleId)) {
            return res.status(400).json({ success: false, error: 'Invalid role ID' });
        }
        if (!name) {
            return res.status(400).json({ success: false, error: 'Role name is required' });
        }

        const role = await rbacService.updateRole(roleId, { name, description });
        res.json({
            success: true,
            role: convertBigIntToNumber(role),
            message: 'Role updated successfully'
        });
    }));

    /**
     * Delete a role
     * @route DELETE /api/roles/:id
     */
    rolesRouter.delete('/:id', asyncHandler(async (req, res) => {
        const roleId = parseInt(req.params.id);
        if (isNaN(roleId)) {
            return res.status(400).json({ success: false, error: 'Invalid role ID' });
        }

        await rbacService.deleteRole(roleId);
        res.json({ success: true, message: 'Role deleted successfully' });
    }));

    /**
     * Assign permission to role
     * @route POST /api/roles/:id/permissions
     */
    rolesRouter.post('/:id/permissions', asyncHandler(async (req, res) => {
        const roleId = parseInt(req.params.id);
        const { permission_id } = req.body;

        if (isNaN(roleId) || isNaN(permission_id)) {
            return res.status(400).json({ success: false, error: 'Invalid role ID or permission ID' });
        }

        await rbacService.assignPermissionToRole(roleId, permission_id);
        res.json({ success: true, message: 'Permission assigned to role successfully' });
    }));

    /**
     * Remove permission from role
     * @route DELETE /api/roles/:id/permissions/:permissionId
     */
    rolesRouter.delete('/:id/permissions/:permissionId', asyncHandler(async (req, res) => {
        const roleId = parseInt(req.params.id);
        const permissionId = parseInt(req.params.permissionId);

        if (isNaN(roleId) || isNaN(permissionId)) {
            return res.status(400).json({ success: false, error: 'Invalid role ID or permission ID' });
        }

        await rbacService.removePermissionFromRole(roleId, permissionId);
        res.json({ success: true, message: 'Permission removed from role successfully' });
    }));

    /**
     * Get users with this role
     * @route GET /api/roles/:id/users
     */
    rolesRouter.get('/:id/users', asyncHandler(async (req, res) => {
        const roleId = parseInt(req.params.id);
        if (isNaN(roleId)) {
            return res.status(400).json({ success: false, error: 'Invalid role ID' });
        }

        const users = await rbacService.getUsersByRole(roleId);
        res.json({
            success: true,
            users: users.map(u => convertBigIntToNumber(u)),
            total: users.length
        });
    }));

    // ========================================================================
    // PERMISSIONS ENDPOINTS (/api/permissions)
    // ========================================================================
    const permissionsRouter = express.Router();

    /**
     * Get all permissions
     * @route GET /api/permissions
     */
    permissionsRouter.get('/', asyncHandler(async (req, res) => {
        const permissions = await rbacService.getAllPermissions();
        res.json({
            success: true,
            permissions: permissions.map(p => convertBigIntToNumber(p)),
            total: permissions.length
        });
    }));

    /**
     * Create a new permission
     * @route POST /api/permissions
     */
    permissionsRouter.post('/', asyncHandler(async (req, res) => {
        const { name, description, resource, action } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Permission name is required' });
        }

        const permission = await rbacService.createPermission({ name, description, resource, action });
        res.status(201).json({
            success: true,
            permission: convertBigIntToNumber(permission),
            message: 'Permission created successfully'
        });
    }));

    // ========================================================================
    // USER ROLES ENDPOINTS (/api/user-roles)
    // ========================================================================
    const userRolesRouter = express.Router();

    /**
     * Get user's permissions and roles
     * @route GET /api/user-roles/:userId/permissions
     */
    userRolesRouter.get('/:userId/permissions', asyncHandler(async (req, res) => {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }

        const permissions = await rbacService.getUserPermissions(userId);
        res.json({
            success: true,
            user_id: userId,
            roles: permissions.roles.map(r => convertBigIntToNumber(r)),
            permissions: permissions.permissions.map(p => convertBigIntToNumber(p))
        });
    }));

    /**
     * Assign role to user
     * @route POST /api/user-roles/:userId/roles
     */
    userRolesRouter.post('/:userId/roles', asyncHandler(async (req, res) => {
        const userId = parseInt(req.params.userId);
        const { role_id, assigned_by } = req.body;

        if (isNaN(userId) || isNaN(role_id)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID or role ID' });
        }

        await rbacService.assignRoleToUser(userId, role_id, assigned_by);
        res.json({ success: true, message: 'Role assigned to user successfully' });
    }));

    /**
     * Remove role from user
     * @route DELETE /api/user-roles/:userId/roles/:roleId
     */
    userRolesRouter.delete('/:userId/roles/:roleId', asyncHandler(async (req, res) => {
        const userId = parseInt(req.params.userId);
        const roleId = parseInt(req.params.roleId);

        if (isNaN(userId) || isNaN(roleId)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID or role ID' });
        }

        await rbacService.removeRoleFromUser(userId, roleId);
        res.json({ success: true, message: 'Role removed from user successfully' });
    }));

    /**
     * Check if user has permission
     * @route GET /api/user-roles/:userId/check-permission/:permissionName
     */
    userRolesRouter.get('/:userId/check-permission/:permissionName', asyncHandler(async (req, res) => {
        const userId = parseInt(req.params.userId);
        const { permissionName } = req.params;

        if (isNaN(userId)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }

        const hasPermission = await rbacService.userHasPermission(userId, permissionName);
        res.json({
            success: true,
            user_id: userId,
            permission: permissionName,
            has_permission: hasPermission
        });
    }));

    /**
     * Check if user has role
     * @route GET /api/user-roles/:userId/check-role/:roleName
     */
    userRolesRouter.get('/:userId/check-role/:roleName', asyncHandler(async (req, res) => {
        const userId = parseInt(req.params.userId);
        const { roleName } = req.params;

        if (isNaN(userId)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }

        const hasRole = await rbacService.userHasRole(userId, roleName);
        res.json({
            success: true,
            user_id: userId,
            role: roleName,
            has_role: hasRole
        });
    }));

    // Mount sub-routers
    router.use('/roles', rolesRouter);
    router.use('/permissions', permissionsRouter);
    router.use('/user-roles', userRolesRouter);

    return router;
};
