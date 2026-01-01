const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const PhoneSpec = sequelizeMaster.define('PhoneSpec', {
            product_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            device_type: {
                type: DataTypes.ENUM('smartphone','tablet','laptop','accessory','spare_part','other'),
                allowNull: true,
                
                
                defaultValue: 'smartphone',
            },
            device_name: {
                type: DataTypes.VIRTUAL,
            },
            device_maker: {
                type: DataTypes.VIRTUAL,
            },
            device_price: {
                type: DataTypes.VIRTUAL,
            },
            color: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            attributes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            processor: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            ram: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            rom: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            display_size: {
                type: DataTypes.DECIMAL,
                allowNull: true,
            },
            resolution: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            refresh_rate: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            battery_capacity: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            fast_charging: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            rear_camera_main: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            front_camera: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            operating_system: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            water_and_dust_rating: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            nfc: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            warranty_months: {
                type: DataTypes.VIRTUAL,
            },
            warranty_type: {
                type: DataTypes.VIRTUAL,
            },
            inv_staging_inventory: {
                type: DataTypes.VIRTUAL,
            },
            inv_reorder_point: {
                type: DataTypes.VIRTUAL,
            },
            inv_reorder_quantity: {
                type: DataTypes.VIRTUAL,
            },
            inv_lead_time_days: {
                type: DataTypes.VIRTUAL,
            },
            inv_safety_stock: {
                type: DataTypes.VIRTUAL,
            },
            inv_avg_daily_usage: {
                type: DataTypes.VIRTUAL,
            },
            default_supplier_id: {
                type: DataTypes.VIRTUAL,
            },
            is_active: {
                type: DataTypes.VIRTUAL,
            },
            is_discontinued: {
                type: DataTypes.VIRTUAL,
            },
            launch_date: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            end_of_life_date: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            created_at: {
                type: DataTypes.VIRTUAL,
            },
            updated_at: {
                type: DataTypes.VIRTUAL,
            },
}, {
    tableName: 'phone_specs',
    timestamps: false
});

module.exports = PhoneSpec;
