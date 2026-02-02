/**
 * Role Model (replaces security_db.roles, role_permissions, permissions)
 * Roles with embedded permissions for RBAC
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const RoleSchema = new Schema({
    // Auto-increment ID for backward compatibility
    role_id: { type: Number, unique: true, index: true },

    name: { type: String, required: true, unique: true, index: true },
    description: String,

    // Embedded permissions (denormalized from permissions, role_permissions tables)
    permissions: [{
        type: String,  // e.g., "inventory.read", "inventory.write", "users.manage"
    }]

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'roles'
});

// Auto-increment role_id
RoleSchema.pre('save', async function () {
    if (this.isNew && !this.role_id) {
        const last = await this.constructor.findOne().sort({ role_id: -1 });
        this.role_id = (last?.role_id || 0) + 1;
    }
});

// Check if role has permission
RoleSchema.methods.hasPermission = function (permission) {
    return this.permissions.includes(permission);
};

// Check if role has any of the permissions
RoleSchema.methods.hasAnyPermission = function (permissions) {
    return permissions.some(p => this.permissions.includes(p));
};

module.exports = mongoose.model('Role', RoleSchema);
