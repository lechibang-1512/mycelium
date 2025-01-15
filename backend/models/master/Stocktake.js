const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const Stocktake = sequelizeMaster.define('Stocktake', {
            stocktake_uuid: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            stocktake_number: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            zone_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            count_type: {
                type: DataTypes.ENUM('full','cycle','random','location'),
                allowNull: true,
                
                
                defaultValue: 'full',
            },
            status: {
                type: DataTypes.ENUM('PLANNED','IN_PROGRESS','COMPLETED','APPROVED','CANCELLED'),
                allowNull: true,
                
                
                defaultValue: 'PLANNED',
            },
            initiated_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            started_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            completed_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            approved_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            approved_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            scheduled_for: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            is_recurring: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                
            },
            recurrence_rule: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            warehouse_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            stocktake_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
}, {
    tableName: 'stocktakes',
    timestamps: false
});

module.exports = Stocktake;
