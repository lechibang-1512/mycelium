import api from './index';

export const serializedInventoryAPI = {
    getDevices: (params) => api.get('/serialized-inventory/devices', { params }),
    getStats: () => api.get('/serialized-inventory/stats/summary'),
    updateStatus: (id, data) => api.put(`/serialized-inventory/${id}/status`, data),
    // Additional potential endpoint based on usage or backend capabilities
    getLog: (id) => api.get(`/serialized-inventory/${id}/log`)
};
