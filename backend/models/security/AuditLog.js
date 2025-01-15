const { DataTypes } = require('sequelize');
const { sequelizeSecurity } = require('../../config/sequelize');

const AuditLog = sequelizeSecurity.define('AuditLog', {
    id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    action_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    resource_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    resource_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
    },
    user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    request_method: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    request_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    status_code: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    changes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    severity: {
        type: DataTypes.ENUM('info', 'warning', 'error', 'critical'),
        allowNull: true,
        defaultValue: 'info',
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'audit_log',
    timestamps: false
});

module.exports = AuditLog;
