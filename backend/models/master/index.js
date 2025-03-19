// Automatically generated from schema
const Supplier = require('./Supplier');
const PhoneSpec = require('./PhoneSpec');
const Warehouse = require('./Warehouse');
const Product = require('./Product');
const SparePart = require('./SparePart');
const Invoice = require('./Invoice');
const WarehouseZone = require('./WarehouseZone');
const InvoiceItem = require('./InvoiceItem');
const RepairJob = require('./RepairJob');
const RepairJobAttachment = require('./RepairJobAttachment');
const RepairJobPart = require('./RepairJobPart');
const Transaction = require('./Transaction');
const TransactionItem = require('./TransactionItem');
const Rma = require('./Rma');
const RmaItem = require('./RmaItem');
const Stocktake = require('./Stocktake');
const StocktakeItem = require('./StocktakeItem');
const StocktakeStatusHistory = require('./StocktakeStatusHistory');
const WarehouseBin = require('./WarehouseBin');
const Inventory = require('./Inventory');

// Define associations here

// Hierarchy: Warehouse -> Zone -> Bin
Warehouse.hasMany(WarehouseZone, { foreignKey: 'warehouse_id' });
WarehouseZone.belongsTo(Warehouse, { foreignKey: 'warehouse_id' });

WarehouseZone.hasMany(WarehouseBin, { foreignKey: 'zone_id' });
WarehouseBin.belongsTo(WarehouseZone, { foreignKey: 'zone_id' });

// Product <-> Inventory
Product.hasMany(Inventory, { foreignKey: 'product_id' });
Inventory.belongsTo(Product, { foreignKey: 'product_id' });

// Warehouse/Zone/Bin <-> Inventory
Warehouse.hasMany(Inventory, { foreignKey: 'warehouse_id' });
Inventory.belongsTo(Warehouse, { foreignKey: 'warehouse_id' });

WarehouseZone.hasMany(Inventory, { foreignKey: 'zone_id' });
Inventory.belongsTo(WarehouseZone, { foreignKey: 'zone_id' });

WarehouseBin.hasMany(Inventory, { foreignKey: 'bin_id' });
Inventory.belongsTo(WarehouseBin, { foreignKey: 'bin_id' });

// Transactions
Transaction.hasMany(TransactionItem, { foreignKey: 'transaction_id' });
TransactionItem.belongsTo(Transaction, { foreignKey: 'transaction_id' });

// Invoice
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id' });

// RMAs
Rma.hasMany(RmaItem, { foreignKey: 'rma_id' });
RmaItem.belongsTo(Rma, { foreignKey: 'rma_id' });

// Repair Jobs
RepairJob.hasMany(RepairJobPart, { foreignKey: 'repair_job_id' });
RepairJobPart.belongsTo(RepairJob, { foreignKey: 'repair_job_id' });

RepairJob.hasMany(RepairJobAttachment, { foreignKey: 'repair_job_id' });
RepairJobAttachment.belongsTo(RepairJob, { foreignKey: 'repair_job_id' });

module.exports = {
    Supplier,
    PhoneSpec,
    Warehouse,
    Product,
    SparePart,
    Invoice,
    WarehouseZone,
    InvoiceItem,
    RepairJob,
    RepairJobPart,
    Transaction,
    Rma,
    Stocktake,
    StocktakeItem,
    StocktakeStatusHistory,
    WarehouseBin,
    Inventory
};
