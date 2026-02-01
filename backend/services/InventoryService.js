/**
 * Inventory Service (Unified)
 * Unified interface for inventory operations.
 * MongoDB/Mongoose version - replaces SQL-based service
 */

const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Warehouse = require('../models/Warehouse');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

class InventoryService {
    constructor(_pool) {
        // Pool parameter kept for backward compatibility but not used
        // InventoryTransactionService will also need migration
    }

    // =========================================================================
    // Query Operations
    // =========================================================================

    async getAllInventory(filters = {}) {
        const { warehouse_id, bin_id, search, product_id, limit = 100, offset = 0, include_inactive } = filters;
        const showInactive = include_inactive === 'true' || include_inactive === true;

        // Build product query
        const productQuery = {};
        if (!showInactive) productQuery.is_active = true;
        if (product_id) productQuery.product_id = product_id;
        if (search) {
            productQuery.$or = [
                { device_name: { $regex: search, $options: 'i' } },
                { device_maker: { $regex: search, $options: 'i' } }
            ];
        }

        // Get products with inventory aggregation
        const pipeline = [
            { $match: productQuery },
            {
                $lookup: {
                    from: 'inventory',
                    let: { pid: '$product_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$product_id', '$$pid'] },
                                inventory_type: 'bulk',
                                ...(warehouse_id && { warehouse_id: warehouse_id }),
                                ...(bin_id && { bin_id: bin_id })
                            }
                        }
                    ],
                    as: 'stock'
                }
            },
            {
                $addFields: {
                    total_inventory: { $sum: '$stock.quantity' }
                }
            },
            {
                $project: {
                    _id: 0,
                    product_id: 1,
                    device_name: 1,
                    device_maker: 1,
                    device_price: 1,
                    color: 1,
                    ram: 1,
                    rom: 1,
                    is_active: 1,
                    total_inventory: 1
                }
            },
            { $sort: { device_maker: 1, device_name: 1 } },
            { $skip: parseInt(offset) },
            { $limit: parseInt(limit) }
        ];

        return Product.aggregate(pipeline);
    }

    async getProductById(productId) {
        const product = await Product.findOne({ product_id: productId }).lean();
        if (!product) return null;

        // Get inventory locations
        const inventoryDocs = await Inventory.find({
            product_id: productId,
            inventory_type: 'bulk'
        }).lean();

        // Get warehouse names for locations
        const warehouseIds = [...new Set(inventoryDocs.map(i => i.warehouse_id))];
        const warehouses = await Warehouse.find({ warehouse_id: { $in: warehouseIds } }).lean();
        const warehouseMap = {};
        warehouses.forEach(w => { warehouseMap[w.warehouse_id] = w.name; });

        const locations = inventoryDocs.map(inv => ({
            ...inv,
            warehouse_name: warehouseMap[inv.warehouse_id] || 'Unknown',
            quantity_on_hand: inv.quantity
        }));

        // Get serialized assets
        const assets = await Inventory.find({
            product_id: productId,
            inventory_type: 'serialized',
            status: 'available'
        }).lean();

        const total_inventory = locations.reduce((sum, loc) => sum + (loc.quantity || 0), 0);

        return { ...product, locations, assets, total_inventory };
    }

    async getProductPrice(productId, _options = {}) {
        const product = await Product.findOne(
            { product_id: productId },
            { product_id: 1, device_name: 1, device_price: 1 }
        ).lean();

        if (!product) return null;

        return {
            product_id: product.product_id,
            device_name: product.device_name,
            base_price: Number(product.device_price),
            currency: 'USD'
        };
    }

    async getInventoryLevel(productId, warehouseId = null, binId = null) {
        const query = { product_id: productId, inventory_type: 'bulk' };
        if (warehouseId) query.warehouse_id = warehouseId;
        if (binId) query.bin_id = binId;

        const result = await Inventory.aggregate([
            { $match: query },
            { $group: { _id: null, level: { $sum: '$quantity' } } }
        ]);

        return result[0]?.level || 0;
    }

    async getTransactionHistory(productId, filters = {}) {
        const { limit = 100, warehouse_id, transaction_type } = filters;

        const query = { 'items.product_id': productId };
        if (warehouse_id) query.warehouse_id = warehouse_id;
        if (transaction_type) query.transaction_type = transaction_type;

        const transactions = await Transaction.find(query)
            .sort({ transaction_date: -1 })
            .limit(parseInt(limit))
            .lean();

        // Flatten to match legacy format
        const logs = [];
        for (const txn of transactions) {
            for (const item of txn.items.filter(i => i.product_id === productId)) {
                logs.push({
                    log_id: txn._id.toString(),
                    product_id: item.product_id,
                    transaction_type: txn.transaction_type,
                    quantity_changed: item.quantity_changed,
                    transaction_date: txn.transaction_date,
                    warehouse_id: item.to_location?.warehouse_id || txn.warehouse_id,
                    bin_id: item.to_location?.bin_id || txn.bin_id,
                    unit_cost: item.unit_cost,
                    total_value: item.total_value,
                    notes: item.notes || txn.notes,
                    supplier_id: txn.supplier_id,
                    user_id: txn.user_id
                });
            }
        }

        return logs;
    }

    async getProductLogs(productId, filters = {}) {
        const { start_date, end_date, limit = 100 } = typeof filters === 'number' ? { limit: filters } : filters;

        const query = { 'items.product_id': productId };
        if (start_date) query.transaction_date = { $gte: new Date(start_date) };
        if (end_date) {
            query.transaction_date = query.transaction_date || {};
            query.transaction_date.$lte = new Date(end_date);
        }

        const transactions = await Transaction.find(query)
            .sort({ transaction_date: -1 })
            .limit(parseInt(limit))
            .lean();

        // Format for API compatibility
        const logs = [];
        for (const txn of transactions) {
            for (const item of txn.items.filter(i => i.product_id === productId)) {
                logs.push({
                    log_id: txn._id.toString(),
                    product_id: item.product_id,
                    transaction_type: txn.transaction_type,
                    quantity_changed: item.quantity_changed,
                    transaction_date: txn.transaction_date,
                    warehouse_id: item.to_location?.warehouse_id || txn.warehouse_id,
                    bin_id: item.to_location?.bin_id,
                    from_warehouse_id: item.from_location?.warehouse_id,
                    from_bin_id: item.from_location?.bin_id,
                    unit_cost: item.unit_cost,
                    total_value: item.total_value,
                    notes: item.notes || txn.notes,
                    user_id: txn.user_id,
                    transaction_group_id: txn.transaction_group_id,
                    subtotal: txn.totals?.subtotal,
                    tax_amount: txn.totals?.tax_amount,
                    total_amount: txn.totals?.total_amount
                });
            }
        }

        return logs;
    }

    async getTransactionLogs(filters = {}) {
        const {
            warehouse_id, bin_id, transaction_type, product_id,
            start_date, end_date, limit = 100, offset = 0
        } = filters;

        const query = {};
        if (warehouse_id) query.$or = [{ warehouse_id }, { from_warehouse_id: warehouse_id }];
        if (transaction_type) query.transaction_type = transaction_type;
        if (product_id) query['items.product_id'] = product_id;
        if (start_date) query.transaction_date = { $gte: new Date(start_date) };
        if (end_date) {
            query.transaction_date = query.transaction_date || {};
            query.transaction_date.$lte = new Date(end_date);
        }

        const transactions = await Transaction.find(query)
            .sort({ transaction_date: -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit))
            .lean();

        // Enrich with product names
        const productIds = [...new Set(transactions.flatMap(t => t.items.map(i => i.product_id).filter(Boolean)))];
        const products = await Product.find({ product_id: { $in: productIds } }).lean();
        const productMap = {};
        products.forEach(p => { productMap[p.product_id] = p; });

        // Flatten transactions to log format
        const logs = [];
        for (const txn of transactions) {
            for (const item of txn.items) {
                const prod = productMap[item.product_id];
                logs.push({
                    log_id: txn._id.toString(),
                    product_id: item.product_id,
                    spare_part_id: item.spare_part_id,
                    transaction_type: txn.transaction_type,
                    quantity_changed: item.quantity_changed,
                    transaction_date: txn.transaction_date,
                    warehouse_id: item.to_location?.warehouse_id || txn.warehouse_id,
                    bin_id: item.to_location?.bin_id || txn.bin_id,
                    zone_id: item.to_location?.zone_id || txn.zone_id,
                    from_warehouse_id: item.from_location?.warehouse_id,
                    from_bin_id: item.from_location?.bin_id,
                    from_zone_id: item.from_location?.zone_id,
                    notes: item.notes || txn.notes,
                    condition: item.condition,
                    user_id: txn.user_id,
                    product_name: prod?.device_name,
                    product_maker: prod?.device_maker
                });
            }
        }

        return logs;
    }

    async getReceiptDetails(receiptId) {
        const txn = await Transaction.findOne({
            $or: [{ transaction_group_id: receiptId }, { receipt_id: receiptId }]
        }).lean();

        if (!txn || txn.items.length === 0) return null;

        // Get product info
        const productIds = txn.items.map(i => i.product_id).filter(Boolean);
        const products = await Product.find({ product_id: { $in: productIds } }).lean();
        const productMap = {};
        products.forEach(p => { productMap[p.product_id] = p; });

        // Get warehouse info
        const warehouse = await Warehouse.findOne({ warehouse_id: txn.warehouse_id }).lean();

        return {
            receipt_id: txn.receipt_id || txn.transaction_group_id,
            transaction_type: txn.transaction_type,
            transaction_date: txn.transaction_date,
            warehouse_id: txn.warehouse_id,
            warehouse_name: warehouse?.name || 'Unknown',
            warehouse_location: warehouse?.location,
            user_name: null, // Would need user lookup
            notes: txn.notes,
            invoice_number: txn.external_doc_no,
            items: txn.items.map(item => {
                const prod = productMap[item.product_id];
                return {
                    log_id: txn._id.toString(),
                    product_id: item.product_id,
                    spare_part_id: item.spare_part_id,
                    product_name: prod?.device_name || item.spare_part_id,
                    product_maker: prod?.device_maker,
                    quantity: item.quantity_changed,
                    unit_cost: item.unit_cost,
                    subtotal: item.total_value,
                    tax_amount: 0,
                    total_amount: item.total_value,
                    condition: item.condition,
                    warehouse_name: warehouse?.name,
                    bin_id: item.to_location?.bin_id
                };
            }),
            totals: txn.totals
        };
    }

    async getMovementHistory(filters = {}) {
        const { productId, warehouseId, fromDate, toDate, limit = 100, offset = 0 } = filters;

        const query = { transaction_type: 'transfer' };
        if (productId) query['items.product_id'] = productId;
        if (warehouseId) query.$or = [{ warehouse_id: warehouseId }, { from_warehouse_id: warehouseId }];
        if (fromDate) query.transaction_date = { $gte: new Date(fromDate) };
        if (toDate) {
            query.transaction_date = query.transaction_date || {};
            query.transaction_date.$lte = new Date(toDate);
        }

        const transactions = await Transaction.find(query)
            .sort({ transaction_date: -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit))
            .lean();

        // Enrich with product names
        const productIds = [...new Set(transactions.flatMap(t => t.items.map(i => i.product_id).filter(Boolean)))];
        const products = await Product.find({ product_id: { $in: productIds } }).lean();
        const productMap = {};
        products.forEach(p => { productMap[p.product_id] = p; });

        const movements = [];
        for (const txn of transactions) {
            for (const item of txn.items) {
                const prod = productMap[item.product_id];
                movements.push({
                    log_id: txn._id.toString(),
                    product_id: item.product_id,
                    product_name: prod?.device_name,
                    product_maker: prod?.device_maker,
                    transaction_type: txn.transaction_type,
                    quantity_changed: item.quantity_changed,
                    transaction_date: txn.transaction_date,
                    from_warehouse_id: item.from_location?.warehouse_id,
                    from_bin_id: item.from_location?.bin_id,
                    to_warehouse_id: item.to_location?.warehouse_id || txn.warehouse_id,
                    to_bin_id: item.to_location?.bin_id || txn.bin_id,
                    user_id: txn.user_id,
                    notes: txn.notes
                });
            }
        }

        return movements;
    }

    async getTransactionStats(filters = {}) {
        const { warehouse_id, start_date, end_date } = filters;

        const match = {};
        if (warehouse_id) match.warehouse_id = warehouse_id;
        if (start_date) match.transaction_date = { $gte: new Date(start_date) };
        if (end_date) {
            match.transaction_date = match.transaction_date || {};
            match.transaction_date.$lte = new Date(end_date);
        }

        const stats = await Transaction.aggregate([
            { $match: match },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$transaction_type',
                    transaction_count: { $sum: 1 },
                    total_quantity: { $sum: { $abs: '$items.quantity_changed' } },
                    total_value: { $sum: '$items.total_value' }
                }
            }
        ]);

        const receiptCount = await Transaction.countDocuments({
            ...match,
            transaction_type: 'incoming',
            transaction_group_id: { $ne: null }
        });

        return {
            transaction_stats: stats.map(s => ({
                transaction_type: s._id,
                transaction_count: s.transaction_count,
                total_quantity: s.total_quantity,
                total_value: s.total_value
            })),
            receipt_stats: [{ receipt_type: 'incoming', receipt_count: receiptCount }],
            filters
        };
    }

    async getZoneInventoryStatus() {
        // Phone stats by zone
        const phoneStats = await Inventory.aggregate([
            { $match: { inventory_type: 'serialized', status: { $ne: 'disposed' } } },
            {
                $lookup: {
                    from: 'warehouses',
                    localField: 'warehouse_id',
                    foreignField: 'warehouse_id',
                    as: 'warehouse'
                }
            },
            { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { warehouse_name: '$warehouse.name', zone_name: '$zone_id', status: '$status' },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    warehouse_name: { $ifNull: ['$_id.warehouse_name', 'Unknown'] },
                    zone_name: { $ifNull: [{ $toString: '$_id.zone_name' }, 'Unassigned'] },
                    status: '$_id.status',
                    count: 1
                }
            }
        ]);

        // Parts stats by bin
        const partStats = await Inventory.aggregate([
            { $match: { inventory_type: { $in: ['bulk', 'spare_part'] }, quantity: { $gt: 0 } } },
            {
                $lookup: {
                    from: 'warehouses',
                    localField: 'warehouse_id',
                    foreignField: 'warehouse_id',
                    as: 'warehouse'
                }
            },
            { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { warehouse_name: '$warehouse.name', bin_code: '$bin_id', status: '$condition' },
                    count: { $sum: '$quantity' }
                }
            },
            {
                $project: {
                    _id: 0,
                    warehouse_name: { $ifNull: ['$_id.warehouse_name', 'Unknown'] },
                    bin_code: { $ifNull: ['$_id.bin_code', 'Unassigned'] },
                    status: '$_id.status',
                    count: 1
                }
            }
        ]);

        return { phones: phoneStats, parts: partStats };
    }

    // =========================================================================
    // Movement Operations
    // =========================================================================

    async warehouseTransfer(data) {
        const {
            productId, fromWarehouseId, toWarehouseId,
            fromBinId, toBinId, quantity, notes, userId
        } = data;

        if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
            throw new Error('Missing required fields: productId, fromWarehouseId, toWarehouseId, and quantity');
        }

        const quantityNum = parseInt(quantity, 10);
        if (isNaN(quantityNum) || quantityNum <= 0) {
            throw new Error('Quantity must be a positive integer');
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get product details
            const product = await Product.findOne({ product_id: productId }).session(session).lean();
            if (!product) throw new Error('Product not found');

            const devicePrice = parseFloat(product.device_price) || 0;
            const transferValue = devicePrice * quantityNum;

            // Build source query
            const sourceQuery = { product_id: productId, warehouse_id: fromWarehouseId, inventory_type: 'bulk' };
            if (fromBinId) sourceQuery.bin_id = fromBinId;

            // Check source stock
            const sourceInventory = await Inventory.find(sourceQuery).session(session).lean();
            const totalAvailable = sourceInventory.reduce((sum, inv) => sum + (inv.quantity || 0), 0);

            if (totalAvailable < quantityNum) {
                throw new Error(`Insufficient stock. Available: ${totalAvailable}, Requested: ${quantityNum}`);
            }

            // Deduct from source (FIFO approach)
            let remainingToTransfer = quantityNum;
            for (const inv of sourceInventory) {
                if (remainingToTransfer <= 0) break;
                const deductAmount = Math.min(inv.quantity, remainingToTransfer);
                await Inventory.updateOne(
                    { _id: inv._id },
                    { $inc: { quantity: -deductAmount }, $set: { last_movement_at: new Date(), last_movement_type: 'transfer' } }
                ).session(session);
                remainingToTransfer -= deductAmount;
            }

            // Add to destination
            await Inventory.findOneAndUpdate(
                { product_id: productId, warehouse_id: toWarehouseId, bin_id: toBinId || null, inventory_type: 'bulk' },
                {
                    $inc: { quantity: quantityNum },
                    $set: { last_movement_at: new Date(), last_movement_type: 'transfer' },
                    $setOnInsert: { condition: 'NEW', min_stock_level: 0 }
                },
                { upsert: true, session }
            );

            // Get new total
            const newTotal = await Inventory.aggregate([
                { $match: { product_id: productId, inventory_type: 'bulk' } },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]).session(session);

            // Create transaction log
            await Transaction.create([{
                transaction_type: 'transfer',
                transaction_date: new Date(),
                warehouse_id: toWarehouseId,
                from_warehouse_id: fromWarehouseId,
                user_id: userId,
                notes: notes || `Warehouse transfer. Value: $${transferValue.toFixed(2)}`,
                items: [{
                    product_id: productId,
                    quantity_changed: quantityNum,
                    unit_cost: devicePrice,
                    total_value: transferValue,
                    from_location: { warehouse_id: fromWarehouseId, bin_id: fromBinId },
                    to_location: { warehouse_id: toWarehouseId, bin_id: toBinId }
                }],
                totals: { subtotal: transferValue, total_amount: transferValue }
            }], { session });

            await session.commitTransaction();

            return {
                productId,
                productName: `${product.device_maker} ${product.device_name}`,
                fromWarehouseId, fromBinId: fromBinId || null,
                toWarehouseId, toBinId: toBinId || null,
                quantity: quantityNum,
                unitPrice: devicePrice,
                transferValue,
                updatedStagingInventory: newTotal[0]?.total || 0,
                binsAffected: sourceInventory.length
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async binTransfer(data) {
        const {
            productId, sparePartId, warehouseId, fromWarehouseId, toWarehouseId,
            fromBinId, toBinId, quantity, reason, userId
        } = data;

        const sourceWarehouseId = fromWarehouseId || warehouseId;
        const destWarehouseId = toWarehouseId || warehouseId;
        const itemType = sparePartId ? 'spare_part' : 'smartphone';
        const itemId = sparePartId || productId;

        if (!itemId || !sourceWarehouseId || !destWarehouseId || !fromBinId || !toBinId || !quantity) {
            throw new Error('Missing required fields');
        }

        if (sourceWarehouseId === destWarehouseId && fromBinId === toBinId) {
            throw new Error('Source and destination bins must be different when transferring within the same warehouse');
        }

        const quantityNum = parseInt(quantity, 10);
        if (isNaN(quantityNum) || quantityNum <= 0) {
            throw new Error('Quantity must be a positive integer');
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get product details
            let productDetails, devicePrice;
            if (sparePartId) {
                const part = await Product.findOne({ product_id: sparePartId, device_type: 'spare_part' }).session(session).lean();
                if (!part) throw new Error('Spare part not found');
                productDetails = { device_name: part.device_name, device_maker: part.device_maker };
                devicePrice = parseFloat(part.device_price) || 0;
            } else {
                const product = await Product.findOne({ product_id: productId }).session(session).lean();
                if (!product) throw new Error('Product not found');
                productDetails = product;
                devicePrice = parseFloat(product.device_price) || 0;
            }

            const transferValue = devicePrice * quantityNum;
            const inventoryType = sparePartId ? 'spare_part' : 'bulk';

            // Check source stock
            const sourceInventory = await Inventory.findOne({
                product_id: itemId,
                warehouse_id: sourceWarehouseId,
                bin_id: fromBinId,
                inventory_type: inventoryType
            }).session(session);

            const availableQty = sourceInventory?.quantity || 0;
            if (availableQty < quantityNum) {
                throw new Error(`Insufficient stock in source bin. Available: ${availableQty}`);
            }

            // Deduct from source
            await Inventory.updateOne(
                { _id: sourceInventory._id },
                { $inc: { quantity: -quantityNum }, $set: { last_movement_at: new Date(), last_movement_type: 'transfer' } }
            ).session(session);

            // Add to destination
            await Inventory.findOneAndUpdate(
                { product_id: itemId, warehouse_id: destWarehouseId, bin_id: toBinId, inventory_type: inventoryType },
                {
                    $inc: { quantity: quantityNum },
                    $set: { last_movement_at: new Date(), last_movement_type: 'transfer' },
                    $setOnInsert: { condition: 'NEW', min_stock_level: 0 }
                },
                { upsert: true, session }
            );

            // Get new total
            const newTotal = await Inventory.aggregate([
                { $match: { product_id: itemId, inventory_type: inventoryType } },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]).session(session);

            const isCrossWarehouse = sourceWarehouseId !== destWarehouseId;

            // Create transaction log
            await Transaction.create([{
                transaction_type: 'bin_transfer',
                transaction_date: new Date(),
                warehouse_id: destWarehouseId,
                from_warehouse_id: sourceWarehouseId,
                bin_id: toBinId,
                user_id: userId,
                notes: `${isCrossWarehouse ? 'Cross-warehouse ' : ''}Bin transfer: ${fromBinId} → ${toBinId}. Value: $${transferValue.toFixed(2)}${reason ? '. Reason: ' + reason : ''}`,
                items: [{
                    product_id: sparePartId ? null : productId,
                    spare_part_id: sparePartId || null,
                    quantity_changed: quantityNum,
                    unit_cost: devicePrice,
                    total_value: transferValue,
                    from_location: { warehouse_id: sourceWarehouseId, bin_id: fromBinId },
                    to_location: { warehouse_id: destWarehouseId, bin_id: toBinId }
                }],
                totals: { subtotal: transferValue, total_amount: transferValue }
            }], { session });

            await session.commitTransaction();

            return {
                productId: itemId,
                productName: `${productDetails.device_maker} ${productDetails.device_name}`,
                fromWarehouseId: sourceWarehouseId, fromBinId, fromBinCode: fromBinId,
                toWarehouseId: destWarehouseId, toBinId, toBinCode: toBinId,
                quantity: quantityNum,
                unitPrice: devicePrice,
                transferValue,
                updatedStagingInventory: newTotal[0]?.total || 0,
                isCrossWarehouse,
                itemType
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async bulkTransfer(data) {
        const { transfers, fromWarehouseId, toWarehouseId, fromBinId, toBinId, notes, userId } = data;

        if (!transfers || !Array.isArray(transfers) || transfers.length === 0) {
            throw new Error('Transfers array is required');
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        const results = [];
        const errors = [];

        try {
            for (const transfer of transfers) {
                try {
                    const { productId, quantity } = transfer;
                    const quantityNum = parseInt(quantity, 10);

                    // Check source stock
                    const sourceQuery = { product_id: productId, warehouse_id: fromWarehouseId, inventory_type: 'bulk' };
                    if (fromBinId) sourceQuery.bin_id = fromBinId;
                    else sourceQuery.bin_id = null;

                    const sourceInventory = await Inventory.findOne(sourceQuery).session(session);

                    if (!sourceInventory || sourceInventory.quantity < quantityNum) {
                        errors.push({ productId, error: 'Insufficient stock' });
                        continue;
                    }

                    // Deduct from source
                    await Inventory.updateOne(
                        { _id: sourceInventory._id },
                        { $inc: { quantity: -quantityNum } }
                    ).session(session);

                    // Add to destination
                    await Inventory.findOneAndUpdate(
                        { product_id: productId, warehouse_id: toWarehouseId, bin_id: toBinId || null, inventory_type: 'bulk' },
                        { $inc: { quantity: quantityNum }, $setOnInsert: { condition: 'NEW' } },
                        { upsert: true, session }
                    );

                    results.push({ productId, quantity: quantityNum, success: true });
                } catch (err) {
                    errors.push({ productId: transfer.productId, error: err.message });
                }
            }

            // Create transaction log
            await Transaction.create([{
                transaction_type: 'transfer',
                transaction_date: new Date(),
                warehouse_id: toWarehouseId,
                from_warehouse_id: fromWarehouseId,
                user_id: userId,
                notes: notes || 'Bulk transfer',
                items: results.map(r => ({
                    product_id: r.productId,
                    quantity_changed: r.quantity,
                    from_location: { warehouse_id: fromWarehouseId, bin_id: fromBinId },
                    to_location: { warehouse_id: toWarehouseId, bin_id: toBinId }
                }))
            }], { session });

            await session.commitTransaction();

            return { results, errors, successCount: results.length, errorCount: errors.length };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async validateTransfer(params) {
        const { productId, fromWarehouseId, toBinId, quantity } = params;

        // Check product exists
        const product = await Product.findOne({ product_id: productId }).lean();
        if (!product) {
            return { valid: false, error: 'Product not found' };
        }

        // Check source stock
        const sourceStock = await Inventory.aggregate([
            { $match: { product_id: productId, warehouse_id: fromWarehouseId, inventory_type: 'bulk' } },
            { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]);

        const available = sourceStock[0]?.total || 0;
        if (available < quantity) {
            return { valid: false, error: `Insufficient stock. Available: ${available}` };
        }

        // Check destination bin exists (if specified)
        if (toBinId) {
            const destWarehouse = await Warehouse.findOne({ 'zones.bins.bin_id': toBinId }).lean();
            if (!destWarehouse) {
                return { valid: false, error: 'Destination bin not found' };
            }
        }

        return { valid: true };
    }

    // Delegate methods (to be implemented in InventoryTransactionService)
    async receiveStock(data) {
        // Delegate to InventoryTransactionService when migrated
        throw new Error('receiveStock should be called via InventoryTransactionService');
    }

    async dispenseStock(data) {
        throw new Error('dispenseStock should be called via InventoryTransactionService');
    }

    async validateAvailability(data) {
        const { product_id, warehouse_id, quantity } = data;
        const level = await this.getInventoryLevel(product_id, warehouse_id);
        return { available: level >= quantity, current_level: level, requested: quantity };
    }

    async transferStock(data) {
        return this.warehouseTransfer(data);
    }

    async getReceivingManifest(_uuid) {
        // Placeholder - implement when needed
        return null;
    }
}

module.exports = InventoryService;
