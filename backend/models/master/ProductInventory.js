const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const ProductInventory = sequelizeMaster.define('ProductInventory', {
    product_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        primaryKey: true,



    },
    serial_number: {
        type: DataTypes.STRING(255),
        allowNull: true,



    },
    batch_number: {
        type: DataTypes.STRING(100),
        allowNull: true,



    },
    warehouse_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        primaryKey: true,



    },
    zone_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        primaryKey: true,



    },
    bin_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        primaryKey: true,



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
    status: {
        type: DataTypes.STRING,
        allowNull: true,


        defaultValue: 'AVAILABLE',
    },
    condition_status: {
        type: DataTypes.STRING,
        allowNull: true,


        defaultValue: 'NEW',
    },
    purchase_cost: {
        type: DataTypes.DECIMAL,
        allowNull: true,



    },
    purchase_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,



    },
    manufacture_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,



    },
    expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,



    },
    warranty_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true,



    },
    last_counted_at: {
        type: DataTypes.DATE,
        allowNull: true,



    },
    last_counted_by: {
        type: DataTypes.STRING(100),
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
    condition_notes: {
        type: DataTypes.TEXT,
        allowNull: true,



    },
    location_notes: {
        type: DataTypes.TEXT,
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
    inventory_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        primaryKey: true,



    },
}, {
    tableName: 'product_inventory',
    timestamps: false
});

module.exports = ProductInventory;
