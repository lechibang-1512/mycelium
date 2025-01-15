/**
 * API Router Index - Consolidated Version (MariaDB/SQL)
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

    // Dashboard
    const dashboardAPI = require('./dashboard')();
    router.use('/dashboard', dashboardAPI);

    // Audit logging
    const auditAPI = require('./audit')();
    router.use('/audit', auditAPI);

    // User management
    const usersAPI = require('./users')();
    router.use('/users', usersAPI);

    // RBAC management
    const rbacAPI = require('./rbac')();
    router.use('/rbac', rbacAPI);

    // Invoices
    const invoicesAPI = require('./invoices')();
    router.use('/invoices', invoicesAPI);

    // Stocktake
    const stocktakeAPI = require('./stocktake')();
    router.use('/stocktake', stocktakeAPI);

    // ========================================================================
    // WAREHOUSE MANAGEMENT
    // ========================================================================
    const warehousesAPI = require('./warehouses')();
    router.use('/warehouses', warehousesAPI);

    // ========================================================================
    // PURCHASE ORDERS & PROCUREMENT
    // ========================================================================
    const purchaseOrdersAPI = require('./purchase-orders')();
    router.use('/purchase-orders', purchaseOrdersAPI);

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
    // PC COMPONENTS & BUILDS
    // ========================================================================
    const pcComponentRoutes = require('./pc_components');
    const pcInventoryRoutes = require('./pc_inventory');
    const pcBuildRoutes = require('./pc_builds');
    router.use('/pc-components', pcComponentRoutes);
    router.use('/pc-inventory', pcInventoryRoutes);
    router.use('/pc-builds', pcBuildRoutes);

    // ========================================================================
    // HEALTH CHECK
    // ========================================================================
    router.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '2.0.0-mariadb'
        });
    });

    return router;
};
