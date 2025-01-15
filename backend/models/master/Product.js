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
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            brand: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            model: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            base_price: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            currency: {
                type: DataTypes.STRING(10),
                allowNull: true,
                
                
                defaultValue: 'VND',
            },
            specifications: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            requires_serial_tracking: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                
            },
            serial_format: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            default_supplier_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            reorder_point: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            reorder_quantity: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            lead_time_days: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                defaultValue: 7,
            },
            safety_stock: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            is_active: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                defaultValue: 1,
            },
            is_discontinued: {
                type: DataTypes.TINYINT,
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
}, {
    tableName: 'products',
    timestamps: false
});

module.exports = Product;
