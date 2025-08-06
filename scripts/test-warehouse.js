#!/usr/bin/env node

/**
 * Test Warehouse Service
 * Tests warehouse management functionality
 * Can be run from anywhere within the project directory
 */

// Initialize project environment
const { initializeProject, getProjectPath } = require('./utils-project-root');
const { projectRoot } = initializeProject({ verbose: true, requireEnv: true });

const mysql = require('mysql2/promise');
const WarehouseService = require(getProjectPath('services/WarehouseService'));
const dbConfig = require(getProjectPath('config/database'));

async function testWarehouseService() {
    let pool;
    
    try {
        console.log('Testing Warehouse Service...');
        // Log database config without sensitive information
        const safeDbConfig = {
            host: dbConfig.development.host,
            port: dbConfig.development.port,
            user: dbConfig.development.user,
            database: dbConfig.development.database,
            connectionLimit: dbConfig.development.connectionLimit
        };
        console.log('Database config:', safeDbConfig);
        
        // Create database connection pool
        pool = mysql.createPool(dbConfig.development);
        console.log('Database pool created');
        
        // Initialize service
        const warehouseService = new WarehouseService(pool);
        console.log('WarehouseService initialized');
        
        // Test getting all warehouses
        console.log('Getting warehouses...');
        const warehouses = await warehouseService.getWarehouses();
        console.log('All warehouses:', warehouses);
        
        // Test creating a warehouse (if none exist)
        if (warehouses.length === 0) {
            console.log('Creating sample warehouse...');
            const newWarehouse = await warehouseService.createWarehouse({
                name: 'Main Warehouse',
                location: '123 Main St',
                description: 'Primary storage facility'
            });
            console.log('Created warehouse:', newWarehouse);
            
            // Create a zone for the warehouse
            const newZone = await warehouseService.createZone({
                warehouse_id: newWarehouse.warehouse_id,
                name: 'Zone A',
                description: 'General storage area'
            });
            console.log('Created zone:', newZone);
        }
        
        // Test getting warehouses with zones
        console.log('Getting warehouses with zones...');
        const warehousesWithZones = await warehouseService.getWarehousesWithZones();
        console.log('Warehouses with zones:', JSON.stringify(warehousesWithZones, null, 2));
        
        console.log('Warehouse service test completed successfully!');
    } catch (error) {
        console.error('Error testing warehouse service:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        if (pool) {
            console.log('Closing database pool...');
            await pool.end();
        }
    }
}

console.log('🏪 Starting warehouse service test...');
console.log(`📁 Running from project root: ${projectRoot}`);
testWarehouseService().then(() => {
    console.log('✅ Test function completed successfully');
    process.exit(0);
}).catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});
