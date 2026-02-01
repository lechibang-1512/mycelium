#!/usr/bin/env node

/**
 * Scheduled Job: Generate Efficiency Reports
 * Runs weekly to analyze zone and warehouse efficiency
 * UC-5: Warehouse & Zone Management - Efficiency Analytics
 * 
 * Analyzes:
 * - Zone utilization (capacity vs. current stock)
 * - Movement activity (incoming/outgoing/transfers)
 * - Turnover ratios
 * - Efficiency scores
 */

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

const pool = mariadb.createPool(dbConfig);

async function generateEfficiencyReports() {
    console.log('='.repeat(70));
    console.log('Starting Warehouse Efficiency Reports Generation');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('='.repeat(70));

    try {
        const WarehouseZoneService = require('../../backend/services/WarehouseZoneService');
        const warehouseZoneService = new WarehouseZoneService(pool);

        // Get all warehouses
        const conn = await pool.getConnection();
        const warehouses = await conn.query(
            'SELECT warehouse_id, name, location FROM warehouses WHERE is_active = 1'
        );
        conn.release();

        if (warehouses.length === 0) {
            console.log('⚠️  No active warehouses found');
            return { warehouses: 0, zones: 0 };
        }

        console.log(`\n📊 Analyzing ${warehouses.length} warehouse(s)...\n`);

        let totalZones = 0;
        let highEfficiencyZones = 0;
        let lowEfficiencyZones = 0;
        let overCapacityZones = 0;
        let underUtilizedZones = 0;

        for (const warehouse of warehouses) {
            console.log('─'.repeat(70));
            console.log(`🏭 ${warehouse.name} (${warehouse.location || 'No location'})`);
            console.log('─'.repeat(70));

            try {
                const zoneEfficiency = await warehouseZoneService.getWarehouseZoneEfficiency(
                    warehouse.warehouse_id
                );

                if (zoneEfficiency.length === 0) {
                    console.log('   No zones configured for this warehouse\n');
                    continue;
                }

                totalZones += zoneEfficiency.length;

                console.log(`   Zones: ${zoneEfficiency.length}\n`);
                console.log('   Zone Efficiency Summary:');
                console.log('   ' + '-'.repeat(50));

                for (const zone of zoneEfficiency) {
                    const scoreEmoji = zone.efficiency_score >= 70 ? '🟢' :
                        zone.efficiency_score >= 40 ? '🟡' : '🔴';

                    console.log(`   ${scoreEmoji} ${zone.zone_name} (${zone.zone_type})`);
                    console.log(`      Efficiency Score: ${zone.efficiency_score}/100`);
                    console.log(`      Utilization: ${zone.utilization_percent || 'N/A'}% | Status: ${zone.capacity_status}`);
                    console.log(`      30-day Activity: ${zone.movements_30d} movements, ${zone.products_handled_30d} products`);
                    console.log(`      Turnover Ratio: ${zone.turnover_ratio}`);
                    console.log('');

                    // Track statistics
                    if (zone.efficiency_score >= 70) highEfficiencyZones++;
                    if (zone.efficiency_score < 40) lowEfficiencyZones++;
                    if (zone.capacity_status === 'Full' || zone.capacity_status === 'Near Capacity') {
                        overCapacityZones++;
                    }
                    if (zone.utilization_percent !== null && zone.utilization_percent < 30) {
                        underUtilizedZones++;
                    }
                }

                // Highlight issues
                const issues = zoneEfficiency.filter(z => z.efficiency_score < 40);
                if (issues.length > 0) {
                    console.log('   ⚠️  Low Efficiency Zones Requiring Attention:');
                    issues.forEach(z => {
                        console.log(`      - ${z.zone_name}: Score ${z.efficiency_score}/100`);
                    });
                    console.log('');
                }

            } catch (error) {
                console.error(`   ❌ Error analyzing warehouse: ${error.message}\n`);
            }
        }

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('📋 OVERALL EFFICIENCY SUMMARY');
        console.log('='.repeat(70));
        console.log(`  Total Warehouses Analyzed: ${warehouses.length}`);
        console.log(`  Total Zones Analyzed: ${totalZones}`);
        console.log('');
        console.log('  Zone Health Distribution:');
        console.log(`    🟢 High Efficiency (70+): ${highEfficiencyZones} zones`);
        console.log(`    🟡 Medium Efficiency: ${totalZones - highEfficiencyZones - lowEfficiencyZones} zones`);
        console.log(`    🔴 Low Efficiency (<40): ${lowEfficiencyZones} zones`);
        console.log('');
        console.log('  Capacity Alerts:');
        console.log(`    ⚠️  Over Capacity: ${overCapacityZones} zones`);
        console.log(`    📉 Under-utilized (<30%): ${underUtilizedZones} zones`);

        if (lowEfficiencyZones > 0 || overCapacityZones > 0) {
            console.log('\n  🚨 ACTION REQUIRED: Review flagged zones for optimization opportunities');
        }

        console.log('\n' + '='.repeat(70));
        console.log('✓ Efficiency Reports Generation Completed');
        console.log('='.repeat(70));

        return {
            warehouses: warehouses.length,
            zones: totalZones,
            high_efficiency: highEfficiencyZones,
            low_efficiency: lowEfficiencyZones,
            over_capacity: overCapacityZones,
            under_utilized: underUtilizedZones
        };

    } catch (error) {
        console.error('\n' + '✗'.repeat(70));
        console.error('Error generating efficiency reports:');
        console.error(error);
        console.error('✗'.repeat(70));
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    generateEfficiencyReports()
        .then((summary) => {
            console.log('\n📋 Final Summary:');
            console.log(`  Warehouses: ${summary.warehouses}`);
            console.log(`  Total Zones: ${summary.zones}`);
            console.log(`  High Efficiency: ${summary.high_efficiency}`);
            console.log(`  Low Efficiency: ${summary.low_efficiency}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        })
        .finally(() => {
            pool.end();
        });
}

module.exports = generateEfficiencyReports;
