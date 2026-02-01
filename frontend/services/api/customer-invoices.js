import api from './index';

export const customerInvoicesAPI = {
    getAll: (params) => api.get('/customer-invoices', { params }),
    getById: (id) => api.get(`/customer-invoices/${id}`),
    create: (data) => api.post('/customer-invoices', data),
    update: (id, data) => api.put(`/customer-invoices/${id}`, data),
    delete: (id) => api.delete(`/customer-invoices/${id}`),
    getByIMEI: (imei) => api.get(`/customer-invoices/by-imei/${imei}`),
    getWarrantyInfo: (imei) => api.get(`/customer-invoices/warranty/${imei}`)
};
