const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const RmaItem = sequelizeMaster.define('RmaItem', {
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
            serial_number: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            quantity: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                defaultValue: 1,
            },
            condition_detail: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            disposition: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            unit_value: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            rma_table_id: {
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
    tableName: 'rma_items',
    timestamps: false
});

module.exports = RmaItem;
