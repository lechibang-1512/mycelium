import api from './index';

export const disposalAPI = {
    getPending: () => api.get('/disposal/pending'),
    getHistory: (params) => api.get('/disposal/history', { params }),
    moveToDisposal: (data) => api.post('/disposal/move', data),
    completeDisposal: (data) => api.post('/disposal/complete', data)
};
