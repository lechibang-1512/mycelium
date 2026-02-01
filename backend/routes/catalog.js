/**
 * Catalog Consolidated Routes (MongoDB)
 * Consolidates: phones.js, suppliers.js, device-search.js, reports.js
 */

const express = require('express');
const router = express.Router();

const phonesRoutes = require('./phones');
const suppliersRoutes = require('./suppliers');
const deviceSearchRoutes = require('./device-search');
const reportsRoutes = require('./reports');

module.exports = () => {
    router.use('/phones', phonesRoutes());
    router.use('/suppliers', suppliersRoutes());
    router.use('/device-search', deviceSearchRoutes());
    router.use('/reports', reportsRoutes());
    return router;
};
