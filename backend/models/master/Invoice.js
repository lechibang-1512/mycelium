const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const Invoice = sequelizeMaster.define('Invoice', {
            uuid: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            invoice_number: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            pattern_number: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            serial_number: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            supplier_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            status: {
                type: DataTypes.ENUM('draft','issued','paid','cancelled'),
                allowNull: true,
                
                
                defaultValue: 'draft',
            },
            verification_status: {
                type: DataTypes.ENUM('draft','issued','paid','cancelled'),
                allowNull: true,
                
                
                defaultValue: 'PENDING',
            },
            invoice_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            due_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            imported_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            subtotal: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            tax_rate: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '10.00',
            },
            tax_amount: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            shipping_fee: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            discount_amount: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            total_amount: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            currency: {
                type: DataTypes.STRING(10),
                allowNull: true,
                
                
                defaultValue: 'VND',
            },
            payment_method: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'TM/CK',
            },
            notes: {
                type: DataTypes.TEXT,
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
            id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
}, {
    tableName: 'invoices',
    timestamps: false
});

module.exports = Invoice;
