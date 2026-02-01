/**
 * Model Index
 * Central export for all Mongoose models
 */

const Product = require('./Product');
const Warehouse = require('./Warehouse');
const Inventory = require('./Inventory');
const Transaction = require('./Transaction');
const Supplier = require('./Supplier');
const Invoice = require('./Invoice');
const SparePart = require('./SparePart');
const RepairJob = require('./RepairJob');
const RMA = require('./RMA');
const User = require('./User');
const Role = require('./Role');
const Session = require('./Session');
const AuditLog = require('./AuditLog');
const CasbinRule = require('./CasbinRule');

module.exports = {
    // Core business models
    Product,
    Warehouse,
    Inventory,
    Transaction,
    Supplier,
    Invoice,
    SparePart,
    RepairJob,
    RMA,

    // Security models
    User,
    Role,
    Session,
    AuditLog,
    CasbinRule
};
