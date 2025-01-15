const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const RepairJobTemplate = sequelizeMaster.define('RepairJobTemplate', {
            template_name: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            template_category: {
                type: DataTypes.ENUM('SCREEN_REPAIR','BATTERY_REPLACEMENT','CHARGING_PORT','WATER_DAMAGE','SOFTWARE_ISSUE','CAMERA_REPAIR','SPEAKER_REPAIR','BUTTON_REPAIR','OTHER'),
                allowNull: true,
                
                
                defaultValue: 'OTHER',
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            default_priority: {
                type: DataTypes.ENUM('LOW','NORMAL','HIGH','URGENT'),
                allowNull: true,
                
                
                defaultValue: 'NORMAL',
            },
            estimated_cost: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            estimated_labor_cost: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            estimated_duration_hours: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                defaultValue: 2,
            },
            default_parts: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            checklist: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            diagnosis_template: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            repair_notes_template: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            warranty_months: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                defaultValue: 3,
            },
            is_active: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                defaultValue: 1,
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            created_by: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            template_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
}, {
    tableName: 'repair_job_templates',
    timestamps: false
});

module.exports = RepairJobTemplate;
