const { DataTypes } = require('sequelize');
const { sequelizeSecurity } = require('../../config/sequelize');

const Role = sequelizeSecurity.define('Role', {
    role_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
        field: 'id'
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    is_system: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'roles',
    timestamps: false
});

module.exports = Role;
