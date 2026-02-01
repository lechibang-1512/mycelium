const setup = require('./setup');

async function cleanup() {
  const pool = setup.getTestPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Delete zones and warehouses created by tests (names starting with TEST or UPDATED TEST)
    const warehouses = await conn.query(`SELECT warehouse_id FROM warehouses WHERE name LIKE 'TEST %' OR name LIKE 'TEST %' OR name LIKE 'UPDATED TEST %'`);
    if (warehouses.length > 0) {
      const ids = warehouses.map(w => w.warehouse_id).join(',');
      // Remove locations and zones, but avoid deleting warehouses directly due to FK constraints (e.g., stocktakes)
      await conn.query(`DELETE FROM warehouse_product_locations WHERE warehouse_id IN (${ids})`);
      await conn.query(`DELETE FROM warehouse_zones WHERE warehouse_id IN (${ids})`);
      // Soft-delete warehouses to avoid FK constraint failures
      await conn.query(`UPDATE warehouses SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE warehouse_id IN (${ids})`);
      console.log('Soft-deleted warehouses (is_active=0):', ids);
    } else {
      console.log('No test warehouses found');
    }

    // Delete stray zones named TEST %
    await conn.query(`DELETE FROM warehouse_zones WHERE name LIKE 'TEST %'`);

    // Delete test products and batches
    await conn.query(`DELETE FROM batch_tracking WHERE batch_no LIKE 'TEST-%'`);
    await conn.query(`DELETE FROM specs_db WHERE device_name LIKE 'Test %' OR device_name LIKE 'TEST %'`);

    await conn.commit();
    console.log('Test cleanup completed');
  } catch (err) {
    await conn.rollback();
    console.error('Cleanup error:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

cleanup();
