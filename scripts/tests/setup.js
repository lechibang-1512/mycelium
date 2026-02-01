/**
 * Test Setup - MongoDB Version
 * Provides test fixtures and cleanup utilities using Mongoose
 */

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Configure chai
chai.use(chaiHttp.default || chaiHttp);

// Global test configuration
global.expect = chai.expect;
global.should = chai.should();

// Import MongoDB connection utilities
const { connectMongoDB, disconnectMongoDB } = require('../../backend/config/mongodb');

// Import Mongoose models
const { Supplier, Warehouse, Product, Transaction, Inventory } = require('../../backend/models');

/**
 * Connect to test database
 */
async function connectTestDB() {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }
    await connectMongoDB();
    return mongoose.connection;
}

/**
 * Close test database connection
 */
async function closeTestDB() {
    await disconnectMongoDB();
}

/**
 * Clean test data from database
 * Removes data identified by test prefixes (TEST-) or test user ID (999)
 */
async function cleanTestData() {
    await connectTestDB();

    try {
        // Clean up test transactions (inventory_log equivalent)
        await Transaction.deleteMany({
            $or: [
                { user_id: 999 },
                { 'items.serial_number': { $regex: /^TEST-/ } }
            ]
        });

        // Clean up test inventory items (assets, batch_tracking equivalent)
        await Inventory.deleteMany({
            $or: [
                { serial_number: { $regex: /^TEST-/ } },
                { batch_no: { $regex: /^TEST-/ } }
            ]
        });

        console.log('[Test Setup] Test data cleaned');
    } catch (error) {
        console.error('[Test Setup] Error cleaning test data:', error);
        throw error;
    }
}

/**
 * Create test fixtures
 */
async function createTestFixtures() {
    await connectTestDB();

    const fixtures = {
        suppliers: [],
        warehouses: [],
        products: []
    };

    try {
        // Create test supplier
        const supplier = await Supplier.create({
            name: 'Test Supplier',
            category: 'electronics',
            is_active: true
        });
        fixtures.suppliers.push({
            id: supplier.supplier_id,
            _id: supplier._id,
            name: supplier.name
        });

        // Create test warehouse
        const warehouseId = uuidv4();
        const warehouse = await Warehouse.create({
            warehouse_id: warehouseId,
            name: 'Test Warehouse',
            location: 'Test Location',
            is_active: true,
            zones: []
        });
        fixtures.warehouses.push({
            id: warehouse.warehouse_id,
            _id: warehouse._id,
            name: warehouse.name
        });

        // Create second test warehouse (for transfers)
        const warehouse2Id = uuidv4();
        const warehouse2 = await Warehouse.create({
            warehouse_id: warehouse2Id,
            name: 'Test Warehouse 2',
            location: 'Test Location 2',
            is_active: true,
            zones: []
        });
        fixtures.warehouses.push({
            id: warehouse2.warehouse_id,
            _id: warehouse2._id,
            name: warehouse2.name
        });

        // Create test product
        const productId = uuidv4();
        const product = await Product.create({
            product_id: productId,
            device_name: 'Test Phone',
            device_maker: 'Test Maker',
            device_price: 999.99,
            device_type: 'smartphone',
            is_active: true
        });
        fixtures.products.push({
            id: product.product_id,
            _id: product._id,
            name: product.device_name
        });

        console.log('[Test Setup] Fixtures created:', {
            suppliers: fixtures.suppliers.length,
            warehouses: fixtures.warehouses.length,
            products: fixtures.products.length
        });

        return fixtures;

    } catch (error) {
        console.error('[Test Setup] Error creating fixtures:', error);
        throw error;
    }
}

/**
 * Clean up test fixtures
 */
async function cleanTestFixtures(fixtures) {
    if (!fixtures) return;

    await connectTestDB();

    try {
        // Delete warehouses
        if (fixtures.warehouses?.length > 0) {
            const warehouseIds = fixtures.warehouses.map(w => w.id);
            await Warehouse.deleteMany({ warehouse_id: { $in: warehouseIds } });
        }

        // Delete products
        if (fixtures.products?.length > 0) {
            const productIds = fixtures.products.map(p => p.id);
            await Product.deleteMany({ product_id: { $in: productIds } });
        }

        // Delete suppliers
        if (fixtures.suppliers?.length > 0) {
            const supplierIds = fixtures.suppliers.map(s => s.id);
            await Supplier.deleteMany({ supplier_id: { $in: supplierIds } });
        }

        console.log('[Test Setup] Fixtures cleaned');
    } catch (error) {
        console.error('[Test Setup] Error cleaning fixtures:', error);
    }
}

/**
 * Setup test user in MongoDB
 * Creates or ensures test user exists for authentication
 */
async function setupTestUser() {
    await connectTestDB();

    const { User } = require('../../backend/models');

    try {
        // Check if test user exists
        let testUser = await User.findOne({ user_id: 999 });

        if (!testUser) {
            // Create test user if not exists
            testUser = await User.create({
                user_id: 999,
                username: 'testuser',
                password: 'testpassword123',
                name: 'Test User',
                email: 'test@example.com',
                is_active: true
            });
            console.log('[Test Setup] Test user created');
        }

        return testUser;
    } catch (error) {
        console.error('[Test Setup] Failed to set up test user:', error);
        throw error;
    }
}

// Export utilities
module.exports = {
    connectTestDB,
    closeTestDB,
    cleanTestData,
    createTestFixtures,
    cleanTestFixtures,
    setupTestUser,

    // Mongoose connection for direct access if needed
    mongoose,

    // Test helpers
    generateTestReceiptId: () => `TEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    generateTestSerialNumber: () => `TEST-SERIAL-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    generateTestBatchNo: () => `TEST-BATCH-${Date.now()}`,

    // Test user
    TEST_USER_ID: 999,
    TEST_USER_NAME: 'Test User'
};

// Note: Global hooks (before/after) should be defined in individual test files, not in setup.js
