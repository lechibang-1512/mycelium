const { DataTypes } = require('sequelize');
const { sequelizeSecurity } = require('../../config/sequelize');

const RolePermission = sequelizeSecurity.define('RolePermission', {
    role_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
    },
    permission_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'role_permissions',
    timestamps: false
});

module.exports = RolePermission;
