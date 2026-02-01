/**
 * Spare Parts Management API Routes
 * Handles CRUD operations for smartphone spare parts catalog, inventory, and repairs
 */

const express = require('express');
const router = express.Router();
const SparePartsService = require('../services/SparePartsService');
const SanitizationService = require('../services/SanitizationService');
const Inventory = require('../models/Inventory');
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/response');

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
  const sparePartsService = new SparePartsService();

  // ============================================
  // SPARE PARTS CATALOG ENDPOINTS
  // ============================================

  /**
   * GET /api/spare-parts
   * Get all spare parts with optional filtering
   */
  router.get('/', async (req, res) => {
    try {
      const rows = await sparePartsService.getAllSpareParts(req.query);
      const converted = Array.isArray(rows) ? rows.map(convertBigIntToNumber) : [];

      sendSuccess(res, {
        data: converted,
        total: converted.length
      });
    } catch (error) {
      console.error('Error fetching spare parts:', error);
      sendError(res, 'Failed to fetch spare parts', 500, error.message);
    }
  });

  /**
   * GET /api/spare-parts/metadata/categories
   * Get list of all part categories with counts
   */
  router.get('/metadata/categories', async (req, res) => {
    try {
      const rows = await sparePartsService.getCategories();
      const converted = Array.isArray(rows) ? rows.map(convertBigIntToNumber) : [];

      sendSuccess(res, { data: converted });
    } catch (error) {
      console.error('Error fetching categories:', error);
      sendError(res, 'Failed to fetch categories', 500, error.message);
    }
  });

  /**
   * GET /api/spare-parts/reports/low-stock
   * Get spare parts with low stock levels
   */
  router.get('/reports/low-stock', async (req, res) => {
    try {
      const rows = await sparePartsService.getLowStockReport();
      const converted = Array.isArray(rows) ? rows.map(convertBigIntToNumber) : [];

      sendSuccess(res, {
        data: converted,
        total: converted.length
      });
    } catch (error) {
      console.error('Error fetching low stock report:', error);
      sendError(res, 'Failed to fetch low stock report', 500, error.message);
    }
  });

  /**
   * GET /api/spare-parts/inventory
   * Get paginated spare parts inventory with search/filters (MongoDB)
   */
  router.get('/inventory', async (req, res) => {
    try {
      const { search, status, limit = 50, offset = 0, include_inactive } = req.query;
      const limitNum = parseInt(limit, 10);
      const offsetNum = parseInt(offset, 10);

      // Build MongoDB query for spare_part inventory type
      const query = { inventory_type: 'spare_part' };

      if (status) {
        query.condition = status.toUpperCase();
      }

      // Get inventory items
      let inventoryItems = await Inventory.find(query)
        .sort({ created_at: -1 })
        .skip(offsetNum)
        .limit(limitNum)
        .lean();

      // Get product details for spare parts
      const productIds = [...new Set(inventoryItems.map(i => i.product_id).filter(Boolean))];
      const products = await Product.find({ product_id: { $in: productIds } }).lean();
      const productMap = {};
      products.forEach(p => { productMap[p.product_id] = p; });

      // Get warehouse names
      const warehouseIds = [...new Set(inventoryItems.map(i => i.warehouse_id).filter(Boolean))];
      const warehouses = await Warehouse.find({ warehouse_id: { $in: warehouseIds } }).lean();
      const warehouseMap = {};
      warehouses.forEach(w => { warehouseMap[w.warehouse_id] = w.name; });

      // Filter by search if provided
      if (search) {
        const searchLower = search.toLowerCase();
        inventoryItems = inventoryItems.filter(i => {
          const product = productMap[i.product_id];
          const productName = product?.device_name || product?.part_name || '';
          return productName.toLowerCase().includes(searchLower) ||
            (i.serial_number && i.serial_number.toLowerCase().includes(searchLower)) ||
            (i.batch_no && i.batch_no.toLowerCase().includes(searchLower));
        });
      }

      // Filter inactive if needed
      if (include_inactive !== 'true') {
        inventoryItems = inventoryItems.filter(i => {
          const product = productMap[i.product_id];
          return !product || product.is_active !== false;
        });
      }

      // Map to response format
      const rows = inventoryItems.map(i => {
        const product = productMap[i.product_id] || {};
        return {
          inventory_id: i._id,
          spare_part_uuid: i.product_id,
          product_name: product.device_name || product.part_name || 'Unknown',
          category: product.category || product.part_category,
          part_code: product.part_code,
          is_active: product.is_active !== false ? 1 : 0,
          serial_number: i.serial_number,
          batch_no: i.batch_no,
          condition_grade: i.condition || i.condition_grade,
          quantity_on_hand: i.quantity_on_hand || i.quantity || 0,
          warehouse_id: i.warehouse_id,
          warehouse_name: warehouseMap[i.warehouse_id] || 'Unknown',
          bin_id: i.bin_id,
          created_at: i.created_at
        };
      });

      sendSuccess(res, {
        data: rows.map(r => convertBigIntToNumber(r)),
        total: rows.length
      });
    } catch (error) {
      console.error('Error fetching spare parts inventory:', error);
      sendError(res, 'Failed to fetch spare parts inventory', 500, error.message);
    }
  });

  /**
   * GET /api/spare-parts/warehouse/:warehouseId
   * Get spare parts available in a specific warehouse (MongoDB)
   */
  router.get('/warehouse/:warehouseId', async (req, res) => {
    try {
      const warehouseId = req.params.warehouseId;
      const showInactive = req.query.include_inactive === 'true';

      // Build MongoDB query
      const query = {
        inventory_type: 'spare_part',
        warehouse_id: warehouseId,
        $expr: { $gt: [{ $subtract: ['$quantity_on_hand', { $ifNull: ['$quantity_reserved', 0] }] }, 0] }
      };

      let inventoryItems = await Inventory.find(query).lean();

      // Get warehouse name
      const warehouse = await Warehouse.findOne({ warehouse_id: warehouseId }).lean();
      const warehouseName = warehouse?.name || 'Unknown';

      // Get product details
      const productIds = [...new Set(inventoryItems.map(i => i.product_id).filter(Boolean))];
      const products = await Product.find({ product_id: { $in: productIds } }).lean();
      const productMap = {};
      products.forEach(p => { productMap[p.product_id] = p; });

      // Filter inactive if needed
      if (!showInactive) {
        inventoryItems = inventoryItems.filter(i => {
          const product = productMap[i.product_id];
          return !product || product.is_active !== false;
        });
      }

      // Map to response format
      const spareParts = inventoryItems.map(i => {
        const product = productMap[i.product_id] || {};
        return {
          spare_part_uuid: i.product_id,
          part_name: product.device_name || product.part_name || 'Unknown',
          part_code: product.part_code,
          part_category: product.category || product.part_category,
          unit_price: product.device_price || product.unit_price,
          is_active: product.is_active !== false ? 1 : 0,
          quantity_on_hand: i.quantity_on_hand || i.quantity || 0,
          quantity_reserved: i.quantity_reserved || 0,
          available_quantity: (i.quantity_on_hand || i.quantity || 0) - (i.quantity_reserved || 0),
          warehouse_id: i.warehouse_id,
          warehouse_name: warehouseName,
          bin_id: i.bin_id,
          condition_status: i.condition,
          batch_no: i.batch_no,
          serial_number: i.serial_number,
          expiry_date: i.expiry_date
        };
      });

      sendSuccess(res, {
        data: spareParts.map(p => convertBigIntToNumber(p)),
        warehouse_id: warehouseId,
        count: spareParts.length
      });
    } catch (error) {
      console.error('Error fetching spare parts for warehouse:', error);
      sendError(res, 'Failed to fetch spare parts for warehouse', 500, error.message);
    }
  });

  // ============================================
  // SPARE PARTS RECOMMENDATIONS ENDPOINTS
  // (Using SparePartsRecommendationService)
  // ============================================

  router.post('/recommendations/generate', async (req, res) => {
    try {
      const { warehouse_id, spare_part_uuid, recalculate_usage } = req.body;
      const options = { warehouse_id, spare_part_uuid, recalculate_usage: recalculate_usage !== false };
      const recommendations = await sparePartsService.generateRecommendations(options);

      sendSuccess(res, {
        data: recommendations,
        count: recommendations.length
      }, `Generated ${recommendations.length} spare parts recommendations`, 200);
    } catch (error) {
      console.error('Error generating spare parts recommendations:', error);
      sendError(res, 'Failed to generate recommendations', 500, error.message);
    }
  });

  router.get('/recommendations', async (req, res) => {
    try {
      const filters = {
        warehouse_id: req.query.warehouse_id,
        urgency_level: req.query.urgency_level,
        category: req.query.category,
        limit: req.query.limit
      };
      const recommendations = await sparePartsService.getPendingRecommendations(filters);

      sendSuccess(res, { data: recommendations, count: recommendations.length });
    } catch (error) {
      console.error('Error fetching spare parts recommendations:', error);
      sendError(res, 'Failed to fetch recommendations', 500, error.message);
    }
  });

  router.get('/recommendations/summary', async (req, res) => {
    try {
      const filters = { warehouse_id: req.query.warehouse_id };
      const summary = await sparePartsService.getRecommendationSummary(filters);

      sendSuccess(res, { data: summary });
    } catch (error) {
      console.error('Error fetching recommendations summary:', error);
      sendError(res, 'Failed to fetch summary', 500, error.message);
    }
  });

  router.put('/recommendations/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user_id = req.user?.id || null;

      if (!status) {
        return sendError(res, 'status is required', 400);
      }

      const result = await sparePartsService.updateRecommendationStatus(parseInt(id), status, user_id);

      sendSuccess(res, { data: result }, `Recommendation status updated to ${status}`);
    } catch (error) {
      console.error('Error updating recommendation status:', error);
      sendError(res, 'Failed to update status', 500, error.message);
    }
  });

  // ============================================
  // SPARE PART CRUD ENDPOINTS
  // ============================================

  /**
   * GET /api/spare-parts/:id
   * Get a specific spare part with inventory details
   */
  router.get('/:id', async (req, res) => {
    try {
      const sparePart = await sparePartsService.getSparePartById(req.params.id);

      if (!sparePart) {
        return sendError(res, 'Spare part not found', 404);
      }

      sendSuccess(res, { data: convertBigIntToNumber(sparePart) });
    } catch (error) {
      console.error('Error fetching spare part details:', error);
      sendError(res, 'Failed to fetch spare part details', 500, error.message);
    }
  });

  /**
   * POST /api/spare-parts
   * Create a new spare part
   */
  router.post('/', async (req, res) => {
    try {
      const result = await sparePartsService.createSparePart(req.body);

      sendSuccess(res, { data: convertBigIntToNumber(result) }, 'Spare part created successfully', 201);
    } catch (error) {
      console.error('Error creating spare part:', error);
      if (error.message.includes('required') || error.message.includes('already exists')) {
        return sendError(res, error.message, 400);
      }
      sendError(res, 'Failed to create spare part', 500, error.message);
    }
  });

  /**
   * PUT /api/spare-parts/:id
   * Update an existing spare part
   */
  router.put('/:id', async (req, res) => {
    try {
      const updated = await sparePartsService.updateSparePart(req.params.id, req.body);

      if (!updated) {
        return sendError(res, 'Spare part not found', 404);
      }

      sendSuccess(res, null, 'Spare part updated successfully');
    } catch (error) {
      console.error('Error updating spare part:', error);
      if (error.message === 'No fields to update') {
        return sendError(res, error.message, 400);
      }
      sendError(res, 'Failed to update spare part', 500, error.message);
    }
  });

  /**
   * DELETE /api/spare-parts/:id
   * Soft delete a spare part
   */
  router.delete('/:id', async (req, res) => {
    try {
      const deleted = await sparePartsService.deleteSparePart(req.params.id);

      if (!deleted) {
        return sendError(res, 'Spare part not found', 404);
      }

      sendSuccess(res, null, 'Spare part deactivated successfully');
    } catch (error) {
      console.error('Error deleting spare part:', error);
      if (error.message.includes('Cannot delete')) {
        return sendError(res, error.message, 400);
      }
      sendError(res, 'Failed to delete spare part', 500, error.message);
    }
  });

  // ============================================
  // SPARE PARTS INVENTORY ENDPOINTS
  // ============================================

  /**
   * GET /api/spare-parts/:id/inventory
   * Get inventory details for a specific spare part
   */
  router.get('/:id/inventory', async (req, res) => {
    try {
      const rows = await sparePartsService.getSparePartInventory(req.params.id);
      const converted = Array.isArray(rows) ? rows.map(convertBigIntToNumber) : [];

      sendSuccess(res, { data: converted });
    } catch (error) {
      console.error('Error fetching spare part inventory:', error);
      sendError(res, 'Failed to fetch spare part inventory', 500, error.message);
    }
  });

  /**
   * POST /api/spare-parts/inventory
   * Add inventory for a spare part (body-based)
   */
  router.post('/inventory', async (req, res) => {
    try {
      const inventoryId = await sparePartsService.addInventory(req.body);

      sendSuccess(res, { inventory_id: inventoryId }, 'Inventory added successfully', 201);
    } catch (error) {
      console.error('Error adding inventory:', error);
      if (error.message.includes('required')) {
        return sendError(res, error.message, 400);
      }
      sendError(res, 'Failed to add inventory', 500, error.message);
    }
  });

  /**
   * POST /api/spare-parts/:uuid/inventory
   * Add inventory for a spare part (URL-based)
   */
  router.post('/:uuid/inventory', async (req, res) => {
    try {
      const inventoryId = await sparePartsService.addInventory({
        spare_part_uuid: req.params.uuid,
        ...req.body
      });

      sendSuccess(res, { inventory_id: inventoryId }, 'Inventory added successfully', 201);
    } catch (error) {
      console.error('Error adding spare part inventory:', error);
      if (error.message.includes('required')) {
        return sendError(res, error.message, 400);
      }
      sendError(res, 'Failed to add spare part inventory', 500, error.message);
    }
  });

  /**
   * PUT /api/spare-parts/inventory/:inventory_id
   * Update inventory quantity or details
   */
  router.put('/inventory/:inventory_id', async (req, res) => {
    try {
      const updated = await sparePartsService.updateInventory(req.params.inventory_id, req.body);

      if (!updated) {
        return sendError(res, 'Inventory record not found', 404);
      }

      sendSuccess(res, null, 'Inventory updated successfully');
    } catch (error) {
      console.error('Error updating spare part inventory:', error);
      if (error.message === 'No fields to update') {
        return sendError(res, error.message, 400);
      }
      sendError(res, 'Failed to update spare part inventory', 500, error.message);
    }
  });

  /**
   * POST /api/spare-parts/receive
   * Receive spare parts into inventory with condition tracking (MongoDB)
   * Supports NEW, USED, REFURBISHED, TESTING, DEFECTIVE conditions
   */
  router.post('/receive', async (req, res) => {
    try {
      const {
        spare_part_uuid,
        quantity,
        unit_cost,
        warehouse_id,
        bin_id,
        condition_status = 'NEW',
        supplier_id,
        notes,
        batch_no,
        expiry_date
      } = req.body;

      // Validation
      if (!spare_part_uuid) {
        return sendError(res, 'spare_part_uuid is required', 400);
      }
      if (!quantity || quantity <= 0) {
        return sendError(res, 'quantity must be a positive number', 400);
      }
      if (!warehouse_id) {
        return sendError(res, 'warehouse_id is required', 400);
      }

      // Validate condition_status
      const validConditions = ['NEW', 'USED', 'REFURBISHED', 'TESTING', 'DEFECTIVE'];
      if (!validConditions.includes(condition_status)) {
        return sendError(res, `condition_status must be one of: ${validConditions.join(', ')}`, 400);
      }

      // Verify spare part exists
      const sparePart = await Product.findOne({ product_id: spare_part_uuid }).lean();
      if (!sparePart) {
        return sendError(res, 'Spare part not found', 404);
      }

      // Verify warehouse exists
      const warehouse = await Warehouse.findOne({ warehouse_id: warehouse_id }).lean();
      if (!warehouse) {
        return sendError(res, 'Warehouse not found', 404);
      }

      // Update or insert inventory record
      const existingInventory = await Inventory.findOne({
        inventory_type: 'spare_part',
        product_id: spare_part_uuid,
        warehouse_id: warehouse_id,
        condition: condition_status,
        $or: [
          { bin_id: bin_id || null },
          { bin_id: { $exists: false } }
        ]
      });

      if (existingInventory) {
        existingInventory.quantity_on_hand += quantity;
        existingInventory.updated_at = new Date();
        await existingInventory.save();
      } else {
        await Inventory.create({
          inventory_type: 'spare_part',
          product_id: spare_part_uuid,
          warehouse_id: warehouse_id,
          bin_id: bin_id || null,
          quantity_on_hand: quantity,
          condition: condition_status,
          batch_no: batch_no || null,
          expiry_date: expiry_date || null,
          supplier_id: supplier_id || null,
          notes: notes || null
        });
      }

      const receiptId = `SP-RCV-${Date.now()}`;

      sendSuccess(res, {
        receipt_id: receiptId,
        spare_part_uuid,
        spare_part_name: sparePart.device_name || sparePart.part_name,
        quantity,
        condition: condition_status,
        warehouse_id,
        bin_id: bin_id || null
      }, `Successfully received ${quantity} ${condition_status} units of ${sparePart.device_name || sparePart.part_name}`, 201);
    } catch (error) {
      console.error('Error receiving spare parts:', error);
      if (error.statusCode === 404) {
        return sendError(res, error.message, 404);
      }
      sendError(res, 'Failed to receive spare parts', 500, error.message);
    }
  });

  // ============================================
  // DEVICE-SPARE PART LINKING ENDPOINTS
  // ============================================

  /**
   * GET /api/spare-parts/device/:product_id/compatible
   * Get all spare parts compatible with a specific device
   */
  router.get('/device/:product_id/compatible', async (req, res) => {
    try {
      const rows = await sparePartsService.getCompatibleParts(req.params.product_id);
      const converted = Array.isArray(rows) ? rows.map(convertBigIntToNumber) : [];

      sendSuccess(res, { data: converted, total: converted.length });
    } catch (error) {
      console.error('Error fetching compatible spare parts:', error);
      sendError(res, 'Failed to fetch compatible spare parts', 500, error.message);
    }
  });

  /**
   * POST /api/spare-parts/device/:product_id/assign
   * Assign a spare part to a device
   */
  router.post('/device/:product_id/assign', async (req, res) => {
    try {
      const assignmentId = await sparePartsService.assignToDevice(req.params.product_id, req.body);

      sendSuccess(res, { assignment_id: assignmentId }, 'Spare part assigned to device successfully', 201);
    } catch (error) {
      console.error('Error assigning spare part to device:', error);
      if (error.message.includes('required') || error.message.includes('already assigned')) {
        return sendError(res, error.message, error.message.includes('already') ? 409 : 400);
      }
      sendError(res, 'Failed to assign spare part to device', 500, error.message);
    }
  });

  /**
   * DELETE /api/spare-parts/device/assignment/:assignment_id
   * Remove a spare part assignment from a device
   */
  router.delete('/device/assignment/:assignment_id', async (req, res) => {
    try {
      const removed = await sparePartsService.removeAssignment(req.params.assignment_id);

      if (!removed) {
        return sendError(res, 'Assignment not found', 404);
      }

      sendSuccess(res, null, 'Assignment removed successfully');
    } catch (error) {
      console.error('Error removing assignment:', error);
      sendError(res, 'Failed to remove assignment', 500, error.message);
    }
  });

  /**
   * GET /api/spare-parts/category/:category/devices
   * Get all devices that use spare parts from a specific category
   */
  router.get('/category/:category/devices', async (req, res) => {
    try {
      const rows = await sparePartsService.getDevicesByCategory(req.params.category);
      const converted = Array.isArray(rows) ? rows.map(convertBigIntToNumber) : [];

      sendSuccess(res, { data: converted, total: converted.length });
    } catch (error) {
      console.error('Error fetching devices by spare part category:', error);
      sendError(res, 'Failed to fetch devices', 500, error.message);
    }
  });

  /**
   * PUT /api/spare-parts/:spare_part_uuid/link-device
   * Link a spare part to a specific device
   */
  router.put('/:spare_part_uuid/link-device', async (req, res) => {
    try {
      const { product_id } = req.body;

      if (!product_id) {
        return sendError(res, 'product_id is required', 400);
      }

      const linked = await sparePartsService.linkToDevice(req.params.spare_part_uuid, product_id);

      if (!linked) {
        return sendError(res, 'Spare part not found', 404);
      }

      sendSuccess(res, null, 'Spare part linked to device successfully');
    } catch (error) {
      console.error('Error linking spare part to device:', error);
      if (error.message === 'Device not found') {
        return sendError(res, error.message, 404);
      }
      sendError(res, 'Failed to link spare part to device', 500, error.message);
    }
  });

  /**
   * GET /api/spare-parts/:id/linked-equipment
   * Get equipment that has used this spare part
   */
  router.get('/:id/linked-equipment', async (req, res) => {
    try {
      const equipment = await sparePartsService.getLinkedEquipment(parseInt(req.params.id));

      sendSuccess(res, { data: equipment, count: equipment.length });
    } catch (error) {
      console.error('Error fetching linked equipment:', error);
      sendError(res, 'Failed to fetch linked equipment', 500, error.message);
    }
  });

  return router;
};
