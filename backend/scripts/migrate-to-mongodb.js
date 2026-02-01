/**
 * MariaDB to MongoDB Migration Script
 * Migrates all data from MariaDB (master_db, security_db) to MongoDB
 * 
 * Usage: node scripts/migrate-to-mongodb.js
 */

require('dotenv').config();
const mariadb = require('mariadb');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Import all models
const {
    Product, Warehouse, Inventory, Transaction, Supplier,
    Invoice, SparePart, RepairJob, RMA,
    User, Role, Session, AuditLog, CasbinRule
} = require('../models');

// MariaDB connection pools
const masterPool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'master_db',
    connectionLimit: 5
});

const securityPool = mariadb.createPool({
    host: process.env.AUTH_DB_HOST || 'localhost',
    port: process.env.AUTH_DB_PORT || 3306,
    user: process.env.AUTH_DB_USER,
    password: process.env.AUTH_DB_PASSWORD,
    database: 'security_db',
    connectionLimit: 5
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mycelium';

// Helper to log progress
function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

// Helper to safely parse JSON (handles both string and object)
function safeJsonParse(value, defaultValue = {}) {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'object') return value; // Already parsed
    try {
        return JSON.parse(value);
    } catch (e) {
        return defaultValue;
    }
}

// Helper to batch insert
async function batchInsert(Model, documents, batchSize = 100) {
    const total = documents.length;
    let inserted = 0;

    for (let i = 0; i < total; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        await Model.insertMany(batch, { ordered: false }).catch(err => {
            if (err.code !== 11000) throw err; // Ignore duplicate key errors
        });
        inserted += batch.length;
        log(`  Inserted ${inserted}/${total}`);
    }

    return inserted;
}

// ====================
// MIGRATION FUNCTIONS
// ====================

async function migrateSuppliers() {
    log('Migrating suppliers...');
    const conn = await masterPool.getConnection();
    try {
        const rows = await conn.query('SELECT * FROM suppliers');
        const docs = rows.map(row => ({
            supplier_id: row.id,
            name: row.name,
            category: row.category,
            contact_person: row.contact_person,
            contact_position: row.contact_position,
            email: row.email,
            phone: row.phone,
            website: row.website,
            address: row.address,
            city: row.city,
            province: row.province,
            ward: row.ward,
            district: row.district,
            tax_code: row.tax_code,
            payment_terms: row.payment_terms,
            lead_time_days: row.lead_time_days,
            rating: row.rating,
            brands: safeJsonParse(row.brands, []),
            additional_contacts: safeJsonParse(row.additional_contacts, []),
            notes: row.notes,
            is_active: row.is_active === 1,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));

        await Supplier.deleteMany({});
        await batchInsert(Supplier, docs);
        log(`  Migrated ${docs.length} suppliers`);
    } finally {
        conn.release();
    }
}

async function migrateProducts() {
    log('Migrating products (specs_db)...');
    const conn = await masterPool.getConnection();
    try {
        const rows = await conn.query('SELECT * FROM specs_db');
        const docs = rows.map(row => ({
            product_id: row.product_id,
            device_type: row.product_type || 'smartphone',
            device_name: row.device_name,
            device_maker: row.device_maker,
            device_price: parseFloat(row.device_price) || 0,
            color: row.color,

            // Standard smartphone specs (for backward compat)
            processor: row.processor,
            ram: row.ram,
            rom: row.rom,
            display_size: parseFloat(row.display_size) || null,
            resolution: row.resolution,
            refresh_rate: row.refresh_rate,
            battery_capacity: row.battery_capacity,
            fast_charging: row.fast_charging,
            rear_camera_main: row.rear_camera_main,
            front_camera: row.front_camera,
            operating_system: row.operating_system,
            water_and_dust_rating: row.water_and_dust_rating,
            nfc: row.nfc,
            warranty_months: row.warranty_months || 12,
            warranty_type: row.warranty_type || 'MANUFACTURER',

            // Flexible attributes for extended specs
            attributes: {
                process_node: row.process_node,
                cpu_cores: row.cpu_cores,
                cpu_frequency: row.cpu_frequency,
                gpu: row.gpu,
                memory_type: row.memory_type,
                expandable_memory: row.expandable_memory,
                length_mm: row.length_mm,
                width_mm: row.width_mm,
                thickness_mm: row.thickness_mm,
                weight_g: row.weight_g,
                pixel_density: row.pixel_density,
                brightness: row.brightness,
                display_features: row.display_features,
                display_type: row.display_type,
                hdr_support: row.hdr_support,
                rear_camera_macro: row.rear_camera_macro,
                rear_camera_ultrawide: row.rear_camera_ultrawide,
                rear_camera_telephoto: row.rear_camera_telephoto,
                optical_zoom: row.optical_zoom,
                rear_camera_features: row.rear_camera_features,
                rear_video_resolution: row.rear_video_resolution,
                front_camera_features: row.front_camera_features,
                front_video_resolution: row.front_video_resolution,
                wireless_charging: row.wireless_charging,
                reverse_charging: row.reverse_charging,
                connector: row.connector,
                security_features: row.security_features,
                sim_card: row.sim_card,
                network_bands: row.network_bands,
                wireless_connectivity: row.wireless_connectivity,
                navigation: row.navigation,
                audio_jack: row.audio_jack,
                audio_playback: row.audio_playback,
                video_playback: row.video_playback,
                sensors: row.sensors,
                package_contents: row.package_contents,
                warranty_notes: row.warranty_notes
            },

            inventory: {
                staging_inventory: row.staging_inventory || 0,
                reorder_point: row.reorder_point || 0,
                reorder_quantity: row.reorder_quantity || 0,
                lead_time_days: row.lead_time_days || 7,
                safety_stock: row.safety_stock || 0,
                avg_daily_usage: parseFloat(row.avg_daily_usage) || 0
            },

            default_supplier_id: row.default_supplier_id,
            is_active: row.is_active === 1,
            is_discontinued: row.is_discontinued === 1,
            launch_date: row.launch_date,
            end_of_life_date: row.end_of_life_date
        }));

        await Product.deleteMany({});
        await batchInsert(Product, docs);
        log(`  Migrated ${docs.length} products`);
    } finally {
        conn.release();
    }
}

async function migrateWarehouses() {
    log('Migrating warehouses, zones, and bins...');
    const conn = await masterPool.getConnection();
    try {
        // Get warehouses
        const warehouses = await conn.query('SELECT * FROM warehouses WHERE is_active = 1');

        for (const wh of warehouses) {
            // Get zones for this warehouse
            const zones = await conn.query(
                'SELECT * FROM warehouse_zones WHERE warehouse_id = ?',
                [wh.warehouse_id]
            );

            // Get bins for each zone
            const zonesWithBins = await Promise.all(zones.map(async (zone) => {
                const bins = await conn.query(
                    'SELECT * FROM bin_locations WHERE zone_id = ?',
                    [zone.zone_id]
                );

                return {
                    zone_id: zone.zone_id,
                    zone_uuid: zone.zone_uuid,
                    name: zone.name,
                    description: zone.description,
                    zone_type: zone.zone_type || 'storage',
                    bin_prefix: zone.bin_prefix,
                    max_bins: zone.max_bins,
                    require_bins: zone.require_bins === 1,
                    default_bin_type: zone.default_bin_type || 'standard',
                    bin_layout: zone.bin_layout || 'grid',
                    capacity_limit: zone.capacity_limit,
                    is_active: zone.is_active === 1,
                    bins: bins.map(bin => ({
                        bin_id: bin.bin_id,
                        bin_code: bin.bin_code,
                        bin_type: bin.bin_type || 'standard',
                        product_type: bin.product_type,
                        row_position: bin.row_position,
                        column_position: bin.column_position,
                        bin_position: bin.bin_position,
                        hierarchical_code: bin.hierarchical_code,
                        aisle: bin.aisle,
                        rack: bin.rack,
                        shelf: bin.shelf,
                        max_capacity: bin.max_capacity,
                        weight_capacity: bin.weight_capacity,
                        height_cm: bin.height_cm,
                        width_cm: bin.width_cm,
                        depth_cm: bin.depth_cm,
                        temperature_controlled: bin.temperature_controlled === 1,
                        temperature_min: bin.temperature_min,
                        temperature_max: bin.temperature_max,
                        priority_level: bin.priority_level || 'normal',
                        accessibility_level: bin.accessibility_level || 'easy',
                        is_active: bin.is_active === 1,
                        notes: bin.notes
                    }))
                };
            }));

            const doc = {
                warehouse_id: wh.warehouse_id,
                warehouse_uuid: wh.warehouse_uuid,
                name: wh.name,
                location: wh.location,
                description: wh.description,
                contact_info: safeJsonParse(wh.contact_info, {}),
                is_active: wh.is_active === 1,
                zones: zonesWithBins,
                created_at: wh.created_at,
                updated_at: wh.updated_at
            };

            await Warehouse.findOneAndUpdate(
                { warehouse_id: wh.warehouse_id },
                doc,
                { upsert: true, new: true }
            );
        }

        log(`  Migrated ${warehouses.length} warehouses with zones and bins`);
    } finally {
        conn.release();
    }
}

async function migrateInventory() {
    log('Migrating inventory (bulk, serialized, spare parts)...');
    const conn = await masterPool.getConnection();

    let bulkCount = 0, serialCount = 0, spareCount = 0;

    try {
        await Inventory.deleteMany({});

        // Bulk inventory (warehouse_product_locations)
        log('  Migrating bulk inventory...');
        try {
            const bulkRows = await conn.query('SELECT * FROM warehouse_product_locations');
            const bulkDocs = bulkRows.map(row => ({
                inventory_type: 'bulk',
                product_id: String(row.product_id),
                warehouse_id: String(row.warehouse_id),
                zone_id: row.zone_id,
                condition: row.condition || 'NEW',
                quantity: row.quantity || 0,
                reserved_quantity: row.reserved_quantity || 0,
                min_stock_level: row.min_stock_level || 0,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
            await batchInsert(Inventory, bulkDocs);
            bulkCount = bulkDocs.length;
        } catch (err) {
            log(`  Warning: Could not migrate bulk inventory: ${err.message}`);
        }

        // Serialized inventory (from serialized_inventory table)
        log('  Migrating serialized inventory...');
        try {
            const serialRows = await conn.query('SELECT * FROM serialized_inventory');
            const serialDocs = serialRows.map(row => ({
                inventory_type: 'serialized',
                product_id: String(row.product_id),
                serial_number: row.serial_number,
                warehouse_id: row.warehouse_id ? String(row.warehouse_id) : null,
                zone_id: row.zone_id,
                status: row.status || 'available',
                condition_grade: 'A',
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
            await batchInsert(Inventory, serialDocs);
            serialCount = serialDocs.length;
        } catch (err) {
            log(`  Warning: Could not migrate serialized inventory: ${err.message}`);
        }

        // Spare parts inventory
        log('  Migrating spare parts inventory...');
        try {
            const spareRows = await conn.query('SELECT * FROM smartphone_spare_parts_inventory');
            const spareDocs = spareRows.map(row => ({
                inventory_type: 'spare_part',
                spare_part_id: row.spare_part_id,
                warehouse_id: row.warehouse_id ? String(row.warehouse_id) : null,
                zone_id: row.zone_id,
                bin_id: row.bin_id,
                quantity_on_hand: row.quantity_on_hand || 0,
                quantity_reserved: row.quantity_reserved || 0,
                quantity_defective: row.quantity_defective || 0,
                quantity_in_transit: row.quantity_in_transit || 0,
                batch_no: row.batch_no,
                serial_number: row.serial_number,
                manufacture_date: row.manufacture_date,
                expiry_date: row.expiry_date,
                condition: row.condition_status || 'NEW',
                last_counted_at: row.last_counted_at,
                last_counted_by: row.last_counted_by,
                last_movement_at: row.last_movement_at,
                last_movement_type: row.last_movement_type,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
            await batchInsert(Inventory, spareDocs);
            spareCount = spareDocs.length;
        } catch (err) {
            log(`  Warning: Could not migrate spare parts inventory: ${err.message}`);
        }

        log(`  Total inventory: ${bulkCount + serialCount + spareCount} records`);
    } finally {
        conn.release();
    }
}


async function migrateTransactions() {
    log('Migrating transactions (inventory_log)...');
    const conn = await masterPool.getConnection();

    try {
        const rows = await conn.query(`
      SELECT * FROM inventory_log ORDER BY transaction_date DESC LIMIT 10000
    `);

        // Group by transaction_group_id
        const groupedTxns = {};
        for (const row of rows) {
            const groupId = row.transaction_group_id || `LOG-${row.log_id}`;
            if (!groupedTxns[groupId]) {
                groupedTxns[groupId] = {
                    transaction_group_id: groupId,
                    receipt_id: row.receipt_id,
                    transaction_type: row.transaction_type,
                    transaction_date: row.transaction_date,
                    warehouse_id: row.warehouse_id,
                    from_warehouse_id: row.from_warehouse_id,
                    zone_id: row.zone_id,
                    bin_id: row.bin_id,
                    supplier_id: row.supplier_id,
                    invoice_id: row.invoice_id,
                    po_id: row.po_id,
                    user_id: row.user_id,
                    external_doc_no: row.external_doc_no,
                    document_reference: row.document_reference,
                    customer: {
                        name: row.customer_name,
                        address: row.customer_address
                    },
                    delivery_person: row.delivery_person,
                    notes: row.notes,
                    totals: {
                        subtotal: 0,
                        tax_amount: 0,
                        total_amount: 0
                    },
                    items: [],
                    created_at: row.created_at,
                    updated_at: row.updated_at
                };
            }

            // Add item
            groupedTxns[groupId].items.push({
                product_id: row.product_id,
                spare_part_id: row.spare_part_id,
                batch_id: row.batch_id,
                asset_id: row.asset_id,
                serial_number: row.serial_number,
                quantity_changed: row.quantity_changed,
                condition: row.condition,
                unit_cost: row.unit_cost || 0,
                total_value: row.total_value || 0,
                from_location: {
                    warehouse_id: row.from_warehouse_id,
                    zone_id: row.from_zone_id
                },
                to_location: {
                    warehouse_id: row.warehouse_id,
                    zone_id: row.zone_id,
                    bin_id: row.bin_id
                },
                new_inventory_level: row.new_inventory_level,
                notes: row.notes
            });

            // Update totals
            groupedTxns[groupId].totals.subtotal += parseFloat(row.subtotal) || 0;
            groupedTxns[groupId].totals.tax_amount += parseFloat(row.tax_amount) || 0;
            groupedTxns[groupId].totals.total_amount += parseFloat(row.total_amount) || 0;
        }

        const docs = Object.values(groupedTxns);
        await Transaction.deleteMany({});
        await batchInsert(Transaction, docs);
        log(`  Migrated ${docs.length} transactions`);
    } finally {
        conn.release();
    }
}

async function migrateInvoices() {
    log('Migrating invoices...');
    const conn = await masterPool.getConnection();

    try {
        const invoices = await conn.query('SELECT * FROM invoices');
        const docs = [];

        for (const inv of invoices) {
            const items = await conn.query(
                'SELECT * FROM invoice_items WHERE invoice_id = ?',
                [inv.id]
            );

            docs.push({
                uuid: inv.uuid,
                invoice_number: inv.invoice_number,
                pattern_number: inv.pattern_number,
                serial_number: inv.serial_number,
                supplier_id: inv.supplier_id,
                status: inv.status,
                verification_status: inv.verification_status,
                invoice_date: inv.invoice_date,
                due_date: inv.due_date,
                imported_at: inv.imported_at,
                items: items.map(item => ({
                    product_id: item.product_id,
                    spare_part_id: item.spare_part_id,
                    product_name: item.product_name,
                    product_uuid: item.product_uuid,
                    description: item.description,
                    unit: item.unit,
                    unit_name: item.unit_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    tax_rate: item.tax_rate,
                    tax_amount: item.tax_amount,
                    discount_rate: item.discount_rate,
                    discount_amount: item.discount_amount,
                    total_amount: item.total_amount
                })),
                subtotal: inv.subtotal,
                tax_rate: inv.tax_rate,
                tax_amount: inv.tax_amount,
                shipping_fee: inv.shipping_fee,
                discount_amount: inv.discount_amount,
                total_amount: inv.total_amount,
                currency: inv.currency,
                payment_method: inv.payment_method,
                notes: inv.notes,
                created_at: inv.created_at,
                updated_at: inv.updated_at
            });
        }

        await Invoice.deleteMany({});
        await batchInsert(Invoice, docs);
        log(`  Migrated ${docs.length} invoices`);
    } finally {
        conn.release();
    }
}

async function migrateSpareParts() {
    log('Migrating spare parts catalog...');
    const conn = await masterPool.getConnection();

    try {
        const rows = await conn.query('SELECT * FROM smartphone_spare_parts');
        const docs = rows.map(row => ({
            spare_part_id: row.spare_part_id,
            part_code: row.part_code,
            part_name: row.part_name,
            part_category: row.part_category,
            part_type: row.part_type,
            description: row.description,
            compatible_product_id: row.compatible_product_id,
            compatible_device_category: row.compatible_device_category,
            compatible_brands: safeJsonParse(row.compatible_brands, []),
            compatible_models: safeJsonParse(row.compatible_models, []),
            dimensions: row.dimensions,
            weight_g: row.weight_g,
            color_variants: safeJsonParse(row.color_variants, []),
            quality_grade: row.quality_grade,
            warranty_months: row.warranty_months,
            manufacturer: row.manufacturer,
            manufacturer_part_number: row.manufacturer_part_number,
            default_supplier_id: row.default_supplier_id,
            unit_cost: row.unit_cost,
            unit_price: row.unit_price,
            currency: row.currency,
            minimum_stock_level: row.minimum_stock_level,
            max_stock_level: row.max_stock_level,
            reorder_point: row.reorder_point,
            reorder_quantity: row.reorder_quantity,
            lead_time_days: row.lead_time_days,
            is_active: row.is_active === 1,
            is_hazardous: row.is_hazardous === 1,
            requires_serial_tracking: row.requires_serial_tracking === 1,
            notes: row.notes,
            created_by: row.created_by,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));

        await SparePart.deleteMany({});
        await batchInsert(SparePart, docs);
        log(`  Migrated ${docs.length} spare parts`);
    } finally {
        conn.release();
    }
}

async function migrateRepairJobs() {
    log('Migrating repair jobs...');
    const conn = await masterPool.getConnection();

    try {
        const jobs = await conn.query('SELECT * FROM smartphone_repair_jobs');
        const docs = [];

        for (const job of jobs) {
            // Get parts usage
            const parts = await conn.query(
                'SELECT * FROM repair_job_parts_usage WHERE repair_job_id = ?',
                [job.repair_job_id]
            );

            // Get attachments
            const attachments = await conn.query(
                'SELECT * FROM repair_job_attachments WHERE repair_job_id = ?',
                [job.repair_job_id]
            );

            // Get status history
            const history = await conn.query(
                'SELECT * FROM repair_job_status_history WHERE repair_job_id = ? ORDER BY changed_at',
                [job.repair_job_id]
            );

            docs.push({
                repair_job_id: job.repair_job_id,
                job_number: job.job_number,
                product_id: job.product_id,
                device_name: job.device_name,
                device_serial_number: job.device_serial_number,
                device_imei: job.device_imei,
                customer: {
                    name: job.customer_name,
                    phone: job.customer_phone,
                    email: job.customer_email,
                    address: job.customer_address
                },
                issue_description: job.issue_description,
                diagnosis: job.diagnosis,
                repair_notes: job.repair_notes,
                status: job.status,
                priority: job.priority,
                assigned_technician: job.assigned_technician,
                assigned_at: job.assigned_at,
                warehouse_id: job.warehouse_id,
                received_date: job.received_date,
                estimated_completion_date: job.estimated_completion_date,
                completion_date: job.completion_date,
                delivered_date: job.delivered_date,
                costs: {
                    estimated: job.estimated_cost,
                    parts: job.parts_cost,
                    labor: job.labor_cost,
                    final: job.final_cost,
                    customer_charge: job.customer_charge
                },
                currency: job.currency,
                tested_by: job.tested_by,
                test_results: job.test_results,
                quality_check_passed: job.quality_check_passed === 1,
                warranty_months: job.warranty_months,
                warranty_expires_at: job.warranty_expires_at,
                parts_used: parts.map(p => ({
                    spare_part_id: p.spare_part_id,
                    inventory_id: p.inventory_id,
                    quantity_used: p.quantity_used,
                    unit_cost: p.unit_cost,
                    total_cost: p.total_cost,
                    installed_date: p.installed_date,
                    installed_by: p.installed_by,
                    warranty_months: p.warranty_months,
                    notes: p.notes
                })),
                attachments: attachments.map(a => ({
                    file_name: a.file_name,
                    file_path: a.file_path,
                    file_type: a.file_type,
                    file_size_kb: a.file_size_kb,
                    mime_type: a.mime_type,
                    category: a.attachment_category,
                    description: a.description,
                    uploaded_by: a.uploaded_by,
                    uploaded_at: a.uploaded_at
                })),
                status_history: history.map(h => ({
                    old_status: h.old_status,
                    new_status: h.new_status,
                    changed_by: h.changed_by,
                    changed_at: h.changed_at,
                    notes: h.notes
                })),
                created_by: job.created_by,
                created_at: job.created_at,
                updated_at: job.updated_at
            });
        }

        await RepairJob.deleteMany({});
        await batchInsert(RepairJob, docs);
        log(`  Migrated ${docs.length} repair jobs`);
    } finally {
        conn.release();
    }
}

async function migrateRMAs() {
    log('Migrating RMAs...');
    const conn = await masterPool.getConnection();

    try {
        const rows = await conn.query('SELECT * FROM rma');
        const docs = rows.map(row => ({
            rma_id: row.rma_id,
            customer: {
                name: row.customer_name,
                email: row.customer_email,
                phone: row.customer_phone
            },
            original_receipt_id: row.original_receipt_id,
            original_transaction_date: row.original_transaction_date,
            reason_code: row.reason_code,
            reason_description: row.reason_description,
            status: row.status,
            priority: row.priority,
            warehouse_id: row.warehouse_id,
            quarantine_zone_id: row.quarantine_zone_id,
            requested_by: row.requested_by,
            assigned_to: row.assigned_to,
            expected_return_date: row.expected_return_date,
            actual_return_date: row.actual_return_date,
            inspection_date: row.inspection_date,
            completion_date: row.completion_date,
            total_value: row.total_value,
            refund_amount: row.refund_amount,
            restocking_fee: row.restocking_fee,
            items: safeJsonParse(row.items, []),
            status_history: safeJsonParse(row.status_history, []),
            attachments: safeJsonParse(row.attachments, []),
            notes: row.notes,
            internal_notes: row.internal_notes,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));

        await RMA.deleteMany({});
        await batchInsert(RMA, docs);
        log(`  Migrated ${docs.length} RMAs`);
    } finally {
        conn.release();
    }
}

async function migrateUsers() {
    log('Migrating users...');
    const conn = await securityPool.getConnection();

    try {
        const rows = await conn.query('SELECT * FROM users');
        const docs = rows.map(row => ({
            user_id: row.id,
            username: row.username,
            password: row.password, // Already hashed in MariaDB
            fullName: row.fullName,
            email: row.email,
            role: row.role,
            is_active: row.is_active === 1,
            last_login: row.last_login,
            failed_login_attempts: row.failed_login_attempts || 0,
            locked_until: row.locked_until,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));

        await User.deleteMany({});
        // Don't use insertMany for users - password gets re-hashed
        for (const doc of docs) {
            const user = new User(doc);
            user.isNew = false; // Prevent password re-hash
            await User.collection.insertOne(doc);
        }
        log(`  Migrated ${docs.length} users`);
    } finally {
        conn.release();
    }
}

async function migrateRoles() {
    log('Migrating roles and permissions...');
    const conn = await securityPool.getConnection();

    try {
        const roles = await conn.query('SELECT * FROM roles');
        const docs = [];

        for (const role of roles) {
            const perms = await conn.query(`
        SELECT p.name FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ?
      `, [role.id]);

            docs.push({
                role_id: role.id,
                name: role.name,
                description: role.description,
                permissions: perms.map(p => p.name),
                created_at: role.created_at,
                updated_at: role.updated_at
            });
        }

        await Role.deleteMany({});
        await batchInsert(Role, docs);
        log(`  Migrated ${docs.length} roles`);
    } finally {
        conn.release();
    }
}

async function migrateCasbinRules() {
    log('Migrating Casbin rules...');
    const conn = await securityPool.getConnection();

    try {
        const rows = await conn.query('SELECT * FROM casbin_rules');
        const docs = rows.map(row => ({
            ptype: row.ptype,
            v0: row.v0,
            v1: row.v1,
            v2: row.v2,
            v3: row.v3,
            v4: row.v4,
            v5: row.v5
        }));

        await CasbinRule.deleteMany({});
        await batchInsert(CasbinRule, docs);
        log(`  Migrated ${docs.length} Casbin rules`);
    } finally {
        conn.release();
    }
}

async function migrateAuditLogs() {
    log('Migrating audit logs (last 1000)...');
    const conn = await securityPool.getConnection();

    try {
        const rows = await conn.query(`
      SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 1000
    `);
        const docs = rows.map(row => ({
            user_id: row.user_id,
            username: row.username,
            action_type: row.action_type,
            resource_type: row.resource_type,
            resource_id: row.resource_id,
            description: row.description,
            ip_address: row.ip_address,
            user_agent: row.user_agent,
            request_method: row.request_method,
            request_url: row.request_url,
            status_code: row.status_code,
            changes: row.changes ? JSON.parse(row.changes) : {},
            severity: row.severity,
            created_at: row.created_at
        }));

        await AuditLog.deleteMany({});
        await batchInsert(AuditLog, docs);
        log(`  Migrated ${docs.length} audit log entries`);
    } finally {
        conn.release();
    }
}

// ====================
// MAIN MIGRATION
// ====================

async function runMigration() {
    log('Starting MariaDB to MongoDB migration...');
    log(`MongoDB URI: ${MONGODB_URI}`);

    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000
        });
        log('Connected to MongoDB');

        // Run migrations in order (dependencies first)
        await migrateSuppliers();
        await migrateProducts();
        await migrateWarehouses();
        await migrateSpareParts();
        await migrateInventory();
        await migrateTransactions();
        await migrateInvoices();
        await migrateRepairJobs();
        await migrateRMAs();
        await migrateUsers();
        await migrateRoles();
        await migrateCasbinRules();
        await migrateAuditLogs();

        log('Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        await masterPool.end();
        await securityPool.end();
        log('Connections closed');
    }
}

// Run if called directly
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration };
