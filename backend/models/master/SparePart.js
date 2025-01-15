const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const SparePart = sequelizeMaster.define('SparePart', {
            part_code: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            part_name: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            part_category: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            part_type: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            compatible_product_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            compatible_device_category: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            compatible_brands: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            compatible_models: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            dimensions: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            weight_g: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            color_variants: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            quality_grade: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'STANDARD',
            },
            warranty_months: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                defaultValue: 3,
            },
            manufacturer: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            manufacturer_part_number: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            default_supplier_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            unit_cost: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            unit_price: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            currency: {
                type: DataTypes.STRING(10),
                allowNull: true,
                
                
                defaultValue: 'USD',
            },
            min_stock_level: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                defaultValue: 5,
            },
            max_stock_level: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                defaultValue: 50,
            },
            reorder_point: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                defaultValue: 10,
            },
            reorder_quantity: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                defaultValue: 20,
            },
            lead_time_days: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            is_active: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                defaultValue: 1,
            },
            is_hazardous: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                
            },
            requires_serial_tracking: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                
            },
            notes: {
                type: DataTypes.TEXT,
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
            spare_part_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
}, {
    tableName: 'spare_parts',
    timestamps: false
});

module.exports = SparePart;
