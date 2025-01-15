const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const RepairJob = sequelizeMaster.define('RepairJob', {
            job_number: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            product_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            device_name: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            device_serial_number: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            device_imei: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            customer_name: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            customer_phone: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            customer_email: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            customer_address: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            issue_description: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            diagnosis: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            repair_notes: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            status: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'PENDING',
            },
            priority: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'NORMAL',
            },
            assigned_technician: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            assigned_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            warehouse_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            received_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            estimated_completion_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            completion_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            delivered_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            cost_estimated: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            cost_parts: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            cost_labor: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            cost_final: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            cost_customer_charge: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            currency: {
                type: DataTypes.STRING(10),
                allowNull: true,
                
                
                defaultValue: 'USD',
            },
            tested_by: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            test_results: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            quality_check_passed: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                
            },
            warranty_months: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                defaultValue: 3,
            },
            warranty_expires_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            created_by: {
                type: DataTypes.STRING(255),
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
            repair_job_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
}, {
    tableName: 'repair_jobs',
    timestamps: false
});

module.exports = RepairJob;
