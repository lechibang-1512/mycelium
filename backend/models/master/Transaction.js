const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const Transaction = sequelizeMaster.define('Transaction', {
            transaction_group_id: {
                type: DataTypes.STRING(100),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            receipt_id: {
                type: DataTypes.STRING(100),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            transaction_type: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            transaction_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            warehouse_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            from_warehouse_id: {
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
            subtotal: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            tax_amount: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            total_amount: {
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
            supplier_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            invoice_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            po_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            external_doc_no: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            document_reference: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            customer: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            delivery_person: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            internal_notes: {
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
    tableName: 'transactions',
    timestamps: false
});

module.exports = Transaction;
