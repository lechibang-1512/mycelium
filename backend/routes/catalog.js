/**
 * Catalog Consolidated Routes
 * Consolidates: phones.js, suppliers.js, reports.js
 */

const express = require('express');
const router = express.Router();

const phonesRoutes = require('./phones');
const suppliersRoutes = require('./suppliers');
const reportsRoutes = require('./reports');

module.exports = () => {
    router.use('/phones', phonesRoutes());
    router.use('/suppliers', suppliersRoutes());
    router.use('/reports', reportsRoutes());
    return router;
};
