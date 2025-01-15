const { DataTypes } = require('sequelize');
const { sequelizeSecurity } = require('../../config/sequelize');

const UserRole = sequelizeSecurity.define('UserRole', {
    user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
    },
    role_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
    },
    assigned_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'user_roles',
    timestamps: false
});

module.exports = UserRole;
