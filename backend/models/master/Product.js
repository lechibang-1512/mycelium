const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const Product = sequelizeMaster.define('Product', {
            product_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            product_type: {
                type: DataTypes.ENUM('PHONE','SPARE_PART','ACCESSORY'),
                allowNull: true,
                
                
                defaultValue: 'PHONE',
            },
            sku: {
                type: DataTypes.STRING(100),
                allowNull: true,
                field: 'part_code'
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            category: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            subcategory: {
                type: DataTypes.VIRTUAL,
            },
            brand: {
                type: DataTypes.STRING(100),
                allowNull: true,
                field: 'manufacturer'
            },
            model: {
                type: DataTypes.VIRTUAL,
            },
            base_price: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                field: 'unit_price'
            },
            unit_cost: {
                type: DataTypes.DECIMAL,
                allowNull: true,
            },
            unit_price: {
                type: DataTypes.DECIMAL,
                allowNull: true,
            },
            currency: {
                type: DataTypes.STRING(10),
                allowNull: true,
                defaultValue: 'VND',
            },
            image_url: {
                type: DataTypes.STRING(500),
                allowNull: true,
            },
            warranty_months: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 12,
            },
            specifications: {
                type: DataTypes.VIRTUAL,
            },
            requires_serial_tracking: {
                type: DataTypes.VIRTUAL,
            },
            serial_format: {
                type: DataTypes.VIRTUAL,
            },
            default_supplier_id: {
                type: DataTypes.VIRTUAL,
            },
            reorder_point: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            reorder_quantity: {
                type: DataTypes.VIRTUAL,
            },
            lead_time_days: {
                type: DataTypes.VIRTUAL,
            },
            safety_stock: {
                type: DataTypes.VIRTUAL,
            },
            is_active: {
                type: DataTypes.TINYINT,
                allowNull: true,
                defaultValue: 1,
            },
            is_discontinued: {
                type: DataTypes.VIRTUAL,
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
    tableName: 'products',
    timestamps: false
});

module.exports = Product;
