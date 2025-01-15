const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const WarehouseBin = sequelizeMaster.define('WarehouseBin', {
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
            bin_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            bin_code: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            bin_type: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'standard',
            },
            product_type: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            row_position: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            column_position: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            bin_position: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            hierarchical_code: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            aisle: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            rack: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            shelf: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            max_capacity: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            weight_capacity: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            height_cm: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            width_cm: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            depth_cm: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            temperature_controlled: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                
            },
            temperature_min: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            temperature_max: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            priority_level: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'normal',
            },
            accessibility_level: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'easy',
            },
            is_active: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                defaultValue: 1,
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
}, {
    tableName: 'warehouse_bins',
    timestamps: false
});

module.exports = WarehouseBin;
