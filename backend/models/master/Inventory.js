const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const Inventory = sequelizeMaster.define('Inventory', {
            inventory_type: {
                type: DataTypes.ENUM('bulk','serialized','spare_part','batch'),
                allowNull: true,
                
                
                
            },
            product_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            batch_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            batch_no: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            warehouse_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            zone_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            bin_id: {
                type: DataTypes.STRING(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            quantity: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            reserved_quantity: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            min_stock_level: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            condition_status: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'NEW',
            },
            serial_number: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            imei_1: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            imei_2: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            status: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'available',
            },
            condition_grade: {
                type: DataTypes.STRING(10),
                allowNull: true,
                
                
                defaultValue: 'A',
            },
            quantity_on_hand: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            quantity_reserved: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            quantity_defective: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            quantity_in_transit: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            manufacture_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            expiry_date: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            supplier_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            import_invoice_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            last_counted_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            last_counted_by: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            last_movement_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            last_movement_type: {
                type: DataTypes.STRING(50),
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
            id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            spare_part_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
}, {
    tableName: 'inventory',
    timestamps: false
});

module.exports = Inventory;
