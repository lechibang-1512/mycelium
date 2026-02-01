/**
 * APIs Barrel File
 * Centralized exports for data access layer
 */

const sparePartsApi = require('./sparePartsApi');
const locationApi = require('./locationApi');

module.exports = {
    sparePartsApi,
    locationApi
};
