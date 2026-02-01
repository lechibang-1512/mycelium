/**
 * Shared Permissions Constants for Frontend
 * Single source of truth for RBAC permissions in React components
 * 
 * Usage:
 *   import { PERMISSIONS, ROLES, hasPermission } from '@/constants/permissions';
 *   
 *   // With AuthContext
 *   const { hasPermission } = useAuth();
 *   if (hasPermission(PERMISSIONS.INVENTORY_WRITE)) { ... }
 */

import {
    PERMISSIONS,
    ROLES,
    PERMISSION_HIERARCHY,
    PERMISSION_GROUPS,
    impliesPermission,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getEffectivePermissions
} from '../../shared/permissions.cjs';

export {
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

/**
 * Get permission label from its name
 */
export const getPermissionLabel = (permissionName) => {
    if (!permissionName) return '';
    const [resource, action] = permissionName.split('.');
    return `${resource.charAt(0).toUpperCase() + resource.slice(1)} ${action.charAt(0).toUpperCase() + action.slice(1)}`;
};

/**
 * Get permission group by permission name
 */
export const getPermissionGroup = (permissionName) => {
    for (const [groupKey, group] of Object.entries(PERMISSION_GROUPS)) {
        if (group.permissions.includes(permissionName)) {
            return { key: groupKey, ...group };
        }
    }
    return null;
};
