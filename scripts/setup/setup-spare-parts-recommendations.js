/**
 * Setup script for spare_parts_reorder_recommendations table
 * Run with: node scripts/setup-spare-parts-recommendations.js
 */

require('dotenv').config();
const mariadb = require('mariadb');

async function setupSparePartsRecommendations() {
    console.log('='.repeat(70));
    console.log('Setting up Spare Parts Reorder Recommendations table');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('='.repeat(70));

    let pool;
    let conn;

    try {
        pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'lechibang',
            password: process.env.DB_PASSWORD || '1212',
            database: process.env.DB_NAME || 'master_db',
            connectionLimit: 5
        });

        conn = await pool.getConnection();

        // Create spare_parts_reorder_recommendations table
        console.log('\n1. Creating spare_parts_reorder_recommendations table...');
        await conn.query(`
      CREATE TABLE IF NOT EXISTS spare_parts_reorder_recommendations (
        recommendation_id INT AUTO_INCREMENT PRIMARY KEY,
        spare_part_id INT NOT NULL,
        warehouse_id INT,
        current_stock INT DEFAULT 0,
        reorder_point INT DEFAULT 0,
        recommended_quantity INT DEFAULT 1,
        urgency_level ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') DEFAULT 'MEDIUM',
        estimated_stockout_date DATE,
        recommendation_reason TEXT,
        status ENUM('PENDING', 'ACKNOWLEDGED', 'ORDERED', 'CANCELLED') DEFAULT 'PENDING',
        acknowledged_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_spare_part (spare_part_id),
        INDEX idx_warehouse (warehouse_id),
        INDEX idx_status (status),
        INDEX idx_urgency (urgency_level),
        INDEX idx_created (created_at),
        
        FOREIGN KEY (spare_part_id) REFERENCES smartphone_spare_parts(spare_part_id) ON DELETE CASCADE,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
        console.log('   ✓ spare_parts_reorder_recommendations table created');

        // Create spare_parts_stock_movements table for tracking
        console.log('\n2. Creating spare_parts_stock_movements table...');
        await conn.query(`
      CREATE TABLE IF NOT EXISTS spare_parts_stock_movements (
        movement_id INT AUTO_INCREMENT PRIMARY KEY,
        spare_part_id INT NOT NULL,
        warehouse_id INT,
        movement_type ENUM('RECEIVED', 'REMOVED', 'ADJUSTED', 'TRANSFERRED') NOT NULL,
        quantity INT NOT NULL,
        user_id INT,
        repair_job_id INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_spare_part (spare_part_id),
        INDEX idx_warehouse (warehouse_id),
        INDEX idx_movement_type (movement_type),
        INDEX idx_repair_job (repair_job_id),
        INDEX idx_created (created_at),
        
        FOREIGN KEY (spare_part_id) REFERENCES smartphone_spare_parts(spare_part_id) ON DELETE CASCADE,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE SET NULL,
        FOREIGN KEY (repair_job_id) REFERENCES smartphone_repair_jobs(repair_job_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
        console.log('   ✓ spare_parts_stock_movements table created');

        console.log('\n' + '='.repeat(70));
        console.log('✓ Spare Parts Recommendations setup completed successfully');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n✗ Error during setup:', error.message);
        throw error;
    } finally {
        if (conn) conn.release();
        if (pool) await pool.end();
    }
}

setupSparePartsRecommendations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
