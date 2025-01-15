const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const RepairJobPart = sequelizeMaster.define('RepairJobPart', {
            spare_part_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            inventory_id: {
                type: DataTypes.BIGINT,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            quantity_used: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                defaultValue: 1,
            },
            unit_cost: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            total_cost: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            installed_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            installed_by: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            warranty_months: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            repair_job_id: {
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
    tableName: 'repair_job_parts',
    timestamps: false
});

module.exports = RepairJobPart;
