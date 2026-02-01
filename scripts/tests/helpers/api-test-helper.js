

// const request = require('supertest'); // Unused currently
const axios = require('axios');

class APITestHelper {
    constructor(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL;
        this.authCookie = null;
        this.axiosInstance = axios.create({
            baseURL: baseURL,
            timeout: 10000,
            validateStatus: () => true // Don't throw on any status
        });
    }


    async login(username = 'admin', password = process.env.ADMIN_PASSWORD || process.env.ADMIN_DEFAULT_PASSWORD) {
        if (!password) {
            throw new Error('ADMIN_PASSWORD or ADMIN_DEFAULT_PASSWORD environment variable is required for tests. Set it in your .env file or export it before running tests.');
        }
        const response = await this.axiosInstance.post('/api/auth/login', {
            username,
            password
        });

        if (response.status === 404) {
            // Auth endpoint doesn't exist - assume auth is disabled
            console.log('APITestHelper: Auth endpoint not found - assuming authentication is disabled');
            return { status: 200, data: { success: true, message: 'Auth disabled' } };
        }

        if (response.status === 200 && response.headers['set-cookie']) {
            this.authCookie = response.headers['set-cookie'][0];
        } else if (response.status !== 200) {
            console.log(`APITestHelper: Login failed with status ${response.status}`);
            if (response.data) {
                console.log('Response:', JSON.stringify(response.data, null, 2));
            }
        }

        return response;
    }

    /**
     * Make authenticated GET request
     */
    async get(path, options = {}) {
        const headers = { ...options.headers };
        if (this.authCookie) {
            headers.Cookie = this.authCookie;
        }

        return await this.axiosInstance.get(path, {
            ...options,
            headers
        });
    }

    /**
     * Make authenticated POST request
     */
    async post(path, data, options = {}) {
        const headers = { ...options.headers };
        if (this.authCookie) {
            headers.Cookie = this.authCookie;
        }

        return await this.axiosInstance.post(path, data, {
            ...options,
            headers
        });
    }

    /**
     * Make authenticated PUT request
     */
    async put(path, data, options = {}) {
        const headers = { ...options.headers };
        if (this.authCookie) {
            headers.Cookie = this.authCookie;
        }

        return await this.axiosInstance.put(path, data, {
            ...options,
            headers
        });
    }

    /**
     * Make authenticated PATCH request
     */
    async patch(path, data = {}, options = {}) {
        const headers = { ...options.headers };
        if (this.authCookie) {
            headers.Cookie = this.authCookie;
        }

        return await this.axiosInstance.patch(path, data, {
            ...options,
            headers
        });
    }

    /**
     * Make authenticated DELETE request
     */
    async delete(path, options = {}) {
        const headers = { ...options.headers };
        if (this.authCookie) {
            headers.Cookie = this.authCookie;
        }

        return await this.axiosInstance.delete(path, {
            ...options,
            headers
        });
    }

    /**
     * Logout
     */
    async logout() {
        try {
            const response = await this.post('/api/auth/logout');
            this.authCookie = null;
            return response;
        } catch (error) {
            // Ignore connection errors during logout (server may not be running)
            this.authCookie = null;
            return { status: 0, data: { error: 'Connection failed' } };
        }
    }


    isSuccess(response) {
        return response.status >= 200 && response.status < 300;
    }


    isError(response) {
        return response.status >= 400;
    }

    /**
     * Extract error message from response
     */
    getErrorMessage(response) {
        return response.data?.error || response.data?.message || 'Unknown error';
    }


    async waitForServer(maxAttempts = 5, delayMs = 500) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await this.axiosInstance.get('/api/health', { timeout: 2000 });
                if (response.status === 200) {
                    return true;
                }
            } catch {
                // Server not ready yet
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        return false;
    }
}

/**
 * Test data generators
 */
const TestDataGenerator = {
    /**
     * Generate random product data
     */
    product: (overrides = {}) => ({
        device_name: `Test Device ${Date.now()}`,
        device_maker: 'Test Maker',
        device_price: 999.99,
        category: 'electronics',
        is_active: 1,
        ...overrides
    }),

    /**
     * Generate random warehouse data
     */
    warehouse: (overrides = {}) => ({
        name: `Test Warehouse ${Date.now()}`,
        location: 'Test Location',
        is_active: 1,
        ...overrides
    }),

    /**
     * Generate random supplier data
     */
    supplier: (overrides = {}) => ({
        name: `Test Supplier ${Date.now()}`,
        category: 'electronics',
        contact_person: 'John Doe',
        email: `test${Date.now()}@example.com`,
        phone: '1234567890',
        is_active: 1,
        ...overrides
    }),

    /**
     * Generate random spare part data
     */
    sparePart: (overrides = {}) => ({
        part_name: `Test Spare Part ${Date.now()}`,
        part_code: `PART-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        part_category: 'display',
        manufacturer: 'Test Manufacturer',
        quality_grade: 'OEM',
        unit_cost: 45.00,
        retail_price: 75.00,
        minimum_stock_level: 10,
        reorder_point: 20,
        is_active: 1,
        ...overrides
    }),

    /**
     * Generate spare part inventory data
     */
    sparePartInventory: (sparePartId, warehouseId, overrides = {}) => ({
        spare_part_id: sparePartId,
        warehouse_id: warehouseId,
        quantity_on_hand: 50,
        batch_no: `BATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        condition_status: 'NEW',
        ...overrides
    }),

    /**
     * Generate random receipt data
     */
    receipt: (supplierId, items, overrides = {}) => ({
        supplier_id: supplierId,
        items: items,
        warehouse_id: 1,
        zone_id: 1,
        user_id: 999,
        subtotal: items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0),
        tax_amount: 0,
        total_amount: items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0),
        ...overrides
    }),

    /**
     * Generate random receipt item
     */
    receiptItem: (productId, overrides = {}) => ({
        product_id: productId,
        quantity: 10,
        unit_cost: 50.00,
        ...overrides
    }),

    /**
     * Generate random batch number
     */
    generateBatchNumber: () => `BATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,

    /**
     * Generate random serial number
     */
    generateSerialNumber: () => `SN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,

    /**
     * Generate random IMEI
     */
    generateIMEI: () => {
        // Generate a 15-digit IMEI (simplified)
        const imei = '35' + Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0');
        return imei;
    },

    /**
     * Generate random string with prefix
     */
    generateRandomString: (prefix = 'TEST') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,

    /**
     * Generate future date
     */
    generateFutureDate: (daysAhead = 30) => {
        const date = new Date();
        date.setDate(date.getDate() + daysAhead);
        return date.toISOString().split('T')[0];
    },

    /**
     * Generate past date
     */
    generatePastDate: (daysBehind = 30) => {
        const date = new Date();
        date.setDate(date.getDate() - daysBehind);
        return date.toISOString().split('T')[0];
    }
};

/**
 * Assertion helpers
 */
const AssertionHelpers = {
    /**
     * Assert response has success structure
     */
    assertSuccess: (response, message = 'Response should be successful') => {
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`${message} (status: ${response.status})`);
        }
    },

    /**
     * Assert response is error
     */
    assertError: (response, expectedStatus, message = 'Response should be error') => {
        if (response.status !== expectedStatus) {
            throw new Error(`${message} (expected: ${expectedStatus}, got: ${response.status})`);
        }
    },

    /**
     * Assert response has required fields
     */
    assertFields: (object, fields, message = 'Object missing required fields') => {
        const missingFields = fields.filter(field => !(field in object));
        if (missingFields.length > 0) {
            throw new Error(`${message}: ${missingFields.join(', ')}`);
        }
    },

    /**
     * Assert array is not empty
     */
    assertNotEmpty: (array, message = 'Array should not be empty') => {
        if (!Array.isArray(array) || array.length === 0) {
            throw new Error(message);
        }
    },

    /**
     * Assert value is in range
     */
    assertInRange: (value, min, max, message = 'Value out of range') => {
        if (value < min || value > max) {
            throw new Error(`${message} (value: ${value}, range: ${min}-${max})`);
        }
    }
};

module.exports = {
    APITestHelper,
    TestDataGenerator,
    AssertionHelpers
};
