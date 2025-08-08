/**
 * Inventory Transaction Service (Sequelize Version)
 * Handles inbound/outbound stock transactions: receiveStock, dispenseStock
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');
const { CapacityError, InsufficientStockError, ValidationError } = require('../utils/errors');

const MAX_QUANTITY_PER_TRANSACTION = 10000;

class InventoryTransactionService {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 100;
    }

    roundCurrency(num) {
        return Math.round((parseFloat(num) || 0) * 100) / 100;
    }

    _sanitizeDate(date) {
        if (!date || date === '' || date === 'NaN' || date === 'undefined') return null;
        return new Date(date);
    }

    _generateReceiptId(type) {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = type === 'IN' ? 'IN' : 'OUT';
        const uniqueSuffix = generateId().slice(-8);
        return `${prefix}-${dateStr}-${uniqueSuffix}`;
    }

    async _checkBinCapacity(t, binId, additionalQuantity) {
        if (!binId) return;

        const [bin] = await sequelizeMaster.query(`SELECT * FROM warehouse_bins WHERE bin_id = ?`, {
            replacements: [binId],
            type: QueryTypes.SELECT,
            transaction: t
        });

        if (!bin || !bin.max_capacity) return;

        const [currentStock] = await sequelizeMaster.query(`
            SELECT SUM(quantity) as total 
            FROM inventory 
            WHERE bin_id = ?
            FOR UPDATE
        `, {
            replacements: [binId],
            type: QueryTypes.SELECT,
            transaction: t
        });

        const currentTotal = currentStock?.total ? Number(currentStock.total) : 0;
        if (currentTotal + additionalQuantity > bin.max_capacity) {
            throw new CapacityError(bin.bin_code, bin.max_capacity, currentTotal, additionalQuantity);
        }
    }

    async getReceivingManifest(_invoiceUuid) {
        // Placeholder - implement when needed
        return null;
    }

    // =========================================================================
    // RECEIVE STOCK (Inbound)
    // =========================================================================

    async receiveStock(inboundData) {
        const {
            supplier_id, items, warehouse_id, bin_id = null,
            user_id = 1, notes = null, po_id = null, invoice_id = null
        } = inboundData;

        // Validation
        if (!supplier_id) throw new ValidationError('supplier id is required for inbound stock');
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new ValidationError('at least one item is required');
        }
        if (!warehouse_id) throw new ValidationError('warehouse id is required');

        try {
            return await sequelizeMaster.transaction(async (t) => {
                const receiptId = this._generateReceiptId('IN');
                const processedItems = [];
                const transactionItems = [];
                let totalSubtotal = 0;
                let totalTaxAmount = 0;

                for (let idx = 0; idx < items.length; idx++) {
                    const item = items[idx];
                    const itemResult = await this._processInboundItem(
                        t, receiptId, item, warehouse_id, bin_id,
                        user_id, supplier_id, idx + 1, notes, po_id, invoice_id
                    );

                    processedItems.push(itemResult);

                    const itemSubtotal = this.roundCurrency((item.quantity || 1) * (item.unit_cost || 0));
                    const itemTax = this.roundCurrency(item.tax_amount || 0);
                    totalSubtotal += itemSubtotal;
                    totalTaxAmount += itemTax;

                    transactionItems.push({
                        product_id: item.product_id || null,
                        spare_part_id: item.spare_part_id || null,
                        serial_number: item.serial_number || null,
                        quantity_changed: item.quantity || 1,
                        condition: item.condition || 'NEW',
                        unit_cost: item.unit_cost || 0,
                        total_value: itemSubtotal + itemTax,
                        to_bucket: { warehouse_id, bin_id },
                        new_inventory_level: itemResult.new_inventory_level,
                        notes: item.location_notes || null
                    });
                }

                const parentTransId = generateId();
                await sequelizeMaster.query(`
                    INSERT INTO transactions (
                        id, transaction_group_id, receipt_id, transaction_type, transaction_date,
                        warehouse_id, bin_id, supplier_id, invoice_id, po_id, user_id,
                        notes, subtotal, tax_amount, total_amount
                    ) VALUES (?, ?, ?, 'incoming', NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, {
                    replacements: [
                        parentTransId, receiptId, receiptId, warehouse_id, bin_id, supplier_id, invoice_id, po_id,
                        user_id, notes, totalSubtotal, totalTaxAmount, totalSubtotal + totalTaxAmount
                    ],
                    type: QueryTypes.INSERT,
                    transaction: t
                });

                for (const tItem of transactionItems) {
                    const transItemId = generateId();
                    await sequelizeMaster.query(`
                        INSERT INTO transaction_items (
                            id, transaction_id, transaction_group_id, product_id, spare_part_id,
                            serial_number, quantity_changed, condition_status, unit_cost, total_value,
                            to_warehouse_id, to_bin_id, new_inventory_level, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, {
                        replacements: [
                            transItemId, parentTransId, receiptId, tItem.product_id, tItem.spare_part_id,
                            tItem.serial_number, tItem.quantity_changed, tItem.condition, tItem.unit_cost, tItem.total_value,
                            tItem.to_bucket.warehouse_id, tItem.to_bucket.bin_id, tItem.new_inventory_level, tItem.notes
                        ],
                        type: QueryTypes.INSERT,
                        transaction: t
                    });
                }

                return {
                    success: true,
                    receipt_id: receiptId,
                    receipt_type: 'incoming',
                    items: processedItems,
                    total_items: processedItems.length,
                    warehouse_id,
                    bin_id
                };
            });
        } catch (err) {
            console.error('❌ CRITICAL: Inbound stock transaction failed:', err);
            throw new ValidationError(`inbound transaction failed: ${err.message}`);
        }
    }

    async _processInboundItem(t, receiptId, item, warehouseId, binId, userId, supplierId, itemSequence, notes, poId, invoiceId) {
        const {
            product_id = null, spare_part_id = null, quantity = 1,
            batch_no = null, serial_number = null, expiry_date = null,
            condition = 'NEW', location_notes = null
        } = item;

        const sanitizedExpiry = this._sanitizeDate(expiry_date);

        if (quantity > MAX_QUANTITY_PER_TRANSACTION) {
            throw new CapacityError(`Quantity exceeds max of ${MAX_QUANTITY_PER_TRANSACTION}`);
        }

        if (binId) await this._checkBinCapacity(t, binId, quantity);

        const isSerialized = !!serial_number;

        if (isSerialized) {
            for (let i = 0; i < quantity; i++) {
                const currentSerial = quantity === 1 ? serial_number : `${serial_number}-${i + 1}`;
                await sequelizeMaster.query(`
                    INSERT INTO inventory (
                        inventory_type, product_id, serial_number, imei_1, warehouse_id, bin_id,
                        status, condition_grade, supplier_id, import_invoice_id, expiry_date, notes
                    ) VALUES ('serialized', ?, ?, ?, ?, ?, 'available', ?, ?, ?, ?, ?)
                `, {
                    replacements: [
                        product_id, currentSerial, currentSerial, warehouseId, binId,
                        condition === 'NEW' ? 'A' : 'B', supplierId, invoiceId, sanitizedExpiry, location_notes
                    ],
                    type: QueryTypes.INSERT,
                    transaction: t
                });
            }

            return { type: 'serialized', product_id, quantity, warehouse_id: warehouseId };
        } else if (spare_part_id) {
            for (let i = 0; i < quantity; i++) {
                await sequelizeMaster.query(`
                    INSERT INTO inventory (
                        inventory_type, spare_part_id, product_id, warehouse_id, bin_id,
                        quantity, condition_status, batch_no, expiry_date, supplier_id, notes,
                        last_movement_at, last_movement_type
                    ) VALUES ('spare_part', ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, NOW(), 'incoming')
                `, {
                    replacements: [
                        spare_part_id, product_id, warehouseId, binId,
                        condition, batch_no, sanitizedExpiry, supplierId, location_notes
                    ],
                    type: QueryTypes.INSERT,
                    transaction: t
                });
            }
            return { type: 'spare_part', spare_part_id, quantity, warehouse_id: warehouseId };
        } else {
            await sequelizeMaster.query(`
                INSERT INTO inventory (
                    inventory_type, product_id, warehouse_id, bin_id, quantity, condition_status,
                    min_stock_level, reserved_quantity, last_movement_at, last_movement_type, supplier_id
                ) VALUES ('bulk', ?, ?, ?, ?, ?, 0, 0, NOW(), 'incoming', ?)
                ON DUPLICATE KEY UPDATE 
                    quantity = quantity + ?, 
                    last_movement_at = NOW(), 
                    last_movement_type = 'incoming',
                    supplier_id = VALUES(supplier_id)
            `, {
                replacements: [
                    product_id, warehouseId, binId, quantity, condition, supplierId,
                    quantity
                ],
                type: QueryTypes.INSERT,
                transaction: t
            });

            let binFilter = binId ? 'bin_id = ?' : 'bin_id IS NULL';
            let Replacements = binId ? [product_id, warehouseId, binId, condition] : [product_id, warehouseId, condition];

            const [row] = await sequelizeMaster.query(`
                SELECT quantity FROM inventory 
                WHERE product_id = ? AND warehouse_id = ? AND ${binFilter} 
                AND inventory_type = 'bulk' AND condition_status = ?
            `, {
                replacements: Replacements,
                type: QueryTypes.SELECT,
                transaction: t
            });

            return { type: 'bulk', product_id, quantity, new_inventory_level: row ? row.quantity : 0 };
        }
    }

    // =========================================================================
    // DISPENSE STOCK (Outbound)
    // =========================================================================

    async dispenseStock(outboundData) {
        const {
            items, warehouse_id, bin_id = null, user_id = 1,
            customer_name, customer_address, delivery_person,
            notes: _notes, po_id, invoice_id, customer_invoice
        } = outboundData;

        let userNotes = _notes || '';
        if (customer_invoice) userNotes += (userNotes ? '. ' : '') + `Customer Invoice: ${customer_invoice}`;

        if (!items || !Array.isArray(items) || items.length === 0) throw new ValidationError('at least one item is required');
        if (!warehouse_id) throw new ValidationError('warehouse id is required');

        try {
            return await sequelizeMaster.transaction(async (t) => {
                const receiptId = this._generateReceiptId('OUT');
                const processedItems = [];
                const transactionItems = [];
                let totalSubtotal = 0;
                let totalTaxAmount = 0;

                for (let idx = 0; idx < items.length; idx++) {
                    const item = items[idx];
                    const itemResult = await this._processOutboundItem(
                        t, receiptId, item, warehouse_id, bin_id, idx + 1
                    );

                    processedItems.push(itemResult);

                    const itemSubtotal = this.roundCurrency((item.quantity || 1) * (item.unit_price || 0));
                    const itemTax = this.roundCurrency(item.tax_amount || 0);
                    totalSubtotal += itemSubtotal;
                    totalTaxAmount += itemTax;

                    transactionItems.push({
                        product_id: item.product_id || null,
                        spare_part_id: item.spare_part_id || null,
                        serial_number: item.serial_number || item.asset_id || null,
                        quantity_changed: -(item.quantity || 1),
                        condition: item.condition || 'NEW',
                        unit_cost: item.unit_price || 0,
                        total_value: itemSubtotal + itemTax,
                        from_bucket: { warehouse_id, bin_id },
                        new_inventory_level: itemResult.new_inventory_level,
                        notes: userNotes
                    });
                }

                const customerJson = JSON.stringify({ name: customer_name, address: customer_address });
                const parentTransId = generateId();
                await sequelizeMaster.query(`
                    INSERT INTO transactions (
                        id, transaction_group_id, receipt_id, transaction_type, transaction_date,
                        warehouse_id, bin_id, invoice_id, po_id, user_id, notes,
                        customer, delivery_person, subtotal, tax_amount, total_amount
                    ) VALUES (?, ?, ?, 'outgoing', NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, {
                    replacements: [
                        parentTransId, receiptId, receiptId, warehouse_id, bin_id, invoice_id, po_id, user_id, userNotes,
                        customerJson, delivery_person, totalSubtotal, totalTaxAmount, totalSubtotal + totalTaxAmount
                    ],
                    type: QueryTypes.INSERT,
                    transaction: t
                });

                for (const tItem of transactionItems) {
                    const transItemId = generateId();
                    await sequelizeMaster.query(`
                        INSERT INTO transaction_items (
                            id, transaction_id, transaction_group_id, product_id, spare_part_id,
                            serial_number, quantity_changed, condition_status, unit_cost, total_value,
                            from_warehouse_id, from_bin_id, new_inventory_level, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, {
                        replacements: [
                            transItemId, parentTransId, receiptId, tItem.product_id, tItem.spare_part_id,
                            tItem.serial_number, tItem.quantity_changed, tItem.condition, tItem.unit_cost, tItem.total_value,
                            tItem.from_bucket.warehouse_id, tItem.from_bucket.bin_id, tItem.new_inventory_level, tItem.notes
                        ],
                        type: QueryTypes.INSERT,
                        transaction: t
                    });
                }

                return {
                    success: true,
                    receipt_id: receiptId,
                    receipt_type: 'outgoing',
                    items: processedItems,
                    warehouse_id,
                    bin_id
                };
            });
        } catch (err) {
            console.error('❌ CRITICAL: Outbound stock transaction failed:', err);
            throw new ValidationError(`outbound transaction failed: ${err.message}`);
        }
    }

    async _processOutboundItem(t, receiptId, item, warehouseId, binId, _itemSequence) {
        const {
            product_id, spare_part_id, serial_number, quantity = 1, condition = 'NEW'
        } = item;

        const isSerialized = !!serial_number;

        if (isSerialized) {
            const [row] = await sequelizeMaster.query(`
                SELECT id, product_id, serial_number, bin_id FROM inventory
                WHERE warehouse_id = ? AND inventory_type = 'serialized' AND status = 'available'
                AND (serial_number = ? OR imei_1 = ?)
                LIMIT 1
                FOR UPDATE
            `, {
                replacements: [warehouseId, serial_number, serial_number],
                type: QueryTypes.SELECT,
                transaction: t
            });

            if (!row) throw new InsufficientStockError(`Serialized item not available: ${serial_number}`);

            await sequelizeMaster.query(`
                UPDATE inventory SET status = 'sold', last_movement_at = NOW(), last_movement_type = 'outgoing'
                WHERE id = ?
            `, {
                replacements: [row.id],
                type: QueryTypes.UPDATE,
                transaction: t
            });

            return { type: 'serialized', product_id: row.product_id, new_inventory_level: 0 };
        } else if (spare_part_id) {
            const rows = await sequelizeMaster.query(`
                SELECT id, quantity FROM inventory
                WHERE spare_part_id = ? AND warehouse_id = ? AND inventory_type = 'spare_part' AND quantity > 0
                ORDER BY created_at ASC
                FOR UPDATE
            `, {
                replacements: [spare_part_id, warehouseId],
                type: QueryTypes.SELECT,
                transaction: t
            });

            let remaining = quantity;
            for (const row of rows) {
                if (remaining <= 0) break;
                const deduct = Math.min(row.quantity, remaining);
                await sequelizeMaster.query(`
                    UPDATE inventory SET quantity = quantity - ?, last_movement_at = NOW(), last_movement_type = 'outgoing'
                    WHERE id = ?
                `, {
                    replacements: [deduct, row.id],
                    type: QueryTypes.UPDATE,
                    transaction: t
                });
                remaining -= deduct;
            }

            if (remaining > 0) throw new InsufficientStockError(`Insufficient spare parts: needed ${quantity}, short ${remaining}`);

            const [total] = await sequelizeMaster.query(`
                SELECT SUM(quantity) as total FROM inventory WHERE spare_part_id = ? AND warehouse_id = ? AND inventory_type = 'spare_part'
            `, {
                replacements: [spare_part_id, warehouseId],
                type: QueryTypes.SELECT,
                transaction: t
            });

            return { type: 'spare_part', spare_part_id, new_inventory_level: total ? total.total : 0 };
        } else {
            let binFilterSQL = binId ? 'AND bin_id = ?' : 'AND bin_id IS NULL';
            let filterParams = binId ? [product_id, warehouseId, condition, binId] : [product_id, warehouseId, condition];

            const rows = await sequelizeMaster.query(`
                SELECT id, quantity FROM inventory
                WHERE product_id = ? AND warehouse_id = ? AND inventory_type = 'bulk' AND condition_status = ? AND quantity > 0
                ${binFilterSQL}
                ORDER BY created_at ASC
                FOR UPDATE
            `, {
                replacements: filterParams,
                type: QueryTypes.SELECT,
                transaction: t
            });

            let remaining = quantity;
            for (const row of rows) {
                if (remaining <= 0) break;
                const deduct = Math.min(row.quantity, remaining);
                await sequelizeMaster.query(`
                    UPDATE inventory SET quantity = quantity - ?, last_movement_at = NOW(), last_movement_type = 'outgoing'
                    WHERE id = ?
                `, {
                    replacements: [deduct, row.id],
                    type: QueryTypes.UPDATE,
                    transaction: t
                });
                remaining -= deduct;
            }

            if (remaining > 0) throw new InsufficientStockError(`Insufficient stock: needed ${quantity}, short ${remaining}`);

            const [total] = await sequelizeMaster.query(`
                SELECT SUM(quantity) as total FROM inventory 
                WHERE product_id = ? AND warehouse_id = ? AND inventory_type = 'bulk' AND condition_status = ?
            `, {
                replacements: [product_id, warehouseId, condition],
                type: QueryTypes.SELECT,
                transaction: t
            });

            return { type: 'bulk', product_id, new_inventory_level: total ? total.total : 0 };
        }
    }

    async adjustStock(adjustmentData) {
        const {
            product_id, spare_part_id, warehouse_id, bin_id = null,
            quantity_change, reason, user_id = 1
        } = adjustmentData;

        return await sequelizeMaster.transaction(async (t) => {
            const inventoryType = spare_part_id ? 'spare_part' : 'bulk';
            const itemId = spare_part_id || product_id;

            await sequelizeMaster.query(`
                    INSERT INTO inventory (
                        inventory_type, product_id, spare_part_id, warehouse_id, bin_id, quantity, 
                        condition_status, last_movement_at, last_movement_type
                    ) VALUES (?, ?, ?, ?, ?, ?, 'NEW', NOW(), 'adjustment')
                    ON DUPLICATE KEY UPDATE 
                        quantity = quantity + ?, 
                        last_movement_at = NOW(), 
                        last_movement_type = 'adjustment'
                `, {
                replacements: [
                    inventoryType, spare_part_id ? null : product_id, spare_part_id, warehouse_id, bin_id, quantity_change,
                    quantity_change
                ],
                type: QueryTypes.INSERT,
                transaction: t
            });

            const binFilterStr = bin_id ? '= ?' : 'IS NULL';
            const paramArgs = bin_id ? [itemId, warehouse_id, bin_id, inventoryType] : [itemId, warehouse_id, inventoryType];

            const [row] = await sequelizeMaster.query(`
                    SELECT quantity FROM inventory 
                    WHERE product_id = ? AND warehouse_id = ? AND bin_id ${binFilterStr} AND inventory_type = ?
                 `, {
                replacements: paramArgs,
                type: QueryTypes.SELECT,
                transaction: t
            });

            const transId = generateId();
            await sequelizeMaster.query(`
                    INSERT INTO transactions (
                        id, transaction_group_id, transaction_type, transaction_date,
                        warehouse_id, bin_id, user_id, notes,
                        product_id, spare_part_id, quantity_changed
                    ) VALUES (?, ?, 'adjustment', NOW(), ?, ?, ?, ?, ?, ?, ?)
                 `, {
                replacements: [
                    transId, `ADJ-${Date.now()}`, warehouse_id, bin_id, user_id, reason,
                    spare_part_id ? null : product_id, spare_part_id, quantity_change
                ],
                type: QueryTypes.INSERT,
                transaction: t
            });

            return { success: true, new_quantity: row ? row.quantity : 0 };
        });
    }
}

module.exports = InventoryTransactionService;
