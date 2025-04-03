const { DataTypes } = require('sequelize');
const { sequelizeSecurity } = require('../../config/sequelize');

const RolePermission = sequelizeSecurity.define('RolePermission', {
    id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
    },
    role_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
    },
    permission_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
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
