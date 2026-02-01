import api from './index';

export const sparePartsAPI = {
    // Core CRUD
    getAll: (params) => api.get('/spare-parts', { params }),
    getById: (uuid) => api.get(`/spare-parts/${uuid}`), // Maps to /api/spare-parts/:id
    create: (data) => api.post('/spare-parts', data),
    update: (uuid, data) => api.put(`/spare-parts/${uuid}`, data),
    delete: (uuid) => api.delete(`/spare-parts/${uuid}`),

    // Inventory
    /**
     * Get paginated inventory list (for SparePartsInventory.jsx)
     */
    getInventoryList: (params) => api.get('/spare-parts/inventory', { params }),

    /**
     * Get inventory for a specific spare part (legacy support)
     * Maps to /api/spare-parts/:id/inventory
     */
    getInventory: (id) => api.get(`/spare-parts/${id}/inventory`), // used by service-operations consumers
    getSparePartInventory: (id) => api.get(`/spare-parts/${id}/inventory`), // Alias

    addInventory: (data) => api.post('/spare-parts/inventory', data),
    updateInventory: (inventoryId, data) => api.put(`/spare-parts/inventory/${inventoryId}`, data),

    // Reports & Metadata
    getLowStock: () => api.get('/spare-parts/reports/low-stock'),
    categories: () => api.get('/spare-parts/metadata/categories'), // legacy alias
    getCategories: () => api.get('/spare-parts/metadata/categories'),

    // Transaction methods
    receiveStock: (data) => api.post('/spare-parts/receive', data),
    dispenseStock: (data) => api.post('/spare-parts/dispense', data),

    // Device linking
    getCompatibleForDevice: (productId) => api.get(`/spare-parts/device/${productId}/compatible`),
    assignToDevice: (productId, data) => api.post(`/spare-parts/device/${productId}/assign`, data),
    removeAssignment: (assignmentId) => api.delete(`/spare-parts/device/assignment/${assignmentId}`),
    getDevicesByCategory: (category) => api.get(`/spare-parts/category/${category}/devices`),
    linkToDevice: (uuid, productId) => api.put(`/spare-parts/${uuid}/link-device`, { product_id: productId }),
    getLinkedEquipment: (id) => api.get(`/spare-parts/${id}/linked-equipment`),
};
