const asyncHandler = require('../utils/asyncHandler');
const express = require('express');
const router = express.Router();
const SanitizationService = require('../services/SanitizationService');
const { requirePermission } = require('../middleware/rbacMiddleware');

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
  const PhonesService = require('../services/PhonesService');
  const phonesService = new PhonesService();

  // Get all phones
  router.get('/', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    try {
      const phones = await phonesService.getAllPhones(req.query);
      // Convert BigInt and rename product_id to id
      const convertedPhones = phones.map(p => {
        const converted = convertBigIntToNumber(p);
        return {
          ...converted,
          id: converted.product_id
        };
      });
      res.json({ success: true, products: convertedPhones });
    } catch (error) {
      console.error('Error fetching phones:', error);
      res.status(500).json({ error: 'Failed to fetch phones' });
    }
  }));

  // Get single phone with full details
  router.get('/:id', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    // AUTHENTICATION INTENTIONALLY DISABLED - Internal tool with direct DB access
    // Note: This API is designed for internal use only. Ensure network-level security.

    try {
      const phone = await phonesService.getPhoneById(req.params.id);

      if (!phone) {
        return res.status(404).json({ error: 'Phone not found' });
      }

      // Convert BigInt and rename product_id to id
      const converted = convertBigIntToNumber(phone);
      res.json({
        success: true,
        phone: {
          ...converted,
          id: converted.product_id
        }
      });
    } catch (error) {
      console.error('Error fetching phone:', error);
      res.status(500).json({ error: 'Failed to fetch phone' });
    }
  }));

  // Add new phone
  router.post('/', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    // AUTHENTICATION INTENTIONALLY DISABLED - Internal tool with direct DB access
    // Note: This API is designed for internal use only. Ensure network-level security.

    try {
      const insertId = await phonesService.createPhone(req.body);

      res.status(201).json({
        success: true,
        message: 'Phone added successfully',
        id: convertBigIntToNumber(insertId)
      });
    } catch (error) {
      console.error('Error adding phone:', error);
      if (error.message.includes('Missing required fields')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to add phone' });
    }
  }));

  // Update phone (full update)
  router.put('/:id', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    // AUTHENTICATION INTENTIONALLY DISABLED - Internal tool with direct DB access
    // Note: This API is designed for internal use only. Ensure network-level security.

    try {
      const result = await phonesService.updatePhone(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      console.error('Error updating phone:', error);
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'Phone not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update phone' });
    }
  }));

  // Delete phone
  router.delete('/:id', requirePermission('inventory:delete'), asyncHandler(async (req, res) => {
    // AUTHENTICATION INTENTIONALLY DISABLED - Internal tool with direct DB access
    // Note: This API is designed for internal use only. Ensure network-level security.

    try {
      const result = await phonesService.deletePhone(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Error deleting phone:', error);
      if (error.message === 'Phone not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete phone' });
    }
  }));

  return router;
};
