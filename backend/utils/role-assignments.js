/**
 * Role and User Definitions (Migration Only)
 * These definitions are used to bootstrap the system and sync with Casbin.
 * Once synced, the database becomes the source of truth.
 */

const { ROLES, PERMISSIONS } = require('./permissions');

// Role definitions with permission assignments
const ROLE_DEFINITIONS = [
    {
        name: ROLES.ADMIN,
        description: 'System administrator with full access to all features',
        permissions: [
            PERMISSIONS.INVENTORY_MANAGE, PERMISSIONS.WAREHOUSE_MANAGE, PERMISSIONS.USERS_MANAGE,
            PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_EXPORT,
            PERMISSIONS.AUDIT_READ, PERMISSIONS.AUDIT_MANAGE,
            PERMISSIONS.RECEIPTS_READ, PERMISSIONS.RECEIPTS_WRITE, PERMISSIONS.RECEIPTS_DELETE,
            PERMISSIONS.STOCKTAKE_READ, PERMISSIONS.STOCKTAKE_WRITE, PERMISSIONS.STOCKTAKE_APPROVE,
            PERMISSIONS.SPARE_PARTS_READ, PERMISSIONS.SPARE_PARTS_WRITE,
            PERMISSIONS.RMA_READ, PERMISSIONS.RMA_WRITE, PERMISSIONS.RMA_APPROVE,
            PERMISSIONS.REPAIRS_READ, PERMISSIONS.REPAIRS_WRITE,
            PERMISSIONS.SUPPLIERS_READ, PERMISSIONS.SUPPLIERS_WRITE,
            PERMISSIONS.SYSTEM_ADMIN
        ]
    },
    {
        name: ROLES.MANAGER,
        description: 'Warehouse manager with operational access',
        permissions: [
            PERMISSIONS.INVENTORY_READ, PERMISSIONS.INVENTORY_WRITE, PERMISSIONS.INVENTORY_MANAGE,
            PERMISSIONS.WAREHOUSE_READ, PERMISSIONS.WAREHOUSE_WRITE,
            PERMISSIONS.USERS_READ,
            PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_EXPORT,
            PERMISSIONS.AUDIT_READ,
            PERMISSIONS.RECEIPTS_READ, PERMISSIONS.RECEIPTS_WRITE,
            PERMISSIONS.STOCKTAKE_READ, PERMISSIONS.STOCKTAKE_WRITE, PERMISSIONS.STOCKTAKE_APPROVE,
            PERMISSIONS.SPARE_PARTS_READ, PERMISSIONS.SPARE_PARTS_WRITE,
            PERMISSIONS.RMA_READ, PERMISSIONS.RMA_WRITE, PERMISSIONS.RMA_APPROVE,
            PERMISSIONS.REPAIRS_READ, PERMISSIONS.REPAIRS_WRITE,
            PERMISSIONS.SUPPLIERS_READ, PERMISSIONS.SUPPLIERS_WRITE
        ]
    },
    {
        name: ROLES.STAFF,
        description: 'Warehouse staff with basic operational access',
        permissions: [
            PERMISSIONS.INVENTORY_READ, PERMISSIONS.INVENTORY_WRITE,
            PERMISSIONS.WAREHOUSE_READ,
            PERMISSIONS.RECEIPTS_READ, PERMISSIONS.RECEIPTS_WRITE,
            PERMISSIONS.STOCKTAKE_READ, PERMISSIONS.STOCKTAKE_WRITE,
            PERMISSIONS.SPARE_PARTS_READ,
            PERMISSIONS.RMA_READ, PERMISSIONS.RMA_WRITE,
            PERMISSIONS.REPAIRS_READ
        ]
    },
    {
        name: ROLES.WAREHOUSE_STAFF,
        description: 'Warehouse staff with inventory management permissions',
        permissions: [
            PERMISSIONS.INVENTORY_READ, PERMISSIONS.INVENTORY_WRITE,
            PERMISSIONS.WAREHOUSE_READ,
            PERMISSIONS.REPORTS_READ,
            PERMISSIONS.SPARE_PARTS_READ,
            PERMISSIONS.RMA_READ,
            PERMISSIONS.REPAIRS_READ
        ]
    },
    {
        name: ROLES.VIEWER,
        description: 'Read-only access - can view all information but cannot create, update, or delete',
        permissions: [
            PERMISSIONS.INVENTORY_READ,
            PERMISSIONS.WAREHOUSE_READ,
            PERMISSIONS.REPORTS_READ,
            PERMISSIONS.RECEIPTS_READ,
            PERMISSIONS.STOCKTAKE_READ,
            PERMISSIONS.SPARE_PARTS_READ,
            PERMISSIONS.RMA_READ,
            PERMISSIONS.REPAIRS_READ,
            PERMISSIONS.SUPPLIERS_READ
        ]
    }
];

// Default users for initial setup
const DEFAULT_USERS = [
    {
        username: 'admin',
        password: process.env.ADMIN_DEFAULT_PASSWORD || 'CHANGE_ME_ADMIN',
        fullName: 'Administrator',
        email: 'admin@mycelium.local',
        role: ROLES.ADMIN
    },
    {
        username: 'lechibang',
        password: process.env.USER_DEFAULT_PASSWORD || 'CHANGE_ME_USER',
        fullName: 'Le Chi Bang',
        email: 'lechibang@mycelium.local',
        role: ROLES.WAREHOUSE_STAFF
    }
];

module.exports = {
    ROLE_DEFINITIONS,
    DEFAULT_USERS
};
