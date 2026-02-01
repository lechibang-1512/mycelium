/**
 * Warehouse API Module
 * 
 * Exports: warehouseAPI, binsAPI
 * Note: Zones have been replaced with Column-Row-Bin hierarchy
 */

import api from './index';

// Warehouse API calls
export const warehouseAPI = {
    getAll: () => api.get('/warehouses'),
    getById: (id) => api.get(`/warehouses/${id}`),
    create: (data) => api.post('/warehouses', data),
    update: (id, data) => api.put(`/warehouses/${id}`, data),
    activate: (id) => api.put(`/warehouses/${id}/activate`),
    deactivate: (id) => api.put(`/warehouses/${id}/deactivate`),
    delete: (id) => api.delete(`/warehouses/${id}`),

    // Distribution
    getDistributionOverview: () => api.get('/warehouses/distribution/overview'),
    getStatistics: (warehouseId) => api.get(`/warehouses/${warehouseId}/statistics`),

    // Column-Row-Bin hierarchy
    getColumns: (warehouseId) => api.get(`/warehouses/${warehouseId}/columns`),
    getRows: (warehouseId, column) => api.get(`/warehouses/${warehouseId}/columns/${column}/rows`),
    getBins: (warehouseId) => api.get(`/warehouses/${warehouseId}/bins`),
    getBinsHierarchical: (warehouseId) => api.get(`/warehouses/${warehouseId}/bins/hierarchical`),

    // Inventory by location
    getInventoryByLocation: (warehouseId) => api.get(`/warehouses/${warehouseId}/inventory`),

    // Transfer operations
    transferInventory: (data) => api.post('/warehouses/transfer', data),

    // Get low stock alerts with stock level classification
    getLowStockAlerts: (options = {}) => {
        const params = {};
        if (options.lowThreshold) params.lowThreshold = options.lowThreshold;
        if (options.criticalThreshold) params.criticalThreshold = options.criticalThreshold;
        if (options.highThreshold) params.highThreshold = options.highThreshold;
        return api.get('/warehouses/low-stock-alerts', { params });
    },
};

// Bins API calls
export const binsAPI = {
    // Get all bins (with optional warehouse filter)
    getAll: (params) => api.get('/bins', { params }),

    // Get all bins in a warehouse
    getByWarehouse: (warehouseId) => api.get(`/bins/warehouse/${warehouseId}`),

    // Get bins organized hierarchically by column-row
    getHierarchical: (warehouseId) => api.get(`/bins/warehouse/${warehouseId}/hierarchical`),

    // Get bin by ID
    getById: (binId) => api.get(`/bins/${binId}`),

    // Get detailed bin contents (aggregate + serialized items)
    getContents: (binId) => api.get(`/bins/${binId}/contents`),

    // Create bin
    create: (data) => api.post('/bins', data),

    // Bulk create bins
    bulkCreate: (data) => api.post('/bins/bulk', data),

    // Update bin
    update: (binId, data) => api.put(`/bins/${binId}`, data),

    // Delete bin
    delete: (binId) => api.delete(`/bins/${binId}`),

    // Assign product to bin
    assignProduct: (binId, data) => api.post(`/bins/${binId}/inventory`, data),

    // Remove product from bin
    removeProduct: (binId, data) => api.delete(`/bins/${binId}/inventory`, { data }),

    // Move product between bins
    moveProduct: (data) => api.post('/bins/move', data),

    // Transfer between bins (supports both products and spare parts)
    transfer: (data) => api.post('/bins/move', {
        from_bin_id: data.fromBinId,
        to_bin_id: data.toBinId,
        product_id: data.productId || null,
        spare_part_id: data.sparePartId || null,
        quantity: data.quantity,
        batch_id: data.batchId || null
    }),

    // Get warehouse bin utilization
    getWarehouseUtilization: (warehouseId) => api.get(`/bins/warehouse/${warehouseId}/utilization`),

    // Find available bins
    findAvailable: (warehouseId, params) => api.get(`/bins/warehouse/${warehouseId}/available`, { params }),

    // Get product bin locations
    getProductLocations: (productId, params) => api.get(`/bins/product/${productId}`, { params }),
};
