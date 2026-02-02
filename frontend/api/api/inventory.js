/**
 * Inventory API Module
 * 
 * Exports: inventoryAPI, inventoryTransactionAPI, inventoryMovementAPI
 */

import api from './index';

// Inventory API calls
export const inventoryAPI = {
    getAll: (params) => api.get('/inventory', { params }),
    getById: (id) => api.get(`/inventory/${id}`),
    getProductLogs: (id) => api.get(`/inventory/product/${id}/logs`),
    getZoneStatus: () => api.get('/inventory/status/zones'),
    receiveStock: (data) => api.post('/inventory/receive', data),

    // DEPRECATED: Use inventoryTransactionAPI.dispenseStock() with warehouse_id and zone_id
    dispenseStock: (data) => {
        console.warn(
            '⚠️ inventoryAPI.dispenseStock() is DEPRECATED!\n' +
            'Use inventoryTransactionAPI.dispenseStock() with warehouse_id and zone_id.\n' +
            'Example: inventoryTransactionAPI.dispenseStock({ warehouse_id, zone_id, items: [...] })'
        );
        return api.post('/inventory/dispense', data);
    },

    adjustStock: (data) => api.post('/inventory/adjust', data),

    // NOTE: getProducts was historically used to fetch a products list for device catalogs.
    // The canonical endpoints are now:
    //   - reportsAPI.getProductsForSpareParts() - for spare parts compatibility
    //   - reportsAPI.getProductsForRepair() - for repair job device selection
    //   - reportsAPI.getProducts() - general purpose (legacy)
    // Keep this alias for backward compatibility with UI components.
    getProducts: () => api.get('/reports/products'),

    // DEPRECATED: Use inventoryTransactionAPI.dispenseStock() instead
    sellStock: (data) => {
        console.warn(
            '⚠️ inventoryAPI.sellStock() is DEPRECATED!\n' +
            'Use inventoryTransactionAPI.dispenseStock() with warehouse_id and zone_id.'
        );
        return api.post('/inventory/dispense', data);
    },

    // Get stock transaction history for a product
    getStockHistory: (productId, limit = 50) => api.get(`/inventory/${productId}/history`, { params: { limit } }),

    // NEW: Get transaction logs with filters
    getTransactionLogs: (params) => api.get('/inventory/logs', { params }),

    // NEW: Get receipt details for printing
    getReceiptDetails: (receiptId) => api.get(`/inventory/receipt/${receiptId}`),
};

// Inventory Transaction API calls (NEW - Transactional Inventory System)
export const inventoryTransactionAPI = {
    // Receive stock from suppliers (creates receipt, updates warehouse_product_locations)
    receiveStock: (data) => api.post('/inventory-transactions/receive', data),

    // Dispense stock for customers (creates receipt, updates warehouse_product_locations)
    dispenseStock: (data) => api.post('/inventory-transactions/dispense', data),

    // Transfer stock between warehouses/zones
    transferStock: (data) => api.post('/inventory-transactions/transfer', data),

    // Get inventory level from transaction log (derived state)
    getInventoryLevel: (productId, params) => api.get(`/inventory-transactions/inventory-level/${productId}`, { params }),

    // Get transaction history for a product
    getHistory: (productId, params) => api.get(`/inventory-transactions/history/${productId}`, { params }),

    // Validate if quantity is available before dispensing
    validateAvailability: (params) => api.get('/inventory-transactions/validate-availability', { params }),

    // Get transaction statistics
    getStats: (params) => api.get('/inventory-transactions/stats', { params }),

    // Get items/expected serials from a PO/Invoice manifest
    getReceivingManifest: (uuid) => api.get(`/inventory-transactions/manifest/${uuid}`),
};

// Inventory Movement API calls
export const inventoryMovementAPI = {
    warehouseTransfer: (data) => api.post('/inventory-movement/warehouse-transfer', data),
    zoneTransfer: (data) => api.post('/inventory-movement/zone-transfer', data),
    bulkTransfer: (data) => api.post('/inventory-movement/bulk-transfer', data),
    getHistory: (params) => api.get('/inventory-movement/history', { params }),
    validate: (params) => api.get('/inventory-movement/validate', { params }),
};
