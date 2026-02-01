/**
 * Shared Permissions Constants
 * Single source of truth for RBAC permissions across backend and frontend
 * 
 * Usage:
 *   Backend:  const { PERMISSIONS, ROLES } = require('../shared/permissions');
 *   Frontend: import { PERMISSIONS, ROLES } from '@/shared/permissions';
 */

// Permission definitions
const PERMISSIONS = {
    // Inventory
    INVENTORY_READ: 'inventory.read',
    INVENTORY_WRITE: 'inventory.write',
    INVENTORY_DELETE: 'inventory.delete',
    INVENTORY_MANAGE: 'inventory.manage',

    // Warehouse
    WAREHOUSE_READ: 'warehouse.read',
    WAREHOUSE_WRITE: 'warehouse.write',
    WAREHOUSE_DELETE: 'warehouse.delete',
    WAREHOUSE_MANAGE: 'warehouse.manage',

    // Users
    USERS_READ: 'users.read',
    USERS_WRITE: 'users.write',
    USERS_DELETE: 'users.delete',
    USERS_MANAGE: 'users.manage',

    // Reports
    REPORTS_READ: 'reports.read',
    REPORTS_WRITE: 'reports.write',
    REPORTS_EXPORT: 'reports.export',
    REPORTS_MANAGE: 'reports.manage',

    // Audit
    AUDIT_READ: 'audit.read',
    AUDIT_WRITE: 'audit.write',
    AUDIT_MANAGE: 'audit.manage',

    // Receipts
    RECEIPTS_READ: 'receipts.read',
    RECEIPTS_WRITE: 'receipts.write',
    RECEIPTS_DELETE: 'receipts.delete',
    RECEIPTS_MANAGE: 'receipts.manage',

    // Stocktake
    STOCKTAKE_READ: 'stocktake.read',
    STOCKTAKE_WRITE: 'stocktake.write',
    STOCKTAKE_DELETE: 'stocktake.delete',
    STOCKTAKE_APPROVE: 'stocktake.approve',
    STOCKTAKE_MANAGE: 'stocktake.manage',

    // Spare Parts
    SPARE_PARTS_READ: 'spare-parts.read',
    SPARE_PARTS_WRITE: 'spare-parts.write',
    SPARE_PARTS_DELETE: 'spare-parts.delete',
    SPARE_PARTS_MANAGE: 'spare-parts.manage',

    // RMA
    RMA_READ: 'rma.read',
    RMA_WRITE: 'rma.write',
    RMA_DELETE: 'rma.delete',
    RMA_APPROVE: 'rma.approve',
    RMA_MANAGE: 'rma.manage',

    // Repairs
    REPAIRS_READ: 'repairs.read',
    REPAIRS_WRITE: 'repairs.write',
    REPAIRS_DELETE: 'repairs.delete',
    REPAIRS_MANAGE: 'repairs.manage',

    // Suppliers
    SUPPLIERS_READ: 'suppliers.read',
    SUPPLIERS_WRITE: 'suppliers.write',
    SUPPLIERS_DELETE: 'suppliers.delete',
    SUPPLIERS_MANAGE: 'suppliers.manage',

    // System
    SYSTEM_ADMIN: 'system.admin'
};

// Role names
const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff',
    WAREHOUSE_STAFF: 'warehouse_staff',
    VIEWER: 'viewer'
};

// Permission hierarchy - manage implies read, write, delete
// This defines which permissions are implied by higher-level permissions
const PERMISSION_HIERARCHY = {
    'manage': ['read', 'write', 'delete', 'approve', 'export'],
    'write': ['read'],
    'delete': ['read'],
    'approve': ['read'],
    'export': ['read']
};

/**
 * Check if a permission implies another permission
 * e.g., inventory.manage implies inventory.read, inventory.write, inventory.delete
 * @param {string} heldPermission - Permission the user has
 * @param {string} requiredPermission - Permission being checked
 * @returns {boolean} True if heldPermission implies requiredPermission
 */
const impliesPermission = (heldPermission, requiredPermission) => {
    if (heldPermission === requiredPermission) return true;

    const [heldResource, heldAction] = heldPermission.split('.');
    const [requiredResource, requiredAction] = requiredPermission.split('.');

    // Must be same resource
    if (heldResource !== requiredResource) return false;

    // Check if held action implies required action
    const impliedActions = PERMISSION_HIERARCHY[heldAction] || [];
    return impliedActions.includes(requiredAction);
};

/**
 * Check if user has permission, considering hierarchy
 * @param {Array<string>} userPermissions - User's permission list
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has permission (directly or via hierarchy)
 */
const hasPermission = (userPermissions, permission) => {
    if (!userPermissions || !Array.isArray(userPermissions)) return false;
    if (userPermissions.includes(PERMISSIONS.SYSTEM_ADMIN)) return true;

    // Direct check
    if (userPermissions.includes(permission)) return true;

    // Hierarchy check - see if any held permission implies this one
    return userPermissions.some(held => impliesPermission(held, permission));
};

/**
 * Check if user has any of the permissions (considering hierarchy)
 * @param {Array<string>} userPermissions - User's permission list
 * @param {Array<string>} permissions - Permissions to check
 * @returns {boolean} True if user has at least one
 */
const hasAnyPermission = (userPermissions, permissions) => {
    if (!userPermissions || !Array.isArray(userPermissions)) return false;
    if (userPermissions.includes(PERMISSIONS.SYSTEM_ADMIN)) return true;
    return permissions.some(p => hasPermission(userPermissions, p));
};

/**
 * Check if user has all of the permissions (considering hierarchy)
 * @param {Array<string>} userPermissions - User's permission list
 * @param {Array<string>} permissions - Permissions to check
 * @returns {boolean} True if user has all
 */
const hasAllPermissions = (userPermissions, permissions) => {
    if (!userPermissions || !Array.isArray(userPermissions)) return false;
    if (userPermissions.includes(PERMISSIONS.SYSTEM_ADMIN)) return true;
    return permissions.every(p => hasPermission(userPermissions, p));
};

/**
 * Get all permissions that a user effectively has (including implied ones)
 * @param {Array<string>} userPermissions - User's direct permission list
 * @returns {Array<string>} All effective permissions
 */
const getEffectivePermissions = (userPermissions) => {
    if (!userPermissions || !Array.isArray(userPermissions)) return [];

    const effectivePermissions = new Set(userPermissions);

    for (const permission of userPermissions) {
        const [resource, action] = permission.split('.');
        const impliedActions = PERMISSION_HIERARCHY[action] || [];

        for (const impliedAction of impliedActions) {
            effectivePermissions.add(`${resource}.${impliedAction}`);
        }
    }

    return Array.from(effectivePermissions);
};

// Permission groups for UI display
const PERMISSION_GROUPS = {
    inventory: {
        label: 'Inventory',
        icon: 'fa-boxes',
        permissions: [
            PERMISSIONS.INVENTORY_READ,
            PERMISSIONS.INVENTORY_WRITE,
            PERMISSIONS.INVENTORY_DELETE,
            PERMISSIONS.INVENTORY_MANAGE
        ]
    },
    warehouse: {
        label: 'Warehouse',
        icon: 'fa-warehouse',
        permissions: [
            PERMISSIONS.WAREHOUSE_READ,
            PERMISSIONS.WAREHOUSE_WRITE,
            PERMISSIONS.WAREHOUSE_DELETE,
            PERMISSIONS.WAREHOUSE_MANAGE
        ]
    },
    users: {
        label: 'Users',
        icon: 'fa-users',
        permissions: [
            PERMISSIONS.USERS_READ,
            PERMISSIONS.USERS_WRITE,
            PERMISSIONS.USERS_DELETE,
            PERMISSIONS.USERS_MANAGE
        ]
    },
    reports: {
        label: 'Reports',
        icon: 'fa-chart-bar',
        permissions: [
            PERMISSIONS.REPORTS_READ,
            PERMISSIONS.REPORTS_WRITE,
            PERMISSIONS.REPORTS_EXPORT,
            PERMISSIONS.REPORTS_MANAGE
        ]
    },
    receipts: {
        label: 'Receipts',
        icon: 'fa-receipt',
        permissions: [
            PERMISSIONS.RECEIPTS_READ,
            PERMISSIONS.RECEIPTS_WRITE,
            PERMISSIONS.RECEIPTS_DELETE,
            PERMISSIONS.RECEIPTS_MANAGE
        ]
    },
    stocktake: {
        label: 'Stocktake',
        icon: 'fa-clipboard-check',
        permissions: [
            PERMISSIONS.STOCKTAKE_READ,
            PERMISSIONS.STOCKTAKE_WRITE,
            PERMISSIONS.STOCKTAKE_DELETE,
            PERMISSIONS.STOCKTAKE_APPROVE,
            PERMISSIONS.STOCKTAKE_MANAGE
        ]
    },
    spareParts: {
        label: 'Spare Parts',
        icon: 'fa-tools',
        permissions: [
            PERMISSIONS.SPARE_PARTS_READ,
            PERMISSIONS.SPARE_PARTS_WRITE,
            PERMISSIONS.SPARE_PARTS_DELETE,
            PERMISSIONS.SPARE_PARTS_MANAGE
        ]
    },
    rma: {
        label: 'RMA',
        icon: 'fa-undo',
        permissions: [
            PERMISSIONS.RMA_READ,
            PERMISSIONS.RMA_WRITE,
            PERMISSIONS.RMA_DELETE,
            PERMISSIONS.RMA_APPROVE,
            PERMISSIONS.RMA_MANAGE
        ]
    },
    repairs: {
        label: 'Repairs',
        icon: 'fa-wrench',
        permissions: [
            PERMISSIONS.REPAIRS_READ,
            PERMISSIONS.REPAIRS_WRITE,
            PERMISSIONS.REPAIRS_DELETE,
            PERMISSIONS.REPAIRS_MANAGE
        ]
    },
    suppliers: {
        label: 'Suppliers',
        icon: 'fa-truck',
        permissions: [
            PERMISSIONS.SUPPLIERS_READ,
            PERMISSIONS.SUPPLIERS_WRITE,
            PERMISSIONS.SUPPLIERS_DELETE,
            PERMISSIONS.SUPPLIERS_MANAGE
        ]
    },
    system: {
        label: 'System',
        icon: 'fa-cog',
        permissions: [
            PERMISSIONS.AUDIT_READ,
            PERMISSIONS.AUDIT_WRITE,
            PERMISSIONS.AUDIT_MANAGE,
            PERMISSIONS.SYSTEM_ADMIN
        ]
    }
};

module.exports = {
    PERMISSIONS,
    ROLES,
    PERMISSION_HIERARCHY,
    PERMISSION_GROUPS,
    impliesPermission,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getEffectivePermissions
};
