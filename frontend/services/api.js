/**
 * API Service - Consolidated Barrel File
 * 
 * This file re-exports all API modules for backward compatibility.
 * New code should import directly from the specific modules:
 *   import { inventoryAPI } from './api/inventory';
 *   import { warehouseAPI } from './api/warehouse';
 * 
 * Legacy imports continue to work:
 *   import { inventoryAPI, warehouseAPI } from '@/services/api';
 */

// Core axios instance
import api from './api/index';
export default api;

// RBAC API (Inlined)
export const getAllRoles = () => api.get('/roles').then(res => res.data);
export const getUserPermissions = (userId) => api.get(`/user-roles/${userId}/permissions`).then(res => res.data);
export const assignRoleToUser = (userId, roleId) => api.post(`/user-roles/${userId}/roles`, { role_id: roleId }).then(res => res.data);
export const removeRoleFromUser = (userId, roleId) => api.delete(`/user-roles/${userId}/roles/${roleId}`).then(res => res.data);

// Additional RBAC functions for RolesPermissions.jsx
export const getAllPermissions = () => api.get('/permissions').then(res => res.data);
export const createRole = (data) => api.post('/roles', data).then(res => res.data);
export const updateRole = (roleId, data) => api.put(`/roles/${roleId}`, data).then(res => res.data);
export const deleteRole = (roleId) => api.delete(`/roles/${roleId}`).then(res => res.data);
export const assignPermissionToRole = (roleId, permissionId) => api.post(`/roles/${roleId}/permissions`, { permission_id: permissionId }).then(res => res.data);
export const removePermissionFromRole = (roleId, permissionId) => api.delete(`/roles/${roleId}/permissions/${permissionId}`).then(res => res.data);
export const bulkSetRolePermissions = (roleId, permissions) => api.put(`/roles/${roleId}/permissions/bulk`, { permissions }).then(res => res.data);
export const getUsersByRole = (roleId) => api.get(`/roles/${roleId}/users`).then(res => res.data);

// Inventory APIs
export {
  inventoryAPI,
  inventoryTransactionAPI,
  inventoryMovementAPI
} from './api/inventory';

// Warehouse APIs
export {
  warehouseAPI,
  binsAPI
} from './api/warehouse';

// Service Operations APIs (Repair, RMA, Spare Parts)
export {
  repairJobsAPI,
  rmaAPI
} from './api/service-operations';

export { sparePartsAPI } from './api/spare-parts';

// Catalog APIs
export {
  phonesAPI,
  suppliersAPI,
  deviceSearchAPI,
  reportsAPI
} from './api/catalog';

export { invoicesAPI } from './api/invoices';

// Stocktake APIs
export {
  stocktakeAPI,
  recommendationsAPI
} from './api/stocktake';

// Receipts API
export { receiptsAPI } from './api/receipts';

// New APIs (Consolidated)
export { customerInvoicesAPI } from './api/customer-invoices';
export { disposalAPI } from './api/disposal';
export { lotsAPI } from './api/lots';
export { serializedInventoryAPI } from './api/serialized-inventory';
