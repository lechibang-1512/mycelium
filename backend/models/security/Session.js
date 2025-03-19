const { DataTypes } = require('sequelize');
const { sequelizeSecurity } = require('../../config/sequelize');

const Session = sequelizeSecurity.define('Session', {
    session_id: {
        type: DataTypes.STRING(128),
        allowNull: true,
        primaryKey: true,



    },
    expires: {
        type: DataTypes.BIGINT,
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
    data: {
        type: DataTypes.TEXT,
        allowNull: true,



    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,



    },
    last_activity: {
        type: DataTypes.DATE,
        allowNull: true,



    },
    is_active: {
        type: DataTypes.TINYINT,
        allowNull: true,


        defaultValue: 1,
    },
    user_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,



    },
}, {
    tableName: 'sessions',
    timestamps: false
});

module.exports = Session;
