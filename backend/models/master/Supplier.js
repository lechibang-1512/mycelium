const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const Supplier = sequelizeMaster.define('Supplier', {
            name: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            category: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            contact_person: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            contact_position: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            phone: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            website: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            address: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            city: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            province: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            ward: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            district: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            tax_code: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            payment_terms: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            lead_time_days: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            rating: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            brands: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            additional_contacts: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            notes: {
                type: DataTypes.TEXT,
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
            supplier_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
}, {
    tableName: 'suppliers',
    timestamps: false
});

module.exports = Supplier;
