/**
 * User Model (replaces security_db.users)
 * User accounts with embedded role references
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
    // Auto-increment ID for backward compatibility
    user_id: { type: Number, unique: true, index: true },

    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },  // bcrypt hashed

    fullName: String,
    email: { type: String, unique: true, sparse: true, index: true },

    // Role references (ObjectIds to Role collection)
    roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],

    // Legacy role field for backward compat
    role: String,

    // Status
    is_active: { type: Boolean, default: true, index: true },

    // Security
    last_login: Date,
    failed_login_attempts: { type: Number, default: 0 },
    locked_until: Date,

    // Token invalidation timestamp
    tokens_invalidated_at: Date

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'users'
});

// Auto-increment user_id
UserSchema.pre('save', async function () {
    if (this.isNew && !this.user_id) {
        const last = await this.constructor.findOne().sort({ user_id: -1 });
        this.user_id = (last?.user_id || 0) + 1;
    }
});

// Hash password before save
UserSchema.pre('save', async function () {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
    }
});

// Instance methods
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.isLocked = function () {
    return this.locked_until && this.locked_until > new Date();
};

UserSchema.methods.recordFailedLogin = async function () {
    this.failed_login_attempts += 1;
    if (this.failed_login_attempts >= 5) {
        this.locked_until = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
    }
    return this.save();
};

UserSchema.methods.resetFailedLogins = async function () {
    this.failed_login_attempts = 0;
    this.locked_until = null;
    this.last_login = new Date();
    return this.save();
};

module.exports = mongoose.model('User', UserSchema);
