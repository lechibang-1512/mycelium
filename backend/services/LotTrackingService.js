/**
 * Lot Tracking Service (MongoDB Version)
 * Handles lot generation, tracking, and FIFO selection for inventory
 */

const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');

class LotTrackingService {
    constructor(_pool) { }

    async generateLotId(supplierId = null, invoiceId = null) {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const supplierPart = supplierId ? String(supplierId).padStart(4, '0') : '0000';

        // Count lots generated today
        const todayStart = new Date(date.setHours(0, 0, 0, 0));
        const count = await Inventory.countDocuments({
            lot_id: new RegExp(`^LOT-${dateStr}`),
            created_at: { $gte: todayStart }
        });

        return `LOT-${dateStr}-${supplierPart}-${String(count + 1).padStart(4, '0')}`;
    }

    async getLotHistory(lotId) {
        // Get inventory items with this lot
        const inventoryItems = await Inventory.find({ lot_id: lotId }).lean();

        // Get transactions involving this lot
        const transactions = await Transaction.find({
            'items.lot_id': lotId
        }).sort({ transaction_date: 1 }).lean();

        // Calculate summary
        let totalReceived = 0;
        let totalDispensed = 0;

        transactions.forEach(txn => {
            txn.items?.forEach(item => {
                if (item.lot_id === lotId) {
                    if (['purchase_receive', 'receive', 'incoming'].includes(txn.transaction_type)) {
                        totalReceived += item.quantity_changed || 0;
                    } else if (['sale', 'dispense', 'outgoing'].includes(txn.transaction_type)) {
                        totalDispensed += Math.abs(item.quantity_changed || 0);
                    }
                }
            });
        });

        const currentQuantity = inventoryItems.reduce((sum, i) => sum + (i.quantity || 0), 0);

        return {
            lot_id: lotId,
            inventory_items: inventoryItems,
            transactions: transactions.map(t => ({
                transaction_id: t._id,
                type: t.transaction_type,
                date: t.transaction_date,
                quantity: t.items?.find(i => i.lot_id === lotId)?.quantity_changed || 0
            })),
            summary: {
                total_received: totalReceived,
                total_dispensed: totalDispensed,
                current_quantity: currentQuantity
            }
        };
    }

    async getLotInventory(lotId) {
        const inventory = await Inventory.aggregate([
            { $match: { lot_id: lotId } },
            {
                $group: {
                    _id: { product_id: '$product_id', warehouse_id: '$warehouse_id' },
                    quantity: { $sum: '$quantity' },
                    items: { $push: '$$ROOT' }
                }
            }
        ]);

        return {
            lot_id: lotId,
            inventory: inventory.map(i => ({
                product_id: i._id.product_id,
                warehouse_id: i._id.warehouse_id,
                quantity: i.quantity,
                items: i.items
            }))
        };
    }

    async getFIFOLots(productId, warehouseId, quantityNeeded) {
        // Get lots sorted by oldest first (FIFO)
        const inventory = await Inventory.find({
            product_id: productId,
            warehouse_id: warehouseId,
            quantity: { $gt: 0 },
            lot_id: { $exists: true, $ne: null }
        })
            .sort({ created_at: 1 }) // Oldest first for FIFO
            .lean();

        const lotsToUse = [];
        let remaining = quantityNeeded;

        for (const inv of inventory) {
            if (remaining <= 0) break;

            const useQty = Math.min(inv.quantity, remaining);
            lotsToUse.push({
                lot_id: inv.lot_id,
                inventory_id: inv._id,
                available_quantity: inv.quantity,
                quantity_to_use: useQty,
                created_at: inv.created_at
            });
            remaining -= useQty;
        }

        return {
            product_id: productId,
            warehouse_id: warehouseId,
            quantity_requested: quantityNeeded,
            quantity_fulfilled: quantityNeeded - remaining,
            lots: lotsToUse
        };
    }

    async listLots(filters = {}) {
        const match = { lot_id: { $exists: true, $ne: null } };

        if (filters.product_id) match.product_id = filters.product_id;
        if (filters.warehouse_id) match.warehouse_id = filters.warehouse_id;
        if (filters.lot_id) match.lot_id = new RegExp(filters.lot_id, 'i');

        const lots = await Inventory.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$lot_id',
                    product_ids: { $addToSet: '$product_id' },
                    warehouse_ids: { $addToSet: '$warehouse_id' },
                    total_quantity: { $sum: '$quantity' },
                    item_count: { $sum: 1 },
                    oldest_item: { $min: '$created_at' },
                    newest_item: { $max: '$created_at' }
                }
            },
            { $sort: { oldest_item: -1 } },
            { $limit: filters.limit || 100 }
        ]);

        return lots.map(l => ({
            lot_id: l._id,
            product_count: l.product_ids.length,
            warehouse_count: l.warehouse_ids.length,
            total_quantity: l.total_quantity,
            item_count: l.item_count,
            created_at: l.oldest_item,
            last_updated: l.newest_item
        }));
    }
}

module.exports = LotTrackingService;
