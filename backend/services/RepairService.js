/**
 * Consolidated Repair Management Service (MongoDB Version)
 * Handles Repair Jobs, Parts Usage, and Templates
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const RepairJob = require('../models/RepairJob');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

// Status normalization mapping
const STATUS_MAP = {
  'PENDING': 'PENDING', 'WAITING': 'PENDING', 'INTAKE': 'PENDING',
  'DIAGNOSED': 'DIAGNOSED', 'ASSESSED': 'DIAGNOSED',
  'PARTS_ORDERED': 'PARTS_ORDERED', 'IN_PROGRESS': 'IN_PROGRESS', 'QUALITY_CHECK': 'IN_PROGRESS',
  'TESTING': 'TESTING', 'COMPLETED': 'COMPLETED', 'READY_PICKUP': 'COMPLETED',
  'DELIVERED': 'DELIVERED', 'CANCELLED': 'CANCELLED'
};

const PRIORITY_MAP = {
  'LOW': 'LOW', 'NORMAL': 'NORMAL', 'MEDIUM': 'NORMAL',
  'HIGH': 'HIGH', 'URGENT': 'URGENT', 'CRITICAL': 'URGENT'
};

function formatDateForDB(value) {
  if (!value) return null;
  return new Date(value);
}

class RepairService {
  constructor(_pool) {
    // Pool parameter kept for backward compatibility but not used
  }

  // =========================================================================
  // REPAIR JOB MANAGEMENT
  // =========================================================================

  async getAllJobs(filters = {}) {
    const query = {};

    if (filters.status) query.status = this.normalizeStatus(filters.status);
    if (filters.priority) query.priority = this.normalizePriority(filters.priority);
    if (filters.assigned_technician) query.assigned_technician = filters.assigned_technician;
    if (filters.warehouse_id) query.warehouse_id = filters.warehouse_id;
    if (filters.customer_name) query['customer.name'] = new RegExp(filters.customer_name, 'i');
    if (filters.start_date) query.received_date = { $gte: new Date(filters.start_date) };
    if (filters.end_date) {
      query.received_date = query.received_date || {};
      query.received_date.$lte = new Date(filters.end_date);
    }

    const jobs = await RepairJob.find(query)
      .sort({ received_date: -1 })
      .limit(filters.limit || 100)
      .lean();

    return jobs.map(job => this._formatJob(job));
  }

  async getJobById(id) {
    const query = typeof id === 'number' ? { repair_job_id: id } : { job_number: id };
    const job = await RepairJob.findOne(query).lean();
    if (!job) return null;
    return this._formatJob(job);
  }

  async createJob(data) {
    const job = await RepairJob.create({
      product_id: data.product_id,
      device_name: data.device_name,
      device_serial_number: data.device_serial_number,
      device_imei: data.device_imei,
      customer: {
        name: data.customer_name,
        phone: data.customer_phone,
        email: data.customer_email,
        address: data.customer_address
      },
      issue_description: data.issue_description,
      diagnosis: data.diagnosis,
      repair_notes: data.repair_notes,
      status: this.normalizeStatus(data.status) || 'PENDING',
      priority: this.normalizePriority(data.priority) || 'NORMAL',
      assigned_technician: data.assigned_technician,
      assigned_at: data.assigned_technician ? new Date() : null,
      warehouse_id: data.warehouse_id,
      received_date: formatDateForDB(data.received_date) || new Date(),
      estimated_completion_date: formatDateForDB(data.estimated_completion_date),
      costs: {
        estimated: data.estimated_cost || 0,
        labor: data.labor_cost || 0
      },
      warranty_months: data.warranty_months || 3,
      created_by: data.created_by
    });

    return {
      repair_job_id: job.repair_job_id,
      job_number: job.job_number,
      success: true
    };
  }

  async updateJob(id, data) {
    const query = typeof id === 'number' ? { repair_job_id: id } : { job_number: id };
    const job = await RepairJob.findOne(query);

    if (!job) return { success: false, error: 'Job not found' };

    // Update allowed fields
    const fields = [
      'device_name', 'device_serial_number', 'device_imei',
      'issue_description', 'diagnosis', 'repair_notes',
      'assigned_technician', 'warehouse_id', 'test_results',
      'tested_by', 'quality_check_passed'
    ];

    fields.forEach(field => {
      if (data[field] !== undefined) job[field] = data[field];
    });

    if (data.status) job.status = this.normalizeStatus(data.status);
    if (data.priority) job.priority = this.normalizePriority(data.priority);
    if (data.customer_name) job.customer.name = data.customer_name;
    if (data.customer_phone) job.customer.phone = data.customer_phone;
    if (data.customer_email) job.customer.email = data.customer_email;
    if (data.estimated_completion_date) job.estimated_completion_date = formatDateForDB(data.estimated_completion_date);
    if (data.completion_date) job.completion_date = formatDateForDB(data.completion_date);
    if (data.estimated_cost !== undefined) job.costs.estimated = data.estimated_cost;
    if (data.labor_cost !== undefined) job.costs.labor = data.labor_cost;
    if (data.customer_charge !== undefined) job.costs.customer_charge = data.customer_charge;

    if (data.assigned_technician && !job.assigned_at) {
      job.assigned_at = new Date();
    }

    await job.save();
    return { success: true };
  }

  async getDashboardStats() {
    const stats = await RepairJob.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const byStatus = {};
    let total = 0;
    stats.forEach(s => {
      byStatus[s._id] = s.count;
      total += s.count;
    });

    // Get recent activity
    const recentJobs = await RepairJob.find()
      .sort({ created_at: -1 })
      .limit(5)
      .select('job_number status customer.name device_name')
      .lean();

    return {
      total,
      pending: byStatus['PENDING'] || 0,
      in_progress: (byStatus['DIAGNOSED'] || 0) + (byStatus['PARTS_ORDERED'] || 0) + (byStatus['IN_PROGRESS'] || 0) + (byStatus['TESTING'] || 0),
      completed: byStatus['COMPLETED'] || 0,
      delivered: byStatus['DELIVERED'] || 0,
      cancelled: byStatus['CANCELLED'] || 0,
      recent_jobs: recentJobs
    };
  }

  async searchJobs(searchQuery, limit = 50) {
    const regex = new RegExp(searchQuery, 'i');
    const jobs = await RepairJob.find({
      $or: [
        { job_number: regex },
        { device_serial_number: regex },
        { device_imei: regex },
        { 'customer.name': regex },
        { 'customer.phone': regex }
      ]
    }).limit(limit).lean();

    return jobs.map(job => this._formatJob(job));
  }

  // =========================================================================
  // PARTS USAGE
  // =========================================================================

  async addPartUsage(repairJobId, partData, userId) {
    const job = await RepairJob.findOne({ repair_job_id: repairJobId });
    if (!job) throw new Error('Repair job not found');

    const usage = {
      spare_part_id: partData.spare_part_id,
      inventory_id: partData.inventory_id,
      quantity_used: partData.quantity || 1,
      unit_cost: partData.unit_cost || 0,
      installed_by: userId || partData.installed_by,
      installed_date: new Date(),
      warranty_months: partData.warranty_months,
      notes: partData.notes
    };

    job.parts_used.push(usage);
    await job.save();

    // Deduct from inventory if inventory_id provided
    if (partData.inventory_id) {
      await Inventory.updateOne(
        { _id: partData.inventory_id },
        { $inc: { quantity: -usage.quantity_used } }
      );
    }

    return { success: true, parts_count: job.parts_used.length };
  }

  async removePartUsage(repairJobId, usageIndex, userId) {
    const job = await RepairJob.findOne({ repair_job_id: repairJobId });
    if (!job) throw new Error('Repair job not found');

    if (usageIndex >= 0 && usageIndex < job.parts_used.length) {
      const removed = job.parts_used.splice(usageIndex, 1)[0];
      await job.save();

      // Return to inventory if possible
      if (removed.inventory_id) {
        await Inventory.updateOne(
          { _id: removed.inventory_id },
          { $inc: { quantity: removed.quantity_used } }
        );
      }

      return { success: true };
    }

    return { success: false, error: 'Usage not found' };
  }

  // =========================================================================
  // REPORTS & ANALYTICS
  // =========================================================================

  async getSummaryReport(filters = {}) {
    const matchStage = {};
    if (filters.start_date) matchStage.received_date = { $gte: new Date(filters.start_date) };
    if (filters.end_date) {
      matchStage.received_date = matchStage.received_date || {};
      matchStage.received_date.$lte = new Date(filters.end_date);
    }

    const summary = await RepairJob.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total_jobs: { $sum: 1 },
          total_parts_cost: { $sum: '$costs.parts' },
          total_labor_cost: { $sum: '$costs.labor' },
          total_revenue: { $sum: '$costs.customer_charge' },
          avg_turnaround_days: {
            $avg: {
              $divide: [
                { $subtract: ['$completion_date', '$received_date'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      }
    ]);

    return summary[0] || {
      total_jobs: 0,
      total_parts_cost: 0,
      total_labor_cost: 0,
      total_revenue: 0,
      avg_turnaround_days: 0
    };
  }

  async getTechnicianPerformance() {
    const perf = await RepairJob.aggregate([
      { $match: { assigned_technician: { $ne: null } } },
      {
        $group: {
          _id: '$assigned_technician',
          total_jobs: { $sum: 1 },
          completed_jobs: {
            $sum: { $cond: [{ $in: ['$status', ['COMPLETED', 'DELIVERED']] }, 1, 0] }
          },
          avg_turnaround_days: {
            $avg: {
              $cond: [
                { $and: [{ $ne: ['$completion_date', null] }, { $ne: ['$received_date', null] }] },
                { $divide: [{ $subtract: ['$completion_date', '$received_date'] }, 1000 * 60 * 60 * 24] },
                null
              ]
            }
          }
        }
      },
      { $sort: { completed_jobs: -1 } }
    ]);

    return perf.map(p => ({
      technician: p._id,
      total_jobs: p.total_jobs,
      completed_jobs: p.completed_jobs,
      completion_rate: p.total_jobs > 0 ? Math.round((p.completed_jobs / p.total_jobs) * 100) : 0,
      avg_turnaround_days: p.avg_turnaround_days ? Math.round(p.avg_turnaround_days * 10) / 10 : null
    }));
  }

  // =========================================================================
  // TEMPLATES (Simplified)
  // =========================================================================

  // Templates could be stored in a separate collection, but for now, stub methods
  async getAllTemplates(includeInactive = false) {
    // Placeholder - would need RepairTemplate model
    return [];
  }

  async applyTemplate(templateId, jobData = {}) {
    // Placeholder
    return this.createJob(jobData);
  }

  async getTemplateById(id) {
    return null;
  }

  async createTemplate(data) {
    return { success: false, error: 'Templates not implemented' };
  }

  async updateTemplate(id, data) {
    return { success: false, error: 'Templates not implemented' };
  }

  async deleteTemplate(id, force = false) {
    return { success: false, error: 'Templates not implemented' };
  }

  // =========================================================================
  // BULK OPERATIONS
  // =========================================================================

  async bulkUpdateStatus(ids, status, userId) {
    const normalizedStatus = this.normalizeStatus(status);
    await RepairJob.updateMany(
      { repair_job_id: { $in: ids } },
      { $set: { status: normalizedStatus } }
    );
    return { success: true, updated: ids.length };
  }

  async bulkAssignTechnician(ids, techId, userId) {
    await RepairJob.updateMany(
      { repair_job_id: { $in: ids } },
      { $set: { assigned_technician: techId, assigned_at: new Date() } }
    );
    return { success: true, updated: ids.length };
  }

  async bulkUpdatePriority(ids, priority, userId) {
    const normalizedPriority = this.normalizePriority(priority);
    await RepairJob.updateMany(
      { repair_job_id: { $in: ids } },
      { $set: { priority: normalizedPriority } }
    );
    return { success: true, updated: ids.length };
  }

  async bulkCancel(ids, reason, userId) {
    await RepairJob.updateMany(
      { repair_job_id: { $in: ids } },
      { $set: { status: 'CANCELLED', repair_notes: reason } }
    );
    return { success: true, updated: ids.length };
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  normalizeStatus(status) {
    if (!status) return null;
    return STATUS_MAP[status.toUpperCase()] || 'PENDING';
  }

  normalizePriority(priority) {
    if (!priority) return null;
    return PRIORITY_MAP[priority.toUpperCase()] || 'NORMAL';
  }

  _formatJob(job) {
    return {
      id: job.repair_job_id,
      repair_job_id: job.repair_job_id,
      job_number: job.job_number,
      product_id: job.product_id,
      device_name: job.device_name,
      device_serial_number: job.device_serial_number,
      device_imei: job.device_imei,
      customer_name: job.customer?.name,
      customer_phone: job.customer?.phone,
      customer_email: job.customer?.email,
      customer_address: job.customer?.address,
      issue_description: job.issue_description,
      diagnosis: job.diagnosis,
      repair_notes: job.repair_notes,
      status: job.status,
      priority: job.priority,
      assigned_technician: job.assigned_technician,
      assigned_at: job.assigned_at,
      warehouse_id: job.warehouse_id,
      received_date: job.received_date,
      estimated_completion_date: job.estimated_completion_date,
      completion_date: job.completion_date,
      delivered_date: job.delivered_date,
      estimated_cost: job.costs?.estimated,
      parts_cost: job.costs?.parts,
      labor_cost: job.costs?.labor,
      final_cost: job.costs?.final,
      customer_charge: job.costs?.customer_charge,
      warranty_months: job.warranty_months,
      parts_used: job.parts_used || [],
      attachments: job.attachments || [],
      status_history: job.status_history || [],
      created_at: job.created_at,
      updated_at: job.updated_at
    };
  }
}

module.exports = RepairService;
