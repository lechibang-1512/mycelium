const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const WarehouseZone = sequelizeMaster.define('WarehouseZone', {
            warehouse_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            zone_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            zone_uuid: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            zone_type: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'storage',
            },
            bin_prefix: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            max_bins: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            require_bins: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                
            },
            default_bin_type: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            bin_layout: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            capacity_limit: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            is_active: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                defaultValue: 1,
            },
            id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
}, {
    tableName: 'warehouse_zones',
    timestamps: false
});

module.exports = WarehouseZone;
