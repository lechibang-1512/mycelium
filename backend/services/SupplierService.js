/**
 * Supplier Service (MongoDB Version)
 * Handles supplier CRUD, stats, and analytics
 */

const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const Transaction = require('../models/Transaction');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');

class SupplierService {
    constructor(_pool) {
        // Pool parameter kept for backward compatibility but not used
    }

    // =========================================================================
    // CRUD OPERATIONS
    // =========================================================================

    async getSuppliers(filters = {}) {
        const query = {};

        if (filters.is_active !== undefined) query.is_active = filters.is_active;
        else if (!filters.includeInactive) query.is_active = true;

        if (filters.category) query.category = filters.category;
        if (filters.search) {
            query.$or = [
                { name: new RegExp(filters.search, 'i') },
                { contact_person: new RegExp(filters.search, 'i') },
                { email: new RegExp(filters.search, 'i') }
            ];
        }

        const suppliers = await Supplier.find(query)
            .sort({ name: 1 })
            .lean();

        return suppliers.map(s => this._formatSupplier(s));
    }

    async getSupplierById(supplierId) {
        const supplier = await Supplier.findOne({ supplier_id: supplierId }).lean();
        if (!supplier) return null;
        return this._formatSupplier(supplier);
    }

    async createSupplier(supplierData) {
        const {
            name, category, contact_person, contact_position,
            email, phone, website, address, city, province, ward, district,
            tax_code, payment_terms, lead_time_days, rating, brands, notes
        } = supplierData;

        if (!name) throw new Error('Supplier name is required');

        // Check duplicate name
        const existing = await Supplier.findOne({ name: new RegExp(`^${name}$`, 'i') });
        if (existing) throw new Error('Supplier with this name already exists');

        // Validate email if provided
        if (email && !this.isValidEmail(email)) {
            throw new Error('Invalid email format');
        }

        const supplier = await Supplier.create({
            name,
            category,
            contact_person,
            contact_position,
            email,
            phone,
            website,
            address,
            city,
            province,
            ward,
            district,
            tax_code,
            payment_terms,
            lead_time_days,
            rating,
            brands: brands || [],
            notes,
            is_active: true
        });

        return {
            supplier_id: supplier.supplier_id,
            success: true
        };
    }

    async updateSupplier(supplierId, supplierData) {
        const supplier = await Supplier.findOne({ supplier_id: supplierId });
        if (!supplier) return { success: false, error: 'Supplier not found' };

        const fields = [
            'name', 'category', 'contact_person', 'contact_position',
            'email', 'phone', 'website', 'address', 'city', 'province',
            'ward', 'district', 'tax_code', 'payment_terms', 'lead_time_days',
            'rating', 'brands', 'notes', 'is_active', 'additional_contacts'
        ];

        fields.forEach(field => {
            if (supplierData[field] !== undefined) {
                supplier[field] = supplierData[field];
            }
        });

        if (supplierData.email && !this.isValidEmail(supplierData.email)) {
            return { success: false, error: 'Invalid email format' };
        }

        await supplier.save();
        return { success: true };
    }

    async deactivateSupplier(supplierId) {
        const result = await Supplier.updateOne(
            { supplier_id: supplierId },
            { $set: { is_active: false } }
        );
        if (result.matchedCount === 0) {
            return { success: false, error: 'Supplier not found' };
        }
        return { success: true, message: 'Supplier deactivated successfully' };
    }

    async deleteSupplier(supplierId) {
        // Check for linked transactions
        const txnCount = await Transaction.countDocuments({ supplier_id: supplierId });
        if (txnCount > 0) {
            return {
                success: false,
                error: `Cannot delete: supplier has ${txnCount} transactions. Use deactivate instead.`
            };
        }

        // Check for linked inventory
        const invCount = await Inventory.countDocuments({ supplier_id: supplierId });
        if (invCount > 0) {
            return {
                success: false,
                error: `Cannot delete: supplier has ${invCount} inventory items. Use deactivate instead.`
            };
        }

        const result = await Supplier.deleteOne({ supplier_id: supplierId });
        return { success: result.deletedCount > 0 };
    }

    // =========================================================================
    // STATS & ANALYTICS
    // =========================================================================

    async getSupplierStats(supplierId) {
        const txnStats = await Transaction.aggregate([
            { $match: { supplier_id: supplierId, transaction_type: 'incoming' } },
            {
                $group: {
                    _id: null,
                    total_transactions: { $sum: 1 },
                    total_value: { $sum: '$totals.total_amount' },
                    avg_transaction: { $avg: '$totals.total_amount' },
                    total_items: { $sum: { $size: '$items' } }
                }
            }
        ]);

        const stats = txnStats[0] || {
            total_transactions: 0,
            total_value: 0,
            avg_transaction: 0,
            total_items: 0
        };

        // Get product count
        const products = await Inventory.distinct('product_id', { supplier_id: supplierId });

        return {
            supplier_id: supplierId,
            total_transactions: stats.total_transactions,
            total_value: Math.round(stats.total_value * 100) / 100,
            avg_transaction_value: Math.round(stats.avg_transaction * 100) / 100,
            total_items_received: stats.total_items,
            unique_products: products.length
        };
    }

    async getSupplierPerformance(supplierId, days = 90) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const performance = await Transaction.aggregate([
            {
                $match: {
                    supplier_id: supplierId,
                    transaction_type: 'incoming',
                    transaction_date: { $gte: cutoff }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$transaction_date' } },
                    count: { $sum: 1 },
                    total_value: { $sum: '$totals.total_amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return {
            supplier_id: supplierId,
            period_days: days,
            monthly_breakdown: performance.map(p => ({
                month: p._id,
                transaction_count: p.count,
                total_value: Math.round(p.total_value * 100) / 100
            }))
        };
    }

    async getStockValuation(supplierId = null) {
        const match = { inventory_type: 'bulk', quantity: { $gt: 0 } };
        if (supplierId) match.supplier_id = supplierId;

        const valuation = await Inventory.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: 'product_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$supplier_id',
                    total_units: { $sum: '$quantity' },
                    unique_products: { $addToSet: '$product_id' },
                    total_cost: { $sum: { $multiply: ['$quantity', { $ifNull: ['$product.base_price', 0] }] } }
                }
            }
        ]);

        return valuation.map(v => ({
            supplier_id: v._id,
            total_units: v.total_units,
            unique_products: v.unique_products?.length || 0,
            estimated_cost_value: Math.round(v.total_cost * 100) / 100
        }));
    }

    async getTopSuppliers(limit = 10, days = 90) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const top = await Transaction.aggregate([
            {
                $match: {
                    transaction_type: 'incoming',
                    transaction_date: { $gte: cutoff }
                }
            },
            {
                $group: {
                    _id: '$supplier_id',
                    transaction_count: { $sum: 1 },
                    total_value: { $sum: '$totals.total_amount' }
                }
            },
            { $sort: { total_value: -1 } },
            { $limit: limit }
        ]);

        // Enrich with supplier names
        const supplierIds = top.map(t => t._id);
        const suppliers = await Supplier.find({ supplier_id: { $in: supplierIds } }).lean();
        const supplierMap = {};
        suppliers.forEach(s => { supplierMap[s.supplier_id] = s; });

        return top.map(t => ({
            supplier_id: t._id,
            supplier_name: supplierMap[t._id]?.name || 'Unknown',
            transaction_count: t.transaction_count,
            total_value: Math.round(t.total_value * 100) / 100
        }));
    }

    async getCategories() {
        const categories = await Supplier.distinct('category', { is_active: true });
        return categories.filter(Boolean).map(c => ({ name: c }));
    }

    async getAvailableBrands() {
        const supplierBrands = await Supplier.distinct('brands', { is_active: true });
        const productBrands = await Product.distinct('device_maker');

        return {
            phones: [...new Set(productBrands.filter(Boolean))],
            parts: [...new Set(supplierBrands.flat().filter(Boolean))]
        };
    }

    async getSupplierProducts(supplierId) {
        const products = await Inventory.aggregate([
            { $match: { supplier_id: supplierId } },
            { $group: { _id: '$product_id', total_received: { $sum: '$quantity' } } },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } }
        ]);

        return products.map(p => ({
            product_id: p._id,
            device_name: p.product?.device_name,
            device_maker: p.product?.device_maker,
            total_received: p.total_received
        }));
    }

    async getBasicStats(supplierId) {
        return this.getSupplierStats(supplierId);
    }

    async checkSupplierProductCompatibility(supplierId, productId) {
        const supplier = await Supplier.findOne({ supplier_id: supplierId }).lean();
        if (!supplier) return { compatible: false, reason: 'Supplier not found' };

        const product = await Product.findOne({ product_id: productId }).lean();
        if (!product) return { compatible: false, reason: 'Product not found' };

        // Check if supplier's brands include product's maker
        if (supplier.brands && supplier.brands.length > 0) {
            const isCompatible = supplier.brands.some(
                b => b.toLowerCase() === product.device_maker?.toLowerCase()
            );
            return { compatible: isCompatible, reason: isCompatible ? 'Brand match' : 'Brand mismatch' };
        }

        return { compatible: true, reason: 'No brand restrictions' };
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    _formatSupplier(s) {
        return {
            id: s.supplier_id,
            supplier_id: s.supplier_id,
            name: s.name,
            category: s.category,
            contact_person: s.contact_person,
            contact_position: s.contact_position,
            email: s.email,
            phone: s.phone,
            website: s.website,
            address: s.address,
            city: s.city,
            province: s.province,
            ward: s.ward,
            district: s.district,
            tax_code: s.tax_code,
            payment_terms: s.payment_terms,
            lead_time_days: s.lead_time_days,
            rating: s.rating,
            brands: s.brands || [],
            additional_contacts: s.additional_contacts || [],
            notes: s.notes,
            is_active: s.is_active,
            created_at: s.created_at,
            updated_at: s.updated_at
        };
    }
}

module.exports = SupplierService;
