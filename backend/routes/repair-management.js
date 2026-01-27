const asyncHandler = require('../utils/asyncHandler');
/**
 * Repair Management Helper API Routes
 * Consolidates Repair Jobs and Repair Job Templates operations
 * Provides endpoints for managing repair workflow and templates
 */

const express = require('express');
const router = express.Router();
const RepairService = require('../services/RepairService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendSuccess, sendError } = require('../utils/response');
const { generateId } = require('../utils/generateId');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');


const { convertBigIntToNumber } = require('../services/SanitizationService');

module.exports = () => {
    const repairService = new RepairService();

    // ==============================================================================
    // REPAIR JOBS ROUTES
    // Originally mounted at /repair-jobs
    // ==============================================================================

    /**
     * GET /api/repair-jobs
     * Get all repair jobs with optional filtering
     */
    router.get('/repair-jobs', requirePermission('repair:read'), asyncHandler(async (req, res) => {
        try {
            const jobs = await repairService.getRepairJobs(req.query);

            res.json({
                success: true,
                data: jobs.map(convertBigIntToNumber),
                total: jobs.length
            });
        } catch (error) {
            console.error('Error fetching repair jobs:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch repair jobs',
                error: error.message
            });
        }
    }));

    /**
     * GET /api/repair-jobs/search/:query
     * Search repair jobs
     */
    router.get('/repair-jobs/search/:query', requirePermission('repair:read'), asyncHandler(async (req, res) => {
        try {
            const { query: searchQuery } = req.params;
            const { limit = 50 } = req.query;

            if (!searchQuery || searchQuery.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query must be at least 2 characters'
                });
            }

            const jobs = await repairService.searchJobs(searchQuery, limit);

            res.json({
                success: true,
                data: jobs.map(convertBigIntToNumber),
                total: jobs.length,
                query: searchQuery
            });
        } catch (error) {
            console.error('Error searching repair jobs:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search repair jobs',
                error: error.message
            });
        }
    }));

    /**
     * GET /api/repair-jobs/reports/technician-performance
     * Get technician performance metrics
     */
    router.get('/repair-jobs/reports/technician-performance', requirePermission('repair:read'), asyncHandler(async (req, res) => {
        try {
            const performance = await repairService.getTechnicianPerformance();

            res.json({
                success: true,
                data: performance.map(convertBigIntToNumber)
            });
        } catch (error) {
            console.error('Error fetching technician performance:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch technician performance',
                error: error.message
            });
        }
    }));

    /**
     * GET /api/repair-jobs/customer-history
     * Get customer repair history
     */
    router.get('/repair-jobs/customer-history', requirePermission('repair:read'), asyncHandler(async (req, res) => {
        try {
            const { customer_name, customer_email, customer_phone } = req.query;

            if (!customer_name && !customer_email && !customer_phone) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one customer identifier (name, email, or phone) is required'
                });
            }

            const history = await repairService.getCustomerHistory(
                customer_name,
                customer_email,
                customer_phone
            );

            res.json({
                success: true,
                data: {
                    customer: history.customer,
                    stats: convertBigIntToNumber(history.stats),
                    jobs: history.jobs.map(convertBigIntToNumber)
                }
            });
        } catch (error) {
            console.error('Error fetching customer history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch customer history',
                error: error.message
            });
        }
    }));

    /**
     * GET /api/repair-jobs/:id/status-history
     * Get status change history for a repair job
     */
    router.get('/repair-jobs/:id/status-history', requirePermission('repair:read'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const history = await repairService.getStatusHistory(id);

            res.json({
                success: true,
                data: history.map(convertBigIntToNumber)
            });
        } catch (error) {
            console.error('Error fetching status history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch status history',
                error: error.message
            });
        }
    }));

    /**
     * GET /api/repair-jobs/:id
     * Get a specific repair job
     */
    router.get('/repair-jobs/:id', requirePermission('repair:read'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const job = await repairService.getJobById(id);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Repair job not found'
                });
            }

            res.json({
                success: true,
                data: convertBigIntToNumber(job)
            });
        } catch (error) {
            console.error('Error fetching repair job details:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch repair job details',
                error: error.message
            });
        }
    }));

    /**
     * POST /api/repair-jobs
     * Create a new repair job
     */
    router.post('/repair-jobs', requirePermission('repair:write'), asyncHandler(async (req, res) => {
        try {
            const result = await repairService.createJob(req.body);

            res.status(201).json({
                success: true,
                message: 'Repair job created successfully',
                data: {
                    repair_job_id: result.repair_job_id,
                    job_number: result.job_number
                }
            });
        } catch (error) {
            console.error('Error creating repair job:', error);
            const status = error.message.includes('required') ? 400 : 500;
            res.status(status).json({
                success: false,
                message: error.message || 'Failed to create repair job',
                error: error.message
            });
        }
    }));

    /**
     * PUT /api/repair-jobs/:id
     * Update repair job
     */
    router.put('/repair-jobs/:id', requirePermission('repair:write'), asyncHandler(async (req, res) => {
        try {
            const updated = await repairService.updateJob(req.params.id, req.body);

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    message: 'Repair job not found'
                });
            }

            res.json({
                success: true,
                message: 'Repair job updated successfully'
            });
        } catch (error) {
            console.error('Error updating repair job:', error);
            const status = error.message.includes('Invalid') || error.message.includes('No valid') ? 400 : 500;
            res.status(status).json({
                success: false,
                message: error.message || 'Failed to update repair job',
                error: error.message
            });
        }
    }));

    /**
     * DELETE /api/repair-jobs/:id
     * Cancel/Delete repair job
     */
    router.delete('/repair-jobs/:id', requirePermission('repair:delete'), asyncHandler(async (req, res) => {
        try {
            const result = await repairService.deleteJob(req.params.id, req.query.force === 'true');

            if (!result.success) {
                return res.status(result.message.includes('not found') ? 404 : 400).json(result);
            }

            res.json(result);
        } catch (error) {
            console.error('Error processing repair job deletion:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete/cancel repair job',
                error: error.message
            });
        }
    }));

    // Parts Usage Endpoints

    /**
     * POST /api/repair-jobs/:id/parts
     * Add part to repair job
     */
    router.post('/repair-jobs/:id/parts', requirePermission('repair:write'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const {
                spare_part_id,
                inventory_id,
                quantity_used = 1,
                installed_by,
                warranty_months,
                notes
            } = req.body;

            if (!spare_part_id) {
                return sendError(res, 'spare_part_id is required', 400);
            }

            // Get cost if not provided
            let finalUnitCost = 0;
            const costRows = await sequelizeMaster.query(
                'SELECT unit_cost FROM products WHERE product_id = ?',
                { replacements: [spare_part_id], type: QueryTypes.SELECT }
            );
            if (costRows && costRows.length > 0) {
                finalUnitCost = Number(costRows[0].unit_cost);
            }

            const usageId = await repairService.addPartUsage(id, {
                spare_part_id,
                inventory_id,
                quantity_used,
                unit_cost: finalUnitCost,
                installed_by,
                warranty_months,
                notes
            }, 1); // Default system user

            // Convert BigInt to string/number for JSON serialization
            const safeUsageId = typeof usageId === 'bigint' ? usageId.toString() : usageId;

            sendSuccess(res, { usage_id: safeUsageId }, 'Part added to repair job successfully', 201);
        } catch (error) {
            console.error('Error adding part to repair job:', error);
            if (error.message.includes('Insufficient inventory')) {
                return sendError(res, error.message, 400);
            }
            sendError(res, 'Failed to add part to repair job', 500, error.message);
        }
    }));

    /**
     * DELETE /api/repair-jobs/:id/parts/:usage_id
     * Remove part from repair job
     */
    router.delete('/repair-jobs/:id/parts/:usage_id', requirePermission('repair:delete'), asyncHandler(async (req, res) => {
        try {
            const { usage_id } = req.params;

            const success = await repairService.removePartUsage(usage_id, 1);

            if (!success) {
                return sendError(res, 'Part usage not found', 404);
            }

            sendSuccess(res, null, 'Part removed from repair job successfully');
        } catch (error) {
            console.error('Error removing part from repair job:', error);
            sendError(res, 'Failed to remove part from repair job', 500, error.message);
        }
    }));

    // Bulk Operations

    router.post('/repair-jobs/bulk/status', requirePermission('repair:write'), asyncHandler(async (req, res) => {
        try {
            const { jobIds, job_ids, status } = req.body;
            const ids = jobIds || job_ids;
            const userId = req.user?.id || 1;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: 'jobIds required' });
            }
            if (!status) {
                return res.status(400).json({ success: false, message: 'status required' });
            }

            const normalized = RepairService.normalizeStatus(status);
            if (!normalized.valid) {
                return res.status(400).json({ success: false, message: 'Invalid status', allowed: normalized.allowed });
            }

            const results = await repairService.bulkUpdateStatus(ids, normalized.normalized, userId);
            res.json({ success: true, message: 'Bulk status update completed', results });
        } catch (error) {
            console.error('Error in bulk status:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }));

    router.post('/repair-jobs/bulk/assign', requirePermission('repair:write'), asyncHandler(async (req, res) => {
        try {
            const { jobIds, job_ids, technicianId, technician } = req.body;
            const ids = jobIds || job_ids;
            const tech = technicianId || technician;
            const userId = req.user?.id || 1;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: 'jobIds required' });
            }
            if (!tech) {
                return res.status(400).json({ success: false, message: 'technicianId required' });
            }

            const results = await repairService.bulkAssignTechnician(ids, tech, userId);
            res.json({ success: true, message: 'Bulk assignment completed', results });
        } catch (error) {
            console.error('Error in bulk assign:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }));

    router.post('/repair-jobs/bulk/priority', requirePermission('repair:write'), asyncHandler(async (req, res) => {
        try {
            const { jobIds, job_ids, priority } = req.body;
            const ids = jobIds || job_ids;
            const userId = req.user?.id || 1;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: 'jobIds required' });
            }
            if (!priority) {
                return res.status(400).json({ success: false, message: 'priority required' });
            }

            const normalized = RepairService.normalizePriority(priority);
            if (!normalized.valid) {
                return res.status(400).json({ success: false, message: 'Invalid priority', allowed: normalized.allowed });
            }

            const results = await repairService.bulkUpdatePriority(ids, normalized.normalized, userId);
            res.json({ success: true, message: 'Bulk priority update completed', results });
        } catch (error) {
            console.error('Error in bulk priority:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }));

    router.post('/repair-jobs/bulk/cancel', requirePermission('repair:write'), asyncHandler(async (req, res) => {
        try {
            const { jobIds, job_ids, reason } = req.body;
            const ids = jobIds || job_ids;
            const userId = req.user?.id || 1;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: 'jobIds required' });
            }

            const results = await repairService.bulkCancel(ids, reason || 'Bulk cancellation', userId);
            res.json({ success: true, message: 'Bulk cancellation completed', results });
        } catch (error) {
            console.error('Error in bulk cancel:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }));

    router.post('/repair-jobs/from-rma', requirePermission('repair:write'), asyncHandler(async (req, res) => {
        try {
            const { rmaItemData, repairJobData } = req.body;
            const userId = req.user?.id || 1;

            if (!rmaItemData) {
                return res.status(400).json({ success: false, message: 'rmaItemData required' });
            }
            if (!rmaItemData.rma_number && !rmaItemData.item_id) {
                return res.status(400).json({ success: false, message: 'rmaItemData requires rma_number and item_id' });
            }

            const result = await repairService.createFromRMAItem(rmaItemData, repairJobData || {}, userId);
            res.status(201).json({ success: true, message: 'Repair job created from RMA item', data: convertBigIntToNumber(result) });
        } catch (error) {
            console.error('Error creating repair job from RMA:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }));

    router.get('/repair-jobs/:id/linked-rmas', requirePermission('repair:read'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const rmas = await repairService.getLinkedRMAs(id);
            res.json({ success: true, data: rmas.map(convertBigIntToNumber) });
        } catch (error) {
            console.error('Error fetching linked RMAs:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }));

    // Attachments

    router.get('/repair-jobs/:id/attachments', requirePermission('repair:read'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const attachments = await sequelizeMaster.query(
                `SELECT * FROM repair_job_attachments WHERE repair_job_id = ? ORDER BY uploaded_at DESC`,
                { replacements: [id], type: QueryTypes.SELECT }
            );
            res.json({ success: true, data: attachments.map(convertBigIntToNumber) });
        } catch (error) {
            console.error('Error fetching attachments:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }));

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, '../../public/uploads/attachments');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });

    const upload = multer({
        storage: storage,
        limits: { fileSize: 10 * 1024 * 1024 }
    });

    router.post('/repair-jobs/:id/attachments', upload.single('file'), requirePermission('repair:write'), asyncHandler(async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            const { id } = req.params;
            const { notes } = req.body;
            const userId = req.user?.id || 1;

            const filename = req.file.filename;
            const mimeType = req.file.mimetype;
            const fileSize = req.file.size;
            const filePath = `/uploads/attachments/${filename}`;
            const fileSizeKb = Math.round(fileSize / 1024);
            const fileType = mimeType.startsWith('image/') ? 'IMAGE' : 'DOCUMENT';

            const attachmentId = generateId();
            const insertQuery = `
                INSERT INTO repair_job_attachments (
                    attachment_id, repair_job_id, file_path, file_name,
                    file_size_kb, mime_type, uploaded_by, description, file_type, attachment_category
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OTHER')
            `;

            await sequelizeMaster.query(insertQuery, {
                replacements: [attachmentId, id, filePath, filename, fileSizeKb, mimeType, userId, notes || '', fileType],
                type: QueryTypes.INSERT
            });

            res.status(201).json({
                success: true,
                message: 'Attachment uploaded successfully',
                data: { attachment_id: attachmentId, file_path: filePath }
            });
        } catch (error) {
            console.error('Error uploading attachment:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }));

    return router;
};
