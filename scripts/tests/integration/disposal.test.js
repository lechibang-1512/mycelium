/**
 * Integration Tests - Disposal Service
 * Tests disposal zone operations and item management
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const assert = require('assert');
const mariadb = require('mariadb');

describe('DisposalService', function () {
    this.timeout(15000);

    let pool;
    let DisposalService;
    let disposalService;

    before(async function () {
        pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'mycelium_dev',
            connectionLimit: 5
        });

        DisposalService = require('../../../backend/services/DisposalService');
        disposalService = new DisposalService(pool);
    });

    after(async function () {
        if (pool) await pool.end();
    });

    describe.skip('getDisposalZone()', function () {
        it('should return disposal zone or null for a warehouse', async function () {
            const [warehouse] = await pool.query(
                'SELECT warehouse_id FROM warehouses WHERE is_active = 1 LIMIT 1'
            );

            if (!warehouse) {
                this.skip('No active warehouse found for test');
                return;
            }

            const zone = await disposalService.getDisposalZone(warehouse.warehouse_id);
            // May be null if no disposal zone exists
            assert.ok(zone === null || typeof zone === 'object', 'Result should be zone object or null');
        });
    });

    describe('getPendingDisposal()', function () {
        it('should return pending items for disposal', async function () {
            const result = await disposalService.getPendingDisposal();
            assert.ok(Array.isArray(result), 'Result should be an array');
        });
    });

    describe('getDisposalHistory()', function () {
        it('should return disposal history with filters', async function () {
            const result = await disposalService.getDisposalHistory({
                limit: 10,
                offset: 0
            });
            assert.ok(Array.isArray(result), 'Result should be an array');
        });

        it('should filter by date range', async function () {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);

            const result = await disposalService.getDisposalHistory({
                startDate: startDate.toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
            });
            assert.ok(Array.isArray(result), 'Result should be an array');
        });
    });

    describe('createDisposalZone()', function () {
        it('should throw error because zones are retired', async function () {
            const [warehouse] = await pool.query(
                'SELECT warehouse_id, name FROM warehouses WHERE is_active = 1 LIMIT 1'
            );

            if (!warehouse) {
                this.skip('No active warehouse found for test');
                return;
            }

            const zoneName = `Test Disposal Zone ${Date.now()}`;

            try {
                await disposalService.createDisposalZone(
                    warehouse.warehouse_id,
                    zoneName,
                    'Integration test disposal zone'
                );
                assert.fail('Expected createDisposalZone to throw');
            } catch (err) {
                assert.ok(err.message.includes('retired'), 'Should indicate zones are retired');
            }
        });
    });
});
