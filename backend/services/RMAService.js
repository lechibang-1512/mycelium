/**
 * RMA Service (MongoDB Version)
 * Handles Return Merchandise Authorization operations
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');

// RMA Schema (inline)
const RMASchema = new mongoose.Schema({
  rma_id: { type: Number, unique: true, index: true },
  rma_number: { type: String, unique: true, index: true },
  customer_name: { type: String, index: true },
  customer_phone: String,
  customer_email: String,
  customer_address: String,
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'RECEIVED', 'INSPECTING', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
  reason: String,
  notes: String,
  items: [{
    item_id: Number,
    product_id: String,
    device_name: String,
    device_identifier: String,
    quantity_requested: { type: Number, default: 1 },
    quantity_received: { type: Number, default: 0 },
    disposition: { type: String, enum: ['PENDING', 'RESTOCK', 'REPAIR', 'SCRAP', 'REFUND'], default: 'PENDING' },
    inspection_notes: String,
    condition_grade: String,
    processed_at: Date
  }],
  status_history: [{
    old_status: String,
    new_status: String,
    changed_by: Number,
    changed_at: { type: Date, default: Date.now },
    reason: String
  }],
  attachments: [{
    file_name: String,
    file_path: String,
    uploaded_by: Number,
    uploaded_at: { type: Date, default: Date.now }
  }],
  assigned_to: Number,
  created_by: Number,
  approved_by: Number,
  approved_at: Date,
  received_at: Date,
  completed_at: Date
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'rmas'
});

// Auto-increment
RMASchema.pre('save', async function (next) {
  if (this.isNew) {
    if (!this.rma_id) {
      const last = await this.constructor.findOne().sort({ rma_id: -1 });
      this.rma_id = (last?.rma_id || 0) + 1;
    }
    if (!this.rma_number) {
      const date = new Date();
      this.rma_number = `RMA-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(this.rma_id).padStart(5, '0')}`;
    }
  }
  next();
});

const RMA = mongoose.models.RMA || mongoose.model('RMA', RMASchema);

class RMAService {
  formatDateForDB(value) {
    if (!value) return null;
    return new Date(value);
  }

  generateItemId(items) {
    if (!items || items.length === 0) return 1;
    return Math.max(...items.map(i => i.item_id || 0)) + 1;
  }

  async createRMARequest(pool, rmaData, items, userId) {
    const rmaItems = items.map((item, idx) => ({
      item_id: idx + 1,
      product_id: item.product_id,
      device_name: item.device_name,
      device_identifier: item.device_identifier || item.imei || item.serial,
      quantity_requested: item.quantity || 1,
      quantity_received: 0,
      disposition: 'PENDING'
    }));

    const rma = await RMA.create({
      customer_name: rmaData.customer_name,
      customer_phone: rmaData.customer_phone,
      customer_email: rmaData.customer_email,
      customer_address: rmaData.customer_address,
      status: 'PENDING',
      priority: rmaData.priority || 'NORMAL',
      reason: rmaData.reason,
      notes: rmaData.notes,
      items: rmaItems,
      status_history: [{
        old_status: null,
        new_status: 'PENDING',
        changed_by: userId,
        changed_at: new Date(),
        reason: 'RMA created'
      }],
      created_by: userId
    });

    return {
      rma_id: rma.rma_id,
      rma_number: rma.rma_number,
      success: true
    };
  }

  async getRMAById(pool, rmaId) {
    const query = typeof rmaId === 'number' ? { rma_id: rmaId } : { rma_number: rmaId };
    const rma = await RMA.findOne(query).lean();
    if (!rma) return null;
    return { ...rma, id: rma.rma_id };
  }

  async listRMAs(pool, filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.customer_name) query.customer_name = new RegExp(filters.customer_name, 'i');
    if (filters.assigned_to) query.assigned_to = filters.assigned_to;
    if (filters.start_date) query.created_at = { $gte: new Date(filters.start_date) };
    if (filters.end_date) {
      query.created_at = query.created_at || {};
      query.created_at.$lte = new Date(filters.end_date);
    }

    const rmas = await RMA.find(query)
      .sort({ created_at: -1 })
      .limit(filters.limit || 100)
      .lean();

    return rmas.map(r => ({
      ...r,
      id: r.rma_id,
      item_count: r.items?.length || 0
    }));
  }

  async updateRMAStatus(pool, rmaId, newStatus, userId, reason = null) {
    const query = typeof rmaId === 'number' ? { rma_id: rmaId } : { rma_number: rmaId };
    const rma = await RMA.findOne(query);
    if (!rma) return { success: false, error: 'RMA not found' };

    const oldStatus = rma.status;
    rma.status = newStatus;
    rma.status_history.push({
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: userId,
      changed_at: new Date(),
      reason
    });

    if (newStatus === 'RECEIVED') rma.received_at = new Date();
    if (newStatus === 'COMPLETED') rma.completed_at = new Date();
    if (newStatus === 'APPROVED') {
      rma.approved_by = userId;
      rma.approved_at = new Date();
    }

    await rma.save();
    return { success: true, old_status: oldStatus, new_status: newStatus };
  }

  async receiveRMAItems(pool, rmaId, receivedItems, userId) {
    const query = typeof rmaId === 'number' ? { rma_id: rmaId } : { rma_number: rmaId };
    const rma = await RMA.findOne(query);
    if (!rma) return { success: false, error: 'RMA not found' };

    for (const received of receivedItems) {
      const item = rma.items.find(i => i.item_id === received.item_id);
      if (item) {
        item.quantity_received = received.quantity_received || received.quantity || 1;
      }
    }

    if (rma.status === 'APPROVED') {
      rma.status = 'RECEIVED';
      rma.received_at = new Date();
      rma.status_history.push({
        old_status: 'APPROVED',
        new_status: 'RECEIVED',
        changed_by: userId,
        changed_at: new Date(),
        reason: 'Items received'
      });
    }

    await rma.save();
    return { success: true };
  }

  async inspectRMAItem(pool, rmaId, itemId, inspectionData, userId) {
    const query = typeof rmaId === 'number' ? { rma_id: rmaId } : { rma_number: rmaId };
    const rma = await RMA.findOne(query);
    if (!rma) return { success: false, error: 'RMA not found' };

    const item = rma.items.find(i => i.item_id === itemId);
    if (!item) return { success: false, error: 'Item not found' };

    item.inspection_notes = inspectionData.notes;
    item.condition_grade = inspectionData.condition_grade;
    item.disposition = inspectionData.disposition || 'PENDING';

    await rma.save();
    return { success: true };
  }

  async setItemDisposition(pool, rmaId, itemId, disposition, notes, userId) {
    const query = typeof rmaId === 'number' ? { rma_id: rmaId } : { rma_number: rmaId };
    const rma = await RMA.findOne(query);
    if (!rma) return { success: false, error: 'RMA not found' };

    const item = rma.items.find(i => i.item_id === itemId);
    if (!item) return { success: false, error: 'Item not found' };

    item.disposition = disposition;
    if (notes) item.inspection_notes = (item.inspection_notes || '') + ' ' + notes;
    item.processed_at = new Date();

    await rma.save();
    return { success: true };
  }

  async processDispositionAction(pool, rmaId, itemId, actionData, userId) {
    const query = typeof rmaId === 'number' ? { rma_id: rmaId } : { rma_number: rmaId };
    const rma = await RMA.findOne(query);
    if (!rma) return { success: false, error: 'RMA not found' };

    const item = rma.items.find(i => i.item_id === itemId);
    if (!item) return { success: false, error: 'Item not found' };

    // Process based on disposition
    if (item.disposition === 'RESTOCK' && actionData.warehouse_id) {
      await Inventory.create({
        inventory_type: 'serialized',
        product_id: item.product_id,
        serial_number: item.device_identifier,
        warehouse_id: actionData.warehouse_id,
        bin_id: actionData.bin_id,
        status: 'available',
        condition_grade: item.condition_grade || 'B',
        quantity: 1
      });
    }

    item.processed_at = new Date();
    await rma.save();

    return { success: true, disposition: item.disposition };
  }

  async deleteRMA(pool, rmaId) {
    const query = typeof rmaId === 'number' ? { rma_id: rmaId } : { rma_number: rmaId };
    const result = await RMA.deleteOne(query);
    return { success: result.deletedCount > 0 };
  }

  async addAttachment(pool, rmaId, attachmentData, userId) {
    const query = typeof rmaId === 'number' ? { rma_id: rmaId } : { rma_number: rmaId };
    await RMA.updateOne(query, {
      $push: {
        attachments: {
          file_name: attachmentData.file_name,
          file_path: attachmentData.file_path,
          uploaded_by: userId,
          uploaded_at: new Date()
        }
      }
    });
    return { success: true };
  }

  async getAttachments(pool, rmaId) {
    const query = typeof rmaId === 'number' ? { rma_id: rmaId } : { rma_number: rmaId };
    const rma = await RMA.findOne(query).select('attachments').lean();
    return rma?.attachments || [];
  }

  async bulkUpdateStatus(pool, rmaIds, newStatus, userId, reason = null, options = {}) {
    let updated = 0;
    for (const id of rmaIds) {
      const result = await this.updateRMAStatus(pool, id, newStatus, userId, reason);
      if (result.success) updated++;
    }
    return { success: true, updated, total: rmaIds.length };
  }

  async bulkAssign(pool, rmaIds, assignedTo, userId) {
    await RMA.updateMany(
      { rma_id: { $in: rmaIds } },
      { $set: { assigned_to: assignedTo } }
    );
    return { success: true, updated: rmaIds.length };
  }

  async bulkSetDisposition(pool, rmaId, itemIds, disposition, notes, userId) {
    const rma = await RMA.findOne({ rma_id: rmaId });
    if (!rma) return { success: false, error: 'RMA not found' };

    for (const itemId of itemIds) {
      const item = rma.items.find(i => i.item_id === itemId);
      if (item) {
        item.disposition = disposition;
        if (notes) item.inspection_notes = notes;
      }
    }

    await rma.save();
    return { success: true, updated: itemIds.length };
  }

  async getDashboardStats(pool) {
    const stats = await RMA.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const byStatus = {};
    let total = 0;
    stats.forEach(s => {
      byStatus[s._id] = s.count;
      total += s.count;
    });

    return { total, byStatus };
  }

  async addItem(pool, rmaId, itemData, userId) {
    const rma = await RMA.findOne({ rma_id: rmaId });
    if (!rma) return { success: false, error: 'RMA not found' };

    const newItemId = this.generateItemId(rma.items);
    rma.items.push({
      item_id: newItemId,
      product_id: itemData.product_id,
      device_name: itemData.device_name,
      device_identifier: itemData.device_identifier,
      quantity_requested: itemData.quantity || 1,
      quantity_received: 0,
      disposition: 'PENDING'
    });

    await rma.save();
    return { success: true, item_id: newItemId };
  }

  async removeItem(pool, rmaId, itemId, userId) {
    await RMA.updateOne(
      { rma_id: rmaId },
      { $pull: { items: { item_id: itemId } } }
    );
    return { success: true };
  }
}

module.exports = RMAService;