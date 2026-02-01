/**
 * DisposalService - Handles disposal bin management and item disposal (MongoDB Version)
 */

const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Warehouse = require('../models/Warehouse');
const Transaction = require('../models/Transaction');

class DisposalService {
    constructor(_pool) { }

    async getDisposalBins(warehouseId) {
        const warehouse = await Warehouse.findOne({ warehouse_id: warehouseId }).lean();
        if (!warehouse) return [];

        const disposalBins = [];
        (warehouse.zones || []).forEach(zone => {
            (zone.bins || []).forEach(bin => {
                if (bin.bin_type === 'hazmat' || bin.bin_type === 'DISPOSAL') {
                    disposalBins.push({
                        bin_id: bin.bin_id,
                        bin_code: bin.bin_code,
                        bin_type: bin.bin_type,
                        zone_id: zone.zone_id,
                        zone_name: zone.name,
                        warehouse_id: warehouseId
                    });
                }
            });
        });
        return disposalBins;
    }

    async getDisposalItems(binId) {
        return await Inventory.find({ bin_id: binId, status: { $ne: 'DISPOSED' } }).lean();
    }

    async processDisposal(binId, userId, notes = null) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get items in this bin
            const items = await Inventory.find({
                bin_id: binId,
                status: { $ne: 'DISPOSED' }
            }).session(session).lean();

            if (!items.length) {
                await session.abortTransaction();
                return { success: true, items_disposed: 0, message: 'No items to dispose' };
            }

            const warehouseId = items[0]?.warehouse_id;
            let totalDisposed = 0;
            const disposedItems = [];

            for (const item of items) {
                const qty = item.quantity || 1;
                totalDisposed += qty;
                disposedItems.push({ product_id: item.product_id, quantity: qty });

                // Mark as disposed and set quantity to 0
                await Inventory.updateOne(
                    { _id: item._id },
                    { $set: { status: 'DISPOSED', quantity: 0 } }
                ).session(session);
            }

            // Log disposal transaction
            await Transaction.create([{
                transaction_type: 'disposal',
                transaction_date: new Date(),
                warehouse_id: warehouseId,
                user_id: userId,
                notes: notes || `Disposed ${totalDisposed} items from bin ${binId}`,
                items: disposedItems.map(d => ({
                    product_id: d.product_id,
                    quantity_changed: -d.quantity,
                    from_location: { bin_id: binId }
                }))
            }], { session });

            await session.commitTransaction();

            return {
                success: true,
                message: 'Disposal processed successfully',
                items_disposed: totalDisposed,
                disposed_items: disposedItems
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async getDisposalZone(warehouseId) {
        return null; // Deprecated
    }

    async getPendingDisposal() {
        const items = await Inventory.find({
            status: 'PENDING_DISPOSAL'
        }).lean();

        // Enrich with warehouse names
        const warehouseIds = [...new Set(items.map(i => i.warehouse_id).filter(Boolean))];
        const warehouses = await Warehouse.find({ warehouse_id: { $in: warehouseIds } }).lean();
        const whMap = {};
        warehouses.forEach(w => { whMap[w.warehouse_id] = w.name; });

        return items.map(i => ({
            ...i,
            id: i._id,
            warehouse_name: whMap[i.warehouse_id] || 'Unknown'
        }));
    }

    async getDisposalHistory(filters = {}) {
        const query = { transaction_type: 'disposal' };

        if (filters.startDate) query.transaction_date = { $gte: new Date(filters.startDate) };
        if (filters.endDate) {
            query.transaction_date = query.transaction_date || {};
            query.transaction_date.$lte = new Date(filters.endDate);
        }

        const txns = await Transaction.find(query)
            .sort({ transaction_date: -1 })
            .limit(filters.limit || 100)
            .skip(filters.offset || 0)
            .lean();

        return txns;
    }

    async markItemAsDisposed(itemId, userId, notes = null) {
        await Inventory.updateOne(
            { _id: itemId },
            { $set: { status: 'DISPOSED' } }
        );
        return { success: true, message: 'Item marked as disposed' };
    }

    async createDisposalZone(warehouseId, name, description) {
        throw new Error('Disposal zones retired. Use bin-based disposal with bin_type=DISPOSAL instead.');
    }
}

module.exports = DisposalService;
