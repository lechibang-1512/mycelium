const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const SmartphoneSparePart = sequelizeMaster.define('SmartphoneSparePart', {
    spare_part_uuid: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        primaryKey: true,



    },
    part_code: {
        type: DataTypes.STRING(50),
        allowNull: true,



    },
    part_name: {
        type: DataTypes.STRING(255),
        allowNull: true,



    },
    part_category: {
        type: DataTypes.STRING,
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
        type: DataTypes.CHAR(36),
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
        type: DataTypes.STRING,
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
        type: DataTypes.STRING(100),
        allowNull: true,



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
    default_supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        primaryKey: true,



    },
    lead_time_days: {
        type: DataTypes.INTEGER,
        allowNull: true,



    },
    minimum_stock_level: {
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
}, {
    tableName: 'smartphone_spare_parts',
    timestamps: false
});

module.exports = SmartphoneSparePart;
