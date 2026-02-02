/**
 * Catalog API Module
 * 
 * Exports: phonesAPI, suppliersAPI, deviceSearchAPI, reportsAPI
 */

import api from './index';

// Phones API calls
export const phonesAPI = {
    getAll: (params) => api.get('/phones', { params }),
    getById: (id) => api.get(`/phones/${id}`),
    create: (data) => api.post('/phones', data),
    update: (id, data) => api.put(`/phones/${id}`, data),
    delete: (id) => api.delete(`/phones/${id}`),
};

// Suppliers API calls
export const suppliersAPI = {
    getAll: (params) => api.get('/suppliers', { params }),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post('/suppliers', data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
    deactivate: (id) => api.put(`/suppliers/${id}/deactivate`),
    toggleStatus: (id) => api.patch(`/suppliers/${id}/toggle-status`),
    getCategories: () => api.get('/suppliers/meta/categories'),
    getBrands: () => api.get('/suppliers/meta/brands'),
    getStats: (id) => api.get(`/suppliers/${id}/stats`),
    getPerformance: (id, period = 90) => api.get(`/suppliers/${id}/performance`, { params: { period } }),
    getValuation: (id) => api.get(`/suppliers/${id}/valuation`),
    checkCompatibility: (supplierId, productId) => api.get(`/suppliers/${supplierId}/products/${productId}/compatibility`)
};

// Device Search API (IMEI/Serial Matching)
export const deviceSearchAPI = {
    // Search for device across repair jobs and RMAs
    search: (identifier, type = 'auto') => api.get(`/device-search/${identifier}`, { params: { type } }),

    // Get device suggestions for autocomplete
    suggest: (partial) => api.get(`/device-search/suggest/${partial}`),
};

// Reports API (Product Listings)
export const reportsAPI = {
    // Get all products from specs_db (general purpose)
    getProducts: (params) => api.get('/reports/products', { params }),

    // Get products for spare parts compatibility selection
    getProductsForSpareParts: () => api.get('/reports/products-for-spare-parts'),

    // Get products for repair job device selection
    getProductsForRepair: () => api.get('/reports/products-for-repair'),
};
