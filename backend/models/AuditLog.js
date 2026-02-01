/**
 * AuditLog Model (replaces security_db.audit_log)
 * Unified audit trail for all system activities
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const AuditLogSchema = new Schema({
    user_id: { type: Number, index: true },
    username: String,  // Preserved even if user deleted

    action_type: { type: String, required: true, index: true },  // login, logout, create, update, delete, view
    resource_type: { type: String, index: true },  // inventory, user, warehouse, receipt
    resource_id: { type: String, index: true },

    description: String,

    // Request info
    ip_address: String,
    user_agent: String,
    request_method: String,  // GET, POST, PUT, DELETE
    request_url: String,
    status_code: Number,

    // Change tracking
    changes: {
        old_values: Schema.Types.Mixed,
        new_values: Schema.Types.Mixed
    },

    severity: {
        type: String,
        enum: ['info', 'warning', 'error', 'critical'],
        default: 'info',
        index: true
    }

}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'audit_logs'
});

// Compound indexes
AuditLogSchema.index({ user_id: 1, action_type: 1, created_at: -1 });
AuditLogSchema.index({ resource_type: 1, resource_id: 1 });
AuditLogSchema.index({ created_at: -1 });

// Static method for logging
AuditLogSchema.statics.log = function (data) {
    return this.create(data);
};

// Get user activity
AuditLogSchema.statics.getUserActivity = function (userId, limit = 100) {
    return this.find({ user_id: userId })
        .sort({ created_at: -1 })
        .limit(limit);
};

module.exports = mongoose.model('AuditLog', AuditLogSchema);
