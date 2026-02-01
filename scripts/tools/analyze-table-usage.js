#!/usr/bin/env node
/**
 * Analyze table usage in the codebase
 * This script scans the codebase for table references and compares with database tables
 */

const fs = require('fs').promises;
const path = require('path');

// Tables from the database
const databaseTables = [
    'assets', 'audit_log', 'audit_log_deprecated', 'batch_tracking', 'bin_capacity_view',
    'bin_inventory', 'bin_locations', 'cycle_count_schedules', 'device_spare_parts_assignment',
    'email_notification_settings', 'expected_serials', 'expiring_batches', 'failed_login_attempts',
    'failed_login_attempts_deprecated', 'inventory_log', 'inventory_movement_tracking',
    'inventory_overview', 'invoice_items', 'invoices', 'low_staging_inventory_alerts',
    'low_stock_alerts', 'phone_models', 'phone_variants', 'product_count_history',
    'product_inventory_computed', 'reorder_recommendations', 'reorder_recommendations_deprecated',
    'repair_job_attachments', 'repair_job_parts_usage', 'repair_job_status_history',
    'repair_job_templates', 'rma', 'roles', 'roles_deprecated', 'serial_inventory_status',
    'serial_tracking', 'serialized_inventory', 'smartphone_repair_jobs', 'smartphone_spare_parts',
    'smartphone_spare_parts_inventory', 'spare_parts_low_stock', 'spare_parts_reorder_recommendations',
    'spare_parts_reorder_recommendations_deprecated', 'specs_db', 'stock_valuation_by_supplier',
    'stocktake_items', 'stocktake_status_history', 'stocktakes', 'suppliers',
    'unified_reorder_recommendations', 'user_roles', 'user_roles_deprecated', 'user_sessions',
    'user_sessions_deprecated', 'v_all_transactions', 'v_cycle_count_summary', 'v_inventory_accuracy',
    'v_items_due_for_count', 'variant_attribute_values', 'variant_attributes', 'variant_details',
    'warehouse_distribution_overview', 'warehouse_product_locations', 'warehouse_zones',
    'warehouses', 'zone_bin_hierarchy', 'zone_distribution_efficiency'
];

// Directories to scan
const scanDirs = [
    '../backend',
    '../frontend',
    '../scripts',
    '../shared'
];

async function scanFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const foundTables = new Set();
        
        // Look for SQL patterns
        const sqlPatterns = [
            /(?:FROM|JOIN|INTO|UPDATE)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/gi,
            /(?:TABLE|VIEW)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/gi
        ];
        
        for (const pattern of sqlPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const tableName = match[1];
                if (databaseTables.includes(tableName)) {
                    foundTables.add(tableName);
                }
            }
        }
        
        return foundTables;
    } catch (error) {
        console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
        return new Set();
    }
}

async function scanDirectory(dirPath) {
    const results = new Map();
    
    try {
        const items = await fs.readdir(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = await fs.stat(itemPath);
            
            if (stat.isDirectory()) {
                // Skip node_modules and other large directories
                if (item === 'node_modules' || item === '.git') continue;
                
                const subResults = await scanDirectory(itemPath);
                for (const [file, tables] of subResults) {
                    results.set(file, tables);
                }
            } else if (item.endsWith('.js') || item.endsWith('.cjs') || item.endsWith('.mjs')) {
                const tables = await scanFile(itemPath);
                if (tables.size > 0) {
                    results.set(itemPath, tables);
                }
            }
        }
    } catch (error) {
        console.warn(`Warning: Could not scan directory ${dirPath}: ${error.message}`);
    }
    
    return results;
}

async function main() {
    console.log('🔍 Analyzing table usage in codebase...\n');
    
    const usedTables = new Set();
    const fileUsage = new Map();
    
    // Scan all directories
    for (const dirName of scanDirs) {
        const dirPath = path.join(__dirname, dirName);
        console.log(`📁 Scanning ${dirPath}...`);
        
        try {
            await fs.access(dirPath);
            const results = await scanDirectory(dirPath);
            
            for (const [file, tables] of results) {
                fileUsage.set(file, tables);
                for (const table of tables) {
                    usedTables.add(table);
                }
            }
        } catch (error) {
            console.warn(`⚠️  Directory ${dirPath} not found, skipping...`);
        }
    }
    
    console.log(`\n📊 Analysis Results:`);
    console.log(`   Total database tables: ${databaseTables.length}`);
    console.log(`   Tables found in code: ${usedTables.size}`);
    
    // Find unused tables
    const unusedTables = databaseTables.filter(table => !usedTables.has(table));
    
    console.log(`\n✅ Used Tables (${usedTables.size}):`);
    const sortedUsedTables = Array.from(usedTables).sort();
    sortedUsedTables.forEach(table => {
        console.log(`   ✓ ${table}`);
    });
    
    console.log(`\n❌ Unused Tables (${unusedTables.length}):`);
    unusedTables.sort().forEach(table => {
        console.log(`   ✗ ${table}`);
    });
    
    // Show detailed usage
    console.log(`\n📋 Table Usage by File:`);
    for (const [file, tables] of fileUsage) {
        const relativeFile = file.replace(process.cwd(), '.');
        console.log(`   ${relativeFile}:`);
        Array.from(tables).sort().forEach(table => {
            console.log(`     - ${table}`);
        });
    }
    
    // Generate removal script
    if (unusedTables.length > 0) {
        console.log(`\n💡 To remove unused tables, you can run:`);
        unusedTables.forEach(table => {
            console.log(`   DROP TABLE IF EXISTS \`${table}\`;`);
        });
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };