import api from './index';

export const lotsAPI = {
    getFIFOAllocation: (data) => api.post('/lots/fifo-allocation', data)
};
