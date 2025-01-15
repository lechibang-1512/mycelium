const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const Warehouse = sequelizeMaster.define('Warehouse', {
            warehouse_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            warehouse_uuid: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            location: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            contact_phone: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            contact_email: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            contact_manager: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
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
}, {
    tableName: 'warehouses',
    timestamps: false
});

module.exports = Warehouse;
