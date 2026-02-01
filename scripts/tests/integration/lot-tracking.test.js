/**
 * Integration Tests - Lot Tracking Service
 * Tests for FIFO allocation, lot generation, and inventory lookup
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const assert = require('assert');
const mariadb = require('mariadb');
const LotTrackingService = require('../../../backend/services/LotTrackingService');

describe('LotTrackingService', function () {
    this.timeout(15000);

    let pool;
    let lotService;

    before(async function () {
        pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'mycelium_dev',
            connectionLimit: 5
        });
        lotService = new LotTrackingService(pool);
    });

    after(async function () {
        if (pool) await pool.end();
    });

    describe('generateLotId()', function () {
        it('should generate a valid lot ID with correct format', async function () {
            const lotId = await lotService.generateLotId(123, null);
            assert.ok(lotId, 'Lot ID should be generated');
            assert.ok(lotId.startsWith('LOT-'), 'Lot ID should start with LOT-');
        });

        it('should generate unique lot IDs', async function () {
            const id1 = await lotService.generateLotId(1, null);
            const id2 = await lotService.generateLotId(1, null);
            assert.notStrictEqual(id1, id2, 'Each lot ID should be unique');
        });
    });

    describe('getFIFOLots()', function () {
        it('should return an array of lot allocations', async function () {
            const result = await lotService.getFIFOLots(1, 'WH001', 5);
            assert.ok(Array.isArray(result), 'Result should be an array');
        });

        it('should allocate in FIFO order (oldest first)', async function () {
            const result = await lotService.getFIFOLots(1, 'WH001', 100);
            if (result.length > 1) {
                for (let i = 1; i < result.length; i++) {
                    assert.ok(
                        new Date(result[i - 1].created_at) <= new Date(result[i].created_at),
                        'Lots should be ordered by creation date (FIFO)'
                    );
                }
            }
        });
    });

    describe('getLotInventory()', function () {
        it('should return inventory for a lot ID', async function () {
            const result = await lotService.getLotInventory('LOT-TEST-123');
            assert.ok(result, 'Result should be returned');
        });
    });

    describe('getLotHistory()', function () {
        it('should return lot transaction history', async function () {
            const testLotId = 'LOT-TEST-HISTORY';
            const result = await lotService.getLotHistory(testLotId);
            assert.ok(result, 'Result should be returned');
        });
    });

    describe('listLots()', function () {
        it('should return list of lots', async function () {
            const result = await lotService.listLots({ limit: 10 });
            assert.ok(Array.isArray(result), 'Result should be an array');
        });
    });
});
