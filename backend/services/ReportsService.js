/**
 * Reports Service (MongoDB Version)
 * Handles various reporting queries for inventory, transactions, and analytics
 */

const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const Warehouse = require('../models/Warehouse');

class ReportsService {
    constructor(_pool) { }

    async getProducts() {
        const products = await Product.find({ is_active: { $ne: false } })
            .sort({ device_name: 1 })
            .lean();

        const productIds = products.map(p => p.product_id);
        const invAgg = await Inventory.aggregate([
            { $match: { product_id: { $in: productIds } } },
            { $group: { _id: '$product_id', total: { $sum: '$quantity' } } }
        ]);

        const invMap = {};
        invAgg.forEach(i => { invMap[i._id] = i.total; });

        return products.map(p => ({
            product_id: p.product_id,
            device_name: p.device_name,
            device_maker: p.device_maker,
            sku: p.sku,
            device_type: p.device_type,
            total_stock: invMap[p.product_id] || 0
        }));
    }

    async getInventoryReport(filters = {}) {
        const match = {};
        if (filters.warehouse_id) match.warehouse_id = filters.warehouse_id;
        if (filters.product_id) match.product_id = filters.product_id;

        const inventory = await Inventory.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { product_id: '$product_id', warehouse_id: '$warehouse_id' },
                    quantity: { $sum: '$quantity' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const productIds = [...new Set(inventory.map(i => i._id.product_id))];
        const warehouseIds = [...new Set(inventory.map(i => i._id.warehouse_id).filter(Boolean))];

        const [products, warehouses] = await Promise.all([
            Product.find({ product_id: { $in: productIds } }).lean(),
            Warehouse.find({ warehouse_id: { $in: warehouseIds } }).lean()
        ]);

        const prodMap = {};
        products.forEach(p => { prodMap[p.product_id] = p; });
        const whMap = {};
        warehouses.forEach(w => { whMap[w.warehouse_id] = w.name; });

        return inventory.map(i => ({
            product_id: i._id.product_id,
            product_name: prodMap[i._id.product_id]?.device_name || 'Unknown',
            sku: prodMap[i._id.product_id]?.sku,
            warehouse_id: i._id.warehouse_id,
            warehouse_name: whMap[i._id.warehouse_id] || 'Unknown',
            quantity: i.quantity,
            record_count: i.count
        }));
    }

    async getTransactionsReport(filters = {}) {
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
            .limit(filters.limit || 500)
            .skip(filters.offset || 0)
            .lean();

        return transactions;
    }

    async getStockValuation(filters = {}) {
        const match = {};
        if (filters.warehouse_id) match.warehouse_id = filters.warehouse_id;

        const valuation = await Inventory.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$warehouse_id',
                    total_quantity: { $sum: '$quantity' },
                    total_value: { $sum: { $multiply: ['$quantity', { $ifNull: ['$cost_price', 0] }] } }
                }
            }
        ]);

        const warehouseIds = valuation.map(v => v._id).filter(Boolean);
        const warehouses = await Warehouse.find({ warehouse_id: { $in: warehouseIds } }).lean();
        const whMap = {};
        warehouses.forEach(w => { whMap[w.warehouse_id] = w.name; });

        const byWarehouse = valuation.map(v => ({
            warehouse_id: v._id,
            warehouse_name: whMap[v._id] || 'Unknown',
            total_quantity: v.total_quantity,
            total_value: v.total_value
        }));

        return {
            byWarehouse,
            grandTotal: byWarehouse.reduce((sum, w) => sum + w.total_value, 0),
            totalQuantity: byWarehouse.reduce((sum, w) => sum + w.total_quantity, 0)
        };
    }

    async getSalesReport(period = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);

        const sales = await Transaction.aggregate([
            {
                $match: {
                    transaction_type: { $in: ['sale', 'dispense', 'outgoing'] },
                    transaction_date: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$transaction_date' } },
                    count: { $sum: 1 },
                    total: { $sum: '$total_amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return {
            period,
            data: sales,
            summary: {
                total_transactions: sales.reduce((sum, s) => sum + s.count, 0),
                total_revenue: sales.reduce((sum, s) => sum + (s.total || 0), 0)
            }
        };
    }

    async getAgingReport() {
        const now = new Date();
        const aging = await Inventory.aggregate([
            { $match: { quantity: { $gt: 0 } } },
            {
                $project: {
                    product_id: 1,
                    quantity: 1,
                    age_days: {
                        $divide: [{ $subtract: [now, '$created_at'] }, 1000 * 60 * 60 * 24]
                    }
                }
            },
            {
                $bucket: {
                    groupBy: '$age_days',
                    boundaries: [0, 30, 60, 90, 180, 365, Infinity],
                    default: 'over_365',
                    output: { count: { $sum: 1 }, total_quantity: { $sum: '$quantity' } }
                }
            }
        ]);

        return aging;
    }

    async getMovementSummary(filters = {}) {
        const match = {};
        if (filters.start_date) match.transaction_date = { $gte: new Date(filters.start_date) };
        if (filters.end_date) {
            match.transaction_date = match.transaction_date || {};
            match.transaction_date.$lte = new Date(filters.end_date);
        }

        const movements = await Transaction.aggregate([
            { $match: match },
            { $group: { _id: '$transaction_type', count: { $sum: 1 } } }
        ]);

        const summary = {};
        movements.forEach(m => { summary[m._id] = m.count; });
        return summary;
    }

    async getLowStock() {
        const products = await Product.find({
            is_active: { $ne: false },
            min_stock_level: { $gt: 0 }
        }).lean();

        const lowStock = [];
        for (const product of products) {
            const inv = await Inventory.aggregate([
                { $match: { product_id: product.product_id } },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]);
            const totalQty = inv[0]?.total || 0;

            if (totalQty <= product.min_stock_level) {
                lowStock.push({
                    product_id: product.product_id,
                    product_name: product.device_name,
                    sku: product.sku,
                    current_stock: totalQty,
                    min_stock_level: product.min_stock_level,
                    shortage: product.min_stock_level - totalQty
                });
            }
        }

        return lowStock.sort((a, b) => b.shortage - a.shortage);
    }
}

module.exports = ReportsService;
