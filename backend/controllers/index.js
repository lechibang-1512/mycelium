/**
 * API Router Index - Consolidated Version (MongoDB)
 * 
 * All routes now use MongoDB/Mongoose. Pool parameter is ignored for backward compatibility.
 */

const express = require('express');
const router = express.Router();

module.exports = () => {
    // ========================================================================
    // STANDALONE MODULES
    // ========================================================================

    // Auth routes
    const authAPI = require('./auth')();
    router.use('/auth', authAPI);

    // Audit logging
    const auditAPI = require('./audit')();
    router.use('/audit', auditAPI);

    // User management
    const usersAPI = require('./users')();
    router.use('/users', usersAPI);

    // Invoices
    const invoicesAPI = require('./invoices')();
    router.use('/invoices', invoicesAPI);

    // Stocktake and recommendations
    const stocktakeAPI = require('./stocktake')();
    const recommendationsAPI = require('./recommendations')();
    router.use('/stocktake', stocktakeAPI);
    router.use('/recommendations', recommendationsAPI);

    // ========================================================================
    // WAREHOUSE MANAGEMENT
    // ========================================================================
    const warehousesAPI = require('./warehouses')();
    router.use('/warehouses', warehousesAPI);

    // ========================================================================
    // INVENTORY DOMAIN
    // ========================================================================
    const inventoryAPI = require('./inventory')();
    const inventoryOpsAPI = require('./inventory-ops')();
    const receivingAPI = require('./receiving')();

    router.use('/inventory', inventoryAPI);
    router.use('/receiving', receivingAPI);
    router.use('/', inventoryOpsAPI);

    // Serialized inventory management
    const serializedInventoryAPI = require('./serialized-inventory')();
    router.use('/serialized-inventory', serializedInventoryAPI);

    // ========================================================================
    // RBAC CONSOLIDATED
    // ========================================================================
    const rbacAPI = require('./rbac')();
    router.use('/', rbacAPI);

    // ========================================================================
    // LOCATION CONSOLIDATED
    // ========================================================================
    const locationAPI = require('./location')();
    router.use('/', locationAPI);

    // ========================================================================
    // SERVICE OPERATIONS CONSOLIDATED
    // ========================================================================
    const serviceOperationsAPI = require('./service-operations')();
    router.use('/', serviceOperationsAPI);

    // ========================================================================
    // CATALOG CONSOLIDATED
    // ========================================================================
    const catalogAPI = require('./catalog')();
    router.use('/', catalogAPI);

    // ========================================================================
    // INVENTORY REWORK 2026 - New Features
    // ========================================================================
    const customerInvoicesAPI = require('./customer-invoices');
    router.use('/customer-invoices', customerInvoicesAPI);

    const disposalAPI = require('./disposal');
    router.use('/disposal', disposalAPI);

    const lotsAPI = require('./lots');
    router.use('/lots', lotsAPI);

    // ========================================================================
    // HEALTH CHECK
    // ========================================================================
    router.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '2.0.0-mongodb'
        });
    });

    return router;
};
