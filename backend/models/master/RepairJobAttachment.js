const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const RepairJobAttachment = sequelizeMaster.define('RepairJobAttachment', {
            file_name: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            file_path: {
                type: DataTypes.STRING(500),
                allowNull: true,
                
                
                
            },
            file_type: {
                type: DataTypes.ENUM('IMAGE','DOCUMENT','VIDEO','OTHER'),
                allowNull: true,
                
                
                defaultValue: 'IMAGE',
            },
            file_size_kb: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            mime_type: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            attachment_category: {
                type: DataTypes.ENUM('BEFORE_PHOTO','AFTER_PHOTO','INVOICE','QUOTE','DIAGNOSTIC_REPORT','WARRANTY_CARD','OTHER'),
                allowNull: true,
                
                
                defaultValue: 'OTHER',
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            uploaded_by: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            uploaded_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            attachment_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            repair_job_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
}, {
    tableName: 'repair_job_attachments',
    timestamps: false
});

module.exports = RepairJobAttachment;
