/**
 * Audit Service (Sequelize Version)
 * Queries security_db.audit_log directly using Sequelize Model
 */

const { Op, fn, col } = require('sequelize');
const { AuditLog } = require('../models/security');
const { generateId } = require('../utils/generateId');

class AuditService {
    constructor() { }

    /**
     * Get paginated audit logs with optional filters
     */
    async getAuditLogs(filters = {}) {
        const {
            action_type,
            user_id,
            entity_type,
            start_date,
            end_date,
            page = 1,
            limit = 50
        } = filters;

        const where = {};

        if (action_type) where.action_type = action_type;
        if (user_id) where.user_id = user_id;
        if (entity_type) where.resource_type = entity_type; // Map entity_type to resource_type
        if (start_date || end_date) {
            where.created_at = {};
            if (start_date) where.created_at[Op.gte] = new Date(start_date);
            if (end_date) where.created_at[Op.lte] = new Date(end_date);
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: Number(limit),
            offset: Number(offset),
            raw: true
        });

        return {
            logs: rows.map(l => this._formatLog(l)),
            page: Number(page),
            limit: Number(limit),
            total: count,
            totalPages: Math.ceil(count / limit)
        };
    }

    /**
     * Get audit log summary statistics
     */
    async getAuditSummary() {
        const totalLogs = await AuditLog.count();

        // Count for today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayLogs = await AuditLog.count({
            where: {
                created_at: {
                    [Op.gte]: todayStart
                }
            }
        });

        const actionTypes = await AuditLog.findAll({
            attributes: [
                'action_type',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['action_type'],
            order: [[fn('COUNT', col('id')), 'DESC']],
            raw: true
        });

        return {
            totalLogs,
            todayLogs,
            actionTypes: actionTypes.map(a => ({
                action_type: a.action_type,
                count: Number(a.count)
            }))
        };
    }

    /**
     * Get audit logs for a specific user
     */
    async getUserAuditLogs(userId, limit = 50) {
        const logs = await AuditLog.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit: Number(limit),
            raw: true
        });
        return logs.map(l => this._formatLog(l));
    }

    /**
     * Create a new audit log entry
     */
    async log({ userId, username, actionType, resourceType, resourceId, description, ipAddress, userAgent, changes, severity = 'info', requestMethod, requestUrl, statusCode }) {
        const id = generateId();
        await AuditLog.create({
            id,
            user_id: userId,
            username,
            action_type: actionType,
            resource_type: resourceType,
            resource_id: resourceId,
            description,
            ip_address: ipAddress,
            user_agent: userAgent,
            changes: changes ? JSON.stringify(changes) : null,
            severity,
            request_method: requestMethod,
            request_url: requestUrl,
            status_code: statusCode,
            created_at: new Date()
        });
        return { id, success: true };
    }

    _formatLog(log) {
        let oldValues = null;
        let newValues = null;
        try {
            if (log.changes) {
                const parsed = typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes;
                // Assuming changes might contain { old: {}, new: {} } or similar structures
                if (parsed && (parsed.old || parsed.new)) {
                    oldValues = parsed.old || null;
                    newValues = parsed.new || null;
                } else if (parsed && (parsed.old_values || parsed.new_values)) {
                    oldValues = parsed.old_values || null;
                    newValues = parsed.new_values || null;
                } else {
                    oldValues = parsed; // Fallback
                    newValues = parsed;
                }
            }
        } catch (e) {
            oldValues = log.changes;
            newValues = log.changes;
        }

        return {
            id: log.id,
            user_id: log.user_id,
            action_type: log.action_type,
            entity_type: log.resource_type,
            entity_id: log.resource_id,
            old_values: oldValues,
            new_values: newValues,
            ip_address: log.ip_address,
            user_agent: log.user_agent,
            notes: log.description,
            created_at: log.created_at
        };
    }
}

module.exports = AuditService;
