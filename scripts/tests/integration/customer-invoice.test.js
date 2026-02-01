/**
 * Integration Tests - Customer Invoice Service
 * Tests CRUD operations and warranty lookups
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const assert = require('assert');
const mariadb = require('mariadb');

describe('CustomerInvoiceService', function () {
    this.timeout(15000);

    let pool;
    let CustomerInvoiceService;
    let invoiceService;

    before(async function () {
        pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'mycelium_dev',
            connectionLimit: 5
        });

        CustomerInvoiceService = require('../../../backend/services/CustomerInvoiceService');
        invoiceService = new CustomerInvoiceService(pool);
    });

    after(async function () {
        if (pool) await pool.end();
    });

    describe('create()', function () {
        let testInvoiceId;
        const uniqueSuffix = Date.now();

        it('should create a new customer invoice', async function () {
            const testData = {
                invoice_number: `TEST-${uniqueSuffix}`,
                customer_name: 'Test Customer',
                customer_phone: '0123456789',
                sale_date: new Date().toISOString().split('T')[0],
                imei: `TESTIMEI${uniqueSuffix}`,
                product_name: 'Test Phone',
                product_variant: 'Test Variant',
                sale_price: 1000000,
                warranty_months: 12,
                notes: 'Integration test invoice'
            };

            const result = await invoiceService.create(testData, 1);
            assert.ok(result.id, 'Created invoice should have an ID');
            testInvoiceId = result.id;
        });

        after(async function () {
            if (testInvoiceId) {
                try {
                    await invoiceService.delete(testInvoiceId);
                } catch (e) { /* ignore cleanup errors */ }
            }
        });
    });

    describe('getWarrantyInfo()', function () {
        let testInvoiceId;
        const testIMEI = `WARRANTY-TEST-${Date.now()}`;

        before(async function () {
            const testData = {
                invoice_number: `WARRANTY-${Date.now()}`,
                customer_name: 'Warranty Test Customer',
                customer_phone: '0987654321',
                sale_date: new Date().toISOString().split('T')[0],
                imei: testIMEI,
                product_name: 'Warranty Test Phone',
                warranty_months: 12
            };

            const result = await invoiceService.create(testData, 1);
            testInvoiceId = result.id;
        });

        it('should find warranty info by IMEI', async function () {
            const result = await invoiceService.getWarrantyInfo(testIMEI);
            assert.ok(result, 'Should find warranty by IMEI');
        });

        it('should return null for unknown IMEI', async function () {
            const result = await invoiceService.getWarrantyInfo('UNKNOWN-IMEI-123');
            assert.strictEqual(result, null, 'Should return null for unknown IMEI');
        });

        after(async function () {
            if (testInvoiceId) {
                try {
                    await invoiceService.delete(testInvoiceId);
                } catch (e) { /* ignore cleanup errors */ }
            }
        });
    });

    describe('list()', function () {
        it('should return list of invoices', async function () {
            const result = await invoiceService.list({ limit: 10, offset: 0 });
            assert.ok(Array.isArray(result), 'Result should be an array');
        });
    });
});
