/**
 * Repair Management Helper API Routes
 * Consolidates Repair Jobs and Repair Job Templates operations
 * Provides endpoints for managing repair workflow and templates
 */

const express = require('express');
const router = express.Router();
const RepairService = require('../services/RepairService');
const RepairJobTemplateService = require('../services/RepairJobTemplateService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendSuccess, sendError } = require('../utils/response');

module.exports = () => {
    // Initialize services
    const repairService = new RepairService();
    const templateService = new RepairJobTemplateService();

    // ==============================================================================
    // REPAIR JOBS ROUTES
    // Originally mounted at /repair-jobs
    // ==============================================================================

    /**
     * GET /api/repair-jobs
     * Get all repair jobs with optional filtering
     */
    router.get('/repair-jobs', async (req, res) => {
        try {
            const _filters = {
                status: req.query.status,
                priority: req.query.priority,
                technician: req.query.technician,
                customer: req.query.customer,
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                product_id: req.query.product_id,
                search: req.query.search
            };

            const jobs = await repairService.getAllJobs(req.query);

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
    });

    /**
     * GET /api/repair-jobs/search/:query
     * Search repair jobs
     */
    router.get('/repair-jobs/search/:query', async (req, res) => {
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
    });

    /**
     * GET /api/repair-jobs/reports/summary
     * Get repair jobs summary report
     */
    router.get('/repair-jobs/reports/summary', async (req, res) => {
        try {
            const { date_from, date_to } = req.query;
            const report = await repairService.getSummaryReport({ date_from, date_to });

            res.json({
                success: true,
                data: report.map(convertBigIntToNumber)
            });
        } catch (error) {
            console.error('Error fetching repair summary:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch repair summary',
                error: error.message
            });
        }
    });

    /**
     * GET /api/repair-jobs/reports/technician-performance
     * Get technician performance metrics
     */
    router.get('/repair-jobs/reports/technician-performance', async (req, res) => {
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
    });

    /**
     * GET /api/repair-jobs/customer-history
     * Get customer repair history
     */
    router.get('/repair-jobs/customer-history', async (req, res) => {
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
    });

    /**
     * GET /api/repair-jobs/:id/status-history
     * Get status change history for a repair job
     */
    router.get('/repair-jobs/:id/status-history', async (req, res) => {
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
    });

    /**
     * GET /api/repair-jobs/:id
     * Get a specific repair job
     */
    router.get('/repair-jobs/:id', async (req, res) => {
        try {
            const { id } = req.params;
            // Check if ID is likely numeric, otherwise skip to avoid casting errors
            if (isNaN(id)) {
                return res.status(404).json({
                    success: false,
                    message: 'Repair job not found (invalid ID)'
                });
            }

            const job = await repairService.getJobById(req.params.id);

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
    });

    /**
     * POST /api/repair-jobs
     * Create a new repair job
     */
    router.post('/repair-jobs', async (req, res) => {
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
    });

    /**
     * PUT /api/repair-jobs/:id
     * Update repair job
     */
    router.put('/repair-jobs/:id', async (req, res) => {
        try {
            const { id: _id } = req.params;
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
    });

    /**
     * DELETE /api/repair-jobs/:id
     * Cancel/Delete repair job
     */
    router.delete('/repair-jobs/:id', async (req, res) => {
        try {
            const { id: _id } = req.params;
            const _forceDelete = req.query.force === 'true';

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
    });

    // Parts Usage Endpoints

    /**
     * POST /api/repair-jobs/:id/parts
     * Add part to repair job
     */
    router.post('/repair-jobs/:id/parts', async (req, res) => {
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
            const costQuery = 'SELECT unit_cost FROM smartphone_spare_parts WHERE spare_part_id = ?';
            const costRows = await null?.query(costQuery, [spare_part_id]);
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
    });

    /**
     * DELETE /api/repair-jobs/:id/parts/:usage_id
     * Remove part from repair job
     */
    router.delete('/repair-jobs/:id/parts/:usage_id', async (req, res) => {
        try {
            const { id, usage_id } = req.params;

            const success = await repairService.removePartUsage(usage_id, 1);

            if (!success) {
                return sendError(res, 'Part usage not found', 404);
            }

            sendSuccess(res, null, 'Part removed from repair job successfully');
        } catch (error) {
            console.error('Error removing part from repair job:', error);
            sendError(res, 'Failed to remove part from repair job', 500, error.message);
        }
    });

    // Bulk Operations

    router.post('/repair-jobs/bulk/status', async (req, res) => {
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

            const results = await repairService.bulkUpdateStatus( ids, normalized.normalized, userId);
            res.json({ success: true, message: 'Bulk status update completed', results });
        } catch (error) {
            console.error('Error in bulk status:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post('/repair-jobs/bulk/assign', async (req, res) => {
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

            const results = await repairService.bulkAssignTechnician( ids, tech, userId);
            res.json({ success: true, message: 'Bulk assignment completed', results });
        } catch (error) {
            console.error('Error in bulk assign:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post('/repair-jobs/bulk/priority', async (req, res) => {
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

            const results = await repairService.bulkUpdatePriority( ids, normalized.normalized, userId);
            res.json({ success: true, message: 'Bulk priority update completed', results });
        } catch (error) {
            console.error('Error in bulk priority:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post('/repair-jobs/bulk/cancel', async (req, res) => {
        try {
            const { jobIds, job_ids, reason } = req.body;
            const ids = jobIds || job_ids;
            const userId = req.user?.id || 1;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: 'jobIds required' });
            }

            const results = await repairService.bulkCancel( ids, reason || 'Bulk cancellation', userId);
            res.json({ success: true, message: 'Bulk cancellation completed', results });
        } catch (error) {
            console.error('Error in bulk cancel:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // RMA Linking

    router.get('/repair-jobs/rma/:rmaNumber/item/:itemId', async (req, res) => {
        try {
            const { rmaNumber, itemId } = req.params;
            const jobs = await repairService.getJobsByRMAItem( rmaNumber, parseInt(itemId));
            res.json({ success: true, data: jobs.map(convertBigIntToNumber) });
        } catch (error) {
            console.error('Error fetching repair jobs by RMA item:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post('/repair-jobs/from-rma', async (req, res) => {
        try {
            const { rmaItemData, repairJobData } = req.body;
            const userId = req.user?.id || 1;

            if (!rmaItemData) {
                return res.status(400).json({ success: false, message: 'rmaItemData required' });
            }
            if (!rmaItemData.rma_number && !rmaItemData.item_id) {
                return res.status(400).json({ success: false, message: 'rmaItemData requires rma_number and item_id' });
            }

            const result = await repairService.createFromRMAItem( rmaItemData, repairJobData || {}, userId);
            res.status(201).json({ success: true, message: 'Repair job created from RMA item', data: convertBigIntToNumber(result) });
        } catch (error) {
            console.error('Error creating repair job from RMA:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/repair-jobs/:id/linked-rmas', async (req, res) => {
        try {
            const { id } = req.params;
            const rmas = await repairService.getLinkedRMAs( parseInt(id));
            res.json({ success: true, data: rmas.map(convertBigIntToNumber) });
        } catch (error) {
            console.error('Error fetching linked RMAs:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Attachments

    router.get('/repair-jobs/:id/attachments', async (req, res) => {
        try {
            const { id } = req.params;
            const attachments = await null?.query(
                `SELECT * FROM repair_job_attachments WHERE repair_job_id = ? ORDER BY uploaded_at DESC`,
                [id]
            );
            res.json({ success: true, data: attachments.map(convertBigIntToNumber) });
        } catch (error) {
            console.error('Error fetching attachments:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

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

    router.post('/repair-jobs/:id/attachments', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            const { id } = req.params;
            const { notes } = req.body;
            const userId = req.user?.id || 1;

            const filename = req.file.filename;
            const originalFilename = req.file.originalname;
            const mimeType = req.file.mimetype;
            const fileSize = req.file.size;
            const filePath = `/uploads/attachments/${filename}`;

            const insertQuery = `
                INSERT INTO repair_job_attachments (
                    repair_job_id, file_path, file_name, original_file_name,
                    file_size, mime_type, uploaded_by, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const result = await null?.query(insertQuery, [
                id, filePath, filename, originalFilename, fileSize, mimeType, userId, notes
            ]);

            res.status(201).json({
                success: true,
                message: 'Attachment uploaded successfully',
                data: { attachment_id: Number(result.insertId), file_path: filePath }
            });
        } catch (error) {
            console.error('Error uploading attachment:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });


    // ==============================================================================
    // REPAIR JOB TEMPLATES ROUTES
    // Originally mounted at /repair-job-templates
    // ==============================================================================

    /**
     * GET /api/repair-job-templates
     */
    router.get('/repair-job-templates', async (req, res) => {
        try {
            const _includeInactive = req.query.include_inactive === 'true';
            const templates = await repairService.getAllTemplates(req.query.includeInactive === 'true');

            res.json({
                success: true,
                data: templates.map(convertBigIntToNumber),
                total: templates.length
            });
        } catch (error) {
            console.error('Error fetching templates:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch templates', error: error.message });
        }
    });

    /**
     * GET /api/repair-job-templates/:id
     */
    router.get('/repair-job-templates/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const template = await templateService.getTemplateById(id);

            if (!template) {
                return res.status(404).json({ success: false, message: 'Template not found' });
            }

            res.json({ success: true, data: convertBigIntToNumber(template) });
        } catch (error) {
            console.error('Error fetching template:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch template', error: error.message });
        }
    });

    /**
     * POST /api/repair-job-templates
     */
    router.post('/repair-job-templates', async (req, res) => {
        try {
            const template = await templateService.createTemplate(req.body);
            res.status(201).json({ success: true, message: 'Template created successfully', data: convertBigIntToNumber(template) });
        } catch (error) {
            console.error('Error creating template:', error);
            res.status(error.message.includes('required') ? 400 : 500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/repair-job-templates/:id
     */
    router.put('/repair-job-templates/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updated = await templateService.updateTemplate(id, req.body);

            if (!updated) {
                return res.status(404).json({ success: false, message: 'Template not found' });
            }
            res.json({ success: true, message: 'Template updated successfully' });
        } catch (error) {
            console.error('Error updating template:', error);
            res.status(error.message.includes('No fields') ? 400 : 500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/repair-job-templates/:id
     */
    router.delete('/repair-job-templates/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const force = req.query.force === 'true';

            const deleted = await templateService.deleteTemplate(id, force);

            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Template not found' });
            }
            res.json({ success: true, message: force ? 'Template permanently deleted' : 'Template deactivated' });
        } catch (error) {
            console.error('Error deleting template:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/repair-job-templates/:id/apply
     */
    router.post('/repair-job-templates/:id/apply', async (req, res) => {
        try {
            const { id } = req.params;
            const jobData = await templateService.applyTemplate(id, req.body);
            res.json({ success: true, data: convertBigIntToNumber(jobData) });
        } catch (error) {
            console.error('Error applying template:', error);
            res.status(error.message.includes('not found') ? 404 : 500).json({ success: false, error: error.message });
        }
    });

    return router;
};
