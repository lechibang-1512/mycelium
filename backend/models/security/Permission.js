const { DataTypes } = require('sequelize');
const { sequelizeSecurity } = require('../../config/sequelize');

const Permission = sequelizeSecurity.define('Permission', {
    permission_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
        field: 'id'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    category: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.getDataValue('resource');
        },
    },
    resource: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    action: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'permissions',
    timestamps: false
});

module.exports = Permission;
