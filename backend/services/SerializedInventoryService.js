/**
 * Serialized Inventory Service (MongoDB Version)
 * Handles individual serialized inventory items with variant support
 * Replaces SQL-based service with Mongoose operations
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Warehouse = require('../models/Warehouse');

class SerializedInventoryService {
    constructor(_pool) {
        // Pool parameter kept for backward compatibility but not used
    }

    /**
     * Get all serialized inventory with optional filtering
     */
    async getAll(filters = {}) {
        const query = { inventory_type: 'serialized' };

        // Apply filters
        if (filters.status) query.status = filters.status;
        if (filters.warehouse_id) query.warehouse_id = filters.warehouse_id;
        if (filters.product_id) query.product_id = filters.product_id;
        if (filters.condition_grade) query.condition_grade = filters.condition_grade;
        if (filters.serial_number) {
            query.$or = [
                { serial_number: { $regex: filters.serial_number, $options: 'i' } },
                { imei_1: { $regex: filters.serial_number, $options: 'i' } },
                { imei_2: { $regex: filters.serial_number, $options: 'i' } }
            ];
        }

        const items = await Inventory.find(query)
            .sort({ created_at: -1 })
            .lean();

        // Enrich with product and warehouse info
        const productIds = [...new Set(items.map(i => i.product_id))];
        const warehouseIds = [...new Set(items.map(i => i.warehouse_id))];

        const products = await Product.find({ product_id: { $in: productIds } }).lean();
        const warehouses = await Warehouse.find({ warehouse_id: { $in: warehouseIds } }).lean();

        const productMap = {};
        products.forEach(p => { productMap[p.product_id] = p; });
        const warehouseMap = {};
        warehouses.forEach(w => { warehouseMap[w.warehouse_id] = w; });

        return items.map(item => {
            const prod = productMap[item.product_id] || {};
            const wh = warehouseMap[item.warehouse_id] || {};
            return {
                serial_id: item._id,
                uuid: item._id,
                product_id: item.product_id,
                serial_number: item.serial_number,
                imei_1: item.imei_1,
                imei_2: item.imei_2,
                warehouse_id: item.warehouse_id,
                bin_id: item.bin_id,
                status: item.status,
                condition_grade: item.condition_grade,
                import_invoice_id: item.import_invoice_id,
                supplier_id: item.supplier_id,
                notes: item.notes,
                created_at: item.created_at,
                updated_at: item.updated_at,
                // Enriched fields
                device_name: prod.device_name,
                device_maker: prod.device_maker,
                warehouse_name: wh.name
            };
        });
    }

    /**
     * Get single serialized inventory item by ID
     */
    async getById(serialId) {
        const item = await Inventory.findOne({
            _id: serialId,
            inventory_type: 'serialized'
        }).lean();

        if (!item) return null;

        // Enrich with product info
        const product = await Product.findOne({ product_id: item.product_id }).lean();
        const warehouse = item.warehouse_id
            ? await Warehouse.findOne({ warehouse_id: item.warehouse_id }).lean()
            : null;

        return {
            serial_id: item._id,
            uuid: item._id,
            product_id: item.product_id,
            serial_number: item.serial_number,
            imei_1: item.imei_1,
            imei_2: item.imei_2,
            warehouse_id: item.warehouse_id,
            bin_id: item.bin_id,
            status: item.status,
            condition_grade: item.condition_grade,
            import_invoice_id: item.import_invoice_id,
            supplier_id: item.supplier_id,
            notes: item.notes,
            created_at: item.created_at,
            updated_at: item.updated_at,
            device_name: product?.device_name,
            device_maker: product?.device_maker,
            warehouse_name: warehouse?.name
        };
    }

    /**
     * Create new serialized inventory item
     */
    async create(itemData) {
        const {
            product_id,
            serial_number,
            imei_1,
            imei_2,
            warehouse_id,
            bin_id = null,
            status = 'available',
            condition_grade = 'A',
            import_invoice_id = null,
            supplier_id = null,
            notes = null
        } = itemData;

        // Validate required fields
        if (!product_id) throw new Error('Product ID is required');
        if (!serial_number && !imei_1) throw new Error('Serial number or IMEI is required');

        // Check for duplicates
        const existing = await Inventory.findOne({
            $or: [
                { serial_number: serial_number || imei_1 },
                { imei_1: imei_1 || serial_number },
                { imei_2: imei_2 }
            ].filter(Boolean)
        });

        if (existing) {
            throw new Error('Duplicate serial number or IMEI already exists');
        }

        const newItem = await Inventory.create({
            inventory_type: 'serialized',
            product_id,
            serial_number: serial_number || imei_1,
            imei_1,
            imei_2,
            warehouse_id,
            bin_id,
            status,
            condition_grade,
            import_invoice_id,
            supplier_id,
            notes,
            quantity: 1
        });

        return newItem._id;
    }

    /**
     * Update serialized inventory item
     */
    async update(serialId, itemData) {
        const item = await Inventory.findOne({
            _id: serialId,
            inventory_type: 'serialized'
        });

        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        // Check for duplicate IMEI if changing
        if (itemData.imei_1 && itemData.imei_1 !== item.imei_1) {
            const duplicate = await Inventory.findOne({
                imei_1: itemData.imei_1,
                _id: { $ne: serialId }
            });
            if (duplicate) {
                return { success: false, error: 'IMEI already exists' };
            }
        }

        // Update allowed fields
        const allowedFields = [
            'product_id', 'serial_number', 'imei_1', 'imei_2',
            'warehouse_id', 'bin_id', 'status', 'condition_grade',
            'notes', 'import_invoice_id', 'supplier_id'
        ];

        for (const field of allowedFields) {
            if (itemData[field] !== undefined) {
                item[field] = itemData[field];
            }
        }

        await item.save();

        return { success: true };
    }

    /**
     * Delete serialized inventory item
     */
    async delete(serialId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const item = await Inventory.findOne({
                _id: serialId,
                inventory_type: 'serialized'
            }).session(session);

            if (!item) {
                await session.abortTransaction();
                return { success: false, error: 'Item not found' };
            }

            // Log the deletion
            await Transaction.create([{
                transaction_type: 'deletion',
                transaction_date: new Date(),
                warehouse_id: item.warehouse_id,
                notes: `Deleted serialized item: ${item.serial_number}`,
                items: [{
                    product_id: item.product_id,
                    serial_number: item.serial_number,
                    quantity_changed: -1,
                    from_location: { warehouse_id: item.warehouse_id, bin_id: item.bin_id }
                }]
            }], { session });

            await Inventory.deleteOne({ _id: serialId }).session(session);

            await session.commitTransaction();
            return { success: true };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get inventory summary by variant
     */
    async getVariantInventorySummary(variantId) {
        const stats = await Inventory.aggregate([
            { $match: { inventory_type: 'serialized', product_id: variantId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const summary = {
            variant_id: variantId,
            total_count: 0,
            available: 0,
            sold: 0,
            reserved: 0,
            in_repair: 0,
            disposed: 0
        };

        for (const stat of stats) {
            summary.total_count += stat.count;
            switch (stat._id) {
                case 'available': summary.available = stat.count; break;
                case 'sold': summary.sold = stat.count; break;
                case 'reserved': summary.reserved = stat.count; break;
                case 'in_repair': summary.in_repair = stat.count; break;
                case 'disposed': summary.disposed = stat.count; break;
            }
        }

        return summary;
    }

    /**
     * Get inventory summary by model
     */
    async getModelInventorySummary(modelId) {
        // Assuming model maps to a product category or parent
        const stats = await Inventory.aggregate([
            { $match: { inventory_type: 'serialized' } },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: 'product_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $match: { 'product.model_id': modelId } },
            {
                $group: {
                    _id: { product_id: '$product_id', status: '$status' },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.product_id',
                    statuses: {
                        $push: { status: '$_id.status', count: '$count' }
                    },
                    total: { $sum: '$count' }
                }
            }
        ]);

        return stats.map(s => ({
            variant_id: s._id,
            total_count: s.total,
            statuses: s.statuses
        }));
    }

    /**
     * Bulk create serialized inventory items
     */
    async bulkCreate(items) {
        const createdIds = [];

        for (const itemData of items) {
            try {
                const id = await this.create(itemData);
                createdIds.push({ success: true, id });
            } catch (err) {
                createdIds.push({ success: false, error: err.message });
            }
        }

        return createdIds;
    }

    /**
     * Transfer serialized inventory item
     */
    async transfer(serialId, transferData) {
        const { to_warehouse_id, to_bin_id = null, notes = null, user_id = 1 } = transferData;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const item = await Inventory.findOne({
                _id: serialId,
                inventory_type: 'serialized'
            }).session(session);

            if (!item) {
                await session.abortTransaction();
                return { success: false, error: 'Item not found' };
            }

            const fromWarehouse = item.warehouse_id;
            const fromBin = item.bin_id;

            // Update location
            item.warehouse_id = to_warehouse_id;
            item.bin_id = to_bin_id;
            await item.save({ session });

            // Log transfer
            await Transaction.create([{
                transaction_type: 'transfer',
                transaction_date: new Date(),
                warehouse_id: to_warehouse_id,
                from_warehouse_id: fromWarehouse,
                user_id,
                notes,
                items: [{
                    product_id: item.product_id,
                    serial_number: item.serial_number,
                    quantity_changed: 1,
                    from_location: { warehouse_id: fromWarehouse, bin_id: fromBin },
                    to_location: { warehouse_id: to_warehouse_id, bin_id: to_bin_id }
                }]
            }], { session });

            await session.commitTransaction();

            return {
                success: true,
                from_warehouse_id: fromWarehouse,
                to_warehouse_id,
                serial_number: item.serial_number
            };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    /**
     * Update status of serialized inventory item
     */
    async updateStatus(serialId, newStatus, notes = '') {
        const item = await Inventory.findOne({
            _id: serialId,
            inventory_type: 'serialized'
        });

        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        const oldStatus = item.status;
        item.status = newStatus;
        if (notes) item.notes = notes;

        await item.save();

        // Log status change
        await Transaction.create({
            transaction_type: 'status_change',
            transaction_date: new Date(),
            warehouse_id: item.warehouse_id,
            notes: `Status changed from ${oldStatus} to ${newStatus}. ${notes}`,
            items: [{
                product_id: item.product_id,
                serial_number: item.serial_number,
                notes: `${oldStatus} -> ${newStatus}`
            }]
        });

        return { success: true, old_status: oldStatus, new_status: newStatus };
    }

    /**
     * Search by IMEI or serial
     */
    async findByIdentifier(identifier) {
        const item = await Inventory.findOne({
            inventory_type: 'serialized',
            $or: [
                { serial_number: identifier },
                { imei_1: identifier },
                { imei_2: identifier }
            ]
        }).lean();

        if (!item) return null;

        const product = await Product.findOne({ product_id: item.product_id }).lean();

        return {
            ...item,
            serial_id: item._id,
            device_name: product?.device_name,
            device_maker: product?.device_maker
        };
    }
}

module.exports = SerializedInventoryService;
