const express = require('express');
const router = express.Router();
const { isAuthenticated, isStaffOrAdmin } = require('../middleware/auth');

module.exports = (pool, suppliersPool, convertBigIntToNumber) => {
    // Initialize warehouse service
    const WarehouseService = require('../services/WarehouseService');
    const warehouseService = new WarehouseService(pool);
    
    // Receive Stock Route
    router.get('/inventory/receive', isStaffOrAdmin, async (req, res, next) => {
        let conn, suppliersConn;
        try {
            conn = await pool.getConnection();
            suppliersConn = await suppliersPool.getConnection();
            
            const [phonesResult, suppliersResult, warehouses] = await Promise.all([
                conn.query('SELECT product_id, device_name, device_maker, device_price, device_inventory, ram, rom, color FROM specs_db ORDER BY device_name'),
                suppliersConn.query('SELECT id as supplier_id, name FROM suppliers WHERE is_active = 1'),
                warehouseService.getWarehouses()
            ]);

            res.render('receive-stock', {
                title: 'Receive Stock',
                phones: convertBigIntToNumber(phonesResult),
                suppliers: convertBigIntToNumber(suppliersResult),
                warehouses: convertBigIntToNumber(warehouses),
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
                product_id,
                supplier_id,
                quantity,
                unit_cost,
                tax_type,
                vat_rate,
                import_duty,
                other_fees,
                po_number,
                notes,
                generate_receipt,
                warehouse_id,
                zone_id,
                aisle,
                shelf,
                bin,
                batch_no,
                lot_no,
                expiry_date
            } = req.body;
            
            // Validate inputs
            if (!product_id || !supplier_id || !quantity || quantity <= 0) {
                req.flash('error', 'Please provide all required fields with valid values');
                return res.redirect('/inventory/receive');
            }

            // Validate warehouse and zone if provided
            if (warehouse_id && !zone_id) {
                req.flash('error', 'Please select a zone when warehouse is specified');
                return res.redirect('/inventory/receive');
            }
            
            // Get current phone data
            const [phone] = await conn.query('SELECT * FROM specs_db WHERE product_id = ?', [product_id]);
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
            
            // Update main inventory
            const newInventoryLevel = (phone.device_inventory || 0) + quantityValue;
            await conn.query(
                'UPDATE specs_db SET device_inventory = ? WHERE product_id = ?',
                [newInventoryLevel, product_id]
            );

            // Handle warehouse-specific operations
            if (warehouse_id && zone_id) {
                // Update or create warehouse product location
                const locationQuery = `
                    INSERT INTO warehouse_product_locations 
                    (warehouse_id, zone_id, product_id, aisle, shelf, bin, quantity, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE 
                        quantity = quantity + VALUES(quantity),
                        aisle = COALESCE(VALUES(aisle), aisle),
                        shelf = COALESCE(VALUES(shelf), shelf),
                        bin = COALESCE(VALUES(bin), bin),
                        updated_at = NOW()
                `;
                await conn.query(locationQuery, [
                    warehouse_id, zone_id, product_id, 
                    aisle || null, shelf || null, bin || null, 
                    quantityValue
                ]);

                // Create batch tracking if batch info provided
                if (batch_no) {
                    const batchQuery = `
                        INSERT INTO batch_tracking 
                        (product_id, warehouse_id, zone_id, batch_no, lot_no, supplier_id, 
                         quantity_received, quantity_remaining, purchase_price, expiry_date, 
                         received_date, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, 'active', NOW(), NOW())
                    `;
                    await conn.query(batchQuery, [
                        product_id, warehouse_id, zone_id, batch_no, lot_no || null, supplier_id,
                        quantityValue, quantityValue, unitCostValue, expiry_date || null
                    ]);
                }
            }
            
            // Log the inventory transaction with warehouse info
            const logQuery = `
                INSERT INTO inventory_log 
                (product_id, transaction_type, quantity_changed, total_value, new_inventory_level, 
                 supplier_id, warehouse_id, zone_id, batch_no, lot_no, expiry_date, notes, transaction_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;
            await conn.query(logQuery, [
                product_id, 'incoming', quantityValue, totalCost, newInventoryLevel, 
                supplier_id, warehouse_id || null, zone_id || null, 
                batch_no || null, lot_no || null, expiry_date || null, notes || null
            ]);
            
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
                
                const crypto = require('crypto');
                const randomId = crypto.randomBytes(4).toString('hex').toUpperCase();
                const receiptId = `PUR-${Date.now()}-${randomId}`;
                
                await conn.query(
                    'INSERT INTO receipts (receipt_id, receipt_type, receipt_data, product_id, supplier_id, transaction_date, subtotal, tax_amount, total_amount, notes) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)',
                    [receiptId, 'PURCHASE_RECEIPT', JSON.stringify(receiptData), product_id, supplier_id, subtotal, vatAmount, totalCost, notes || null]
                );
            }
            
            // Warehouse and stock location handling
            if (warehouse_id && zone_id) {
                // Assign stock to warehouse and zone
                await conn.query(
                    'INSERT INTO stock_assignments (product_id, warehouse_id, zone_id, aisle, shelf, bin, batch_no, lot_no, expiry_date, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [product_id, warehouse_id, zone_id, aisle || null, shelf || null, bin || null, batch_no || null, lot_no || null, expiry_date || null, quantityValue]
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
            const [phonesResult, warehouses] = await Promise.all([
                conn.query('SELECT product_id, device_name, device_maker, device_price, device_inventory, ram, rom, color FROM specs_db WHERE device_inventory > 0 ORDER BY device_name'),
                warehouseService.getWarehouses()
            ]);

            res.render('sell-stock', {
                title: 'Sell Stock',
                phones: convertBigIntToNumber(phonesResult),
                warehouses: convertBigIntToNumber(warehouses),
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
                product_id,
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
                notes,
                warehouse_id,
                zone_id,
                bin_location
            } = req.body;
            
            // Validate inputs
            if (!product_id || !quantity || quantity <= 0) {
                req.flash('error', 'Please provide all required fields with valid values');
                return res.redirect('/inventory/sell');
            }
            
            // Get current phone data
            const [phone] = await conn.query('SELECT * FROM specs_db WHERE product_id = ?', [product_id]);
            if (!phone) {
                req.flash('error', 'Phone not found');
                return res.redirect('/inventory/sell');
            }
            
            const quantityValue = parseInt(quantity);
            const currentInventory = phone.device_inventory || 0;

            // Check warehouse-specific availability if specified
            let warehouseQuantity = 0;
            if (warehouse_id && zone_id) {
                const [warehouseStock] = await conn.query(`
                    SELECT quantity FROM warehouse_product_locations 
                    WHERE product_id = ? AND warehouse_id = ? AND zone_id = ?
                `, [product_id, warehouse_id, zone_id]);
                
                warehouseQuantity = warehouseStock?.quantity || 0;
                
                if (quantityValue > warehouseQuantity) {
                    req.flash('error', `Insufficient stock in selected warehouse/zone. Available: ${warehouseQuantity}, Requested: ${quantityValue}`);
                    return res.redirect('/inventory/sell');
                }
            }
            
            // Check if sufficient stock is available in main inventory
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
            
            // Update main inventory
            const newInventoryLevel = currentInventory - quantityValue;
            await conn.query(
                'UPDATE specs_db SET device_inventory = ? WHERE product_id = ?',
                [newInventoryLevel, product_id]
            );

            // Handle warehouse-specific operations
            if (warehouse_id && zone_id) {
                // Update warehouse product location quantity
                await conn.query(`
                    UPDATE warehouse_product_locations 
                    SET quantity = quantity - ?, updated_at = NOW()
                    WHERE product_id = ? AND warehouse_id = ? AND zone_id = ?
                `, [quantityValue, product_id, warehouse_id, zone_id]);

                // Handle FIFO batch tracking for sold items
                const batchesQuery = `
                    SELECT batch_id, quantity_remaining, batch_no, lot_no 
                    FROM batch_tracking 
                    WHERE product_id = ? AND warehouse_id = ? AND zone_id = ? 
                      AND status = 'active' AND quantity_remaining > 0
                    ORDER BY received_date ASC, batch_id ASC
                `;
                const batches = await conn.query(batchesQuery, [product_id, warehouse_id, zone_id]);

                let remainingToSell = quantityValue;
                for (const batch of batches) {
                    if (remainingToSell <= 0) break;

                    const quantityFromBatch = Math.min(remainingToSell, batch.quantity_remaining);
                    const newBatchRemaining = batch.quantity_remaining - quantityFromBatch;

                    await conn.query(`
                        UPDATE batch_tracking 
                        SET quantity_remaining = ?, 
                            quantity_sold = quantity_sold + ?,
                            status = CASE WHEN ? = 0 THEN 'depleted' ELSE status END,
                            updated_at = NOW()
                        WHERE batch_id = ?
                    `, [newBatchRemaining, quantityFromBatch, newBatchRemaining, batch.batch_id]);

                    remainingToSell -= quantityFromBatch;
                }
            }
            
            // Log the inventory transaction with warehouse info
            const logQuery = `
                INSERT INTO inventory_log 
                (product_id, transaction_type, quantity_changed, total_value, new_inventory_level, 
                 warehouse_id, zone_id, notes, transaction_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;
            await conn.query(logQuery, [
                product_id, 'outgoing', -quantityValue, totalAmount, newInventoryLevel, 
                warehouse_id || null, zone_id || null, 
                `Sale${bin_location ? ` from bin: ${bin_location}` : ''}${notes ? ` - ${notes}` : ''}`
            ]);
            
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
                    'INSERT INTO receipts (receipt_id, receipt_type, receipt_data, product_id, transaction_date, subtotal, tax_amount, total_amount, notes) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)',
                    [receiptId, 'SALES_RECEIPT', JSON.stringify(receiptData), product_id, subtotal, taxAmount, totalAmount, notes || null]
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

    // API endpoint to get zones for a warehouse
    router.get('/api/warehouse/:warehouseId/zones', isAuthenticated, async (req, res) => {
        try {
            const warehouseId = parseInt(req.params.warehouseId);
            
            if (isNaN(warehouseId)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid warehouse ID' 
                });
            }
            
            const zones = await warehouseService.getWarehouseZones(warehouseId);
            res.json({ success: true, zones: convertBigIntToNumber(zones) });
        } catch (error) {
            console.error('Error fetching zones:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch zones' });
        }
    });

    // API endpoint to get warehouse stock for a product
    router.get('/api/warehouse/:warehouseId/zone/:zoneId/product/:productId/stock', isAuthenticated, async (req, res) => {
        try {
            const { warehouseId, zoneId, productId } = req.params;
            
            const warehouseIdNum = parseInt(warehouseId);
            const zoneIdNum = parseInt(zoneId);
            const productIdNum = parseInt(productId);
            
            if (isNaN(warehouseIdNum) || isNaN(zoneIdNum) || isNaN(productIdNum)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid warehouse ID, zone ID, or product ID' 
                });
            }
            
            let conn;
            try {
                conn = await pool.getConnection();
                const [stock] = await conn.query(`
                    SELECT quantity, reserved_quantity, aisle, shelf, bin,
                           (quantity - COALESCE(reserved_quantity, 0)) as available_quantity
                    FROM warehouse_product_locations 
                    WHERE warehouse_id = ? AND zone_id = ? AND product_id = ?
                `, [warehouseIdNum, zoneIdNum, productIdNum]);
                
                res.json({ 
                    success: true, 
                    stock: stock ? convertBigIntToNumber([stock])[0] : null 
                });
            } finally {
                if (conn) conn.release();
            }
        } catch (error) {
            console.error('Error fetching warehouse stock:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch stock information' });
        }
    });

    // API endpoint to get warehouse zones and stock levels for a product
    router.get('/api/warehouse/:warehouseId/product/:productId', isAuthenticated, async (req, res) => {
        try {
            const { warehouseId, productId } = req.params;
            
            const warehouseIdNum = parseInt(warehouseId);
            const productIdNum = parseInt(productId);
            
            if (isNaN(warehouseIdNum) || isNaN(productIdNum)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid warehouse ID or product ID' 
                });
            }
            
            let conn;
            try {
                conn = await pool.getConnection();
                
                // Get zones and stock levels for this product in the warehouse
                const stockQuery = `
                    SELECT 
                        wz.zone_id, wz.name as zone_name, wz.zone_type,
                        COALESCE(wpl.quantity, 0) as quantity,
                        COALESCE(wpl.reserved_quantity, 0) as reserved_quantity,
                        COALESCE(wpl.quantity - wpl.reserved_quantity, 0) as available_quantity,
                        wpl.aisle, wpl.shelf, wpl.bin
                    FROM warehouse_zones wz
                    LEFT JOIN warehouse_product_locations wpl ON wz.zone_id = wpl.zone_id 
                        AND wpl.product_id = ? AND wpl.warehouse_id = ?
                    WHERE wz.warehouse_id = ? AND wz.is_active = TRUE
                    ORDER BY wz.zone_type, wz.name
                `;
                
                const stockData = await conn.query(stockQuery, [productIdNum, warehouseIdNum, warehouseIdNum]);
                
                res.json({ 
                    success: true, 
                    zones: convertBigIntToNumber(stockData)
                });
            } finally {
                if (conn) conn.release();
            }
        } catch (error) {
            console.error('Error fetching warehouse product data:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch warehouse data' });
        }
    });

    return router;
};
