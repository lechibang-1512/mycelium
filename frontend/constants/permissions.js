/**
 * Shared Permissions Constants for Frontend
 * Single source of truth for RBAC permissions in React components
 * 
 * Usage:
 *   import { PERMISSIONS, ROLES } from '@/constants/permissions';
 *   
 *   // With AuthContext
 *   const { hasPermission } = useAuth();
 *   if (hasPermission(PERMISSIONS.INVENTORY_WRITE)) { ... }
 */

import {
    PERMISSIONS,
    ROLES
} from '../../shared/permissions.cjs';

export {
    PERMISSIONS,
    ROLES
};
