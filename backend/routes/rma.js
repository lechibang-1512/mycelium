/**
 * RMA API Routes
 * RESTful API endpoints for Return Merchandise Authorization operations
 * Updated for unified rma table with JSON columns
 */

const express = require('express');
const RMAService = require('../services/RMAService');
const { requireRole } = require('../middleware/rbac');

module.exports = () => {
  const router = express.Router();

  /**
   * @route   POST /api/rma
   * @desc    Create a new RMA request
   * @access  Private
   */
  router.post('/', async (req, res, next) => {
    try {
      const { rmaData, items } = req.body;
      const userId = req.user?.id || 1; // Default user ID for non-authenticated access

      if (!rmaData || !items || items.length === 0) {
        return res.status(400).json({ error: 'RMA data and items are required' });
      }

      if (!rmaData.warehouse_id) {
        return res.status(400).json({ error: 'Warehouse ID is required' });
      }

      // Validate email format if provided
      if (rmaData.customer_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(rmaData.customer_email)) {
          return res.status(400).json({ error: 'Invalid email format' });
        }
      }

      // Validate maximum items limit
      const MAX_ITEMS_PER_RMA = 100;
      if (items.length > MAX_ITEMS_PER_RMA) {
        return res.status(400).json({
          error: `Too many items: maximum ${MAX_ITEMS_PER_RMA} items allowed per RMA`
        });
      }

      const rma = await RMAService.createRMARequest( rmaData, items, userId);
      res.status(201).json(rma);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   GET /api/rma
   * @desc    List RMA requests with filters
   * @access  Private
   */
  router.get('/', async (req, res, next) => {
    try {
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        warehouse_id: req.query.warehouse_id,
        assigned_to: req.query.assigned_to,
        customer_search: req.query.search,
        device_imei: req.query.device_imei,
        date_from: req.query.date_from,
        date_to: req.query.date_to,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      };

      const rmas = await RMAService.listRMAs( filters);
      res.json(Array.isArray(rmas) ? rmas : []);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   GET /api/rma/dashboard
   * @desc    Get RMA dashboard metrics
   * @access  Private
   */
  router.get('/dashboard', async (req, res, next) => {
    try {
      const metrics = await RMAService.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   GET /api/rma/analytics
   * @desc    Get RMA analytics
   * @access  Private
   */
  router.get('/analytics', async (req, res, next) => {
    try {
      const filters = {
        date_from: req.query.date_from,
        date_to: req.query.date_to
      };
      const analytics = await RMAService.getRMAAnalytics( filters);
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   GET /api/rma/search/:query
   * @desc    Search RMAs by RMA number, customer name, or email
   * @access  Private
   */
  router.get('/search/:query', async (req, res, next) => {
    try {
      const { query } = req.params;
      const rmas = await RMAService.listRMAs( { customer_search: query });
      res.json(rmas);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   GET /api/rma/:rmaNumber
   * @desc    Get RMA request by number
   * @access  Private
   */
  router.get('/:rmaNumber', async (req, res, next) => {
    try {
      const { rmaNumber } = req.params;
      const rma = await RMAService.getRMAById( rmaNumber);

      if (!rma) {
        return res.status(404).json({ error: 'RMA not found' });
      }

      res.json(rma);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   PUT /api/rma/:rmaNumber
   * @desc    Update RMA request details
   * @access  Private
   */
  router.put('/:rmaNumber', async (req, res, next) => {
    try {
      const { rmaNumber } = req.params;
      const updates = req.body;
      const userId = req.user?.id || 1;

      const rma = await RMAService.updateRMARequest( rmaNumber, updates, userId);

      if (!rma) {
        return res.status(404).json({ error: 'RMA not found' });
      }

      res.json(rma);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   DELETE /api/rma/:rmaNumber
   * @desc    Delete RMA request (admin only)
   * @access  Private (Admin)
   */
  router.delete('/:rmaNumber', requireRole('admin'), async (req, res, next) => {
    try {
      const { rmaNumber } = req.params;

      const success = await RMAService.deleteRMA( rmaNumber);

      if (!success) {
        return res.status(404).json({ error: 'RMA not found' });
      }

      res.json({ message: 'RMA deleted successfully' });
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   PUT /api/rma/:rmaNumber/status
   * @desc    Update RMA status
   * @access  Private
   */
  router.put('/:rmaNumber/status', async (req, res, next) => {
    try {
      const { rmaNumber } = req.params;
      const { status, reason } = req.body;
      const userId = req.user?.id || 1;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const validStatuses = [
        'pending', 'awaiting_receipt', 'received', 'inspecting',
        'approved', 'rejected', 'completed', 'cancelled'
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const rma = await RMAService.updateRMAStatus( rmaNumber, status, userId, reason);
      res.json(rma);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   POST /api/rma/:rmaNumber/receive
   * @desc    Receive RMA items into quarantine
   * @access  Private
   */
  router.post('/:rmaNumber/receive', async (req, res, next) => {
    try {
      const { rmaNumber } = req.params;
      const { items } = req.body;
      const userId = req.user?.id || 1;

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Items data is required' });
      }

      const rma = await RMAService.receiveRMAItems( rmaNumber, items, userId);
      res.json(rma);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   GET /api/rma/:rmaNumber/history
   * @desc    Get status history for RMA
   * @access  Private
   */
  router.get('/:rmaNumber/history', async (req, res, next) => {
    try {
      const { rmaNumber } = req.params;
      const rma = await RMAService.getRMAById( rmaNumber);

      if (!rma) {
        return res.status(404).json({ error: 'RMA not found' });
      }

      res.json(rma.status_history || []);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   PUT /api/rma/:rmaNumber/items/:itemId/inspect
   * @desc    Inspect an RMA item
   * @access  Private
   */
  router.put('/:rmaNumber/items/:itemId/inspect', async (req, res, next) => {
    try {
      const { rmaNumber, itemId } = req.params;
      const inspectionData = req.body;
      const userId = req.user?.id || 1;

      if (!inspectionData.inspection_result) {
        return res.status(400).json({ error: 'Inspection result is required' });
      }

      const validResults = ['pass', 'fail', 'partial', 'pending'];
      if (!validResults.includes(inspectionData.inspection_result)) {
        return res.status(400).json({ error: 'Invalid inspection result' });
      }

      const item = await RMAService.inspectRMAItem( rmaNumber, parseInt(itemId, 10), inspectionData, userId);
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   PUT /api/rma/:rmaNumber/items/:itemId/disposition
   * @desc    Set disposition for an RMA item
   * @access  Private
   */
  router.put('/:rmaNumber/items/:itemId/disposition', async (req, res, next) => {
    try {
      const { rmaNumber, itemId } = req.params;
      const { disposition, notes } = req.body;
      const userId = req.user?.id || 1;

      if (!disposition) {
        return res.status(400).json({ error: 'Disposition is required' });
      }

      const validDispositions = [
        'return_to_stock', 'repair', 'scrap', 'return_to_vendor',
        'warranty_claim', 'pending'
      ];

      if (!validDispositions.includes(disposition)) {
        return res.status(400).json({ error: 'Invalid disposition' });
      }

      const item = await RMAService.setItemDisposition( rmaNumber, parseInt(itemId, 10), disposition, notes, userId);
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   POST /api/rma/:rmaNumber/items/:itemId/process-disposition
   * @desc    Process disposition action (restock, scrap, etc.)
   * @access  Private
   */
  router.post('/:rmaNumber/items/:itemId/process-disposition', async (req, res, next) => {
    try {
      const { rmaNumber, itemId } = req.params;
      const actionData = req.body;
      const userId = req.user?.id || 1;

      if (!actionData.action_type) {
        return res.status(400).json({ error: 'Action type is required' });
      }

      const validActionTypes = [
        'restocked', 'scrapped', 'sent_to_repair',
        'returned_to_vendor', 'warranty_processed'
      ];

      if (!validActionTypes.includes(actionData.action_type)) {
        return res.status(400).json({ error: 'Invalid action type' });
      }

      const result = await RMAService.processDispositionAction( rmaNumber, parseInt(itemId, 10), actionData, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   POST /api/rma/:rmaNumber/attachments
   * @desc    Add attachment to RMA
   * @access  Private
   */
  router.post('/:rmaNumber/attachments', async (req, res, next) => {
    try {
      const { rmaNumber } = req.params;
      const attachmentData = req.body;
      const userId = req.user?.id || 1;

      if (!attachmentData.file_name || !attachmentData.file_path) {
        return res.status(400).json({ error: 'File name and path are required' });
      }

      const attachment = await RMAService.addAttachment( rmaNumber, attachmentData, userId);
      res.status(201).json(attachment);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   GET /api/rma/:rmaNumber/attachments
   * @desc    Get attachments for RMA
   * @access  Private
   */
  router.get('/:rmaNumber/attachments', async (req, res, next) => {
    try {
      const { rmaNumber } = req.params;
      const attachments = await RMAService.getAttachments( rmaNumber);
      res.json(attachments);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   POST /api/rma/bulk/status
   * @desc    Bulk update RMA status
   * @access  Private
   */
  router.post('/bulk/status', async (req, res, next) => {
    try {
      const { rmaNumbers, status, reason } = req.body;
      const userId = req.user?.id || 1;

      // Support both rmaIds (legacy) and rmaNumbers
      const numbers = rmaNumbers || req.body.rmaIds;

      if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ error: 'rmaNumbers array is required' });
      }

      if (!status) {
        return res.status(400).json({ error: 'status is required' });
      }

      const results = await RMAService.bulkUpdateStatus( numbers, status, userId, reason);
      res.json({
        message: 'Bulk status update completed',
        results
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   POST /api/rma/bulk/assign
   * @desc    Bulk assign RMAs to user
   * @access  Private
   */
  router.post('/bulk/assign', async (req, res, next) => {
    try {
      const { rmaNumbers, assignedTo } = req.body;
      const userId = req.user?.id || 1;

      // Support both rmaIds (legacy) and rmaNumbers
      const numbers = rmaNumbers || req.body.rmaIds;

      if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ error: 'rmaNumbers array is required' });
      }

      if (!assignedTo) {
        return res.status(400).json({ error: 'assignedTo is required' });
      }

      const results = await RMAService.bulkAssign( numbers, assignedTo, userId);
      res.json({
        message: 'Bulk assignment completed',
        results
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   POST /api/rma/:rmaNumber/bulk/disposition
   * @desc    Bulk set disposition for RMA items
   * @access  Private
   */
  router.post('/:rmaNumber/bulk/disposition', async (req, res, next) => {
    try {
      const { rmaNumber } = req.params;
      const { itemIds, disposition, notes } = req.body;
      const userId = req.user?.id || 1;

      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ error: 'itemIds array is required' });
      }

      if (!disposition) {
        return res.status(400).json({ error: 'disposition is required' });
      }

      const results = await RMAService.bulkSetDisposition( rmaNumber, itemIds, disposition, notes, userId);
      res.json({
        message: 'Bulk disposition update completed',
        results
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   POST /api/rma/:rmaNumber/items/:itemId/link-repair
   * @desc    Link RMA item to repair job
   * @access  Private
   */
  router.post('/:rmaNumber/items/:itemId/link-repair', async (req, res, next) => {
    try {
      const { rmaNumber, itemId } = req.params;
      const { repairJobId, linkReason, notes } = req.body;
      const userId = req.user?.id || 1;

      if (!repairJobId) {
        return res.status(400).json({ error: 'repairJobId is required' });
      }

      const item = await RMAService.linkToRepairJob(
        pool,
        rmaNumber,
        parseInt(itemId, 10),
        repairJobId,
        linkReason || 'defect_repair',
        userId,
        notes
      );

      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   GET /api/rma/:rmaNumber/repair-jobs
   * @desc    Get repair jobs linked to RMA
   * @access  Private
   */
  router.get('/:rmaNumber/repair-jobs', async (req, res, next) => {
    try {
      const { rmaNumber } = req.params;
      const links = await RMAService.getLinkedRepairJobs( rmaNumber);
      res.json(links);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   DELETE /api/rma/:rmaNumber/items/:itemId/repair-link
   * @desc    Unlink RMA item from repair job
   * @access  Private
   */
  router.delete('/:rmaNumber/items/:itemId/repair-link', async (req, res, next) => {
    try {
      const { rmaNumber, itemId } = req.params;
      const success = await RMAService.unlinkRepairJob( rmaNumber, parseInt(itemId, 10));

      if (!success) {
        return res.status(404).json({ error: 'Item or link not found' });
      }

      res.json({ message: 'Repair job link removed successfully' });
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   GET /api/rma/:rmaNumber/items/:itemId/matching-repair-jobs
   * @desc    Get repair jobs that match an RMA item by device identifier, name, or product
   * @access  Private
   */
  router.get('/:rmaNumber/items/:itemId/matching-repair-jobs', async (req, res, next) => {
    try {
      const { rmaNumber, itemId } = req.params;

      // Get the RMA to find the item
      const rma = await RMAService.getRMAById( rmaNumber);
      if (!rma) {
        return res.status(404).json({ error: 'RMA not found' });
      }

      const item = rma.items.find(i => i.item_id === parseInt(itemId, 10));
      if (!item) {
        return res.status(404).json({ error: 'RMA item not found' });
      }

      // Use RMAService method to find matching repair jobs
      const jobs = await RMAService.getMatchingRepairJobs( item);

      res.json({
        success: true,
        data: jobs,
        rma_item: {
          device_identifier: item.device_identifier,
          device_name: item.device_name,
          product_id: item.product_id
        }
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
