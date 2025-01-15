/**
 * Service Operations Consolidated Routes
 * Consolidates: repair-jobs.js, repair-job-templates.js, rma.js, spare-parts.js
 */

const express = require('express');
const router = express.Router();

const repairManagementRoutes = require('./repair-management');
const rmaRoutes = require('./rma');
const sparePartsRoutes = require('./spare-parts');

module.exports = () => {
    router.use('/', repairManagementRoutes());
    router.use('/rma', rmaRoutes());
    router.use('/spare-parts', sparePartsRoutes());
    return router;
};
