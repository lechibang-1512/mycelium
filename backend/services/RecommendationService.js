/**
 * Recommendation Service (MongoDB Version)
 * Generates reorder recommendations based on inventory analysis
 */

const mongoose = require('mongoose');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const Warehouse = require('../models/Warehouse');

// Service level Z-scores for safety stock calculation
const SERVICE_LEVEL_ZSCORE = { 90: 1.28, 95: 1.65, 98: 2.05, 99: 2.33 };

// Recommendation schema (inline)
const ReorderRecommendationSchema = new mongoose.Schema({
  recommendation_id: { type: Number, unique: true, index: true },
  product_id: { type: String, index: true },
  warehouse_id: String,
  current_stock: Number,
  reorder_point: Number,
  recommended_quantity: Number,
  urgency: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  reason: String,
  status: { type: String, enum: ['PENDING', 'APPROVED', 'ORDERED', 'DISMISSED'], default: 'PENDING', index: true },
  estimated_stockout_date: Date,
  avg_daily_usage: Number,
  lead_time_days: Number,
  approved_by: Number,
  approved_at: Date
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'reorder_recommendations'
});

const ReorderRecommendation = mongoose.models.ReorderRecommendation ||
  mongoose.model('ReorderRecommendation', ReorderRecommendationSchema);

class RecommendationService {
  static setPool(_pool) { }
  static getPool() { return null; }

  static async calculateDemandVariability(product_id, warehouse_id = null, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const match = {
      'items.product_id': product_id,
      transaction_type: { $in: ['sale', 'dispense', 'outgoing'] },
      transaction_date: { $gte: startDate }
    };
    if (warehouse_id) match.warehouse_id = warehouse_id;

    const txns = await Transaction.find(match).lean();

    const dailyUsage = {};
    txns.forEach(t => {
      const day = t.transaction_date.toISOString().slice(0, 10);
      t.items?.forEach(i => {
        if (i.product_id === product_id) {
          dailyUsage[day] = (dailyUsage[day] || 0) + Math.abs(i.quantity_changed || 0);
        }
      });
    });

    const values = Object.values(dailyUsage);
    if (values.length === 0) return { avg: 0, stdDev: 0 };

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;

    return { avg, stdDev: Math.sqrt(variance) };
  }

  static calculateDynamicSafetyStock(params) {
    const { stdDev = 0, leadTimeDays = 7, serviceLevel = 95 } = params;
    const z = SERVICE_LEVEL_ZSCORE[serviceLevel] || 1.65;
    return Math.ceil(z * stdDev * Math.sqrt(leadTimeDays));
  }

  static async calculateAverageDailyUsage(product_id, warehouse_id = null, days = 30) {
    const { avg } = await this.calculateDemandVariability(product_id, warehouse_id, days);
    return avg;
  }

  static calculateReorderPoint(params) {
    const { avgDailyUsage = 0, leadTimeDays = 7, safetyStock = 0 } = params;
    return Math.ceil(avgDailyUsage * leadTimeDays + safetyStock);
  }

  static calculateReorderQuantity(params) {
    const { avgDailyUsage = 0, leadTimeDays = 7, bufferDays = 14 } = params;
    return Math.ceil(avgDailyUsage * (leadTimeDays + bufferDays));
  }

  static determineUrgencyLevel(currentStock, reorderPoint, avgDailyUsage) {
    if (currentStock <= 0) return 'CRITICAL';
    if (avgDailyUsage > 0) {
      const daysLeft = currentStock / avgDailyUsage;
      if (daysLeft <= 3) return 'CRITICAL';
      if (daysLeft <= 7) return 'HIGH';
    }
    if (currentStock <= reorderPoint * 0.5) return 'HIGH';
    if (currentStock <= reorderPoint) return 'MEDIUM';
    return 'LOW';
  }

  static estimateStockoutDate(currentStock, avgDailyUsage) {
    if (avgDailyUsage <= 0) return null;
    const daysUntilStockout = Math.floor(currentStock / avgDailyUsage);
    const date = new Date();
    date.setDate(date.getDate() + daysUntilStockout);
    return date;
  }

  static async generateRecommendations(options = {}) {
    const { warehouse_id, min_urgency = 'LOW' } = options;
    const recommendations = [];

    // Get products with min stock levels
    const products = await Product.find({
      is_active: { $ne: false },
      min_stock_level: { $gt: 0 }
    }).lean();

    for (const product of products) {
      // Get current stock
      const invMatch = { product_id: product.product_id };
      if (warehouse_id) invMatch.warehouse_id = warehouse_id;

      const inv = await Inventory.aggregate([
        { $match: invMatch },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]);
      const currentStock = inv[0]?.total || 0;

      // Calculate metrics
      const avgDailyUsage = await this.calculateAverageDailyUsage(product.product_id, warehouse_id);
      const { stdDev } = await this.calculateDemandVariability(product.product_id, warehouse_id);
      const leadTimeDays = product.lead_time_days || 7;

      const safetyStock = this.calculateDynamicSafetyStock({ stdDev, leadTimeDays });
      const reorderPoint = this.calculateReorderPoint({ avgDailyUsage, leadTimeDays, safetyStock });
      const reorderQuantity = this.calculateReorderQuantity({ avgDailyUsage, leadTimeDays });

      const urgency = this.determineUrgencyLevel(currentStock, reorderPoint, avgDailyUsage);
      const stockoutDate = this.estimateStockoutDate(currentStock, avgDailyUsage);

      // Only include if below reorder point and meets urgency filter
      if (currentStock <= reorderPoint) {
        const urgencyOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
        if (urgencyOrder[urgency] >= urgencyOrder[min_urgency]) {
          recommendations.push({
            product_id: product.product_id,
            product_name: product.device_name,
            sku: product.sku,
            warehouse_id,
            current_stock: currentStock,
            reorder_point: reorderPoint,
            recommended_quantity: reorderQuantity,
            urgency,
            avg_daily_usage: avgDailyUsage,
            lead_time_days: leadTimeDays,
            estimated_stockout_date: stockoutDate,
            reason: `Stock (${currentStock}) below reorder point (${reorderPoint})`
          });
        }
      }
    }

    // Sort by urgency
    const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return recommendations.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  }

  static async getPendingRecommendations(filters = {}) {
    const query = { status: 'PENDING' };
    if (filters.warehouse_id) query.warehouse_id = filters.warehouse_id;
    if (filters.urgency) query.urgency = filters.urgency;

    return await ReorderRecommendation.find(query)
      .sort({ urgency: 1, created_at: -1 })
      .limit(filters.limit || 100)
      .lean();
  }

  static async updateRecommendationStatus(recommendation_id, status, user_id) {
    const update = { status };
    if (status === 'APPROVED') {
      update.approved_by = user_id;
      update.approved_at = new Date();
    }

    await ReorderRecommendation.updateOne({ recommendation_id }, { $set: update });
    return { success: true };
  }

  static async getRecommendationStats(filters = {}) {
    const match = {};
    if (filters.warehouse_id) match.warehouse_id = filters.warehouse_id;

    const stats = await ReorderRecommendation.aggregate([
      { $match: match },
      {
        $group: {
          _id: { status: '$status', urgency: '$urgency' },
          count: { $sum: 1 }
        }
      }
    ]);

    const byStatus = {};
    const byUrgency = {};
    stats.forEach(s => {
      byStatus[s._id.status] = (byStatus[s._id.status] || 0) + s.count;
      byUrgency[s._id.urgency] = (byUrgency[s._id.urgency] || 0) + s.count;
    });

    return { byStatus, byUrgency, total: Object.values(byStatus).reduce((a, b) => a + b, 0) };
  }

  static async getOverstockedProducts(filters = {}) {
    const products = await Product.find({ is_active: { $ne: false } }).lean();
    const overstocked = [];

    for (const product of products) {
      const inv = await Inventory.aggregate([
        { $match: { product_id: product.product_id } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]);
      const currentStock = inv[0]?.total || 0;

      const avgDailyUsage = await this.calculateAverageDailyUsage(product.product_id);
      const leadTimeDays = product.lead_time_days || 7;
      const optimalStock = avgDailyUsage * leadTimeDays * 2;

      if (currentStock > optimalStock && optimalStock > 0) {
        overstocked.push({
          product_id: product.product_id,
          product_name: product.device_name,
          current_stock: currentStock,
          optimal_stock: Math.ceil(optimalStock),
          excess: currentStock - Math.ceil(optimalStock)
        });
      }
    }

    return overstocked.sort((a, b) => b.excess - a.excess);
  }

  static async getSlowMovingProducts(filters = {}) {
    const { days = 60 } = filters;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const products = await Product.find({ is_active: { $ne: false } }).lean();
    const slowMoving = [];

    for (const product of products) {
      const txnCount = await Transaction.countDocuments({
        'items.product_id': product.product_id,
        transaction_type: { $in: ['sale', 'dispense', 'outgoing'] },
        transaction_date: { $gte: cutoffDate }
      });

      if (txnCount === 0) {
        const inv = await Inventory.aggregate([
          { $match: { product_id: product.product_id } },
          { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]);

        if ((inv[0]?.total || 0) > 0) {
          slowMoving.push({
            product_id: product.product_id,
            product_name: product.device_name,
            current_stock: inv[0]?.total || 0,
            last_movement_days: days
          });
        }
      }
    }

    return slowMoving;
  }

  static async getRecommendationSummary(filters = {}) {
    const [recommendations, stats, overstocked, slowMoving] = await Promise.all([
      this.generateRecommendations(filters),
      this.getRecommendationStats(filters),
      this.getOverstockedProducts(filters),
      this.getSlowMovingProducts(filters)
    ]);

    return {
      reorder_recommendations: recommendations.slice(0, 10),
      overstocked_products: overstocked.slice(0, 10),
      slow_moving_products: slowMoving.slice(0, 10),
      statistics: stats
    };
  }
}

module.exports = RecommendationService;
