const express = require('express');
const router = express.Router();
const { isAuthenticated, isStaffOrAdmin } = require('../middleware/auth');

module.exports = (pool, suppliersPool, convertBigIntToNumber) => {
    
    // Receive Stock Route
    router.get('/inventory/receive', isStaffOrAdmin, async (req, res, next) => {
        let conn, suppliersConn;
        try {
            conn = await pool.getConnection();
            suppliersConn = await suppliersPool.getConnection();
            
            const phonesResult = await conn.query('SELECT product_id, device_name, device_maker, device_price, device_inventory, ram, rom, color FROM specs_db ORDER BY device_name');
            const suppliersResult = await suppliersConn.query('SELECT id as supplier_id, name FROM suppliers WHERE is_active = 1');

            res.render('receive-stock', {
                title: 'Receive Stock',
                phones: convertBigIntToNumber(phonesResult),
                suppliers: convertBigIntToNumber(suppliersResult),
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
            if (suppliersConn) suppliersConn.release();
        }
    });

    // Process Receive Stock Route
    router.post('/inventory/receive', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const {
                phone_id,
                supplier_id,
                quantity,
                unit_cost,
                tax_type,
                vat_rate,
                import_duty,
                other_fees,
                po_number,
                notes,
                generate_receipt
            } = req.body;
            
            // Validate inputs
            if (!phone_id || !supplier_id || !quantity || quantity <= 0) {
                req.flash('error', 'Please provide all required fields with valid values');
                return res.redirect('/inventory/receive');
            }
            
            // Get current phone data
            const [phone] = await conn.query('SELECT * FROM specs_db WHERE product_id = ?', [phone_id]);
            if (!phone) {
                req.flash('error', 'Phone not found');
                return res.redirect('/inventory/receive');
            }
            
            // Calculate financial values
            const unitCostValue = parseFloat(unit_cost) || 0;
            const quantityValue = parseInt(quantity);
            const vatRateValue = parseFloat(vat_rate) || 0;
            const importDutyValue = parseFloat(import_duty) || 0;
            const otherFeesValue = parseFloat(other_fees) || 0;
            
            const subtotal = unitCostValue * quantityValue;
            const vatAmount = tax_type === 'vat' ? subtotal * vatRateValue : 0;
            const importDutyAmount = (subtotal * importDutyValue) / 100;
            const totalCost = subtotal + vatAmount + importDutyAmount + otherFeesValue;
            
            // Update inventory
            const newInventoryLevel = (phone.device_inventory || 0) + quantityValue;
            await conn.query(
                'UPDATE specs_db SET device_inventory = ? WHERE product_id = ?',
                [newInventoryLevel, phone_id]
            );
            
            // Log the inventory transaction
            await conn.query(
                'INSERT INTO inventory_log (phone_id, transaction_type, quantity_changed, total_value, new_inventory_level, supplier_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [phone_id, 'incoming', quantityValue, totalCost, newInventoryLevel, supplier_id, notes || null]
            );
            
            // Generate receipt if requested
            if (generate_receipt === 'on') {
                const receiptData = {
                    phone_info: {
                        id: phone.product_id,
                        name: phone.device_name,
                        maker: phone.device_maker
                    },
                    supplier_id: supplier_id,
                    quantity: quantityValue,
                    unit_cost: unitCostValue,
                    subtotal: subtotal,
                    vat_amount: vatAmount,
                    import_duty_amount: importDutyAmount,
                    other_fees: otherFeesValue,
                    total_cost: totalCost,
                    po_number: po_number || null,
                    tax_type: tax_type,
                    notes: notes || null
                };
                
                const receiptId = `PUR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                
                await conn.query(
                    'INSERT INTO receipts (receipt_id, receipt_type, receipt_data, phone_id, supplier_id, transaction_date, subtotal, tax_amount, total_amount, notes) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)',
                    [receiptId, 'PURCHASE_RECEIPT', JSON.stringify(receiptData), phone_id, supplier_id, subtotal, vatAmount, totalCost, notes || null]
                );
            }
            
            await conn.commit();
            
            req.flash('success', `Successfully received ${quantityValue} units of ${phone.device_name}. New inventory level: ${newInventoryLevel}`);
            res.redirect('/inventory/receive?success=received');
            
        } catch (err) {
            if (conn) await conn.rollback();
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    // Sell Stock Route
    router.get('/inventory/sell', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const phonesResult = await conn.query('SELECT product_id, device_name, device_maker, device_price, device_inventory, ram, rom, color FROM specs_db WHERE device_inventory > 0 ORDER BY device_name');

            res.render('sell-stock', {
                title: 'Sell Stock',
                phones: convertBigIntToNumber(phonesResult),
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    // Process Sell Stock Route
    router.post('/inventory/sell', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const {
                phone_id,
                quantity,
                tax_type,
                tax_rate,
                discount_percent,
                service_fee,
                customer_name,
                customer_email,
                customer_phone,
                generate_receipt,
                email_receipt,
                notes
            } = req.body;
            
            // Validate inputs
            if (!phone_id || !quantity || quantity <= 0) {
                req.flash('error', 'Please provide all required fields with valid values');
                return res.redirect('/inventory/sell');
            }
            
            // Get current phone data
            const [phone] = await conn.query('SELECT * FROM specs_db WHERE product_id = ?', [phone_id]);
            if (!phone) {
                req.flash('error', 'Phone not found');
                return res.redirect('/inventory/sell');
            }
            
            const quantityValue = parseInt(quantity);
            const currentInventory = phone.device_inventory || 0;
            
            // Check if sufficient stock is available
            if (quantityValue > currentInventory) {
                req.flash('error', `Insufficient stock. Available: ${currentInventory}, Requested: ${quantityValue}`);
                return res.redirect('/inventory/sell');
            }
            
            // Calculate financial values
            const unitPrice = parseFloat(phone.device_price) || 0;
            const subtotal = unitPrice * quantityValue;
            const taxRateValue = parseFloat(tax_rate) || 0;
            const discountPercentValue = parseFloat(discount_percent) || 0;
            const serviceFeeValue = parseFloat(service_fee) || 0;
            
            const taxAmount = tax_type !== 'none' ? subtotal * taxRateValue : 0;
            const discountAmount = (subtotal * discountPercentValue) / 100;
            const totalAmount = subtotal + taxAmount - discountAmount + serviceFeeValue;
            
            // Update inventory
            const newInventoryLevel = currentInventory - quantityValue;
            await conn.query(
                'UPDATE specs_db SET device_inventory = ? WHERE product_id = ?',
                [newInventoryLevel, phone_id]
            );
            
            // Log the inventory transaction
            await conn.query(
                'INSERT INTO inventory_log (phone_id, transaction_type, quantity_changed, total_value, new_inventory_level, notes) VALUES (?, ?, ?, ?, ?, ?)',
                [phone_id, 'outgoing', -quantityValue, totalAmount, newInventoryLevel, notes || null]
            );
            
            // Generate receipt if requested
            if (generate_receipt === 'on') {
                const receiptData = {
                    phone_info: {
                        id: phone.product_id,
                        name: phone.device_name,
                        maker: phone.device_maker
                    },
                    customer: {
                        name: customer_name || null,
                        email: customer_email || null,
                        phone: customer_phone || null
                    },
                    quantity: quantityValue,
                    unit_price: unitPrice,
                    subtotal: subtotal,
                    tax_amount: taxAmount,
                    discount_amount: discountAmount,
                    service_fee: serviceFeeValue,
                    total_amount: totalAmount,
                    tax_type: tax_type,
                    notes: notes || null
                };
                
                const receiptId = `SAL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                
                await conn.query(
                    'INSERT INTO receipts (receipt_id, receipt_type, receipt_data, phone_id, transaction_date, subtotal, tax_amount, total_amount, notes) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)',
                    [receiptId, 'SALES_RECEIPT', JSON.stringify(receiptData), phone_id, subtotal, taxAmount, totalAmount, notes || null]
                );
            }
            
            await conn.commit();
            
            req.flash('success', `Successfully sold ${quantityValue} units of ${phone.device_name}. Remaining inventory: ${newInventoryLevel}`);
            res.redirect('/inventory/sell?success=sold');
            
        } catch (err) {
            if (conn) await conn.rollback();
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    // Stock Alerts Route
    router.get('/stock-alerts', isAuthenticated, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const lowStockThreshold = 5;
            const criticalStockThreshold = 1;
            
            // Get critical stock products
            const criticalStockResult = await conn.query(
                'SELECT * FROM specs_db WHERE device_inventory <= ? ORDER BY device_inventory ASC',
                [criticalStockThreshold]
            );
            
            // Get low stock products  
            const lowStockResult = await conn.query(
                'SELECT * FROM specs_db WHERE device_inventory > ? AND device_inventory <= ? ORDER BY device_inventory ASC',
                [criticalStockThreshold, lowStockThreshold]
            );
            
            // Get fast moving products (mock data for now)
            const fastMovingResult = await conn.query(
                'SELECT * FROM specs_db WHERE device_inventory > 20 ORDER BY device_inventory DESC LIMIT 5'
            );
            
            // Get slow moving products (mock data for now)
            const slowMovingResult = await conn.query(
                'SELECT * FROM specs_db WHERE device_inventory > 50 ORDER BY device_inventory DESC LIMIT 3'
            );
            
            // Mock data for analytics
            const topPerformers = [
                { sm_name: 'iPhone 14 Pro', units_sold: 45 },
                { sm_name: 'Samsung Galaxy S23', units_sold: 38 },
                { sm_name: 'Google Pixel 7', units_sold: 24 }
            ];
            
            const recommendations = criticalStockResult.length > 0 ? [
                {
                    title: 'Critical Stock Alert',
                    description: `You have ${criticalStockResult.length} product(s) with critical stock levels. Immediate restocking recommended.`,
                    confidence: 95
                }
            ] : [];

            res.render('stock-alerts', {
                title: 'Stock Alerts',
                criticalStockProducts: convertBigIntToNumber(criticalStockResult),
                lowStockProducts: convertBigIntToNumber(lowStockResult),
                criticalStockCount: criticalStockResult.length || 0,
                lowStockCount: lowStockResult.length || 0,
                fastMovingCount: fastMovingResult.length || 0,
                slowMovingCount: slowMovingResult.length || 0,
                topPerformers: topPerformers || [],
                recommendations: recommendations || [],
                avgStockTurnover: 4.2,
                avgInventoryValue: 125000,
                threshold: lowStockThreshold,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};
