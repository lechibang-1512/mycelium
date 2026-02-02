/**
 * Device Search API Routes
 * Provides device-centric search across repair jobs and RMAs for IMEI/serial matching
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const DeviceSearchService = require('../services/DeviceSearchService');

module.exports = () => {
  const deviceSearchService = new DeviceSearchService();

  /**
   * @route   GET /api/device-search/:identifier
   * @desc    Search for device across repair jobs and RMAs by IMEI, serial, or device name
   * @access  Private
   */
  router.get('/:identifier', asyncHandler(async (req, res) => {
    const { identifier } = req.params;
    const { type } = req.query; // 'imei', 'serial', or 'auto'

    if (!identifier || identifier.length < 3) {
      return res.status(400).json({ error: 'Identifier must be at least 3 characters' });
    }

    const results = await deviceSearchService.searchDevice(identifier, type || 'auto');
    res.json(results);
  }));

  /**
   * @route   GET /api/device-search/suggest/:partial
   * @desc    Get device suggestions for autocomplete based on partial identifier
   * @access  Private
   */
  router.get('/suggest/:partial', asyncHandler(async (req, res) => {
    const { partial } = req.params;

    if (!partial || partial.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await deviceSearchService.getDeviceSuggestions(partial);
    res.json({ suggestions });
  }));

  return router;
};