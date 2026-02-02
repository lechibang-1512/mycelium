import api from './index';

export const invoicesAPI = {
    // Invoices
    getInvoices: (filters = {}) => api.get('/invoices', { params: filters }),
    getInvoiceDetail: (id) => api.get(`/invoices/${id}`),
    createInvoice: (data) => api.post('/invoices', data),
    deleteInvoice: (id) => api.delete(`/invoices/${id}`),
    updateInvoiceStatus: (id, status) => api.patch(`/invoices/${id}/status`, { status }),
    importInvoice: (formData) => api.post('/invoices/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getSpareParts: (id) => api.get(`/invoices/${id}/spare-parts`)
};