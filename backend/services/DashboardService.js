/**
 * Dashboard Service
 * Aggregation service providing KPI data, stock trends, warehouse utilization,
 * and service center summaries for the dashboard page.
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');

class DashboardService {
    constructor() { }

    /**
     * Get key performance indicators for the dashboard
     * Returns: total SKUs, total stock quantity, total stock value,
     *          low stock count, pending repairs, open RMAs
     */
    async getKPIs() {
        const [inventoryStats] = await sequelizeMaster.query(`
            SELECT
                COUNT(DISTINCT i.product_id) AS total_skus,
                COALESCE(SUM(i.quantity), 0) AS total_stock_quantity,
                COALESCE(SUM(i.quantity * COALESCE(p.base_price, 0)), 0) AS total_stock_value
            FROM inventory i
            JOIN products p ON p.product_id = i.product_id
        `, { type: QueryTypes.SELECT });

        const [lowStockCount] = await sequelizeMaster.query(`
            SELECT COUNT(*) AS count
            FROM (
                SELECT p.product_id
                FROM products p
                LEFT JOIN (
                    SELECT product_id, SUM(quantity) AS total_qty
                    FROM inventory
                    GROUP BY product_id
                ) inv ON inv.product_id = p.product_id
                WHERE p.is_active = 1
                  AND p.reorder_point > 0
                  AND COALESCE(inv.total_qty, 0) <= p.reorder_point
            ) low
        `, { type: QueryTypes.SELECT });

        const [pendingRepairs] = await sequelizeMaster.query(`
            SELECT COUNT(*) AS count
            FROM repair_jobs
            WHERE status IN ('PENDING', 'IN_PROGRESS', 'DIAGNOSED', 'WAITING_PARTS')
        `, { type: QueryTypes.SELECT });

        const [openRMAs] = await sequelizeMaster.query(`
            SELECT COUNT(*) AS count
            FROM rmas
            WHERE status IN ('pending', 'approved', 'in_transit', 'received', 'inspecting')
        `, { type: QueryTypes.SELECT });

        return {
            total_skus: Number(inventoryStats?.total_skus || 0),
            total_stock_quantity: Number(inventoryStats?.total_stock_quantity || 0),
            total_stock_value: Number(inventoryStats?.total_stock_value || 0),
            low_stock_count: Number(lowStockCount?.count || 0),
            pending_repairs: Number(pendingRepairs?.count || 0),
            open_rmas: Number(openRMAs?.count || 0)
        };
    }

    /**
     * Get stock movement trend over the last N days
     * Returns daily inbound/outbound quantities
     */
    async getStockTrend(days = 7) {
        const rows = await sequelizeMaster.query(`
            SELECT
                DATE(t.transaction_date) AS date,
                SUM(CASE WHEN t.transaction_type = 'incoming' THEN ABS(t.quantity_changed) ELSE 0 END) AS inbound,
                SUM(CASE WHEN t.transaction_type = 'outgoing' THEN ABS(t.quantity_changed) ELSE 0 END) AS outbound
            FROM transactions t
            WHERE t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
            GROUP BY DATE(t.transaction_date)
            ORDER BY date ASC
        `, {
            type: QueryTypes.SELECT,
            replacements: { days: Number(days) }
        });

        return rows.map(r => ({
            date: r.date,
            inbound: Number(r.inbound || 0),
            outbound: Number(r.outbound || 0)
        }));
    }

    /**
     * Get warehouse utilization summary
     * Returns each warehouse with total bins, used bins, total capacity, used capacity
     */
    async getWarehouseUtilization() {
        const rows = await sequelizeMaster.query(`
            SELECT
                w.warehouse_id,
                w.name AS warehouse_name,
                COUNT(DISTINCT wb.bin_id) AS total_bins,
                COUNT(DISTINCT CASE WHEN inv.qty > 0 THEN wb.bin_id END) AS used_bins,
                COALESCE(SUM(wb.max_capacity), 0) AS total_capacity,
                COALESCE(SUM(inv.qty), 0) AS used_capacity
            FROM warehouses w
            LEFT JOIN warehouse_bins wb ON wb.warehouse_id = w.warehouse_id AND wb.is_active = 1
            LEFT JOIN (
                SELECT bin_id, SUM(quantity) AS qty
                FROM inventory
                GROUP BY bin_id
            ) inv ON inv.bin_id = wb.bin_id
            WHERE w.is_active = 1
            GROUP BY w.warehouse_id, w.name
            ORDER BY w.name
        `, { type: QueryTypes.SELECT });

        return rows.map(r => ({
            warehouse_id: r.warehouse_id,
            warehouse_name: r.warehouse_name,
            total_bins: Number(r.total_bins || 0),
            used_bins: Number(r.used_bins || 0),
            total_capacity: Number(r.total_capacity || 0),
            used_capacity: Number(r.used_capacity || 0),
            utilization_pct: r.total_capacity > 0
                ? Math.round((Number(r.used_capacity || 0) / Number(r.total_capacity)) * 100)
                : 0
        }));
    }

    /**
     * Get service center summary (repairs + RMAs)
     */
    async getServiceSummary() {
        const repairRows = await sequelizeMaster.query(`
            SELECT status, COUNT(*) AS count
            FROM repair_jobs
            GROUP BY status
            ORDER BY count DESC
        `, { type: QueryTypes.SELECT });

        const rmaRows = await sequelizeMaster.query(`
            SELECT status, COUNT(*) AS count
            FROM rmas
            GROUP BY status
            ORDER BY count DESC
        `, { type: QueryTypes.SELECT });

        return {
            repairs: repairRows.map(r => ({
                status: r.status,
                count: Number(r.count || 0)
            })),
            rmas: rmaRows.map(r => ({
                status: r.status,
                count: Number(r.count || 0)
            }))
        };
    }
}

module.exports = DashboardService;
