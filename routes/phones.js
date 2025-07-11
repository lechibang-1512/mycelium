const express = require('express');
const router = express.Router();
const { isAuthenticated, isStaffOrAdmin } = require('../middleware/auth');
const InputValidator = require('../middleware/inputValidation');
const SanitizationService = require('../services/SanitizationService');

module.exports = (pool, convertBigIntToNumber, formatDeviceInfo) => {
    
    // Individual Phone Details Route
    router.get('/phone/:id', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const phoneId = req.params.id;
            
            const [phone] = await conn.query('SELECT * FROM specs_db WHERE product_id = ?', [phoneId]);
            
            if (!phone) {
                req.flash('error', 'Phone not found');
                return res.redirect('/');
            }

            // Get recent inventory logs for this phone
            const inventoryLogs = await conn.query(`
                SELECT *, DATE_FORMAT(transaction_date, '%M %d, %Y at %h:%i %p') as formatted_date
                FROM inventory_log 
                WHERE phone_id = ? 
                ORDER BY transaction_date DESC 
                LIMIT 10
            `, [phoneId]);

            res.render('details', {
                title: phone.device_name || 'Phone Details',
                phone: convertBigIntToNumber(phone),
                inventoryLogs: convertBigIntToNumber(inventoryLogs),
                formatDeviceInfo, // Pass the helper function
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    // Add Phone Route
    router.get('/phones/add', isStaffOrAdmin, (req, res) => {
        res.render('phone-form', {
            phone: {},
            action: 'add',
            title: 'Add New Phone',
            csrfToken: req.csrfToken()
        });
    });


    // Edit Phone Route
    router.get('/phones/:id/edit', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const phoneId = req.params.id;
            
            const [phone] = await conn.query('SELECT * FROM specs_db WHERE product_id = ?', [phoneId]);
            
            if (!phone) {
                req.flash('error', 'Phone not found');
                return res.redirect('/');
            }

            res.render('phone-form', {
                phone: convertBigIntToNumber(phone),
                action: 'edit',
                title: 'Edit Phone',
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    // Update Phone Route (POST)
    router.post('/phones/:id', isStaffOrAdmin, InputValidator.validatePhoneData, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const phoneId = req.params.id;
            const sanitizedData = SanitizationService.sanitizePhoneInput(req.body);
            
            // Build dynamic update query
            const updateFields = [];
            const updateValues = [];
            
            Object.entries(sanitizedData).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    updateFields.push(`${key} = ?`);
                    updateValues.push(value);
                }
            });
            
            if (updateFields.length === 0) {
                req.flash('error', 'No valid data to update');
                return res.redirect(`/phone/${phoneId}`);
            }
            
            updateValues.push(phoneId);
            
            const updateQuery = `UPDATE specs_db SET ${updateFields.join(', ')} WHERE product_id = ?`;
            await conn.query(updateQuery, updateValues);
            
            req.flash('success', 'Phone updated successfully');
            res.redirect(`/phone/${phoneId}`);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    // Delete Phone Route
    router.post('/phones/:id/delete', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const phoneId = req.params.id;
            
            // Check if phone exists
            const [phone] = await conn.query('SELECT device_name FROM specs_db WHERE product_id = ?', [phoneId]);
            if (!phone) {
                req.flash('error', 'Phone not found');
                return res.redirect('/');
            }
            
            // Delete related inventory logs first
            await conn.query('DELETE FROM inventory_log WHERE phone_id = ?', [phoneId]);
            
            // Delete the phone
            await conn.query('DELETE FROM specs_db WHERE product_id = ?', [phoneId]);
            
            req.flash('success', `Phone "${phone.device_name}" deleted successfully`);
            res.redirect('/?success=deleted');
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    // Create Phone Route (POST)
    router.post('/phones', isStaffOrAdmin, InputValidator.validatePhoneData, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const sanitizedData = SanitizationService.sanitizePhoneInput(req.body);
            
            // Build dynamic insert query
            const fields = [];
            const placeholders = [];
            const values = [];
            
            Object.entries(sanitizedData).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    fields.push(key);
                    placeholders.push('?');
                    values.push(value);
                }
            });
            
            // Always include product_type
            if (!fields.includes('product_type')) {
                fields.push('product_type');
                placeholders.push('?');
                values.push('phone');
            }
            
            const insertQuery = `INSERT INTO specs_db (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
            const result = await conn.query(insertQuery, values);
            
            req.flash('success', 'Phone added successfully');
            res.redirect(`/phone/${result.insertId}?success=created`);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};
