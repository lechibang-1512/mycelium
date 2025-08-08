/**
 * Supplier Service (Sequelize Version)
 * Handles supplier CRUD, stats, and analytics
 */

const { QueryTypes, Op } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { Supplier, Transaction, Inventory } = require('../models/master');
const { generateId } = require('../utils/generateId');
const { ValidationError, ConflictError } = require('../utils/errors');


class SupplierService {
    constructor() { }

    // =========================================================================
    // CRUD OPERATIONS
    // =========================================================================

    async getSuppliers(filters = {}) {
        const where = {};

        if (filters.is_active !== undefined) {
            where.is_active = filters.is_active ? 1 : 0;
        } else if (!filters.includeInactive) {
            where.is_active = 1;
        }

        if (filters.category) {
            where.category = filters.category;
        }

        if (filters.search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${filters.search}%` } },
                { contact_person: { [Op.like]: `%${filters.search}%` } },
                { email: { [Op.like]: `%${filters.search}%` } }
            ];
        }

        const suppliers = await Supplier.findAll({
            where,
            order: [['name', 'ASC']]
        });
        return suppliers.map(s => this._formatSupplier(s.toJSON()));
    }

    async getSupplierById(supplierId) {
        if (!supplierId) return null;

        const supplier = await Supplier.findByPk(supplierId);
        if (!supplier) return null;
        return this._formatSupplier(supplier.toJSON());
    }

    async createSupplier(supplierData) {
        const {
            name, category, contact_person, contact_position,
            email, phone, website, address, city, province, ward, district,
            tax_code, payment_terms, lead_time_days, rating, brands, notes
        } = supplierData;

        if (!name) throw new ValidationError('supplier name is required');
        if (email && !this.isValidEmail(email)) throw new ValidationError('invalid email format');

        const existing = await Supplier.findOne({ where: { name } });
        if (existing) throw new ConflictError('supplier with this name already exists');

        const newId = generateId();
        await Supplier.create({
            supplier_id: newId,
            name, category, contact_person, contact_position, email, phone, website,
            address, city, province, ward, district, tax_code, payment_terms,
            lead_time_days, rating, brands: JSON.stringify(brands || []), notes,
            is_active: 1
        });

        return { id: newId, supplier_id: newId, success: true };
    }

    async updateSupplier(supplierId, supplierData) {
        if (supplierData.email && !this.isValidEmail(supplierData.email)) {
            return { success: false, error: 'Invalid email format' };
        }

        const allowedFields = [
            'name', 'category', 'contact_person', 'contact_position',
            'email', 'phone', 'website', 'address', 'city', 'province',
            'ward', 'district', 'tax_code', 'payment_terms', 'lead_time_days',
            'rating', 'notes', 'is_active'
        ];

        const updateData = {};
        allowedFields.forEach(f => {
            if (supplierData[f] !== undefined) {
                updateData[f] = supplierData[f];
            }
        });

        if (supplierData.brands !== undefined) {
            updateData.brands = JSON.stringify(supplierData.brands);
        }

        if (Object.keys(updateData).length === 0) return { success: true };

        await Supplier.update(updateData, { where: { supplier_id: supplierId } });
        return { success: true };
    }

    async deactivateSupplier(supplierId) {
        await Supplier.update({ is_active: 0 }, { where: { supplier_id: supplierId } });
        return { success: true, message: 'Supplier deactivated successfully' };
    }

    async deleteSupplier(supplierId) {
        const txnCount = await Transaction.count({ where: { supplier_id: supplierId } });
        if (txnCount > 0) return { success: false, error: `Cannot delete: supplier has ${txnCount} transactions` };

        const invCount = await Inventory.count({ where: { supplier_id: supplierId } });
        if (invCount > 0) return { success: false, error: `Cannot delete: supplier has ${invCount} inventory items` };

        await Supplier.destroy({ where: { supplier_id: supplierId } });
        return { success: true };
    }

    // =========================================================================
    // STATS & ANALYTICS
    // =========================================================================

    async getSupplierStats(supplierId) {
        const [stats] = await sequelizeMaster.query(`
            SELECT 
                COUNT(DISTINCT transaction_group_id) as total_transactions,
                SUM(total_amount) as total_value,
                AVG(total_amount) as avg_transaction
            FROM transactions 
            WHERE supplier_id = ? AND transaction_type = 'incoming'
        `, { replacements: [supplierId], type: QueryTypes.SELECT });

        const [items] = await sequelizeMaster.query(`
            SELECT SUM(quantity_changed) as total_items
            FROM transactions
            WHERE supplier_id = ? AND transaction_type = 'incoming'
        `, { replacements: [supplierId], type: QueryTypes.SELECT });

        const [prods] = await sequelizeMaster.query(`
            SELECT COUNT(DISTINCT product_id) as count 
            FROM inventory WHERE supplier_id = ?
        `, { replacements: [supplierId], type: QueryTypes.SELECT });

        return {
            supplier_id: supplierId,
            total_transactions: stats?.total_transactions || 0,
            total_value: Number(stats?.total_value || 0),
            avg_transaction_value: Number(stats?.avg_transaction || 0),
            total_items_received: Number(items?.total_items || 0),
            unique_products: Number(prods?.count || 0)
        };
    }

    async getSupplierPerformance(supplierId, days = 90) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const rows = await sequelizeMaster.query(`
            SELECT 
                DATE_FORMAT(transaction_date, '%Y-%m') as month,
                COUNT(*) as count,
                SUM(total_amount) as total_value
            FROM transactions
            WHERE supplier_id = ? AND transaction_type = 'incoming' AND transaction_date >= ?
            GROUP BY month
            ORDER BY month ASC
        `, { replacements: [supplierId, cutoff], type: QueryTypes.SELECT });

        return {
            supplier_id: supplierId,
            period_days: days,
            monthly_breakdown: rows.map(r => ({
                month: r.month,
                transaction_count: Number(r.count),
                total_value: Number(r.total_value)
            }))
        };
    }

    async getStockValuation(supplierId = null) {
        let sql = `
            SELECT 
                i.supplier_id,
                SUM(i.quantity) as total_units,
                COUNT(DISTINCT i.product_id) as unique_products,
                SUM(i.quantity * COALESCE(p.device_price, 0)) as total_cost
            FROM inventory i
            LEFT JOIN phone_specs p ON i.product_id = p.product_id
            WHERE i.inventory_type = 'bulk' AND i.quantity > 0
        `;
        const params = [];
        if (supplierId) {
            sql += ` AND i.supplier_id = ?`;
            params.push(supplierId);
        }
        sql += ` GROUP BY i.supplier_id`;

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        return rows.map(v => ({
            supplier_id: v.supplier_id,
            total_units: Number(v.total_units),
            unique_products: Number(v.unique_products),
            estimated_cost_value: Number(v.total_cost)
        }));
    }

    async getCategories() {
        const suppliers = await Supplier.findAll({
            attributes: ['category'],
            where: { is_active: 1, category: { [Op.not]: null } },
            group: ['category']
        });
        return suppliers.map(s => s.category).filter(Boolean);
    }

    async getAvailableBrands() {
        const suppliers = await Supplier.findAll({
            attributes: ['brands'],
            where: { is_active: 1, brands: { [Op.not]: null } }
        });
        const brandSet = new Set();
        for (const s of suppliers) {
            try {
                const parsed = typeof s.brands === 'string' ? JSON.parse(s.brands) : s.brands;
                if (Array.isArray(parsed)) {
                    parsed.forEach(b => { if (b) brandSet.add(b); });
                }
            } catch { /* skip malformed JSON */ }
        }
        return [...brandSet].sort();
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    _formatSupplier(s) {
        let brands = [];
        try {
            brands = typeof s.brands === 'string' ? JSON.parse(s.brands) : (s.brands || []);
        } catch (_e) { brands = []; }

        return {
            ...s,
            id: s.supplier_id,
            brands,
            is_active: !!s.is_active
        };
    }
}

module.exports = SupplierService;
