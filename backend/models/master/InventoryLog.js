const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const InventoryLog = sequelizeMaster.define('InventoryLog', {
    product_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        primaryKey: true,



    },
    spare_part_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        primaryKey: true,



    },
    asset_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        primaryKey: true,



    },
    transaction_type: {
        type: DataTypes.STRING,
        allowNull: true,



    },
    quantity_changed: {
        type: DataTypes.INTEGER,
        allowNull: true,



    },
    condition: {
        type: DataTypes.STRING,
        allowNull: true,


        defaultValue: 'NEW',
    },
    transaction_date: {
        type: DataTypes.DATE,
        allowNull: true,



    },
    from_zone_id: {
        type: DataTypes.INTEGER,
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
    receipt_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        primaryKey: true,



    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        primaryKey: true,



    },
    supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        primaryKey: true,



    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,



    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,



    },
    unit_cost: {
        type: DataTypes.DECIMAL,
        allowNull: true,



    },
    total_value: {
        type: DataTypes.DECIMAL,
        allowNull: true,



    },
    batch_no: {
        type: DataTypes.STRING(100),
        allowNull: true,



    },
    lot_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        primaryKey: true,



    },
    expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,



    },
    new_inventory_level: {
        type: DataTypes.INTEGER,
        allowNull: true,



    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: true,



    },
    serial_number: {
        type: DataTypes.STRING(100),
        allowNull: true,



    },
    reference_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        primaryKey: true,



    },
    subtotal: {
        type: DataTypes.DECIMAL,
        allowNull: true,


        defaultValue: '0.00',
    },
    tax_amount: {
        type: DataTypes.DECIMAL,
        allowNull: true,


        defaultValue: '0.00',
    },
    total_amount: {
        type: DataTypes.DECIMAL,
        allowNull: true,


        defaultValue: '0.00',
    },
    transaction_group_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        primaryKey: true,



    },
    item_sequence: {
        type: DataTypes.INTEGER,
        allowNull: true,



    },
    po_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        primaryKey: true,



    },
    invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        primaryKey: true,



    },
    warehouse_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        primaryKey: true,



    },
    from_warehouse_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        primaryKey: true,



    },
    from_bin_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        primaryKey: true,



    },
    external_doc_no: {
        type: DataTypes.STRING(100),
        allowNull: true,



    },
    customer_name: {
        type: DataTypes.STRING(255),
        allowNull: true,



    },
    customer_address: {
        type: DataTypes.TEXT,
        allowNull: true,



    },
    delivery_person: {
        type: DataTypes.STRING(255),
        allowNull: true,



    },
    document_reference: {
        type: DataTypes.STRING(255),
        allowNull: true,



    },
    unit_of_measure: {
        type: DataTypes.STRING(50),
        allowNull: true,


        defaultValue: 'Unit',
    },
    doc_type: {
        type: DataTypes.STRING(10),
        allowNull: true,



    },
    doc_number: {
        type: DataTypes.STRING(50),
        allowNull: true,



    },
    log_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        primaryKey: true,



    },
    batch_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        primaryKey: true,



    },
}, {
    tableName: 'inventory_log',
    timestamps: false
});

module.exports = InventoryLog;
