/**
 * Consolidated Warehouse Management Service
 * MongoDB/Mongoose version - handles multi-warehouse operations with embedded zones and bins
 */

const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

class WarehouseService {
    constructor(_pool) {
        // Pool parameter kept for backward compatibility but not used
    }

    // ==========================================
    // WAREHOUSE MANAGEMENT
    // ==========================================

    async getWarehouses(activeOnly = true) {
        const query = activeOnly ? { is_active: true } : {};
        const warehouses = await Warehouse.find(query)
            .select('warehouse_id name location is_active created_at updated_at')
            .sort({ name: 1 })
            .lean();

        return warehouses.map(w => ({
            warehouse_id: w.warehouse_id,
            name: w.name,
            location: w.location,
            is_active: w.is_active,
            created_at: w.created_at,
            updated_at: w.updated_at
        }));
    }

    async createOrUpdateWarehouse(warehouseData, warehouseId = null) {
        if (warehouseId) {
            const updateData = {};
            if (warehouseData.name !== undefined) updateData.name = warehouseData.name;
            if (warehouseData.location !== undefined) updateData.location = warehouseData.location;
            if (warehouseData.description !== undefined) updateData.description = warehouseData.description;
            if (warehouseData.contactInfo !== undefined) updateData.contact_info = warehouseData.contactInfo;
            if (warehouseData.isActive !== undefined) updateData.is_active = warehouseData.isActive;

            if (Object.keys(updateData).length === 0) {
                throw new Error('No fields to update');
            }

            await Warehouse.updateOne({ warehouse_id: warehouseId }, { $set: updateData });
            return warehouseId;
        } else {
            const { name, location, description, contactInfo, isActive } = warehouseData;
            if (!name || !location) {
                throw new Error('Name and location are required for creating a warehouse');
            }

            const warehouse = await Warehouse.create({
                warehouse_id: uuidv4(),
                name,
                location,
                description: description || null,
                contact_info: contactInfo,
                is_active: isActive !== undefined ? isActive : true,
                zones: []
            });

            return warehouse.warehouse_id;
        }
    }

    async activateWarehouse(warehouseId) {
        const result = await Warehouse.updateOne(
            { warehouse_id: warehouseId },
            { $set: { is_active: true } }
        );
        if (result.matchedCount === 0) throw new Error('Warehouse not found');
        return { success: true, message: 'Warehouse activated successfully' };
    }

    async deactivateWarehouse(warehouseId) {
        const result = await Warehouse.updateOne(
            { warehouse_id: warehouseId },
            { $set: { is_active: false } }
        );
        if (result.matchedCount === 0) throw new Error('Warehouse not found');
        return { success: true, message: 'Warehouse deactivated successfully.' };
    }

    async deleteWarehouse(warehouseId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get inventory to return to staging
            const inventoryToReturn = await Inventory.aggregate([
                { $match: { warehouse_id: warehouseId } },
                { $group: { _id: '$product_id', total_qty: { $sum: '$quantity' } } }
            ]).session(session);

            // Log removals
            if (inventoryToReturn.length > 0) {
                await Transaction.create([{
                    transaction_type: 'outgoing',
                    transaction_date: new Date(),
                    warehouse_id: warehouseId,
                    notes: 'Warehouse deleted - inventory removed',
                    items: inventoryToReturn.map(item => ({
                        product_id: item._id,
                        quantity_changed: -item.total_qty
                    }))
                }], { session });
            }

            // Delete inventory records
            await Inventory.deleteMany({ warehouse_id: warehouseId }).session(session);

            // Delete warehouse
            const result = await Warehouse.deleteOne({ warehouse_id: warehouseId }).session(session);

            await session.commitTransaction();
            return { success: result.deletedCount > 0, message: 'Warehouse hard deleted successfully.' };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async getWarehouseSummary(warehouseId = null) {
        const match = { is_active: true };
        if (warehouseId) match.warehouse_id = warehouseId;

        const warehouses = await Warehouse.find(match).lean();
        const result = [];

        for (const w of warehouses) {
            // Get inventory counts
            const invStats = await Inventory.aggregate([
                { $match: { warehouse_id: w.warehouse_id, inventory_type: 'bulk' } },
                {
                    $group: {
                        _id: null,
                        unique_products: { $addToSet: '$product_id' },
                        total_items: { $sum: '$quantity' },
                        total_reserved: { $sum: '$reserved_quantity' }
                    }
                }
            ]);

            const stats = invStats[0] || { unique_products: [], total_items: 0, total_reserved: 0 };
            const totalBins = w.zones.reduce((sum, z) => sum + (z.bins?.length || 0), 0);
            const uniqueColumns = new Set();
            const uniqueRows = new Set();
            w.zones.forEach(z => {
                (z.bins || []).forEach(b => {
                    if (b.column_position) uniqueColumns.add(b.column_position);
                    if (b.row_position) uniqueRows.add(b.row_position);
                });
            });

            result.push({
                warehouse_id: w.warehouse_id,
                warehouse_name: w.name,
                unique_products: stats.unique_products?.length || 0,
                unique_spare_parts: 0,
                total_items: stats.total_items || 0,
                total_reserved: stats.total_reserved || 0,
                total_available: (stats.total_items || 0) - (stats.total_reserved || 0),
                total_bins: totalBins,
                total_columns: uniqueColumns.size,
                total_rows: uniqueRows.size
            });
        }

        return result;
    }

    // ==========================================
    // COLUMN-ROW-BIN MANAGEMENT
    // ==========================================

    async getWarehouseColumns(warehouseId, activeOnly = true) {
        const warehouse = await Warehouse.findOne({ warehouse_id: warehouseId }).lean();
        if (!warehouse) return { columns: {}, flat: [] };

        // Flatten all bins from zones
        const allBins = [];
        for (const zone of warehouse.zones || []) {
            for (const bin of zone.bins || []) {
                if (activeOnly && !bin.is_active) continue;
                allBins.push({
                    ...bin,
                    zone_id: zone.zone_id,
                    zone_name: zone.name,
                    warehouse_id: warehouseId
                });
            }
        }

        // Get inventory counts per bin
        const binIds = allBins.map(b => b.bin_id);
        const invCounts = await Inventory.aggregate([
            { $match: { bin_id: { $in: binIds }, quantity: { $gt: 0 } } },
            {
                $group: {
                    _id: '$bin_id',
                    current_quantity: { $sum: '$quantity' },
                    unique_products: { $addToSet: '$product_id' }
                }
            }
        ]);

        const invMap = {};
        invCounts.forEach(i => { invMap[i._id] = i; });

        // Organize into column-row-bin hierarchy
        const columns = {};
        const flat = [];

        for (const bin of allBins) {
            const col = bin.column_position || 'default';
            const row = bin.row_position || 'default';
            const inv = invMap[bin.bin_id] || { current_quantity: 0, unique_products: [] };

            const binData = {
                ...bin,
                current_quantity: inv.current_quantity,
                unique_products: inv.unique_products?.length || 0,
                unique_spare_parts: 0
            };

            if (!columns[col]) columns[col] = { rows: {}, bin_count: 0, total_quantity: 0 };
            if (!columns[col].rows[row]) columns[col].rows[row] = { bins: [], total_quantity: 0 };

            columns[col].rows[row].bins.push(binData);
            columns[col].rows[row].total_quantity += inv.current_quantity;
            columns[col].bin_count++;
            columns[col].total_quantity += inv.current_quantity;

            flat.push(binData);
        }

        return { columns, flat };
    }

    async getWarehouseStatistics(warehouseId) {
        const warehouse = await Warehouse.findOne({ warehouse_id: warehouseId, is_active: true }).lean();
        if (!warehouse) {
            return {
                warehouse_id: warehouseId,
                total_bins: 0,
                total_columns: 0,
                total_rows: 0,
                unique_products: 0,
                unique_spare_parts: 0,
                total_items: 0,
                total_capacity: 0,
                utilization_percent: 0
            };
        }

        // Calculate bin stats from embedded structure
        let totalBins = 0;
        let totalCapacity = 0;
        const uniqueColumns = new Set();
        const uniqueRows = new Set();

        for (const zone of warehouse.zones || []) {
            for (const bin of zone.bins || []) {
                if (bin.is_active !== false) {
                    totalBins++;
                    totalCapacity += bin.max_capacity || 0;
                    if (bin.column_position) uniqueColumns.add(bin.column_position);
                    if (bin.row_position) uniqueRows.add(bin.row_position);
                }
            }
        }

        // Get inventory stats
        const binStats = await Inventory.aggregate([
            { $match: { warehouse_id: warehouseId, inventory_type: 'bulk' } },
            {
                $group: {
                    _id: null,
                    unique_products: { $addToSet: '$product_id' },
                    total_quantity: { $sum: '$quantity' }
                }
            }
        ]);

        const serialStats = await Inventory.aggregate([
            { $match: { warehouse_id: warehouseId, inventory_type: 'serialized', status: 'available' } },
            {
                $group: {
                    _id: null,
                    unique_products: { $addToSet: '$product_id' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const binStat = binStats[0] || { unique_products: [], total_quantity: 0 };
        const serialStat = serialStats[0] || { unique_products: [], count: 0 };

        return {
            warehouse_id: warehouseId,
            warehouse_name: warehouse.name,
            total_bins: totalBins,
            total_columns: uniqueColumns.size,
            total_rows: uniqueRows.size,
            unique_products: (binStat.unique_products?.length || 0) + (serialStat.unique_products?.length || 0),
            unique_spare_parts: 0,
            total_items: (binStat.total_quantity || 0) + (serialStat.count || 0),
            total_capacity: totalCapacity,
            utilization_percent: totalCapacity > 0 ? Math.round((binStat.total_quantity / totalCapacity) * 100) : 0
        };
    }

    // ==========================================
    // BIN MANAGEMENT
    // ==========================================

    async getBinsByWarehouseWithItems(warehouseId, activeOnly = true) {
        const warehouse = await Warehouse.findOne({ warehouse_id: warehouseId }).lean();
        if (!warehouse) return [];

        const bins = [];
        for (const zone of warehouse.zones || []) {
            for (const bin of zone.bins || []) {
                if (activeOnly && bin.is_active === false) continue;
                bins.push({
                    ...bin,
                    zone_id: zone.zone_id,
                    zone_name: zone.name,
                    warehouse_id: warehouseId
                });
            }
        }

        // Get inventory for each bin
        for (const bin of bins) {
            // Get aggregate inventory
            const aggregateItems = await Inventory.find({
                bin_id: bin.bin_id,
                inventory_type: 'bulk',
                quantity: { $gt: 0 }
            }).lean();

            // Get product details
            const productIds = aggregateItems.map(i => i.product_id);
            const products = await Product.find({ product_id: { $in: productIds } }).lean();
            const productMap = {};
            products.forEach(p => { productMap[p.product_id] = p; });

            // Get serialized items
            const serializedItems = await Inventory.find({
                bin_id: bin.bin_id,
                inventory_type: 'serialized',
                status: 'available'
            }).lean();

            const aggregateMapped = aggregateItems.map(item => {
                const prod = productMap[item.product_id];
                return {
                    quantity: item.quantity,
                    product_id: item.product_id,
                    spare_part_id: null,
                    product_name: prod?.device_name,
                    spare_part_name: null,
                    item_condition: item.condition,
                    item_type: 'aggregate'
                };
            });

            const serializedMapped = serializedItems.map(item => {
                const prod = productMap[item.product_id];
                return {
                    quantity: 1,
                    product_id: item.product_id,
                    spare_part_id: null,
                    product_name: prod?.device_name,
                    spare_part_name: null,
                    item_condition: item.condition_grade,
                    item_type: 'serialized',
                    serial_number: item.serial_number,
                    imei_1: item.imei_1,
                    imei_2: item.imei_2,
                    status: item.status
                };
            });

            bin.items = [...aggregateMapped, ...serializedMapped];
            bin.current_quantity = aggregateItems.reduce((sum, i) => sum + i.quantity, 0) + serializedItems.length;
        }

        return bins;
    }

    async createBin(binData) {
        const {
            warehouse_id, zone_id, bin_code,
            column_position, row_position, bin_position,
            max_capacity = 100, notes = null, product_type = null
        } = binData;

        // Validate positions
        if (!column_position || !row_position || !bin_position) {
            throw new Error('Column-Row-Bin addressing requires all three positions');
        }

        const hierarchical_code = `C${column_position}-R${row_position}-B${bin_position}`;

        const warehouse = await Warehouse.findOne({ warehouse_id: warehouse_id });
        if (!warehouse) throw new Error('Warehouse not found');

        // Find zone or use first zone
        const targetZoneId = zone_id || (warehouse.zones[0]?.zone_id);
        const zone = warehouse.zones.find(z => z.zone_id === targetZoneId);
        if (!zone) {
            // Create default zone if none exists
            const newZone = { zone_id: 1, name: 'Default', bins: [] };
            warehouse.zones.push(newZone);
        }

        const zoneIdx = warehouse.zones.findIndex(z => z.zone_id === (zone?.zone_id || 1));

        // Check for duplicate bin code
        const existingBin = warehouse.zones[zoneIdx].bins.find(b => b.bin_code === bin_code);
        if (existingBin) {
            throw new Error(`Bin code '${bin_code}' already exists in this warehouse`);
        }

        const binId = uuidv4();
        const newBin = {
            bin_id: binId,
            bin_code,
            column_position,
            row_position,
            bin_position,
            hierarchical_code,
            max_capacity,
            notes,
            product_type,
            is_active: true
        };

        warehouse.zones[zoneIdx].bins.push(newBin);
        await warehouse.save();

        return binId;
    }

    async getBinById(binId) {
        const warehouse = await Warehouse.findOne({ 'zones.bins.bin_id': binId }).lean();
        if (!warehouse) return null;

        for (const zone of warehouse.zones) {
            const bin = zone.bins.find(b => b.bin_id === binId);
            if (bin) {
                return {
                    ...bin,
                    zone_id: zone.zone_id,
                    zone_name: zone.name,
                    warehouse_id: warehouse.warehouse_id,
                    warehouse_name: warehouse.name
                };
            }
        }
        return null;
    }

    async updateBin(binId, updateData) {
        const warehouse = await Warehouse.findOne({ 'zones.bins.bin_id': binId });
        if (!warehouse) throw new Error('Bin not found');

        let updated = false;
        for (const zone of warehouse.zones) {
            const binIdx = zone.bins.findIndex(b => b.bin_id === binId);
            if (binIdx >= 0) {
                const bin = zone.bins[binIdx];

                // Update allowed fields
                if (updateData.column_position !== undefined) bin.column_position = updateData.column_position;
                if (updateData.row_position !== undefined) bin.row_position = updateData.row_position;
                if (updateData.bin_position !== undefined) bin.bin_position = updateData.bin_position;
                if (updateData.bin_code !== undefined) bin.bin_code = updateData.bin_code;
                if (updateData.max_capacity !== undefined) bin.max_capacity = updateData.max_capacity;
                if (updateData.notes !== undefined) bin.notes = updateData.notes;
                if (updateData.is_active !== undefined) bin.is_active = updateData.is_active;
                if (updateData.product_type !== undefined) bin.product_type = updateData.product_type;

                // Update hierarchical code if positions changed
                if (bin.column_position && bin.row_position && bin.bin_position) {
                    bin.hierarchical_code = `C${bin.column_position}-R${bin.row_position}-B${bin.bin_position}`;
                }

                zone.bins[binIdx] = bin;
                updated = true;
                break;
            }
        }

        if (updated) {
            await warehouse.save();
        }
        return updated;
    }

    async deleteBin(binId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get inventory to return to staging
            const binInventory = await Inventory.find({ bin_id: binId }).session(session).lean();

            // Log the removal
            if (binInventory.length > 0) {
                await Transaction.create([{
                    transaction_type: 'bin_deletion_return',
                    transaction_date: new Date(),
                    bin_id: binId,
                    notes: 'Bin deleted - inventory returned to staging',
                    items: binInventory.map(item => ({
                        product_id: item.product_id,
                        spare_part_id: item.spare_part_id,
                        quantity_changed: -(item.quantity || 1)
                    }))
                }], { session });
            }

            // Delete inventory
            await Inventory.deleteMany({ bin_id: binId }).session(session);

            // Deactivate bin (soft delete in embedded structure)
            await Warehouse.updateOne(
                { 'zones.bins.bin_id': binId },
                { $set: { 'zones.$[].bins.$[bin].is_active': false } },
                { arrayFilters: [{ 'bin.bin_id': binId }] }
            ).session(session);

            await session.commitTransaction();
            return { success: true, itemsReturned: binInventory.length };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async getBinsByWarehouse(warehouseId, activeOnly = true) {
        return this.getBinsByWarehouseWithItems(warehouseId, activeOnly);
    }

    async getBinsHierarchical(warehouseId, activeOnly = true) {
        const { columns, flat } = await this.getWarehouseColumns(warehouseId, activeOnly);

        // Transform to hierarchical structure
        const hierarchical = {};
        for (const bin of flat) {
            const col = bin.column_position;
            const row = bin.row_position;
            const binPos = bin.bin_position;

            if (!col || !row || !binPos) continue;

            if (!hierarchical[col]) hierarchical[col] = {};
            if (!hierarchical[col][row]) hierarchical[col][row] = {};

            hierarchical[col][row][binPos] = {
                ...bin,
                location_display: `Column ${col}, Row ${row}, Bin ${binPos}`,
                hierarchical_code: bin.hierarchical_code || `C${col}-R${row}-B${binPos}`
            };
        }

        return {
            hierarchical,
            flat,
            summary: {
                total_bins: flat.length,
                total_columns: Object.keys(hierarchical).length,
                total_rows: Math.max(...Object.values(hierarchical).map(col => Object.keys(col).length), 0),
                occupied_bins: flat.filter(b => b.current_quantity > 0).length
            }
        };
    }

    // ==========================================
    // INVENTORY OPERATIONS
    // ==========================================

    async getInventoryByLocation(warehouseId = null, binId = null) {
        const match = { inventory_type: 'bulk', quantity: { $gt: 0 } };
        if (warehouseId) match.warehouse_id = warehouseId;
        if (binId) match.bin_id = binId;

        const inventory = await Inventory.find(match).lean();

        // Get product info
        const productIds = [...new Set(inventory.map(i => i.product_id))];
        const products = await Product.find({ product_id: { $in: productIds } }).lean();
        const productMap = {};
        products.forEach(p => { productMap[p.product_id] = p; });

        // Get warehouse info
        const warehouseIds = [...new Set(inventory.map(i => i.warehouse_id))];
        const warehouses = await Warehouse.find({ warehouse_id: { $in: warehouseIds } }).lean();
        const warehouseMap = {};
        warehouses.forEach(w => { warehouseMap[w.warehouse_id] = w; });

        // Group by product and location
        const grouped = {};
        for (const inv of inventory) {
            const key = `${inv.product_id}_${inv.warehouse_id}_${inv.zone_id || 'default'}`;
            if (!grouped[key]) {
                grouped[key] = {
                    product_id: inv.product_id,
                    spare_part_id: null,
                    warehouse_quantity: 0,
                    available_quantity: 0,
                    reserved_quantity: 0,
                    bins_used: new Set()
                };
            }
            grouped[key].warehouse_quantity += inv.quantity || 0;
            grouped[key].available_quantity += (inv.quantity || 0) - (inv.reserved_quantity || 0);
            grouped[key].reserved_quantity += inv.reserved_quantity || 0;
            if (inv.bin_id) grouped[key].bins_used.add(inv.bin_id);
        }

        return Object.values(grouped).map(g => {
            const prod = productMap[g.product_id];
            const wh = warehouseMap[warehouseId || inventory[0]?.warehouse_id];
            return {
                product_id: g.product_id,
                spare_part_id: null,
                warehouse_quantity: g.warehouse_quantity,
                available_quantity: g.available_quantity,
                reserved_quantity: g.reserved_quantity,
                product_name: prod?.device_name || `Product-${g.product_id}`,
                brand: prod?.device_maker || '',
                model: '',
                spare_part_name: null,
                category: '',
                location_name: 'Zone',
                warehouse_name: wh?.name || 'Unknown',
                item_type: 'product',
                item_name: prod?.device_name || `Product-${g.product_id}`,
                warehouse_id: warehouseId,
                bins_used: g.bins_used.size
            };
        });
    }

    async transferInventory(productId, fromWarehouseId, toWarehouseId, quantity, fromZoneId = null, toZoneId = null, notes = null) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Deduct from source
            const source = await Inventory.findOne({
                product_id: productId,
                warehouse_id: fromWarehouseId,
                inventory_type: 'bulk'
            }).session(session);

            if (!source || source.quantity < quantity) {
                throw new Error('Insufficient inventory or location not found');
            }

            await Inventory.updateOne(
                { _id: source._id },
                { $inc: { quantity: -quantity } }
            ).session(session);

            // Add to destination
            await Inventory.findOneAndUpdate(
                { product_id: productId, warehouse_id: toWarehouseId, inventory_type: 'bulk' },
                {
                    $inc: { quantity: quantity },
                    $setOnInsert: { zone_id: toZoneId, condition: 'NEW' }
                },
                { upsert: true, session }
            );

            // Log
            await Transaction.create([{
                transaction_type: 'transfer',
                transaction_date: new Date(),
                warehouse_id: toWarehouseId,
                from_warehouse_id: fromWarehouseId,
                notes: notes,
                items: [{
                    product_id: productId,
                    quantity_changed: quantity,
                    from_location: { warehouse_id: fromWarehouseId, zone_id: fromZoneId },
                    to_location: { warehouse_id: toWarehouseId, zone_id: toZoneId }
                }]
            }], { session });

            await session.commitTransaction();
            return true;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async assignProductToBin(binId, productId, quantity, batchId = null, sparePartId = null) {
        // Get bin info to validate
        const bin = await this.getBinById(binId);
        if (!bin || bin.is_active === false) throw new Error('Bin not found or inactive');

        // Validate product type
        if (bin.product_type) {
            if (sparePartId && bin.product_type !== 'spare_part') {
                throw new Error('This bin is designated for smartphones only');
            }
            if (productId && bin.product_type !== 'smartphone') {
                throw new Error('This bin is designated for spare parts only');
            }
        }

        // Check capacity
        if (bin.max_capacity) {
            const currentInventory = await Inventory.aggregate([
                { $match: { bin_id: binId } },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]);
            const current = currentInventory[0]?.total || 0;
            if (current + quantity > bin.max_capacity) {
                throw new Error('Bin capacity exceeded');
            }
        }

        // Add inventory
        await Inventory.findOneAndUpdate(
            {
                bin_id: binId,
                warehouse_id: bin.warehouse_id,
                product_id: sparePartId ? null : productId,
                spare_part_id: sparePartId || null,
                inventory_type: sparePartId ? 'spare_part' : 'bulk'
            },
            {
                $inc: { quantity: quantity },
                $setOnInsert: { zone_id: bin.zone_id, condition: 'NEW' }
            },
            { upsert: true }
        );

        return true;
    }

    // ==========================================
    // ANALYTICS & DISTRIBUTION
    // ==========================================

    async getWarehouseDistributionOverview() {
        const warehouses = await Warehouse.find({ is_active: true }).lean();
        const result = [];

        for (const w of warehouses) {
            const invStats = await Inventory.aggregate([
                { $match: { warehouse_id: w.warehouse_id } },
                {
                    $group: {
                        _id: null,
                        unique_products: { $addToSet: '$product_id' },
                        total_quantity: { $sum: '$quantity' },
                        reserved_quantity: { $sum: '$reserved_quantity' }
                    }
                }
            ]);

            const stats = invStats[0] || { unique_products: [], total_quantity: 0, reserved_quantity: 0 };
            const binCount = w.zones.reduce((sum, z) => sum + (z.bins?.filter(b => b.is_active !== false).length || 0), 0);

            result.push({
                warehouse_id: w.warehouse_id,
                warehouse_name: w.name,
                location: w.location,
                unique_products: stats.unique_products?.length || 0,
                unique_spare_parts: 0,
                total_quantity: stats.total_quantity || 0,
                reserved_quantity: stats.reserved_quantity || 0,
                zone_count: w.zones?.length || 0,
                bin_count: binCount
            });
        }

        return result;
    }

    async getZoneDistributionEfficiency(warehouseId = null) {
        // Placeholder - would need zone efficiency calculation
        return [];
    }

    async getInventoryMovementTracking(filters = {}) {
        const query = {};
        if (filters.productId) query['items.product_id'] = filters.productId;
        if (filters.warehouseId) query.$or = [{ warehouse_id: filters.warehouseId }, { from_warehouse_id: filters.warehouseId }];
        if (filters.fromDate) query.transaction_date = { $gte: new Date(filters.fromDate) };
        if (filters.toDate) {
            query.transaction_date = query.transaction_date || {};
            query.transaction_date.$lte = new Date(filters.toDate);
        }

        return Transaction.find(query)
            .sort({ transaction_date: -1 })
            .limit(1000)
            .lean();
    }

    // ==========================================
    // BATCH & SERIALIZED OPERATIONS
    // ==========================================

    async getExpiringBatches(daysAhead = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

        return Inventory.find({
            expiry_date: { $lte: cutoffDate, $gte: new Date() },
            quantity: { $gt: 0 }
        })
            .sort({ expiry_date: 1 })
            .lean();
    }

    async findBySerialNumber(serialNumber) {
        const item = await Inventory.findOne({
            $or: [{ serial_number: serialNumber }, { imei_1: serialNumber }, { imei_2: serialNumber }]
        }).lean();

        if (!item) return null;

        // Get product info
        const product = await Product.findOne({ product_id: item.product_id }).lean();

        return {
            ...item,
            device_name: product?.device_name,
            device_maker: product?.device_maker
        };
    }

    async createSerializedItem(productId, serialNumber, warehouseId, binId, batchNo = null, lotNo = null, expiryDate = null, supplierId = null, notes = null) {
        const item = await Inventory.create({
            inventory_type: 'serialized',
            product_id: productId,
            serial_number: serialNumber,
            warehouse_id: warehouseId,
            bin_id: binId,
            batch_no: batchNo,
            expiry_date: expiryDate,
            supplier_id: supplierId,
            notes: notes,
            status: 'available',
            condition_grade: 'A'
        });

        return item._id;
    }

    async updateSerializedItemStatus(serialId, status, notes = null) {
        const updateData = { status };
        if (notes) updateData.notes = notes;

        await Inventory.updateOne(
            { _id: serialId },
            { $set: updateData }
        );

        return true;
    }
}

module.exports = WarehouseService;
