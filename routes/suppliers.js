const express = require('express');
const router = express.Router();
const { isAuthenticated, isStaffOrAdmin } = require('../middleware/auth');
const InputValidator = require('../middleware/inputValidation');
const SanitizationService = require('../services/SanitizationService');

module.exports = (suppliersPool, convertBigIntToNumber) => {
    
    // Suppliers Listing Route
    router.get('/suppliers', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await suppliersPool.getConnection();
            
            const search = req.query.search || '';
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;

            let query = 'SELECT * FROM suppliers';
            let countQuery = 'SELECT COUNT(*) as total FROM suppliers';
            let params = [];

            if (search) {
                const searchCondition = ' WHERE name LIKE ? OR contact_person LIKE ? OR contact_email LIKE ? OR email LIKE ?';
                query += searchCondition + ' ORDER BY name';
                countQuery += searchCondition;
                const searchTerm = `%${search}%`;
                params = [searchTerm, searchTerm, searchTerm, searchTerm];
            } else {
                query += ' ORDER BY name';
            }

            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [totalResult] = await conn.query(countQuery, search ? params.slice(0, -2) : []);
            const total = convertBigIntToNumber(totalResult.total);

            const suppliersResult = await conn.query(query, params);

            res.render('suppliers', {
                title: 'Suppliers',
                suppliers: convertBigIntToNumber(suppliersResult),
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                limit,
                search: search || '',
                total,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    // Individual Supplier Details Route
    router.get('/supplier/:id', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await suppliersPool.getConnection();
            const supplierId = req.params.id;
            
            const [supplier] = await conn.query('SELECT * FROM suppliers WHERE id = ?', [supplierId]);
            
            if (!supplier) {
                req.flash('error', 'Supplier not found');
                return res.redirect('/suppliers');
            }

            res.render('supplier-details', {
                title: 'Supplier Details',
                supplier: convertBigIntToNumber(supplier),
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    // Add Supplier Form Route
    router.get('/suppliers/add', isStaffOrAdmin, (req, res) => {
        res.render('supplier-form', {
            title: 'Add New Supplier',
            action: 'add',
            supplier: null,
            csrfToken: req.csrfToken()
        });
    });

    // Create Supplier Route
    router.post('/suppliers', isStaffOrAdmin, InputValidator.validateSupplierData, async (req, res, next) => {
        let conn;
        try {
            conn = await suppliersPool.getConnection();
            const sanitizedData = SanitizationService.sanitizeSupplierInput(req.body);
            
            // Check if supplier name already exists
            const [existingSupplier] = await conn.query('SELECT id FROM suppliers WHERE name = ?', [sanitizedData.name]);
            if (existingSupplier) {
                req.flash('error', 'Supplier name already exists. Please use a different name.');
                return res.redirect('/suppliers/add');
            }
            
            // Build dynamic insert query with field validation
            const allowedFields = new Set([
                'name', 'contact_person', 'contact_email', 'email', 'phone', 
                'address', 'city', 'country', 'postal_code', 'tax_id',
                'payment_terms', 'notes', 'is_active'
            ]);
            
            const fields = [];
            const placeholders = [];
            const values = [];
            
            Object.entries(sanitizedData).forEach(([key, value]) => {
                if (allowedFields.has(key) && value !== null && value !== undefined && value !== '') {
                    fields.push(key);
                    placeholders.push('?');
                    values.push(value);
                }
            });
            
            if (fields.length === 0) {
                req.flash('error', 'No valid supplier data provided');
                return res.redirect('/suppliers/add');
            }
            
            const insertQuery = `INSERT INTO suppliers (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
            const result = await conn.query(insertQuery, values);
            
            req.flash('success', 'Supplier added successfully');
            res.redirect(`/supplier/${result.insertId}?success=created`);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    // Edit Supplier Form Route
    router.get('/suppliers/edit/:id', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await suppliersPool.getConnection();
            const supplierId = req.params.id;
            
            const [supplier] = await conn.query('SELECT * FROM suppliers WHERE id = ?', [supplierId]);
            
            if (!supplier) {
                req.flash('error', 'Supplier not found');
                return res.redirect('/suppliers');
            }

            res.render('supplier-form', {
                title: 'Edit Supplier',
                action: 'edit',
                supplier: convertBigIntToNumber(supplier),
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    // Update Supplier Route
    router.post('/suppliers/:id', isStaffOrAdmin, InputValidator.validateSupplierData, async (req, res, next) => {
        let conn;
        try {
            conn = await suppliersPool.getConnection();
            const supplierId = req.params.id;
            const sanitizedData = SanitizationService.sanitizeSupplierInput(req.body);
            
            // Check if supplier exists
            const [existingSupplier] = await conn.query('SELECT id FROM suppliers WHERE id = ?', [supplierId]);
            if (!existingSupplier) {
                req.flash('error', 'Supplier not found');
                return res.redirect('/suppliers');
            }
            
            // Build dynamic update query with field validation
            const allowedFields = new Set([
                'name', 'contact_person', 'contact_email', 'email', 'phone', 
                'address', 'city', 'country', 'postal_code', 'tax_id',
                'payment_terms', 'notes', 'is_active'
            ]);
            
            const updateFields = [];
            const updateValues = [];
            
            Object.entries(sanitizedData).forEach(([key, value]) => {
                if (allowedFields.has(key) && value !== null && value !== undefined && value !== '') {
                    updateFields.push(`${key} = ?`);
                    updateValues.push(value);
                }
            });
            
            if (updateFields.length === 0) {
                req.flash('error', 'No valid data to update');
                return res.redirect(`/supplier/${supplierId}`);
            }
            
            updateValues.push(supplierId);
            
            const updateQuery = `UPDATE suppliers SET ${updateFields.join(', ')} WHERE id = ?`;
            await conn.query(updateQuery, updateValues);
            
            req.flash('success', 'Supplier updated successfully');
            res.redirect(`/supplier/${supplierId}?success=updated`);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    // Toggle Supplier Status Route
    router.post('/suppliers/:id/toggle-status', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await suppliersPool.getConnection();
            const supplierId = req.params.id;
            
            const [supplier] = await conn.query('SELECT is_active FROM suppliers WHERE id = ?', [supplierId]);
            if (!supplier) {
                return res.status(404).json({ success: false, error: 'Supplier not found' });
            }
            
            const newStatus = !supplier.is_active;
            await conn.query('UPDATE suppliers SET is_active = ? WHERE id = ?', [newStatus, supplierId]);
            
            res.json({ success: true, newStatus });
        } catch (err) {
            console.error('Toggle supplier status error:', err);
            res.status(500).json({ success: false, error: 'Failed to update supplier status' });
        } finally {
            if (conn) conn.release();
        }
    });

    // Delete Supplier Route
    router.post('/suppliers/:id/delete', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await suppliersPool.getConnection();
            const supplierId = req.params.id;
            
            // Check if supplier exists
            const [supplier] = await conn.query('SELECT name FROM suppliers WHERE id = ?', [supplierId]);
            if (!supplier) {
                req.flash('error', 'Supplier not found');
                return res.redirect('/suppliers');
            }
            
            // Delete the supplier
            await conn.query('DELETE FROM suppliers WHERE id = ?', [supplierId]);
            
            req.flash('success', `Supplier "${supplier.name}" deleted successfully`);
            res.redirect('/suppliers?success=deleted');
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};
