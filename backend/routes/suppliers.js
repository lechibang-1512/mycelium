const asyncHandler = require('../utils/asyncHandler');


const express = require('express');
const router = express.Router();
const SanitizationService = require('../services/SanitizationService');
const { requirePermission } = require('../middleware/rbacMiddleware');
// Authentication disabled - will be re-enabled later
// 
const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
  const SupplierService = require('../services/SupplierService');
  const supplierService = new SupplierService();

  // Validate route parameters early to avoid invalid DB queries
  // supplier_id is char(36) UUID, not an integer
  router.param('id', (req, res, next, id) => {
    if (!id || typeof id !== 'string') return res.status(400).json({ success: false, error: 'Invalid supplier id' });
    req.params.id = id;
    next();
  });

  router.param('supplierId', (req, res, next, id) => {
    if (!id || typeof id !== 'string') return res.status(400).json({ success: false, error: 'Invalid supplier id' });
    req.params.supplierId = id;
    next();
  });

  router.param('productId', (req, res, next, id) => {
    // Product ID is a UUID (string)
    if (!id || typeof id !== 'string') return res.status(400).json({ success: false, error: 'Invalid product id' });
    req.params.productId = id;
    next();
  });

  // ========================================================================
  // SUPPLIER LISTING & SEARCH
  // ========================================================================


  router.get('/', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    try {
      const { search, category, status } = req.query;

      const filters = {};
      if (search) filters.search = search;
      if (category) filters.category = category;
      if (status === 'active') filters.is_active = true;
      if (status === 'inactive') filters.is_active = false;

      const suppliers = await supplierService.getSuppliers(filters);

      res.json({
        success: true,
        suppliers: suppliers.map(s => convertBigIntToNumber(s)),
        count: suppliers.length
      });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch suppliers',
        message: error.message
      });
    }
  }));

  // ========================================================================
  // SUPPLIER DETAILS
  // ========================================================================


  router.get('/:id', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    try {
      const supplier = await supplierService.getSupplierById(req.params.id);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
      }

      res.json({
        success: true,
        supplier: convertBigIntToNumber(supplier)
      });
    } catch (error) {
      console.error('Error fetching supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch supplier',
        message: error.message
      });
    }
  }));

  // ========================================================================
  // SUPPLIER METADATA
  // ========================================================================

  /**
   * GET /api/suppliers/meta/categories
   * Get all distinct supplier categories
   */
  router.get('/meta/categories', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    try {
      const categories = await supplierService.getCategories();

      res.json({
        success: true,
        categories
      });
    } catch (error) {
      console.error('Error fetching supplier categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch categories',
        message: error.message
      });
    }
  }));

  /**
   * GET /api/suppliers/meta/brands
   * Get all distinct brands
   */
  router.get('/meta/brands', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    try {
      const brands = await supplierService.getAvailableBrands();
      res.json({
        success: true,
        brands
      });
    } catch (error) {
      console.error('Error fetching brands:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch brands',
        message: error.message
      });
    }
  }));

  // ========================================================================
  // SUPPLIER CREATION
  // ========================================================================


  router.post('/', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    try {
      const supplierData = {
        name: req.body.name,
        category: req.body.category,
        contact_person: req.body.contact_person,
        contact_position: req.body.contact_position,
        email: req.body.email,
        phone: req.body.phone,
        website: req.body.website,
        address: req.body.address,
        city: req.body.city,
        province: req.body.province,
        ward: req.body.ward,
        district: req.body.district,
        notes: req.body.notes,
        brands: req.body.brands,
        tax_code: req.body.tax_code,
        additional_contacts: req.body.additional_contacts,
        // Pass is_active through only when explicitly set. The service will preserve current value when undefined.
        is_active: req.body.is_active !== undefined ? req.body.is_active : undefined
      };

      // Validate required fields
      if (!supplierData.name) {
        return res.status(400).json({
          success: false,
          error: 'Supplier name is required'
        });
      }

      const supplierId = await supplierService.createSupplier(supplierData);

      res.status(201).json({
        success: true,
        message: 'Supplier created successfully',
        id: convertBigIntToNumber(supplierId)
      });
    } catch (error) {
      console.error('Error adding supplier:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add supplier'
      });
    }
  }));

  // ========================================================================
  // SUPPLIER UPDATE
  // ========================================================================


  router.put('/:id', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    try {
      const supplierData = {
        name: req.body.name,
        category: req.body.category,
        contact_person: req.body.contact_person,
        contact_position: req.body.contact_position,
        email: req.body.email,
        phone: req.body.phone,
        website: req.body.website,
        address: req.body.address,
        city: req.body.city,
        province: req.body.province,
        ward: req.body.ward,
        district: req.body.district,
        notes: req.body.notes,
        brands: req.body.brands,
        tax_code: req.body.tax_code,
        additional_contacts: req.body.additional_contacts,
        is_active: req.body.is_active !== undefined ? req.body.is_active : 1
      };

      const updated = await supplierService.updateSupplier(req.params.id, supplierData);

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
      }

      res.json({
        success: true,
        message: 'Supplier updated successfully'
      });
    } catch (error) {
      console.error('Error updating supplier:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update supplier'
      });
    }
  }));

  // ========================================================================
  // SUPPLIER STATUS MANAGEMENT
  // ========================================================================


  router.patch('/:id/toggle-status', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    try {
      const supplier = await supplierService.getSupplierById(req.params.id);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
      }

      const newStatus = supplier.is_active ? 0 : 1;

      // Only pass the fields necessary to toggle status. The service will keep other fields unchanged.
      await supplierService.updateSupplier(req.params.id, {
        is_active: newStatus
      });

      res.json({
        success: true,
        message: `Supplier ${newStatus ? 'activated' : 'deactivated'} successfully`,
        is_active: newStatus
      });
    } catch (error) {
      console.error('Error toggling supplier status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle supplier status',
        message: error.message
      });
    }
  }));

  // ========================================================================
  // SUPPLIER DEACTIVATION & DELETION
  // ========================================================================

  /**
   * Deactivate a supplier (soft delete)
   * This is the preferred method for suppliers with transaction history
   */
  router.put('/:id/deactivate', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    try {
      const deactivated = await supplierService.deactivateSupplier(req.params.id);

      if (!deactivated) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
      }

      res.json({
        success: true,
        message: 'Supplier deactivated successfully'
      });
    } catch (error) {
      console.error('Error deactivating supplier:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to deactivate supplier'
      });
    }
  }));

  /**
   * Delete a supplier (soft delete with validation)
   * Only allows deletion if:
   * - No products linked to this supplier
   * - No transactions in the last 60 days
   */
  router.delete('/:id', requirePermission('inventory:delete'), asyncHandler(async (req, res) => {
    try {
      const deleted = await supplierService.deleteSupplier(req.params.id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
      }

      res.json({
        success: true,
        message: 'Supplier deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete supplier'
      });
    }
  }));

  // ========================================================================
  // SUPPLIER ANALYTICS & PERFORMANCE
  // ========================================================================


  router.get('/:id/stats', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    try {
      const stats = await supplierService.getBasicStats(req.params.id);

      if (!stats) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
      }

      res.json({
        success: true,
        stats: convertBigIntToNumber(stats)
      });
    } catch (error) {
      console.error('Error fetching supplier stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch supplier statistics',
        message: error.message
      });
    }
  }));


  router.get('/:id/performance', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    try {
      const supplierId = req.params.id;
      const period = parseInt(req.query.period) || 90;

      const performance = await supplierService.getSupplierPerformance(supplierId, period);

      res.json({
        success: true,
        performance: {
          basic: convertBigIntToNumber(performance.basic),
          products: performance.products.map(p => convertBigIntToNumber(p)),
          leadTime: convertBigIntToNumber(performance.leadTime),
          trend: performance.trend.map(t => convertBigIntToNumber(t))
        }
      });
    } catch (error) {
      console.error('Error fetching supplier performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch supplier performance',
        message: error.message
      });
    }
  }));


  router.get('/:id/valuation', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    try {
      const supplierId = req.params.id;
      const valuation = await supplierService.getStockValuation(supplierId);

      res.json({
        success: true,
        valuation: valuation.map(v => convertBigIntToNumber(v))
      });
    } catch (error) {
      console.error('Error fetching stock valuation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stock valuation',
        message: error.message
      });
    }
  }));


  router.get('/:supplierId/products/:productId/compatibility', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    try {
      const supplierId = req.params.supplierId;
      const productId = req.params.productId;

      const compatibility = await supplierService.checkSupplierProductCompatibility(
        supplierId,
        productId
      );

      res.json({
        success: true,
        compatibility: convertBigIntToNumber(compatibility)
      });
    } catch (error) {
      console.error('Error checking compatibility:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check compatibility',
        message: error.message
      });
    }
  }));

  return router;
};
