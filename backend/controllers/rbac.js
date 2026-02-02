/**
 * RBAC (Role-Based Access Control) Routes
 * Uses CasbinService for permission enforcement and MongoDB for data storage
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const CasbinService = require('../services/CasbinService');
const Role = require('../models/Role');
const User = require('../models/User');
const { PERMISSION_DEFINITIONS } = require('../utils/permissions');

module.exports = () => {
    // ========================================================================
    // ROLES ENDPOINTS (/api/roles)
    // ========================================================================
    const rolesRouter = express.Router();

    /**
     * Get all roles with their permissions
     * @route GET /api/roles
     */
    rolesRouter.get('/', asyncHandler(async (req, res) => {
        const roles = await Role.find().sort({ name: 1 }).lean();

        const result = roles.map(role => ({
            id: role.role_id,
            name: role.name,
            description: role.description,
            created_at: role.created_at,
            updated_at: role.updated_at,
            permissions: role.permissions.map(permName => {
                const def = PERMISSION_DEFINITIONS.find(p => p.name === permName);
                if (def) {
                    return {
                        id: def.name,
                        name: def.name,
                        description: def.description,
                        resource: def.resource,
                        action: def.action
                    };
                }
                const [resource, action] = permName.split('.');
                return {
                    id: permName,
                    name: permName,
                    description: '',
                    resource: resource || '',
                    action: action || ''
                };
            })
        }));

        res.json({
            success: true,
            roles: result,
            total: result.length
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

        const role = await Role.findOne({ role_id: roleId }).lean();
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }

        res.json({
            success: true,
            role: {
                id: role.role_id,
                name: role.name,
                description: role.description,
                created_at: role.created_at,
                updated_at: role.updated_at,
                permissions: role.permissions.map(permName => {
                    const def = PERMISSION_DEFINITIONS.find(p => p.name === permName);
                    if (def) {
                        return {
                            id: def.name,
                            name: def.name,
                            description: def.description,
                            resource: def.resource,
                            action: def.action
                        };
                    }
                    const [resource, action] = permName.split('.');
                    return {
                        id: permName,
                        name: permName,
                        description: '',
                        resource: resource || '',
                        action: action || ''
                    };
                })
            }
        });
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

        const role = await Role.create({
            name,
            description,
            permissions: []
        });

        res.status(201).json({
            success: true,
            role: {
                id: role.role_id,
                name: role.name,
                description: role.description
            },
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

        const role = await Role.findOneAndUpdate(
            { role_id: roleId },
            { name, description },
            { new: true }
        ).lean();

        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }

        res.json({
            success: true,
            role: {
                id: role.role_id,
                name: role.name,
                description: role.description
            },
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

        const role = await Role.findOne({ role_id: roleId });
        if (role) {
            // Remove role reference from all users
            await User.updateMany(
                { roles: role._id },
                { $pull: { roles: role._id } }
            );

            // Remove role policies from Casbin
            await CasbinService.removeFilteredPoliciesForRole(role.name);

            await role.deleteOne();
        }

        res.json({ success: true, message: 'Role deleted successfully' });
    }));

    /**
     * Assign permission to role
     * @route POST /api/roles/:id/permissions
     */
    rolesRouter.post('/:id/permissions', asyncHandler(async (req, res) => {
        const roleId = parseInt(req.params.id);
        const { permission_id } = req.body;

        if (isNaN(roleId)) {
            return res.status(400).json({ success: false, error: 'Invalid role ID' });
        }

        // permission_id can be a number (index) or string (permission name)
        let permName = permission_id;
        if (typeof permission_id === 'number') {
            const perm = PERMISSION_DEFINITIONS[permission_id - 1];
            permName = perm?.name || permission_id;
        }

        const role = await Role.findOne({ role_id: roleId });
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }

        // Add permission if not already present
        if (!role.permissions.includes(permName)) {
            role.permissions.push(permName);
            await role.save();
        }

        // Sync to Casbin
        await CasbinService.syncRolePolicies(role.name, role.permissions);

        res.json({ success: true, message: 'Permission assigned to role successfully' });
    }));

    /**
     * Remove permission from role
     * @route DELETE /api/roles/:id/permissions/:permissionId
     */
    rolesRouter.delete('/:id/permissions/:permissionId', asyncHandler(async (req, res) => {
        const roleId = parseInt(req.params.id);
        const permissionId = req.params.permissionId;

        if (isNaN(roleId)) {
            return res.status(400).json({ success: false, error: 'Invalid role ID' });
        }

        // permissionId can be a number (index) or string (permission name)
        let permName = permissionId;
        if (!isNaN(parseInt(permissionId))) {
            const perm = PERMISSION_DEFINITIONS[parseInt(permissionId) - 1];
            permName = perm?.name || permissionId;
        }

        const role = await Role.findOne({ role_id: roleId });
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }

        // Remove permission
        role.permissions = role.permissions.filter(p => p !== permName);
        await role.save();

        // Sync to Casbin
        await CasbinService.syncRolePolicies(role.name, role.permissions);

        res.json({ success: true, message: 'Permission removed from role successfully' });
    }));

    /**
     * Bulk set all permissions for a role
     * @route PUT /api/roles/:id/permissions/bulk
     */
    rolesRouter.put('/:id/permissions/bulk', asyncHandler(async (req, res) => {
        const roleId = parseInt(req.params.id);
        const { permissions } = req.body;

        if (isNaN(roleId)) {
            return res.status(400).json({ success: false, error: 'Invalid role ID' });
        }

        if (!Array.isArray(permissions)) {
            return res.status(400).json({ success: false, error: 'permissions must be an array' });
        }

        const role = await Role.findOne({ role_id: roleId });
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }

        // Set permissions directly (array of permission name strings)
        role.permissions = permissions;
        await role.save();

        // Sync to Casbin
        await CasbinService.syncRolePolicies(role.name, role.permissions);

        res.json({
            success: true,
            message: `Set ${permissions.length} permissions for role`,
            count: permissions.length
        });
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

        const role = await Role.findOne({ role_id: roleId });
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }

        const users = await User.find({ roles: role._id })
            .select('-password')
            .sort({ username: 1 })
            .lean();

        const result = users.map(u => ({
            id: u.user_id,
            username: u.username,
            email: u.email,
            fullName: u.fullName,
            assigned_at: u.updated_at
        }));

        res.json({
            success: true,
            users: result,
            total: result.length
        });
    }));

    // ========================================================================
    // PERMISSIONS ENDPOINTS (/api/permissions)
    // ========================================================================
    const permissionsRouter = express.Router();

    /**
     * Get all permissions (from code definitions)
     * @route GET /api/permissions
     */
    permissionsRouter.get('/', asyncHandler(async (req, res) => {
        const permissions = PERMISSION_DEFINITIONS.map((perm, index) => ({
            id: index + 1,
            name: perm.name,
            description: perm.description,
            resource: perm.resource,
            action: perm.action
        }));

        res.json({
            success: true,
            permissions,
            total: permissions.length
        });
    }));

    /**
     * Create a new permission (no-op - permissions defined in code)
     * @route POST /api/permissions
     */
    permissionsRouter.post('/', asyncHandler(async (req, res) => {
        const { name, description, resource, action } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Permission name is required' });
        }

        // Permissions are defined in code, return the provided data
        res.status(201).json({
            success: true,
            permission: { name, description, resource, action },
            message: 'Permission created successfully (note: permissions are defined in code)'
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

        const permissions = await CasbinService.getUserPermissions(userId);

        res.json({
            success: true,
            user_id: userId,
            roles: permissions.roles,
            permissions: permissions.permissions
        });
    }));

    /**
     * Assign role to user
     * @route POST /api/user-roles/:userId/roles
     */
    userRolesRouter.post('/:userId/roles', asyncHandler(async (req, res) => {
        const userId = parseInt(req.params.userId);
        const { role_id } = req.body;

        if (isNaN(userId) || isNaN(role_id)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID or role ID' });
        }

        const role = await Role.findOne({ role_id: role_id });
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }

        // Add role to user in MongoDB
        await User.updateOne(
            { user_id: userId },
            { $addToSet: { roles: role._id } }
        );

        // Sync to Casbin
        await CasbinService.addRoleForUser(userId, role.name);

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

        const role = await Role.findOne({ role_id: roleId });
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }

        // Remove role from user in MongoDB
        await User.updateOne(
            { user_id: userId },
            { $pull: { roles: role._id } }
        );

        // Sync to Casbin
        await CasbinService.deleteRoleForUser(userId, role.name);

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

        const [resource, action] = permissionName.split('.');
        const hasPermission = await CasbinService.enforce(userId, resource, action);

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

        const hasRole = await CasbinService.hasRole(userId, roleName);

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
