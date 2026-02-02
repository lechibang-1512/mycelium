const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const AuditService = require('../services/AuditService');
const SanitizationService = require('../services/SanitizationService');

const convertBigIntToNumber = SanitizationService.convertBigIntToNumber;

module.exports = () => {
    const auditService = new AuditService();

    /**
     * Get audit logs with filters
     * @route GET /api/audit
     * @query {string} action_type - Filter by action type
     * @query {number} user_id - Filter by user ID
     * @query {string} start_date - Filter by start date
     * @query {string} end_date - Filter by end date
     * @query {number} page - Page number (default: 1)
     * @query {number} limit - Items per page (default: 50)
     * @returns {Object} Paginated audit logs with summary
     */
    router.get('/', asyncHandler(async (req, res) => {
        const result = await auditService.getAuditLogs(req.query);

        res.json({
            success: true,
            logs: result.logs.map(l => convertBigIntToNumber(l)),
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages
            }
        });
    }));

    /**
     * Get audit log summary statistics
     * @route GET /api/audit/summary
     * @returns {Object} Audit log summary with total, today, and action type breakdown
     */
    router.get('/summary', asyncHandler(async (req, res) => {
        const summary = await auditService.getAuditSummary();

        res.json({
            success: true,
            summary: {
                totalLogs: summary.totalLogs,
                todayLogs: summary.todayLogs,
                actionTypes: summary.actionTypes.map(a => convertBigIntToNumber(a))
            }
        });
    }));

    /**
     * Get audit log for a specific user
     * @route GET /api/audit/user/:userId
     * @param {number} userId - User ID
     * @query {number} limit - Maximum number of logs (default: 50)
     * @returns {Object} User's audit logs
     */
    router.get('/user/:userId', asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { limit = 50 } = req.query;

        const logs = await auditService.getUserAuditLogs(userId, limit);

        res.json({
            success: true,
            logs: logs.map(l => convertBigIntToNumber(l))
        });
    }));

    return router;
};
