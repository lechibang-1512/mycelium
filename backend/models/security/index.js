// Security models
const User = require('./User');
const Session = require('./Session');
const AuditLog = require('./AuditLog');
const Role = require('./Role');
const Permission = require('./Permission');
const RolePermission = require('./RolePermission');
const UserRole = require('./UserRole');

// Define associations

// User 1:N relations
User.hasMany(Session, { foreignKey: 'user_id' });
Session.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(AuditLog, { foreignKey: 'user_id' });
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

// RBAC: User <-> Role (many-to-many via user_roles)
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', otherKey: 'role_id', sourceKey: 'user_id', targetKey: 'role_id' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', otherKey: 'user_id', sourceKey: 'role_id', targetKey: 'user_id' });

// RBAC: Role <-> Permission (many-to-many via role_permissions)
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id', otherKey: 'permission_id', sourceKey: 'role_id', targetKey: 'permission_id' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id', otherKey: 'role_id', sourceKey: 'permission_id', targetKey: 'role_id' });

module.exports = {
    User,
    Session,
    AuditLog,
    Role,
    Permission,
    RolePermission,
    UserRole
};
