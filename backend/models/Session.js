/**
 * Session Model (replaces security_db.sessions)
 * User session storage for express-session
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const SessionSchema = new Schema({
    session_id: { type: String, required: true, unique: true, index: true },

    user_id: { type: Number, index: true },

    expires: { type: Date, required: true },

    // Session data (serialized JSON)
    data: Schema.Types.Mixed,

    // Security tracking
    ip_address: String,
    user_agent: String,

    is_active: { type: Boolean, default: true },
    last_activity: { type: Date, default: Date.now }

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'sessions'
});

// Auto-expire sessions
SessionSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

// Cleanup inactive sessions
SessionSchema.statics.cleanupExpired = function () {
    return this.deleteMany({ expires: { $lt: new Date() } });
};

module.exports = mongoose.model('Session', SessionSchema);
