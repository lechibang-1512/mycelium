const { DataTypes } = require('sequelize');
const { sequelizeSecurity } = require('../../config/sequelize');

const User = sequelizeSecurity.define('User', {
    id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
    },
    username: {
        type: DataTypes.STRING(50),
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
    fullName: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    is_active: {
        type: DataTypes.TINYINT,
        allowNull: true,
        defaultValue: 1,
    },
    locked_until: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    failed_login_attempts: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
    },
    role: {
        type: DataTypes.STRING(50),
        allowNull: true,
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
