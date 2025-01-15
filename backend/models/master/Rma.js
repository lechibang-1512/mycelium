const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const Rma = sequelizeMaster.define('Rma', {
            rma_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            customer_name: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            customer_email: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            customer_phone: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            original_receipt_id: {
                type: DataTypes.STRING(100),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            original_transaction_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            reason_code: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            reason_description: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            status: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'pending',
            },
            priority: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'medium',
            },
            warehouse_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            quarantine_zone_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            requested_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            assigned_to: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            expected_return_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            actual_return_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            inspection_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            completion_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            total_value: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            refund_amount: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            restocking_fee: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
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
    tableName: 'rmas',
    timestamps: false
});

module.exports = Rma;
