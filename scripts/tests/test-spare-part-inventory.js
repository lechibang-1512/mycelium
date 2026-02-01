/**
 * Backend test to verify spare part inventory for MOBO-REALMEP3LITE
 */

require('dotenv').config();
const mariadb = require('mariadb');

async function testInventory() {
    const pool = mariadb.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'master_db',
        connectionLimit: 1
    });

    try {
        const conn = await pool.getConnection();

        console.log('='.repeat(80));
        console.log('SPARE PART INVENTORY TEST - MOBO-REALMEP3LITE');
        console.log('='.repeat(80));

        // 1. Find the spare part
        console.log('\n1. SPARE PART DETAILS:');
        const parts = await conn.query(`
            SELECT spare_part_id, part_code, part_name, unit_cost 
            FROM smartphone_spare_parts 
            WHERE part_code = 'MOBO-REALMEP3LITE'
        `);

        if (parts.length === 0) {
            console.log('   ❌ Part not found!');
            return;
        }

        const part = parts[0];
        console.log(`   Part ID: ${part.spare_part_id}`);
        console.log(`   Code: ${part.part_code}`);
        console.log(`   Name: ${part.part_name}`);
        console.log(`   Unit Cost: $${part.unit_cost}`);

        // 2. Check inventory records
        console.log('\n2. INVENTORY RECORDS:');
        const inventory = await conn.query(`
            SELECT 
                spi.inventory_id,
                spi.warehouse_id,
                w.name AS warehouse_name,
                spi.zone_id,
                wz.name AS zone_name,
                spi.quantity_on_hand,
                spi.quantity_reserved,
                (spi.quantity_on_hand - spi.quantity_reserved) AS available,
                spi.last_movement_at,
                spi.last_movement_type
            FROM smartphone_spare_parts_inventory spi
            LEFT JOIN warehouses w ON spi.warehouse_id = w.warehouse_id
            LEFT JOIN warehouse_zones wz ON spi.zone_id = wz.zone_id
            WHERE spi.spare_part_id = ?
        `, [part.spare_part_id]);

        if (inventory.length === 0) {
            console.log('   ❌ No inventory records found!');
        } else {
            let totalOnHand = 0;
            let totalReserved = 0;

            inventory.forEach((inv, idx) => {
                console.log(`\n   Record ${idx + 1}:`);
                console.log(`   - Inventory ID: ${inv.inventory_id}`);
                console.log(`   - Warehouse: ${inv.warehouse_name || 'N/A'} (ID: ${inv.warehouse_id || 'N/A'})`);
                console.log(`   - Zone: ${inv.zone_name || 'N/A'} (ID: ${inv.zone_id || 'N/A'})`);
                console.log(`   - Quantity On Hand: ${inv.quantity_on_hand}`);
                console.log(`   - Quantity Reserved: ${inv.quantity_reserved}`);
                console.log(`   - Available: ${inv.available}`);
                console.log(`   - Last Movement: ${inv.last_movement_type || 'N/A'} at ${inv.last_movement_at || 'N/A'}`);

                totalOnHand += inv.quantity_on_hand;
                totalReserved += inv.quantity_reserved;
            });

            console.log(`\n   📊 TOTALS:`);
            console.log(`   - Total On Hand: ${totalOnHand}`);
            console.log(`   - Total Reserved: ${totalReserved}`);
            console.log(`   - Total Available: ${totalOnHand - totalReserved}`);
        }

        // 3. Check repair job usage
        console.log('\n3. REPAIR JOB USAGE:');
        const usage = await conn.query(`
            SELECT 
                rjpu.usage_id,
                rjpu.repair_job_id,
                srj.job_number,
                rjpu.quantity_used,
                rjpu.installed_date,
                rjpu.installed_by
            FROM repair_job_parts_usage rjpu
            JOIN smartphone_repair_jobs srj ON rjpu.repair_job_id = srj.repair_job_id
            WHERE rjpu.spare_part_id = ?
            ORDER BY rjpu.installed_date DESC
            LIMIT 10
        `, [part.spare_part_id]);

        if (usage.length === 0) {
            console.log('   ℹ️  No usage records found');
        } else {
            let totalUsed = 0;
            usage.forEach((u, idx) => {
                console.log(`\n   Usage ${idx + 1}:`);
                console.log(`   - Job: ${u.job_number} (ID: ${u.repair_job_id})`);
                console.log(`   - Quantity Used: ${u.quantity_used}`);
                console.log(`   - Installed: ${u.installed_date || 'N/A'}`);
                console.log(`   - Installed By: ${u.installed_by || 'N/A'}`);

                totalUsed += u.quantity_used;
            });

            console.log(`\n   📊 Total Used in Repair Jobs: ${totalUsed}`);
        }

        // 4. Check inventory log
        console.log('\n4. RECENT INVENTORY LOG (Last 10 entries):');
        const logs = await conn.query(`
            SELECT 
                log_id,
                transaction_type,
                quantity_changed,
                transaction_date,
                reference_id,
                notes
            FROM inventory_log
            WHERE notes LIKE ?
            ORDER BY transaction_date DESC
            LIMIT 10
        `, [`%Part #${part.spare_part_id}%`]);

        if (logs.length === 0) {
            console.log('   ℹ️  No log entries found');
        } else {
            logs.forEach((log, idx) => {
                console.log(`\n   Log ${idx + 1}:`);
                console.log(`   - Type: ${log.transaction_type}`);
                console.log(`   - Quantity Changed: ${log.quantity_changed}`);
                console.log(`   - Date: ${log.transaction_date}`);
                console.log(`   - Reference ID: ${log.reference_id || 'N/A'}`);
                console.log(`   - Notes: ${log.notes || 'N/A'}`);
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log('TEST COMPLETE');
        console.log('='.repeat(80) + '\n');

        conn.release();
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

testInventory();
