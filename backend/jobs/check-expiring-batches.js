#!/usr/bin/env node

require('dotenv').config();
const mariadb = require('mariadb');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'master_db',
    connectionLimit: 5
};

const dbPool = mariadb.createPool(dbConfig);

async function checkExpiringBatches() {
    let conn;
    try {
        console.log('🔍 Checking for expiring batches...');

        conn = await dbPool.getConnection();

        // Check for batches expiring in 30 days (warning)
        const expiring30Days = await conn.query(`
            SELECT batch_no, product_id, quantity, expiry_date
            FROM batch_tracking
            WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
              AND quantity > 0
        `);

        // Check for batches expiring in 7 days (critical)
        const expiring7Days = await conn.query(`
            SELECT batch_no, product_id, quantity, expiry_date
            FROM batch_tracking
            WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
              AND quantity > 0
        `);

        // Check for already expired batches
        const expired = await conn.query(`
            SELECT batch_no, product_id, quantity, expiry_date
            FROM batch_tracking
            WHERE expiry_date < CURDATE()
              AND quantity > 0
        `);

        console.log('\n📊 Expiry Alert Summary:');
        console.log(`  ⚠️  Warning (30 days): ${expiring30Days.length} batches`);
        console.log(`  🚨 Critical (7 days): ${expiring7Days.length} batches`);
        console.log(`  ❌ Expired: ${expired.length} batches\n`);

        // Log critical alerts
        if (expiring7Days.length > 0) {
            console.log('🚨 CRITICAL - Batches expiring within 7 days:');
            expiring7Days.forEach(batch => {
                console.log(`  - Batch ${batch.batch_no}: ${batch.product_name || 'Product'} (${batch.quantity} units) expires on ${batch.expiry_date}`);
            });
            console.log('');
        }

        // Log expired batches
        if (expired.length > 0) {
            console.log('❌ EXPIRED - Batches that have already expired:');
            expired.forEach(batch => {
                console.log(`  - Batch ${batch.batch_no}: ${batch.product_name || 'Product'} (${batch.quantity} units) expired on ${batch.expiry_date}`);
            });
            console.log('');
        }

        // TODO: Send email notifications to warehouse managers

        // 

        //     await emailService.sendExpiryAlert({
        //         critical: expiring7Days,
        //         expired: expired


        console.log('✅ Expiry check complete');

        return {
            warning: expiring30Days.length,
            critical: expiring7Days.length,
            expired: expired.length
        };

    } catch (error) {
        console.error('❌ Error checking expiring batches:', error);
        throw error;
    } finally {
        if (conn) conn.release();
    }
}

// Run the check
if (require.main === module) {
    checkExpiringBatches()
        .then((summary) => {
            console.log('\n📋 Final Summary:');
            console.log(`  Total Warnings: ${summary.warning}`);
            console.log(`  Total Critical: ${summary.critical}`);
            console.log(`  Total Expired: ${summary.expired}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        })
        .finally(() => {
            dbPool.end();
        });
}

module.exports = checkExpiringBatches;
