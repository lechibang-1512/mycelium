/**
 * Service Operations API Module
 * 
 * Exports: repairJobsAPI, rmaAPI, sparePartsAPI
 */

import api from './index';

// Repair Jobs API
export const repairJobsAPI = {
    getAll: (params) => api.get('/repair-jobs', { params }),
    getById: (id) => api.get(`/repair-jobs/${id}`),
    create: (data) => api.post('/repair-jobs', data),
    update: (id, data) => api.put(`/repair-jobs/${id}`, data),
    cancel: (id) => api.delete(`/repair-jobs/${id}`),
    delete: (id, force = false) => api.delete(`/repair-jobs/${id}${force ? '?force=true' : ''}`),
    addPart: (id, data) => api.post(`/repair-jobs/${id}/parts`, data),
    removePart: (id, usageId) => api.delete(`/repair-jobs/${id}/parts/${usageId}`),
    technicianPerformance: () => api.get('/repair-jobs/reports/technician-performance'),

    // Search
    search: (query) => api.get(`/repair-jobs/search/${encodeURIComponent(query)}`),

    // RMA Integration (NEW)
    createFromRMA: (rmaItemData, repairJobData) => api.post('/repair-jobs/from-rma', { rmaItemData, repairJobData }),
    getByRMAItem: (rmaItemId) => api.get(`/repair-jobs/rma-item/${rmaItemId}`),
    linkToRMA: (repairJobId, data) => api.post(`/repair-jobs/${repairJobId}/link-rma`, data),
    getLinkedRMAs: (repairJobId) => api.get(`/repair-jobs/${repairJobId}/linked-rmas`),

    // Bulk operations
    bulkUpdateStatus: (data) => api.post('/repair-jobs/bulk/status', data),
    bulkAssign: (data) => api.post('/repair-jobs/bulk/assign', data),
    bulkUpdatePriority: (data) => api.post('/repair-jobs/bulk/priority', data),
    bulkCancel: (data) => api.post('/repair-jobs/bulk/cancel', data),

    // Status History (NEW)
    getStatusHistory: (id) => api.get(`/repair-jobs/${id}/status-history`),

    // Customer History (NEW)
    getCustomerHistory: (params) => api.get('/repair-jobs/customer-history', { params }),

    // Attachments (NEW)
    getAttachments: (id) => api.get(`/repair-jobs/${id}/attachments`),
    uploadAttachment: (id, formData) => api.post(`/repair-jobs/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    deleteAttachment: (id, attachmentId) => api.delete(`/repair-jobs/${id}/attachments/${attachmentId}`),
};

// RMA (Return Merchandise Authorization) API
export const rmaAPI = {
    // Core CRUD operations
    getAll: (params) => api.get('/rma', { params }),
    getById: (id) => api.get(`/rma/${id}`),
    create: (data) => api.post('/rma', data),
    update: (id, data) => api.put(`/rma/${id}`, data),
    delete: (id) => api.delete(`/rma/${id}`),

    // Status management
    updateStatus: (id, data) => api.put(`/rma/${id}/status`, data),
    getHistory: (id) => api.get(`/rma/${id}/history`),

    // Item operations (for unified rma table with JSON items)
    receiveItems: (rmaNumber, data) => api.post(`/rma/${rmaNumber}/receive`, data),
    inspectItem: (rmaNumber, itemId, data) => api.put(`/rma/${rmaNumber}/items/${itemId}/inspect`, data),
    setDisposition: (rmaNumber, itemId, data) => api.put(`/rma/${rmaNumber}/items/${itemId}/disposition`, data),
    processDisposition: (rmaNumber, itemId, data) => api.post(`/rma/${rmaNumber}/items/${itemId}/process-disposition`, data),

    // Attachments
    addAttachment: (id, data) => api.post(`/rma/${id}/attachments`, data),
    getAttachments: (id) => api.get(`/rma/${id}/attachments`),

    // Search
    search: (query) => api.get(`/rma/search/${query}`),

    // Repair Job Linking (for unified rma table with JSON items)
    getRepairJobs: (rmaNumber) => api.get(`/rma/${rmaNumber}/repair-jobs`),
    linkRepairJob: (rmaNumber, itemId, repairJobId, linkReason, notes) =>
        api.post(`/rma/${rmaNumber}/items/${itemId}/link-repair`, { repairJobId, linkReason, notes }),
    unlinkRepairJob: (rmaNumber, itemId) => api.delete(`/rma/${rmaNumber}/items/${itemId}/repair-link`),
    createRepairJobFromItem: (rmaItemData, repairJobData) =>
        api.post('/repair-jobs/from-rma', { rmaItemData, repairJobData }),
    getMatchingRepairJobs: (rmaNumber, itemId) => api.get(`/rma/${rmaNumber}/items/${itemId}/matching-repair-jobs`),

    // Bulk operations
    bulkUpdateStatus: (data) => api.post('/rma/bulk/status', data),
    bulkAssign: (data) => api.post('/rma/bulk/assign', data),
    bulkSetPriority: (data) => api.post('/rma/bulk/priority', data),
};

// Spare Parts API
export const sparePartsAPI = {
    getAll: (params) => api.get('/spare-parts', { params }),
    getById: (id) => api.get(`/spare-parts/${id}`),
    create: (data) => api.post('/spare-parts', data),
    update: (id, data) => api.put(`/spare-parts/${id}`, data),
    delete: (id) => api.delete(`/spare-parts/${id}`),
    getInventory: (id) => api.get(`/spare-parts/${id}/inventory`),
    addInventory: (data) => api.post('/spare-parts/inventory', data),
    updateInventory: (inventoryId, data) => api.put(`/spare-parts/inventory/${inventoryId}`, data),
    lowStockReport: () => api.get('/spare-parts/reports/low-stock'),
    categories: () => api.get('/spare-parts/metadata/categories'),
    getLowStock: () => api.get('/spare-parts/reports/low-stock'),

    // Device linking endpoints
    getCompatibleForDevice: (productId) => api.get(`/spare-parts/device/${productId}/compatible`),
    assignToDevice: (productId, data) => api.post(`/spare-parts/device/${productId}/assign`, data),
    removeAssignment: (assignmentId) => api.delete(`/spare-parts/device/assignment/${assignmentId}`),
    getDevicesByCategory: (category) => api.get(`/spare-parts/category/${category}/devices`),
    linkToDevice: (sparePartId, productId) => api.put(`/spare-parts/${sparePartId}/link-device`, { product_id: productId }),
};
