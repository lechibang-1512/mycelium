/**
 * Shared Permissions Constants
 * Single source of truth for RBAC permissions across backend and frontend
 * 
 * Usage:
 *   Backend:  const { PERMISSIONS, ROLES } = require('../shared/permissions');
 *   Frontend: import { PERMISSIONS, ROLES } from '@/shared/permissions';
 */

// Import shared permissions logic
const {
    PERMISSIONS,
    ROLES,
    PERMISSION_HIERARCHY,
    PERMISSION_GROUPS,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    impliesPermission,
    getEffectivePermissions
} = require('../../shared/permissions.cjs');

// Permission metadata for database seeding and UI display
const PERMISSION_DEFINITIONS = [
    { name: PERMISSIONS.INVENTORY_READ, description: 'View inventory items and stock levels', resource: 'inventory', action: 'read' },
    { name: PERMISSIONS.INVENTORY_WRITE, description: 'Create and update inventory items', resource: 'inventory', action: 'write' },
    { name: PERMISSIONS.INVENTORY_DELETE, description: 'Delete inventory items', resource: 'inventory', action: 'delete' },
    { name: PERMISSIONS.INVENTORY_MANAGE, description: 'Full inventory management', resource: 'inventory', action: 'manage' },

    { name: PERMISSIONS.WAREHOUSE_READ, description: 'View warehouse information', resource: 'warehouse', action: 'read' },
    { name: PERMISSIONS.WAREHOUSE_WRITE, description: 'Create and update warehouses', resource: 'warehouse', action: 'write' },
    { name: PERMISSIONS.WAREHOUSE_DELETE, description: 'Delete warehouses', resource: 'warehouse', action: 'delete' },
    { name: PERMISSIONS.WAREHOUSE_MANAGE, description: 'Full warehouse management', resource: 'warehouse', action: 'manage' },

    { name: PERMISSIONS.USERS_READ, description: 'View user information', resource: 'users', action: 'read' },
    { name: PERMISSIONS.USERS_WRITE, description: 'Create and update users', resource: 'users', action: 'write' },
    { name: PERMISSIONS.USERS_DELETE, description: 'Delete users', resource: 'users', action: 'delete' },
    { name: PERMISSIONS.USERS_MANAGE, description: 'Full user management including roles', resource: 'users', action: 'manage' },

    { name: PERMISSIONS.REPORTS_READ, description: 'View and generate reports', resource: 'reports', action: 'read' },
    { name: PERMISSIONS.REPORTS_WRITE, description: 'Create and save custom reports', resource: 'reports', action: 'write' },
    { name: PERMISSIONS.REPORTS_EXPORT, description: 'Export reports to file formats', resource: 'reports', action: 'export' },
    { name: PERMISSIONS.REPORTS_MANAGE, description: 'Full reports management including templates', resource: 'reports', action: 'manage' },

    { name: PERMISSIONS.AUDIT_READ, description: 'View audit logs', resource: 'audit', action: 'read' },
    { name: PERMISSIONS.AUDIT_WRITE, description: 'Create audit log entries', resource: 'audit', action: 'write' },
    { name: PERMISSIONS.AUDIT_MANAGE, description: 'Manage audit settings and retention', resource: 'audit', action: 'manage' },

    { name: PERMISSIONS.RECEIPTS_READ, description: 'View receipts and transactions', resource: 'receipts', action: 'read' },
    { name: PERMISSIONS.RECEIPTS_WRITE, description: 'Create and update receipts', resource: 'receipts', action: 'write' },
    { name: PERMISSIONS.RECEIPTS_DELETE, description: 'Delete receipts', resource: 'receipts', action: 'delete' },
    { name: PERMISSIONS.RECEIPTS_MANAGE, description: 'Full receipts management including voiding', resource: 'receipts', action: 'manage' },

    { name: PERMISSIONS.STOCKTAKE_READ, description: 'View stocktake records', resource: 'stocktake', action: 'read' },
    { name: PERMISSIONS.STOCKTAKE_WRITE, description: 'Perform stocktake operations', resource: 'stocktake', action: 'write' },
    { name: PERMISSIONS.STOCKTAKE_DELETE, description: 'Delete stocktake records', resource: 'stocktake', action: 'delete' },
    { name: PERMISSIONS.STOCKTAKE_APPROVE, description: 'Approve stocktake results', resource: 'stocktake', action: 'approve' },
    { name: PERMISSIONS.STOCKTAKE_MANAGE, description: 'Full stocktake management including scheduling', resource: 'stocktake', action: 'manage' },

    { name: PERMISSIONS.SPARE_PARTS_READ, description: 'View spare parts inventory', resource: 'spare-parts', action: 'read' },
    { name: PERMISSIONS.SPARE_PARTS_WRITE, description: 'Create and update spare parts', resource: 'spare-parts', action: 'write' },
    { name: PERMISSIONS.SPARE_PARTS_DELETE, description: 'Delete spare parts', resource: 'spare-parts', action: 'delete' },
    { name: PERMISSIONS.SPARE_PARTS_MANAGE, description: 'Full spare parts management', resource: 'spare-parts', action: 'manage' },

    { name: PERMISSIONS.RMA_READ, description: 'View RMA requests', resource: 'rma', action: 'read' },
    { name: PERMISSIONS.RMA_WRITE, description: 'Create and update RMA requests', resource: 'rma', action: 'write' },
    { name: PERMISSIONS.RMA_DELETE, description: 'Delete RMA requests', resource: 'rma', action: 'delete' },
    { name: PERMISSIONS.RMA_APPROVE, description: 'Approve RMA requests', resource: 'rma', action: 'approve' },
    { name: PERMISSIONS.RMA_MANAGE, description: 'Full RMA management including policies', resource: 'rma', action: 'manage' },

    { name: PERMISSIONS.REPAIRS_READ, description: 'View repair jobs', resource: 'repairs', action: 'read' },
    { name: PERMISSIONS.REPAIRS_WRITE, description: 'Create and update repair jobs', resource: 'repairs', action: 'write' },
    { name: PERMISSIONS.REPAIRS_DELETE, description: 'Delete repair jobs', resource: 'repairs', action: 'delete' },
    { name: PERMISSIONS.REPAIRS_MANAGE, description: 'Full repairs management including assignments', resource: 'repairs', action: 'manage' },

    { name: PERMISSIONS.SUPPLIERS_READ, description: 'View suppliers', resource: 'suppliers', action: 'read' },
    { name: PERMISSIONS.SUPPLIERS_WRITE, description: 'Create and update suppliers', resource: 'suppliers', action: 'write' },
    { name: PERMISSIONS.SUPPLIERS_DELETE, description: 'Delete suppliers', resource: 'suppliers', action: 'delete' },
    { name: PERMISSIONS.SUPPLIERS_MANAGE, description: 'Full suppliers management', resource: 'suppliers', action: 'manage' },

    { name: PERMISSIONS.SYSTEM_ADMIN, description: 'Full system administration access', resource: 'system', action: 'admin' }
];

// Export for CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PERMISSIONS,
        PERMISSION_DEFINITIONS,
        ROLES,
        PERMISSION_GROUPS,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        getEffectivePermissions
    };
}

