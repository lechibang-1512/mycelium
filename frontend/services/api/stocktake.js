/**
 * Stocktake API Module
 * 
 * Exports: stocktakeAPI, recommendationsAPI
 */

import api from './index';

// Stocktake APIs
export const stocktakeAPI = {
    // Get all stocktakes
    getAll: (params) => api.get('/stocktake', { params }),

    // Get stocktake by ID
    getById: (id) => api.get(`/stocktake/${id}`),

    // Create new stocktake (full count)
    create: (data) => api.post('/stocktake', data),

    // Update stocktake
    update: (id, data) => api.put(`/stocktake/${id}`, data),

    // Start stocktake (change to IN_PROGRESS)
    start: (id) => api.put(`/stocktake/${id}/start`),

    // Complete stocktake
    complete: (id) => api.put(`/stocktake/${id}/complete`),

    // Approve stocktake
    approve: (id) => api.put(`/stocktake/${id}/approve`),

    // Cancel stocktake
    cancel: (id, reason) => api.put(`/stocktake/${id}/cancel`, { reason }),

    // Delete stocktake
    delete: (id) => api.delete(`/stocktake/${id}`),

    // ==========================================
    // ITEM APIs
    // ==========================================

    // Add item to stocktake
    addItem: (id, data) => api.post(`/stocktake/${id}/items`, data),

    // Record item count / Update item
    updateItem: (itemId, data) => api.put(`/stocktake/items/${itemId}`, data),

    // Alias for record count (legacy support)
    recordCount: (itemId, data) => api.put(`/stocktake/items/${itemId}/count`, data),

    // Delete item
    deleteItem: (itemId) => api.delete(`/stocktake/items/${itemId}`),

    // Get stocktake stats
    getStats: (id) => api.get(`/stocktake/${id}/stats`),

    // ==========================================
    // CYCLE COUNTING APIs
    // ==========================================

    // Create cycle count
    createCycleCount: (data) => api.post('/stocktake/cycle', data),

    // Get items due for counting
    getDueItems: (params) => api.get('/stocktake/due-items', { params }),

    // Get inventory accuracy (IRA) metrics
    getAccuracy: (params) => api.get('/stocktake/accuracy', { params }),

    // Get cycle count schedules
    getSchedules: (params) => api.get('/stocktake/schedules', { params }),

    // Create cycle count schedule
    createSchedule: (data) => api.post('/stocktake/schedules', data),

    // Get available products for stocktake
    getProducts: (params) => api.get('/stocktake/products', { params }),
};

// Recommendations APIs
export const recommendationsAPI = {
    // Get reorder recommendations
    getReorderRecommendations: (params) => api.get('/recommendations', { params }),

    // Get recommendation by ID
    getById: (id) => api.get(`/recommendations/${id}`),

    // Approve recommendation
    approve: (id) => api.post(`/recommendations/${id}/approve`),

    // Reject recommendation
    reject: (id, reason) => api.post(`/recommendations/${id}/reject`, { reason }),

    // Generate recommendations
    generate: (data) => api.post('/recommendations/generate', data),

    // Get recommendation settings
    getSettings: () => api.get('/recommendations/settings'),

    // Update recommendation settings
    updateSettings: (data) => api.put('/recommendations/settings', data),
};
