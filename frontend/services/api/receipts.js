/**
 * Receipts API Module
 * 
 * Exports: receiptsAPI
 */

import api from './index';

// Receipts API calls
export const receiptsAPI = {
    getAll: (params) => api.get('/receipts', { params }),
    getById: (id) => api.get(`/receipts/${id}`),
    create: (data) => api.post('/receipts', data),
    delete: (id) => api.delete(`/receipts/${id}`),
};
