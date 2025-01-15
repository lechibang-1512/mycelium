const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const InvoiceItem = sequelizeMaster.define('InvoiceItem', {
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
            product_name: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            product_uuid: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            unit: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            unit_name: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            quantity: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                defaultValue: 1,
            },
            unit_price: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            total_price: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            tax_rate: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '10.00',
            },
            tax_amount: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            discount_rate: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            discount_amount: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            total_amount: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            invoice_id: {
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
    tableName: 'invoice_items',
    timestamps: false
});

module.exports = InvoiceItem;
