const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const SparePart = sequelizeMaster.define('SparePart', {
            part_code: {
                type: DataTypes.VIRTUAL,
            },
            part_name: {
                type: DataTypes.VIRTUAL,
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
                type: DataTypes.VIRTUAL,
            },
            compatible_product_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
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
                type: DataTypes.VIRTUAL,
            },
            manufacturer: {
                type: DataTypes.VIRTUAL,
            },
            manufacturer_part_number: {
                type: DataTypes.VIRTUAL,
            },
            default_supplier_id: {
                type: DataTypes.VIRTUAL,
            },
            unit_cost: {
                type: DataTypes.VIRTUAL,
            },
            unit_price: {
                type: DataTypes.VIRTUAL,
            },
            currency: {
                type: DataTypes.VIRTUAL,
            },
            min_stock_level: {
                type: DataTypes.VIRTUAL,
            },
            max_stock_level: {
                type: DataTypes.VIRTUAL,
            },
            reorder_point: {
                type: DataTypes.VIRTUAL,
            },
            reorder_quantity: {
                type: DataTypes.VIRTUAL,
            },
            lead_time_days: {
                type: DataTypes.VIRTUAL,
            },
            is_active: {
                type: DataTypes.VIRTUAL,
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
                type: DataTypes.VIRTUAL,
            },
            created_by: {
                type: DataTypes.VIRTUAL,
            },
            created_at: {
                type: DataTypes.VIRTUAL,
            },
            updated_at: {
                type: DataTypes.VIRTUAL,
            },
            spare_part_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
                primaryKey: true,
                field: 'product_id'
            },
}, {
    tableName: 'spare_part_specs',
    timestamps: false
});

module.exports = SparePart;
