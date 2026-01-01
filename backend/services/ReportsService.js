/**
 * ReportsService (Sequelize Version)
 * Provides reporting queries for inventory, transactions, and analytics
 * Refactored to use consolidated `inventory` table and views via Sequelize raw queries / models
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { Product } = require('../models/master');

class ReportsService {
    constructor() { }

    /**
     * Get all products for selection in forms (RMA, Repair Jobs, etc.)
     */
    async getProducts() {
        return await Product.findAll({
            attributes: ['product_id', 'name', 'brand', 'model', 'sku', 'category', 'base_price', 'is_active'],
            where: { is_active: 1 },
            order: [['name', 'ASC']],
            raw: true
        });
    }

    /**
     * Generate inventory report with optional filters
     * Uses view_inventory_summary for efficiency
     */
    async getInventoryReport(filters = {}) {
        const { warehouse_id } = filters;
        let sql = `
            SELECT 
                product_id, device_name as name, NULL as brand, NULL as model, NULL as sku, NULL as category,
                total_on_hand as total_quantity,
                total_reserved,
                available_to_promise as available_quantity,
                warehouse_name, warehouse_id
            FROM view_inventory_summary
            WHERE 1=1
        `;
        const replacements = {};

        if (warehouse_id) {
            sql += ` AND warehouse_id = :warehouse_id`;
            replacements.warehouse_id = warehouse_id;
        }
        sql += ` ORDER BY device_name`;

        return await sequelizeMaster.query(sql, {
            replacements,
            type: QueryTypes.SELECT
        });
    }

    /**
     * Generate transaction report with pagination and filters
     * Reverting to base table query as view_transaction_ledger lacks ID filtering support or column exposure
     */
    async getTransactionsReport(filters = {}) {
        const { limit = 100, offset = 0, type, date_from, date_to, warehouse_id } = filters;

        // Since it's a left join to different tables, let's use a raw query or Sequelize include
        // It's probably easier to use a raw query to keep it identical to the working SQL
        let sql = `
            SELECT 
                t.id as log_id, t.transaction_type, t.quantity_changed,
                t.transaction_date as created_at, t.notes, t.receipt_id,
                t.warehouse_id, w.name as warehouse_name,
                p.device_name as product_name
            FROM transactions t
            LEFT JOIN warehouses w ON t.warehouse_id = w.warehouse_id
            LEFT JOIN phone_specs p ON t.product_id = p.product_id
            WHERE 1=1
        `;
        const replacements = {};

        if (type) { sql += ` AND t.transaction_type = :type`; replacements.type = type; }
        if (date_from) { sql += ` AND t.transaction_date >= :date_from`; replacements.date_from = date_from; }
        if (date_to) { sql += ` AND t.transaction_date <= :date_to`; replacements.date_to = date_to; }
        if (warehouse_id) { sql += ` AND t.warehouse_id = :warehouse_id`; replacements.warehouse_id = warehouse_id; }

        sql += ` ORDER BY t.transaction_date DESC LIMIT :limit OFFSET :offset`;
        replacements.limit = parseInt(limit);
        replacements.offset = parseInt(offset);

        return await sequelizeMaster.query(sql, {
            replacements,
            type: QueryTypes.SELECT
        });
    }

    /**
     * Calculate total stock valuation by warehouse
     */
    async getStockValuation(_filters = {}) {
        const warehouses = await sequelizeMaster.query(`
            SELECT 
                w.warehouse_id, w.name as warehouse_name,
                COUNT(DISTINCT i.product_id) as unique_products,
                COALESCE(SUM(i.quantity), 0) as total_quantity,
                COALESCE(SUM(i.quantity * COALESCE(p.unit_price, 0)), 0) as total_value
            FROM warehouses w
            LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id AND i.quantity > 0
            LEFT JOIN products p ON i.product_id = p.product_id
            WHERE w.is_active = 1
            GROUP BY w.warehouse_id, w.name
            ORDER BY w.name
        `, { type: QueryTypes.SELECT });

        const totalValue = warehouses.reduce((sum, w) => sum + Number(w.total_value || 0), 0);

        return {
            warehouses,
            total_value: totalValue,
            currency: 'VND'
        };
    }

    /**
     * Generate sales report (based on outgoing transactions)
     */
    async getSalesReport(periodDays = 30) {
        const dailySales = await sequelizeMaster.query(`
            SELECT 
                DATE(transaction_date) as sale_date,
                COUNT(*) as transaction_count,
                COALESCE(SUM(ABS(quantity_changed)), 0) as total_quantity,
                COALESCE(SUM(total_value), 0) as total_value
            FROM transactions
            WHERE transaction_type = 'outgoing'
                AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL :periodDays DAY)
            GROUP BY DATE(transaction_date)
            ORDER BY sale_date
        `, {
            replacements: { periodDays: parseInt(periodDays) },
            type: QueryTypes.SELECT
        });

        const totalSales = dailySales.reduce((sum, d) => sum + Number(d.total_value || 0), 0);
        const totalQuantity = dailySales.reduce((sum, d) => sum + Number(d.total_quantity || 0), 0);

        return {
            period_days: parseInt(periodDays),
            daily_sales: dailySales,
            total_sales: totalSales,
            total_quantity: totalQuantity
        };
    }

    /**
     * Generate inventory aging report
     */
    async getAgingReport() {
        return await sequelizeMaster.query(`
            SELECT 
                i.product_id, 
                COALESCE(p.device_name, sp.part_name) as name, 
                COALESCE(p.device_maker, sp.part_category) as brand, 
                COALESCE(sp.part_code, NULL) as sku,
                i.quantity as quantity_on_hand,
                i.created_at as received_date,
                DATEDIFF(CURDATE(), i.created_at) as age_days,
                CASE
                    WHEN DATEDIFF(CURDATE(), i.created_at) <= 30 THEN '0-30 days'
                    WHEN DATEDIFF(CURDATE(), i.created_at) <= 60 THEN '31-60 days'
                    WHEN DATEDIFF(CURDATE(), i.created_at) <= 90 THEN '61-90 days'
                    ELSE '90+ days'
                END as age_bracket
            FROM inventory i
            LEFT JOIN phone_specs p ON i.product_id = p.product_id
            LEFT JOIN spare_parts sp ON i.product_id = sp.spare_part_id
            WHERE i.quantity > 0
            ORDER BY age_days DESC
        `, { type: QueryTypes.SELECT });
    }

    /**
     * Generate summary of inventory movements
     */
    async getMovementSummary(filters = {}) {
        const { date_from, date_to } = filters;
        const replacements = {};
        let dateFilter = '';

        if (date_from) { dateFilter += ` AND transaction_date >= :date_from`; replacements.date_from = date_from; }
        if (date_to) { dateFilter += ` AND transaction_date <= :date_to`; replacements.date_to = date_to; }

        const movements = await sequelizeMaster.query(`
            SELECT 
                transaction_type,
                COUNT(*) as count,
                COALESCE(SUM(ABS(quantity_changed)), 0) as total_quantity,
                COALESCE(SUM(total_value), 0) as total_value
            FROM transactions
            WHERE 1=1 ${dateFilter}
            GROUP BY transaction_type
            ORDER BY transaction_type
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        return {
            movements,
            date_range: {
                from: date_from || null,
                to: date_to || null
            }
        };
    }

    /**
     * Get products below reorder level
     */
    async getLowStock() {
        return await sequelizeMaster.query(`
            SELECT 
                p.product_id, p.name, p.brand, p.model, p.sku,
                p.reorder_point, p.reorder_quantity, p.safety_stock,
                COALESCE(v.total_on_hand, 0) as current_stock,
                (COALESCE(p.reorder_point, 0) - COALESCE(v.total_on_hand, 0)) as deficit
            FROM products p
            LEFT JOIN (
                SELECT product_id, SUM(quantity) as total_on_hand 
                FROM inventory 
                GROUP BY product_id
            ) v ON p.product_id = v.product_id
            WHERE p.is_active = 1 AND p.reorder_point IS NOT NULL AND p.reorder_point > 0
            HAVING current_stock < p.reorder_point
            ORDER BY deficit DESC
        `, { type: QueryTypes.SELECT });
    }

    /**
     * @deprecated Use specific report methods instead
     */
    async generateReport() { return {}; }
    async getStockReport() { return []; }
}

module.exports = ReportsService;
