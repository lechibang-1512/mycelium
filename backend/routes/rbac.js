/**
 * RBAC Management Routes
 * Admin-only endpoints for managing roles, permissions, and user-role assignments.
 */

const express = require('express');
const router = express.Router();
const RBACService = require('../services/RBACService');
const SanitizationService = require('../services/SanitizationService');
const asyncHandler = require('../utils/asyncHandler');
const { requireRole } = require('../middleware/rbacMiddleware');

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
    const rbacService = new RBACService();

    // All RBAC management routes require admin role
    router.use(requireRole('admin'));

    // ========================================================================
    // ROLES
    // ========================================================================

    /**
     * GET /api/rbac/roles
     * List all roles with permission counts
     */
    router.get('/roles', asyncHandler(async (req, res) => {
        const roles = await rbacService.getAllRoles();
        res.json({ success: true, roles: convertBigIntToNumber(roles) });
    }));

    /**
     * GET /api/rbac/roles/:id
     * Get role details with permissions
     */
    router.get('/roles/:id', asyncHandler(async (req, res) => {
        const role = await rbacService.getRoleById(req.params.id);
        res.json({ success: true, role: convertBigIntToNumber(role) });
    }));

    /**
     * POST /api/rbac/roles
     * Create a new role
     */
    router.post('/roles', asyncHandler(async (req, res) => {
        const { name, description } = req.body;
        const role = await rbacService.createRole({ name, description });
        res.status(201).json({ success: true, role: convertBigIntToNumber(role) });
    }));

    /**
     * PUT /api/rbac/roles/:id
     * Update a role
     */
    router.put('/roles/:id', asyncHandler(async (req, res) => {
        const { name, description } = req.body;
        await rbacService.updateRole(req.params.id, { name, description });
        res.json({ success: true, message: 'Role updated' });
    }));

    /**
     * DELETE /api/rbac/roles/:id
     * Delete a non-system role
     */
    router.delete('/roles/:id', asyncHandler(async (req, res) => {
        await rbacService.deleteRole(req.params.id);
        res.json({ success: true, message: 'Role deleted' });
    }));

    // ========================================================================
    // PERMISSIONS
    // ========================================================================

    /**
     * GET /api/rbac/permissions
     * List all permissions (optionally grouped by category)
     */
    router.get('/permissions', asyncHandler(async (req, res) => {
        if (req.query.grouped === 'true') {
            const grouped = await rbacService.getPermissionsByCategory();
            return res.json({ success: true, permissions: convertBigIntToNumber(grouped) });
        }
        const permissions = await rbacService.getAllPermissions();
        res.json({ success: true, permissions: convertBigIntToNumber(permissions) });
    }));

    // ========================================================================
    // ROLE-PERMISSION ASSIGNMENTS
    // ========================================================================

    /**
     * GET /api/rbac/roles/:id/permissions
     * Get permissions for a specific role
     */
    router.get('/roles/:id/permissions', asyncHandler(async (req, res) => {
        const permissions = await rbacService.getRolePermissions(req.params.id);
        res.json({ success: true, permissions: convertBigIntToNumber(permissions) });
    }));

    /**
     * POST /api/rbac/roles/:id/permissions
     * Assign a permission to a role
     * Body: { permissionId: "..." }
     */
    router.post('/roles/:id/permissions', asyncHandler(async (req, res) => {
        const { permissionId } = req.body;
        await rbacService.assignPermissionToRole(req.params.id, permissionId);
        res.status(201).json({ success: true, message: 'Permission assigned to role' });
    }));

    /**
     * DELETE /api/rbac/roles/:id/permissions/:permId
     * Remove a permission from a role
     */
    router.delete('/roles/:id/permissions/:permId', asyncHandler(async (req, res) => {
        await rbacService.removePermissionFromRole(req.params.id, req.params.permId);
        res.json({ success: true, message: 'Permission removed from role' });
    }));

    // ========================================================================
    // USER-ROLE ASSIGNMENTS
    // ========================================================================

    /**
     * GET /api/rbac/users/:id/roles
     * Get roles for a specific user
     */
    router.get('/users/:id/roles', asyncHandler(async (req, res) => {
        const roles = await rbacService.getUserRoles(req.params.id);
        res.json({ success: true, roles: convertBigIntToNumber(roles) });
    }));

    /**
     * POST /api/rbac/users/:id/roles
     * Assign a role to a user
     * Body: { roleId: "..." }
     */
    router.post('/users/:id/roles', asyncHandler(async (req, res) => {
        const { roleId } = req.body;
        await rbacService.assignRoleToUser(req.params.id, roleId);
        res.status(201).json({ success: true, message: 'Role assigned to user' });
    }));

    /**
     * DELETE /api/rbac/users/:id/roles/:roleId
     * Remove a role from a user
     */
    router.delete('/users/:id/roles/:roleId', asyncHandler(async (req, res) => {
        await rbacService.removeRoleFromUser(req.params.id, req.params.roleId);
        res.json({ success: true, message: 'Role removed from user' });
    }));

    return router;
};
