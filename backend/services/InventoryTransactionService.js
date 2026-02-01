/**
 * Inventory Transaction Service (MongoDB Version)
 * Handles inbound/outbound stock transactions: receiveStock, dispenseStock
 * Replaces SQL-based service with Mongoose operations
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const { CapacityError, InsufficientStockError, NotFoundError } = require('../utils/errors');

const MAX_QUANTITY_PER_TRANSACTION = 10000;

class InventoryTransactionService {
    constructor(_masterPool) {
        // Pool parameter kept for backward compatibility but not used
        this.maxRetries = 3;
        this.retryDelay = 100;
    }

    roundCurrency(num) {
        return Math.round((parseFloat(num) || 0) * 100) / 100;
    }

    _sanitizeDate(date) {
        if (!date || date === '' || date === 'NaN' || date === 'undefined') return null;
        return new Date(date);
    }

    async _generateReceiptId(type) {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = type === 'IN' ? 'IN' : 'OUT';
        const count = await Transaction.countDocuments({
            transaction_type: type === 'IN' ? 'incoming' : 'outgoing',
            transaction_date: { $gte: new Date(date.setHours(0, 0, 0, 0)) }
        });
        const sequence = String(count + 1).padStart(5, '0');
        return `${prefix}-${dateStr}-${sequence}`;
    }

    async _checkBinCapacity(binId, additionalQuantity) {
        if (!binId) return;

        const warehouse = await Warehouse.findOne({ 'zones.bins.bin_id': binId }).lean();
        if (!warehouse) return;

        let binCapacity = null;
        let binCode = 'unknown';
        for (const zone of warehouse.zones) {
            const bin = zone.bins.find(b => b.bin_id === binId);
            if (bin) {
                binCapacity = bin.max_capacity;
                binCode = bin.bin_code;
                break;
            }
        }

        if (!binCapacity) return;

        const currentStock = await Inventory.aggregate([
            { $match: { bin_id: binId } },
            { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]);

        const currentTotal = currentStock[0]?.total || 0;
        if (currentTotal + additionalQuantity > binCapacity) {
            throw new CapacityError(binCode, binCapacity, currentTotal, additionalQuantity);
        }
    }

    async getReceivingManifest(invoiceUuid) {
        // Placeholder - would need Invoice model integration
        console.warn('getReceivingManifest: Invoice integration pending');
        return null;
    }

    // =========================================================================
    // RECEIVE STOCK (Inbound)
    // =========================================================================

    async receiveStock(inboundData) {
        const {
            supplier_id,
            items,
            warehouse_id,
            bin_id = null,
            user_id = 1,
            notes = null,
            subtotal: _subtotal = 0,
            tax_amount: _tax_amount = 0,
            total_amount: _total_amount = 0,
            po_id = null,
            invoice_id = null
        } = inboundData;

        // Validation
        if (!supplier_id) throw new Error('Supplier ID is required for inbound stock');
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new Error('At least one item is required');
        }
        if (!warehouse_id) throw new Error('Warehouse ID is required');

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const receiptId = await this._generateReceiptId('IN');
            const processedItems = [];
            const transactionItems = [];
            let totalSubtotal = 0;
            let totalTaxAmount = 0;

            for (let idx = 0; idx < items.length; idx++) {
                const item = items[idx];
                const itemResult = await this._processInboundItem(
                    session, receiptId, item, warehouse_id, bin_id,
                    user_id, supplier_id, idx + 1, notes, po_id, invoice_id
                );

                processedItems.push(itemResult);

                // Build transaction item
                const itemSubtotal = this.roundCurrency((item.quantity || 1) * (item.unit_cost || 0));
                const itemTax = this.roundCurrency(item.tax_amount || 0);
                totalSubtotal += itemSubtotal;
                totalTaxAmount += itemTax;

                transactionItems.push({
                    product_id: item.product_id || null,
                    spare_part_id: item.spare_part_id || null,
                    serial_number: item.serial_number || null,
                    quantity_changed: item.quantity || 1,
                    condition: item.condition || 'NEW',
                    unit_cost: item.unit_cost || 0,
                    total_value: itemSubtotal + itemTax,
                    to_location: { warehouse_id, bin_id },
                    new_inventory_level: itemResult.new_inventory_level,
                    notes: item.location_notes || null
                });
            }

            // Create transaction log
            await Transaction.create([{
                transaction_group_id: receiptId,
                receipt_id: receiptId,
                transaction_type: 'incoming',
                transaction_date: new Date(),
                warehouse_id,
                bin_id,
                supplier_id,
                invoice_id,
                po_id,
                user_id,
                notes,
                items: transactionItems,
                totals: {
                    subtotal: totalSubtotal,
                    tax_amount: totalTaxAmount,
                    total_amount: totalSubtotal + totalTaxAmount
                }
            }], { session });

            await session.commitTransaction();

            return {
                success: true,
                receipt_id: receiptId,
                receipt_type: 'incoming',
                items: processedItems,
                total_items: processedItems.length,
                warehouse_id,
                bin_id
            };
        } catch (err) {
            await session.abortTransaction();
            console.error('❌ CRITICAL: Inbound stock transaction failed:', err);
            throw new Error(`Inbound transaction failed: ${err.message}`);
        } finally {
            session.endSession();
        }
    }

    async _processInboundItem(session, receiptId, item, warehouseId, binId, userId, supplierId, itemSequence, notes, poId, invoiceId) {
        const {
            product_id = null,
            spare_part_id = null,
            quantity = 1,
            unit_cost = 0,
            tax_amount = 0,
            batch_no = null,
            serial_number = null,
            expiry_date = null,
            manufacture_date = null,
            warranty_expiry = null,
            condition = 'NEW',
            location_notes = null
        } = item;

        const sanitizedExpiry = this._sanitizeDate(expiry_date);
        const sanitizedWarranty = this._sanitizeDate(warranty_expiry);

        if (quantity > MAX_QUANTITY_PER_TRANSACTION) {
            throw new Error(`Quantity ${quantity} exceeds maximum of ${MAX_QUANTITY_PER_TRANSACTION} per transaction`);
        }

        // Check bin capacity
        if (binId) {
            await this._checkBinCapacity(binId, quantity);
        }

        const isSerialized = !!serial_number;
        const itemId = spare_part_id || product_id;
        const inventoryType = spare_part_id ? 'spare_part' : (isSerialized ? 'serialized' : 'bulk');

        if (isSerialized) {
            // Create individual serialized records
            const assets = [];
            for (let i = 0; i < quantity; i++) {
                const currentSerial = quantity === 1 ? serial_number : `${serial_number}-${i + 1}`;

                await Inventory.create([{
                    inventory_type: 'serialized',
                    product_id: product_id,
                    serial_number: currentSerial,
                    imei_1: currentSerial, // Often IMEI is used as serial
                    warehouse_id: warehouseId,
                    bin_id: binId,
                    status: 'available',
                    condition_grade: condition === 'NEW' ? 'A' : 'B',
                    supplier_id: supplierId,
                    import_invoice_id: invoiceId,
                    expiry_date: sanitizedExpiry,
                    notes: location_notes
                }], { session });

                assets.push({ serial_number: currentSerial });
            }

            return {
                type: 'serialized',
                item_id: itemSequence,
                product_id,
                quantity,
                assets,
                warehouse_id: warehouseId,
                bin_id: binId
            };
        } else if (spare_part_id) {
            // Spare parts - create individual tracked records
            const generatedUuids = [];
            for (let i = 0; i < quantity; i++) {
                const itemUUID = uuidv4();
                await Inventory.create([{
                    inventory_type: 'spare_part',
                    spare_part_id,
                    product_id: spare_part_id,
                    warehouse_id: warehouseId,
                    bin_id: binId,
                    quantity: 1,
                    condition,
                    batch_no,
                    expiry_date: sanitizedExpiry,
                    supplier_id: supplierId,
                    notes: location_notes,
                    last_movement_at: new Date(),
                    last_movement_type: 'incoming'
                }], { session });

                generatedUuids.push({ uuid: itemUUID });
            }

            return {
                type: 'spare_part',
                item_id: itemSequence,
                spare_part_id,
                quantity,
                warehouse_id: warehouseId,
                bin_id: binId,
                condition,
                generated_uuids: generatedUuids
            };
        } else {
            // Bulk goods - aggregate quantity
            const upsertResult = await Inventory.findOneAndUpdate(
                {
                    inventory_type: 'bulk',
                    product_id,
                    warehouse_id: warehouseId,
                    bin_id: binId || null,
                    condition
                },
                {
                    $inc: { quantity },
                    $set: {
                        last_movement_at: new Date(),
                        last_movement_type: 'incoming',
                        supplier_id: supplierId
                    },
                    $setOnInsert: {
                        min_stock_level: 0,
                        reserved_quantity: 0
                    }
                },
                { upsert: true, new: true, session }
            );

            return {
                type: 'bulk',
                item_id: itemSequence,
                product_id,
                quantity,
                warehouse_id: warehouseId,
                bin_id: binId,
                new_inventory_level: upsertResult.quantity
            };
        }
    }

    // =========================================================================
    // DISPENSE STOCK (Outbound)
    // =========================================================================

    async dispenseStock(outboundData) {
        const {
            items,
            warehouse_id,
            bin_id = null,
            user_id = 1,
            customer_name = null,
            customer_address = null,
            delivery_person = null,
            notes: _notes = null,
            po_id = null,
            invoice_id = null,
            customer_invoice = null
        } = outboundData;

        let extendedNotes = _notes || '';
        if (customer_invoice) {
            extendedNotes = (extendedNotes ? extendedNotes + '. ' : '') + `Customer Invoice: ${customer_invoice}`;
        }
        const userNotes = extendedNotes || null;

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new Error('At least one item is required');
        }
        if (!warehouse_id) throw new Error('Warehouse ID is required');

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const receiptId = await this._generateReceiptId('OUT');
            const processedItems = [];
            const transactionItems = [];
            let totalSubtotal = 0;
            let totalTaxAmount = 0;

            for (let idx = 0; idx < items.length; idx++) {
                const item = items[idx];
                const itemResult = await this._processOutboundItem(
                    session, receiptId, item, warehouse_id, bin_id, user_id,
                    idx + 1, po_id, invoice_id, customer_name, customer_address, delivery_person, userNotes
                );

                processedItems.push(itemResult);

                const itemSubtotal = this.roundCurrency((item.quantity || 1) * (item.unit_price || 0));
                const itemTax = this.roundCurrency(item.tax_amount || 0);
                totalSubtotal += itemSubtotal;
                totalTaxAmount += itemTax;

                transactionItems.push({
                    product_id: item.product_id || null,
                    spare_part_id: item.spare_part_id || null,
                    serial_number: item.serial_number || item.asset_id || null,
                    quantity_changed: -(item.quantity || 1),
                    condition: item.condition || 'NEW',
                    unit_cost: item.unit_price || 0,
                    total_value: itemSubtotal + itemTax,
                    from_location: { warehouse_id, bin_id },
                    new_inventory_level: itemResult.new_inventory_level,
                    notes: userNotes
                });
            }

            // Create transaction log
            await Transaction.create([{
                transaction_group_id: receiptId,
                receipt_id: receiptId,
                transaction_type: 'outgoing',
                transaction_date: new Date(),
                warehouse_id,
                bin_id,
                invoice_id,
                po_id,
                user_id,
                notes: userNotes,
                customer: {
                    name: customer_name,
                    address: customer_address
                },
                delivery_person,
                items: transactionItems,
                totals: {
                    subtotal: totalSubtotal,
                    tax_amount: totalTaxAmount,
                    total_amount: totalSubtotal + totalTaxAmount
                }
            }], { session });

            await session.commitTransaction();

            return {
                success: true,
                receipt_id: receiptId,
                receipt_type: 'outgoing',
                items: processedItems,
                total_items: processedItems.length,
                warehouse_id,
                bin_id,
                customer_name,
                customer_address
            };
        } catch (err) {
            await session.abortTransaction();
            console.error('❌ CRITICAL: Outbound stock transaction failed:', err);
            throw new Error(`Outbound transaction failed: ${err.message}`);
        } finally {
            session.endSession();
        }
    }

    async _processOutboundItem(session, receiptId, item, warehouseId, binId, userId, itemSequence, poId, invoiceId, customerName, customerAddress, deliveryPerson, notes) {
        const {
            product_id = null,
            spare_part_id = null,
            asset_id = null,
            serial_number = null,
            quantity = 1,
            unit_price = 0,
            condition = 'NEW'
        } = item;

        const itemId = spare_part_id || product_id;
        const isSerialized = !!(serial_number || asset_id);

        if (isSerialized) {
            // Find and mark serialized item as sold
            const query = { warehouse_id: warehouseId, status: 'available', inventory_type: 'serialized' };
            if (serial_number) query.$or = [{ serial_number }, { imei_1: serial_number }];
            if (product_id) query.product_id = product_id;

            const serialItem = await Inventory.findOne(query).session(session);
            if (!serialItem) {
                throw new InsufficientStockError(`Serialized item not available: ${serial_number || asset_id}`);
            }

            serialItem.status = 'sold';
            serialItem.last_movement_at = new Date();
            serialItem.last_movement_type = 'outgoing';
            await serialItem.save({ session });

            return {
                type: 'serialized',
                item_id: itemSequence,
                product_id: serialItem.product_id,
                serial_number: serialItem.serial_number,
                warehouse_id: warehouseId,
                bin_id: serialItem.bin_id,
                new_inventory_level: 0
            };
        } else if (spare_part_id) {
            // FIFO consumption for spare parts
            const availableParts = await Inventory.find({
                inventory_type: 'spare_part',
                spare_part_id,
                warehouse_id: warehouseId,
                quantity: { $gt: 0 }
            }).sort({ created_at: 1 }).session(session);

            let remaining = quantity;
            for (const part of availableParts) {
                if (remaining <= 0) break;
                const deduct = Math.min(part.quantity, remaining);
                part.quantity -= deduct;
                part.last_movement_at = new Date();
                part.last_movement_type = 'outgoing';
                await part.save({ session });
                remaining -= deduct;
            }

            if (remaining > 0) {
                throw new InsufficientStockError(`Insufficient spare parts: needed ${quantity}, short ${remaining}`);
            }

            const newLevel = await Inventory.aggregate([
                { $match: { spare_part_id, warehouse_id: warehouseId, inventory_type: 'spare_part' } },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]).session(session);

            return {
                type: 'spare_part',
                item_id: itemSequence,
                spare_part_id,
                quantity,
                warehouse_id: warehouseId,
                bin_id: binId,
                new_inventory_level: newLevel[0]?.total || 0
            };
        } else {
            // Bulk goods - deduct quantity
            const inventoryQuery = {
                inventory_type: 'bulk',
                product_id,
                warehouse_id: warehouseId,
                condition
            };
            if (binId) inventoryQuery.bin_id = binId;

            // FIFO approach
            const sources = await Inventory.find({ ...inventoryQuery, quantity: { $gt: 0 } })
                .sort({ created_at: 1 })
                .session(session);

            let remaining = quantity;
            for (const source of sources) {
                if (remaining <= 0) break;
                const deduct = Math.min(source.quantity, remaining);
                source.quantity -= deduct;
                source.last_movement_at = new Date();
                source.last_movement_type = 'outgoing';
                await source.save({ session });
                remaining -= deduct;
            }

            if (remaining > 0) {
                throw new InsufficientStockError(`Insufficient stock for product ${product_id}: needed ${quantity}, short ${remaining}`);
            }

            const newLevel = await Inventory.aggregate([
                { $match: { product_id, warehouse_id: warehouseId, inventory_type: 'bulk' } },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]).session(session);

            return {
                type: 'bulk',
                item_id: itemSequence,
                product_id,
                quantity,
                warehouse_id: warehouseId,
                bin_id: binId,
                new_inventory_level: newLevel[0]?.total || 0
            };
        }
    }

    // =========================================================================
    // ADJUSTMENT, RETURNS, TRANSFER
    // =========================================================================

    async adjustStock(adjustmentData) {
        const {
            product_id,
            spare_part_id,
            warehouse_id,
            bin_id = null,
            quantity_change,
            reason,
            user_id = 1
        } = adjustmentData;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const itemId = spare_part_id || product_id;
            const inventoryType = spare_part_id ? 'spare_part' : 'bulk';

            const result = await Inventory.findOneAndUpdate(
                {
                    inventory_type: inventoryType,
                    product_id: itemId,
                    warehouse_id,
                    bin_id: bin_id || null
                },
                {
                    $inc: { quantity: quantity_change },
                    $set: { last_movement_at: new Date(), last_movement_type: 'adjustment' }
                },
                { new: true, upsert: true, session }
            );

            await Transaction.create([{
                transaction_type: 'adjustment',
                transaction_date: new Date(),
                warehouse_id,
                bin_id,
                user_id,
                notes: reason,
                items: [{
                    product_id: spare_part_id ? null : product_id,
                    spare_part_id,
                    quantity_changed: quantity_change,
                    to_location: { warehouse_id, bin_id },
                    new_inventory_level: result.quantity
                }]
            }], { session });

            await session.commitTransaction();

            return {
                success: true,
                product_id: itemId,
                new_quantity: result.quantity,
                adjustment: quantity_change
            };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    async getInventoryLevel(productId, warehouseId = null, binId = null) {
        const query = { product_id: productId, inventory_type: 'bulk' };
        if (warehouseId) query.warehouse_id = warehouseId;
        if (binId) query.bin_id = binId;

        const result = await Inventory.aggregate([
            { $match: query },
            { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]);

        return result[0]?.total || 0;
    }

    async getTransactionLogs(filters = {}) {
        const { warehouse_id, product_id, transaction_type, start_date, end_date, limit = 100 } = filters;

        const query = {};
        if (warehouse_id) query.warehouse_id = warehouse_id;
        if (product_id) query['items.product_id'] = product_id;
        if (transaction_type) query.transaction_type = transaction_type;
        if (start_date) query.transaction_date = { $gte: new Date(start_date) };
        if (end_date) {
            query.transaction_date = query.transaction_date || {};
            query.transaction_date.$lte = new Date(end_date);
        }

        return Transaction.find(query)
            .sort({ transaction_date: -1 })
            .limit(parseInt(limit))
            .lean();
    }

    async getReceiptDetails(receiptId) {
        const txn = await Transaction.findOne({
            $or: [{ receipt_id: receiptId }, { transaction_group_id: receiptId }]
        }).lean();

        if (!txn) return null;

        // Enrich with product names
        const productIds = txn.items.map(i => i.product_id).filter(Boolean);
        const products = await Product.find({ product_id: { $in: productIds } }).lean();
        const productMap = {};
        products.forEach(p => { productMap[p.product_id] = p; });

        return {
            receipt_id: txn.receipt_id || txn.transaction_group_id,
            transaction_type: txn.transaction_type,
            transaction_date: txn.transaction_date,
            warehouse_id: txn.warehouse_id,
            supplier_id: txn.supplier_id,
            user_id: txn.user_id,
            notes: txn.notes,
            customer: txn.customer,
            items: txn.items.map(item => {
                const prod = productMap[item.product_id];
                return {
                    ...item,
                    product_name: prod?.device_name,
                    product_maker: prod?.device_maker
                };
            }),
            totals: txn.totals
        };
    }
}

module.exports = InventoryTransactionService;
