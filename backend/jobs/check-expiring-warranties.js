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

async function checkExpiringWarranties() {
    let conn;
    try {
        console.log('🔍 Checking for expiring warranties...');

        conn = await dbPool.getConnection();

        // Check for warranties expiring in 30 days from assets table
        const expiring30Days = await conn.query(`
            SELECT 
                a.serial_number, 
                a.product_id, 
                a.warranty_expiry, 
                a.status,
                s.device_name as product_name,
                s.device_maker
            FROM assets a
            LEFT JOIN specs_db s ON a.product_id = s.product_id
            WHERE a.warranty_expiry IS NOT NULL
            AND a.warranty_expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            AND a.status NOT IN ('disposed', 'returned')
        `);

        // Check for warranties expiring in 7 days (critical)
        const expiring7Days = await conn.query(`
            SELECT 
                a.serial_number, 
                a.product_id, 
                a.warranty_expiry, 
                a.status,
                s.device_name as product_name,
                s.device_maker
            FROM assets a
            LEFT JOIN specs_db s ON a.product_id = s.product_id
            WHERE a.warranty_expiry IS NOT NULL
            AND a.warranty_expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            AND a.status NOT IN ('disposed', 'returned')
        `);

        console.log('\n📊 Warranty Alert Summary:');
        console.log(`  ⚠️  Warning (30 days): ${expiring30Days.length} items`);
        console.log(`  🚨 Critical (7 days): ${expiring7Days.length} items\n`);

        // Log critical alerts
        if (expiring7Days.length > 0) {
            console.log('🚨 CRITICAL - Warranties expiring within 7 days:');
            expiring7Days.forEach(item => {
                const productName = item.device_maker && item.device_name
                    ? `${item.device_maker} ${item.device_name}`
                    : 'Unknown Product';
                console.log(`  - Serial ${item.serial_number}: ${productName} (warranty expires ${item.warranty_expiry})`);
            });
            console.log('');
        }

        // Group by customer if sold
        const soldItems = expiring30Days.filter(s => s.status === 'sold');
        if (soldItems.length > 0) {
            console.log('📞 Customer Notifications Needed:');
            const customerGroups = soldItems.reduce((groups, item) => {
                const customer = item.sold_to_customer || 'Unknown';
                if (!groups[customer]) groups[customer] = [];
                groups[customer].push(item);
                return groups;
            }, {});

            Object.entries(customerGroups).forEach(([customer, items]) => {
                console.log(`  ${customer}: ${items.length} items with expiring warranties`);
                items.forEach(item => {
                    console.log(`    - ${item.serial_number}: expires ${item.warranty_expiry}`);
                });
            });
            console.log('');
        }

        // Email notifications not implemented - manual follow-up required
        // To implement: Create EmailService with sendWarrantyAlert method
        // Example integration: SendGrid, AWS SES, or Nodemailer
        // For now, check console output above for warranty alerts requiring customer contact

        console.log('✅ Warranty check complete');

        return {
            warning: expiring30Days.length,
            critical: expiring7Days.length,
            customers: soldItems.length
        };

    } catch (error) {
        console.error('❌ Error checking expiring warranties:', error);
        throw error;
    } finally {
        if (conn) conn.release();
    }
}

// Run the check
if (require.main === module) {
    checkExpiringWarranties()
        .then((summary) => {
            console.log('\n📋 Final Summary:');
            console.log(`  Total Warnings: ${summary.warning}`);
            console.log(`  Total Critical: ${summary.critical}`);
            console.log(`  Customer Items: ${summary.customers}`);
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

module.exports = checkExpiringWarranties;
