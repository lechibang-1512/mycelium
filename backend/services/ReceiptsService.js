/**
 * Receipts Service (MongoDB Version)
 * Handles receipt queries and CRUD operations
 */

const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');

class ReceiptsService {
    constructor(_pool) { }

    async getReceiptsList(filters = {}) {
        const match = {};
        if (filters.transaction_type) match.transaction_type = filters.transaction_type;
        if (filters.warehouse_id) match.warehouse_id = filters.warehouse_id;
        if (filters.start_date) match.transaction_date = { $gte: new Date(filters.start_date) };
        if (filters.end_date) {
            match.transaction_date = match.transaction_date || {};
            match.transaction_date.$lte = new Date(filters.end_date);
        }

        const transactions = await Transaction.find(match)
            .sort({ transaction_date: -1 })
            .limit(filters.limit || 100)
            .lean();

        return transactions.map(t => ({
            transaction_id: t._id,
            transaction_type: t.transaction_type,
            transaction_date: t.transaction_date,
            warehouse_id: t.warehouse_id,
            reference_id: t.reference_id,
            reference_type: t.reference_type,
            notes: t.notes,
            total_amount: t.total_amount,
            item_count: t.items?.length || 0
        }));
    }

    async getPhones() {
        const products = await Product.find({
            device_type: { $in: ['smartphone', 'phone', 'tablet'] },
            is_active: { $ne: false }
        }).select('product_id device_name device_maker sku').lean();

        return products;
    }

    async getReceiptDetail(receiptId) {
        const transaction = await Transaction.findById(receiptId).lean();
        if (!transaction) return null;

        // Enrich items with product details
        const productIds = transaction.items?.map(i => i.product_id) || [];
        const products = await Product.find({ product_id: { $in: productIds } }).lean();
        const prodMap = {};
        products.forEach(p => { prodMap[p.product_id] = p; });

        return {
            transaction_id: transaction._id,
            transaction_type: transaction.transaction_type,
            transaction_date: transaction.transaction_date,
            warehouse_id: transaction.warehouse_id,
            reference_id: transaction.reference_id,
            notes: transaction.notes,
            total_amount: transaction.total_amount,
            items: transaction.items?.map(i => ({
                ...i,
                product_name: prodMap[i.product_id]?.device_name,
                sku: prodMap[i.product_id]?.sku
            })) || []
        };
    }

    async getAllReceipts(filters = {}) {
        return this.getReceiptsList(filters);
    }

    async getReceiptById(receiptId) {
        return this.getReceiptDetail(receiptId);
    }

    async createReceipt(receiptData) {
        const transaction = await Transaction.create({
            transaction_type: receiptData.transaction_type || 'general',
            transaction_date: new Date(),
            warehouse_id: receiptData.warehouse_id,
            reference_type: receiptData.reference_type,
            reference_id: receiptData.reference_id,
            notes: receiptData.notes,
            user_id: receiptData.user_id,
            items: receiptData.items?.map(item => ({
                product_id: item.product_id,
                quantity_changed: item.quantity || item.quantity_changed,
                unit_price: item.unit_price,
                from_location: item.from_location,
                to_location: item.to_location
            })) || [],
            total_amount: receiptData.total_amount || 0
        });

        return {
            receipt_id: transaction._id,
            success: true
        };
    }

    async deleteReceipt(receiptId) {
        const result = await Transaction.deleteOne({ _id: receiptId });
        return { success: result.deletedCount > 0 };
    }

    async getAnalytics(filters = {}) {
        const match = {};
        if (filters.start_date) match.transaction_date = { $gte: new Date(filters.start_date) };
        if (filters.end_date) {
            match.transaction_date = match.transaction_date || {};
            match.transaction_date.$lte = new Date(filters.end_date);
        }

        const [byType, byDay, summary] = await Promise.all([
            Transaction.aggregate([
                { $match: match },
                { $group: { _id: '$transaction_type', count: { $sum: 1 }, total: { $sum: '$total_amount' } } }
            ]),
            Transaction.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$transaction_date' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Transaction.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        total_transactions: { $sum: 1 },
                        total_value: { $sum: '$total_amount' },
                        avg_value: { $avg: '$total_amount' }
                    }
                }
            ])
        ]);

        return {
            byType: byType.map(t => ({ type: t._id, count: t.count, total: t.total })),
            byDay,
            summary: summary[0] || { total_transactions: 0, total_value: 0, avg_value: 0 }
        };
    }

    async getStockIn(filters = {}) {
        return this.getReceiptsList({
            ...filters,
            transaction_type: { $in: ['purchase_receive', 'receive', 'incoming', 'transfer_in'] }
        });
    }

    async getStockOut(filters = {}) {
        return this.getReceiptsList({
            ...filters,
            transaction_type: { $in: ['sale', 'dispense', 'outgoing', 'transfer_out'] }
        });
    }
}

module.exports = ReceiptsService;
