
const pool = require('../backend/config/database');
const WarehouseService = require('../backend/services/WarehouseService');
const StocktakeService = require('../backend/services/StocktakeService');

async function deleteAll() {
    let connection;
    try {
        console.log('Connecting to database...');
        // Ensure pool works
        connection = await pool.getConnection();
        console.log('Connected to database.');
        connection.release(); // Release the test connection immediately

        const warehouseService = new WarehouseService(pool);
        // StocktakeService can use the pool passed to constructor or static setPool
        // Based on the code: const service = new StocktakeService(pool); service.createStocktake()
        const stocktakeService = new StocktakeService(pool);


        // 1. Delete all stocktakes
        console.log('\n--- Deleting Stocktakes ---');
        // listStocktakes doesn't seem to have a "limit: unlimited" option easily visible, 
        // but passing a large limit should work or check implementation.
        // The implementation checks: if (filters.limit && !isNaN(parseInt(filters.limit)))
        // So if we don't pass limit, it might return all? 
        // Let's check listStocktakes implementation in thought process previously:
        /*
          if (filters.limit && !isNaN(parseInt(filters.limit))) {
            query += ' LIMIT ?';
            params.push(parseInt(filters.limit));
          }
        */
        // So no limit by default.
        
        const stocktakes = await StocktakeService.listStocktakes({}); 
        console.log(`Found ${stocktakes.length} stocktakes.`);

        for (const st of stocktakes) {
            try {
                console.log(`Deleting stocktake ${st.stocktake_number} (ID: ${st.stocktake_id})...`);
                await StocktakeService.deleteStocktake(st.stocktake_id);
                console.log(`✓ Deleted stocktake ${st.stocktake_id}`);
            } catch (err) {
                console.error(`✗ Failed to delete stocktake ${st.stocktake_id}:`, err.message);
            }
        }

        // 2. Delete all warehouses
        console.log('\n--- Deleting Warehouses ---');
        // getWarehouses(activeOnly = true) -> default is true. We want ALL.
        const warehouses = await warehouseService.getWarehouses(false);
        console.log(`Found ${warehouses.length} warehouses.`);

        for (const wh of warehouses) {
            try {
                console.log(`Deleting warehouse ${wh.name} (ID: ${wh.warehouse_id})...`);
                await warehouseService.deleteWarehouse(wh.warehouse_id);
                console.log(`✓ Deleted warehouse ${wh.warehouse_id}`);
            } catch (err) {
                console.error(`✗ Failed to delete warehouse ${wh.warehouse_id}:`, err.message);
            }
        }

        console.log('\n✅ Deletion process completed.');

    } catch (error) {
        console.error('\n❌ Error during deletion:', error);
    } finally {
        if (pool) {
            await pool.end();
            console.log('Database pool closed.');
        }
    }
}

// Run the function
if (require.main === module) {
    deleteAll();
}
