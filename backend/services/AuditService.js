/**
 * Audit Service (MongoDB Version)
 * Handles audit log queries and statistics
 */

const mongoose = require('mongoose');

// AuditLog schema (inline for simplicity)
const AuditLogSchema = new mongoose.Schema({
    action_type: { type: String, index: true },
    user_id: { type: Number, index: true },
    entity_type: String,
    entity_id: String,
    details: mongoose.Schema.Types.Mixed,
    ip_address: String,
    old_values: mongoose.Schema.Types.Mixed,
    new_values: mongoose.Schema.Types.Mixed
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'audit_logs'
});

AuditLogSchema.index({ created_at: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

class AuditService {
    constructor(_pool) {
        // Pool parameter kept for backward compatibility but not used
    }

    async getAuditLogs(filters = {}) {
        const { action_type, user_id, start_date, end_date, page = 1, limit = 50 } = filters;
        const query = {};

        if (action_type) query.action_type = action_type;
        if (user_id) query.user_id = user_id;
        if (start_date || end_date) {
            query.created_at = {};
            if (start_date) query.created_at.$gte = new Date(start_date);
            if (end_date) query.created_at.$lte = new Date(end_date);
        }

        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const total = await AuditLog.countDocuments(query);
        const logs = await AuditLog.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit, 10))
            .lean();

        return {
            logs: logs.map(l => ({
                ...l,
                id: l._id,
                formatted_date: l.created_at?.toLocaleString()
            })),
            total,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            totalPages: Math.ceil(total / parseInt(limit, 10))
        };
    }

    async getAuditSummary() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalLogs, todayLogs, actionTypes] = await Promise.all([
            AuditLog.countDocuments(),
            AuditLog.countDocuments({ created_at: { $gte: today } }),
            AuditLog.aggregate([
                { $group: { _id: '$action_type', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);

        return {
            totalLogs,
            todayLogs,
            actionTypes: actionTypes.map(a => ({ action_type: a._id, count: a.count }))
        };
    }

    async getUserAuditLogs(userId, limit = 50) {
        const logs = await AuditLog.find({ user_id: userId })
            .sort({ created_at: -1 })
            .limit(parseInt(limit, 10))
            .lean();

        return logs.map(l => ({
            ...l,
            id: l._id,
            formatted_date: l.created_at?.toLocaleString()
        }));
    }

    async createAuditLog(logData) {
        const { action_type, user_id, entity_type, entity_id, details, ip_address, old_values, new_values } = logData;

        const log = await AuditLog.create({
            action_type,
            user_id,
            entity_type,
            entity_id,
            details,
            ip_address,
            old_values,
            new_values
        });

        return log._id;
    }
}

module.exports = AuditService;
