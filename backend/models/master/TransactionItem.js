const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const TransactionItem = sequelizeMaster.define('TransactionItem', {
            transaction_group_id: {
                type: DataTypes.STRING(100),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            product_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            spare_part_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            batch_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            asset_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            serial_number: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            quantity_changed: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            condition_status: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'NEW',
            },
            unit_cost: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            total_value: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            from_warehouse_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            from_zone_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            from_bin_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            to_warehouse_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            to_zone_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            to_bin_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            new_inventory_level: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            transaction_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
}, {
    tableName: 'transaction_items',
    timestamps: false
});

module.exports = TransactionItem;
