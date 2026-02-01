/**
 * StocktakeService - Manual Stocktake CRUD Operations (MongoDB Version)
 * UC-10: Inventory Counting/Stocktake
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Stocktake schema (inline)
const StocktakeSchema = new mongoose.Schema({
  stocktake_id: { type: Number, unique: true, index: true },
  stocktake_number: { type: String, unique: true, index: true },
  warehouse_id: { type: String, index: true },
  count_type: { type: String, enum: ['full', 'cycle', 'partial'], default: 'full' },
  status: {
    type: String,
    enum: ['PLANNED', 'DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'CANCELLED'],
    default: 'DRAFT',
    index: true
  },
  scheduled_date: Date,
  started_at: Date,
  completed_at: Date,
  notes: String,
  initiated_by: Number,
  items: [{
    item_id: { type: Number, index: true },
    product_id: String,
    bin_location: String,
    system_quantity: Number,
    counted_quantity: Number,
    variance: Number,
    counted_by: Number,
    counted_at: Date,
    notes: String
  }]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'stocktakes'
});

StocktakeSchema.pre('save', async function (next) {
  if (this.isNew && !this.stocktake_id) {
    const last = await this.constructor.findOne().sort({ stocktake_id: -1 });
    this.stocktake_id = (last?.stocktake_id || 0) + 1;
  }
  // Auto-increment item_ids
  if (this.items) {
    let maxItemId = 0;
    this.items.forEach(i => { if (i.item_id > maxItemId) maxItemId = i.item_id; });
    this.items.forEach(i => {
      if (!i.item_id) i.item_id = ++maxItemId;
    });
  }
  next();
});

const Stocktake = mongoose.models.Stocktake || mongoose.model('Stocktake', StocktakeSchema);

class StocktakeService {
  constructor(_pool = null) { }

  static setPool(_pool) { }
  static getPool() { return null; }

  static generateStocktakeNumber() {
    const date = new Date();
    const prefix = `STK-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `${prefix}-${uuidv4().substring(0, 8).toUpperCase()}`;
  }

  // =========================================================================
  // STOCKTAKE CRUD
  // =========================================================================

  static async createStocktake(data) {
    const Inventory = require('../models/Inventory');
    const Product = require('../models/Product');

    const { warehouse_id, count_type = 'full', scheduled_date, notes, initiated_by = 1, items = [] } = data;

    // If no items and full count, get all warehouse inventory
    let stocktakeItems = items;
    if (items.length === 0 && count_type === 'full' && warehouse_id) {
      const inventory = await Inventory.aggregate([
        { $match: { warehouse_id, quantity: { $gt: 0 } } },
        { $group: { _id: '$product_id', total: { $sum: '$quantity' } } }
      ]);

      stocktakeItems = inventory.map(i => ({
        product_id: i._id,
        system_quantity: i.total,
        counted_quantity: null
      }));
    }

    const stocktake = await Stocktake.create({
      stocktake_number: this.generateStocktakeNumber(),
      warehouse_id,
      count_type,
      status: 'DRAFT',
      scheduled_date: scheduled_date ? new Date(scheduled_date) : null,
      notes,
      initiated_by,
      items: stocktakeItems.map((item, idx) => ({
        item_id: idx + 1,
        product_id: item.product_id,
        bin_location: item.bin_location,
        system_quantity: item.system_quantity || 0,
        counted_quantity: item.counted_quantity,
        variance: null,
        notes: item.notes
      }))
    });

    return this.getStocktakeById(stocktake.stocktake_id);
  }

  static async getStocktakeById(stocktake_id) {
    const stocktake = await Stocktake.findOne({ stocktake_id }).lean();
    if (!stocktake) return null;

    const Warehouse = require('../models/Warehouse');
    const warehouse = stocktake.warehouse_id
      ? await Warehouse.findOne({ warehouse_id: stocktake.warehouse_id }).lean()
      : null;

    return {
      ...stocktake,
      id: stocktake.stocktake_id,
      warehouse_name: warehouse?.name
    };
  }

  static async listStocktakes(filters = {}) {
    const query = {};
    if (filters.warehouse_id) query.warehouse_id = filters.warehouse_id;
    if (filters.status) query.status = filters.status;
    if (filters.count_type) query.count_type = filters.count_type;

    const stocktakes = await Stocktake.find(query)
      .sort({ created_at: -1 })
      .limit(filters.limit || 100)
      .lean();

    const Warehouse = require('../models/Warehouse');
    const warehouseIds = [...new Set(stocktakes.map(s => s.warehouse_id).filter(Boolean))];
    const warehouses = await Warehouse.find({ warehouse_id: { $in: warehouseIds } }).lean();
    const whMap = {};
    warehouses.forEach(w => { whMap[w.warehouse_id] = w.name; });

    return stocktakes.map(s => ({
      id: s.stocktake_id,
      stocktake_id: s.stocktake_id,
      stocktake_number: s.stocktake_number,
      warehouse_id: s.warehouse_id,
      warehouse_name: whMap[s.warehouse_id] || 'Unknown',
      count_type: s.count_type,
      status: s.status,
      started_at: s.started_at,
      completed_at: s.completed_at,
      item_count: s.items?.length || 0,
      created_at: s.created_at
    }));
  }

  static async updateStocktake(stocktake_id, data) {
    const stocktake = await Stocktake.findOne({ stocktake_id });
    if (!stocktake) return { success: false, error: 'Stocktake not found' };

    ['warehouse_id', 'count_type', 'scheduled_date', 'notes'].forEach(f => {
      if (data[f] !== undefined) stocktake[f] = data[f];
    });

    await stocktake.save();
    return { success: true };
  }

  static async deleteStocktake(stocktake_id) {
    const result = await Stocktake.deleteOne({ stocktake_id });
    return result.deletedCount > 0;
  }

  // =========================================================================
  // STOCKTAKE ITEMS
  // =========================================================================

  static async clearItems(stocktake_id) {
    await Stocktake.updateOne({ stocktake_id }, { $set: { items: [] } });
    return { success: true };
  }

  static async addItem(stocktake_id, item) {
    const stocktake = await Stocktake.findOne({ stocktake_id });
    if (!stocktake) throw new Error('Stocktake not found');

    const maxId = stocktake.items.reduce((max, i) => Math.max(max, i.item_id || 0), 0);

    stocktake.items.push({
      item_id: maxId + 1,
      product_id: item.product_id,
      bin_location: item.bin_location,
      system_quantity: item.system_quantity || 0,
      counted_quantity: item.counted_quantity,
      notes: item.notes
    });

    await stocktake.save();
    return stocktake.items[stocktake.items.length - 1];
  }

  static async updateItem(item_id, data) {
    const stocktake = await Stocktake.findOne({ 'items.item_id': item_id });
    if (!stocktake) throw new Error('Item not found');

    const item = stocktake.items.find(i => i.item_id === item_id);
    if (!item) throw new Error('Item not found');

    if (data.counted_quantity !== undefined) {
      item.counted_quantity = data.counted_quantity;
      item.variance = data.counted_quantity - (item.system_quantity || 0);
    }
    if (data.counted_by !== undefined) item.counted_by = data.counted_by;
    if (data.notes !== undefined) item.notes = data.notes;
    item.counted_at = new Date();

    await stocktake.save();
    return item;
  }

  static async deleteItem(item_id) {
    const result = await Stocktake.updateOne(
      { 'items.item_id': item_id },
      { $pull: { items: { item_id } } }
    );
    return result.modifiedCount > 0;
  }

  // =========================================================================
  // STATUS MANAGEMENT
  // =========================================================================

  static async updateStatus(stocktake_id, new_status, user_id, notes = null) {
    const stocktake = await Stocktake.findOne({ stocktake_id });
    if (!stocktake) return { success: false, error: 'Stocktake not found' };

    const oldStatus = stocktake.status;
    stocktake.status = new_status;

    if (new_status === 'IN_PROGRESS' && !stocktake.started_at) {
      stocktake.started_at = new Date();
    }
    if (new_status === 'COMPLETED' || new_status === 'APPROVED') {
      stocktake.completed_at = new Date();
    }
    if (notes) {
      stocktake.notes = (stocktake.notes || '') + `\n[${new Date().toISOString()}] ${oldStatus} → ${new_status}: ${notes}`;
    }

    await stocktake.save();
    return this.getStocktakeById(stocktake_id);
  }

  // =========================================================================
  // STATISTICS
  // =========================================================================

  static async getStats(stocktake_id) {
    const stocktake = await Stocktake.findOne({ stocktake_id }).lean();
    if (!stocktake) return null;

    const items = stocktake.items || [];
    const totalItems = items.length;
    const countedItems = items.filter(i => i.counted_quantity !== null && i.counted_quantity !== undefined).length;
    const totalVariance = items.reduce((sum, i) => sum + Math.abs(i.variance || 0), 0);

    return {
      stocktake_id,
      total_items: totalItems,
      counted_items: countedItems,
      pending_items: totalItems - countedItems,
      completion_percentage: totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0,
      total_variance: totalVariance
    };
  }

  // =========================================================================
  // HELPER METHODS FOR ROUTES
  // =========================================================================

  static async getAccuracyStats() {
    const completed = await Stocktake.find({ status: 'COMPLETED' })
      .sort({ completed_at: -1 })
      .limit(10)
      .lean();

    if (completed.length === 0) return [];

    return completed.map(s => {
      const items = s.items || [];
      const totalItems = items.length;
      const matchedItems = items.filter(i => i.counted_quantity === i.system_quantity).length;
      const accuracy = totalItems > 0 ? ((matchedItems / totalItems) * 100).toFixed(2) : 0;

      return {
        warehouse_id: s.warehouse_id,
        stocktake_id: s.stocktake_id,
        accuracy_percentage: parseFloat(accuracy),
        total_items: totalItems,
        matched_items: matchedItems
      };
    });
  }

  static async getDueItems(filters = {}) {
    const Inventory = require('../models/Inventory');
    const match = {};
    if (filters.warehouse_id) match.warehouse_id = filters.warehouse_id;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const inventory = await Inventory.find({
      ...match,
      $or: [
        { last_count_date: { $lt: cutoffDate } },
        { last_count_date: { $exists: false } }
      ]
    }).limit(filters.limit || 50).lean();

    return inventory.map(i => ({
      product_id: i.product_id,
      warehouse_id: i.warehouse_id,
      quantity: i.quantity,
      last_count_date: i.last_count_date,
      days_since_count: i.last_count_date
        ? Math.floor((new Date() - new Date(i.last_count_date)) / (1000 * 60 * 60 * 24))
        : 'Never'
    }));
  }

  static async getWarehouseProducts(filters = {}) {
    const Inventory = require('../models/Inventory');
    const Product = require('../models/Product');

    const inventory = await Inventory.aggregate([
      { $match: { warehouse_id: filters.warehouse_id, quantity: { $gt: 0 } } },
      { $group: { _id: '$product_id', total: { $sum: '$quantity' } } }
    ]);

    const productIds = inventory.map(i => i._id);
    let products = await Product.find({ product_id: { $in: productIds } }).lean();

    if (filters.search) {
      const search = filters.search.toLowerCase();
      products = products.filter(p =>
        p.device_name?.toLowerCase().includes(search) ||
        p.device_maker?.toLowerCase().includes(search)
      );
    }

    const invMap = {};
    inventory.forEach(i => { invMap[i._id] = i.total; });

    return products.map(p => ({
      product_id: p.product_id,
      device_name: p.device_name,
      device_maker: p.device_maker,
      system_quantity: invMap[p.product_id] || 0,
      warehouse_id: filters.warehouse_id
    }));
  }

  static async createCycleCount(data) {
    const dueItems = await this.getDueItems({
      warehouse_id: data.warehouse_id,
      limit: data.limit || 50
    });

    return this.createStocktake({
      warehouse_id: data.warehouse_id,
      count_type: 'cycle',
      initiated_by: data.initiated_by || 1,
      notes: data.notes,
      items: dueItems.map(item => ({
        product_id: item.product_id,
        system_quantity: item.quantity,
        notes: `Days since count: ${item.days_since_count}`
      }))
    });
  }
}

module.exports = StocktakeService;
