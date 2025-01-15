const { DataTypes } = require('sequelize');
const { sequelizeSecurity } = require('../../config/sequelize');

const User = sequelizeSecurity.define('User', {
    user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
    },
    username: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true
    },
    full_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    is_active: {
        type: DataTypes.TINYINT,
        allowNull: true,
        defaultValue: 1,
    },
    is_locked: {
        type: DataTypes.TINYINT,
        allowNull: true,
        defaultValue: 0,
    },
    failed_login_attempts: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
    },
    last_login: {
        type: DataTypes.DATE,
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
    tableName: 'users',
    timestamps: false
});

module.exports = User;
