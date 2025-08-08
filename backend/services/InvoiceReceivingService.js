/**
 * Invoice Receiving Service (Sequelize Version)
 * Handles receiving stock from invoices
 */

const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { Invoice, InvoiceItem } = require('../models/master');
const { generateId } = require('../utils/generateId');
const InventoryTransactionService = require('./InventoryTransactionService');
const InvoiceService = require('./InvoiceService');
const { ValidationError, NotFoundError } = require('../utils/errors');


class InvoiceReceivingService {
    constructor() {
        this.inventoryTransactionService = new InventoryTransactionService();
        this.invoiceService = new InvoiceService();
    }

    /**
     * Receive items from an invoice
     * @param {number|string} invoiceId 
     * @param {Object} receiveData - { warehouse_id, items: [{ item_id, quantity, to_bin_id }] }
     * @param {number} userId - User performing the action
     */
    async receiveInvoice(invoiceId, receiveData, userId) {
        const { warehouse_id, items } = receiveData;

        if (!warehouse_id) throw new ValidationError('warehouse id is required');

        return await sequelizeMaster.transaction(async (t) => {
            // Lock the invoice row to prevent concurrent double-receive
            const invoice = await Invoice.findOne({
                where: { id: invoiceId },
                attributes: ['id', 'invoice_number', 'supplier_id', 'verification_status'],
                lock: true,
                transaction: t
            });
            if (!invoice) throw new NotFoundError('invoice not found');

            if (invoice.verification_status === 'VERIFIED') {
                throw new ValidationError('invoice already received/verified');
            }

            let itemsToProcess = items;
            if (!itemsToProcess || itemsToProcess.length === 0) {
                const invoiceItems = await InvoiceItem.findAll({
                    where: { invoice_id: invoice.id },
                    attributes: ['product_id', 'spare_part_id', 'quantity', 'unit_price'],
                    transaction: t
                });
                itemsToProcess = invoiceItems.map(i => ({
                    product_id: i.product_id,
                    spare_part_id: i.spare_part_id,
                    quantity: i.quantity,
                    unit_cost: i.unit_price
                }));
            }

            const transactionPayload = {
                transaction_type: 'incoming',
                warehouse_id: warehouse_id,
                supplier_id: invoice.supplier_id,
                invoice_id: invoice.id,
                user_id: userId,
                notes: `Received items for Invoice ${invoice.invoice_number}`,
                items: itemsToProcess.map(item => ({
                    product_id: item.product_id,
                    spare_part_id: item.spare_part_id,
                    quantity: item.quantity,
                    unit_cost: item.unit_cost,
                    notes: `Received from Invoice #${invoice.invoice_number}`
                }))
            };

            const transactionResult = await this.inventoryTransactionService.receiveStock(transactionPayload);

            // Update instead of returning an error if verification_status update fails
            await Invoice.update({ verification_status: 'VERIFIED' }, { 
                where: { id: invoice.id }, 
                transaction: t 
            });

            return { success: true, transaction_id: transactionResult.transaction_id };
        });
    }

    async getPendingInvoices(filters = {}) {
        let sql = `
            SELECT i.id, i.uuid, i.invoice_number, i.total_amount, i.currency, i.verification_status,
                   s.name as supplier_name, i.status
            FROM invoices i
            LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
            WHERE i.verification_status IN ('PENDING', 'PARTIAL')
        `;
        const params = [];
        if (filters.supplierId) {
            sql += ` AND i.supplier_id = ?`;
            params.push(filters.supplierId);
        }
        if (filters.status && filters.status !== 'all') {
            sql += ` AND i.status = ?`;
            params.push(filters.status);
        }
        sql += ` ORDER BY i.created_at DESC`;
        if (filters.limit) {
            sql += ` LIMIT ?`;
            params.push(parseInt(filters.limit));
        }

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        return rows.map(r => ({
            id: r.id,
            uuid: r.uuid,
            invoice_number: r.invoice_number,
            supplier_id: r.supplier_id,
            supplier_name: r.supplier_name || 'Unknown Supplier',
            status: r.status,
            verification_status: r.verification_status,
            receiving_status: r.verification_status,
            total_amount: r.total_amount,
            currency: r.currency || 'VND'
        }));
    }

    async getReceivingManifest(invoiceUuid) {
        if (!invoiceUuid) throw new ValidationError('Invoice UUID is required');

        // Fetch invoice
        const [invoice] = await sequelizeMaster.query(`
            SELECT i.id, i.uuid, i.invoice_number, i.total_amount, i.currency, s.name as supplier_name
            FROM invoices i
            LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
            WHERE i.uuid = ? OR i.id = ?
        `, { replacements: [invoiceUuid, invoiceUuid], type: QueryTypes.SELECT });

        if (!invoice) throw new NotFoundError('Invoice not found');

        // Fetch invoice items
        const invoiceItems = await sequelizeMaster.query(`
            SELECT ii.id as item_id, ii.product_id, ii.spare_part_id, ii.product_name, ii.description,
                   ii.quantity, ii.unit_price, ii.product_uuid
            FROM invoice_items ii
            WHERE ii.invoice_id = ?
        `, { replacements: [invoice.id], type: QueryTypes.SELECT });

        // Fetch received quantities from transactions
        const receivedQuantities = await sequelizeMaster.query(`
            SELECT ti.product_id, ti.spare_part_id, SUM(ti.quantity_changed) as qty_received
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            WHERE t.invoice_id = ? AND t.transaction_type = 'incoming'
            GROUP BY ti.product_id, ti.spare_part_id
        `, { replacements: [invoice.id], type: QueryTypes.SELECT });

        // Map received quantities by product/spare part
        const receivedMap = {};
        for (const rq of receivedQuantities) {
            const key = rq.product_id ? `prod_${rq.product_id}` : `part_${rq.spare_part_id}`;
            receivedMap[key] = Number(rq.qty_received || 0);
        }

        // Map items with remaining quantities
        const items = invoiceItems.map(item => {
            const key = item.product_id ? `prod_${item.product_id}` : `part_${item.spare_part_id}`;
            const qtyReceived = receivedMap[key] || 0;
            const quantity = Number(item.quantity || 0);
            const quantityRemaining = Math.max(0, quantity - qtyReceived);
            const receivingComplete = quantityRemaining <= 0;

            // Check if it's a device or spare part to determine serial tracking
            const isDevice = !!item.product_id;
            const requiresSerialTracking = isDevice;

            return {
                item_id: item.item_id,
                product_id: item.product_id,
                spare_part_id: item.spare_part_id,
                product_name: item.product_name,
                description: item.description,
                quantity: quantity,
                quantity_remaining: quantityRemaining,
                receiving_complete: receivingComplete,
                unit_price: Number(item.unit_price || 0),
                product_uuid: item.product_uuid || item.product_id,
                requires_serial_tracking: requiresSerialTracking,
                product_type: isDevice ? 'Device' : 'Spare Part'
            };
        });

        return {
            invoice: {
                id: invoice.id,
                uuid: invoice.uuid,
                invoice_number: invoice.invoice_number,
                supplier_name: invoice.supplier_name || 'Unknown Supplier',
                total_amount: Number(invoice.total_amount || 0),
                currency: invoice.currency || 'VND'
            },
            items
        };
    }

    async receiveStockFromInvoice(invoiceUuid, receivingData) {
        const { warehouseId, binId, items, userId } = receivingData;
        if (!warehouseId) throw new ValidationError('Warehouse ID is required');
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new ValidationError('At least one item is required');
        }

        // Fetch invoice
        const [invoice] = await sequelizeMaster.query(`
            SELECT i.id, i.invoice_number, i.supplier_id, i.verification_status
            FROM invoices i
            WHERE i.uuid = ? OR i.id = ?
        `, { replacements: [invoiceUuid, invoiceUuid], type: QueryTypes.SELECT });

        if (!invoice) throw new NotFoundError('Invoice not found');
        if (invoice.verification_status === 'VERIFIED') {
            throw new ValidationError('Invoice has already been fully received and verified');
        }

        // Fetch invoice items to validate
        const invoiceItems = await sequelizeMaster.query(`
            SELECT ii.id as item_id, ii.product_id, ii.spare_part_id, ii.quantity, ii.unit_price, ii.product_name
            FROM invoice_items ii
            WHERE ii.invoice_id = ?
        `, { replacements: [invoice.id], type: QueryTypes.SELECT });

        const txnItems = [];

        for (const rItem of items) {
            const matched = invoiceItems.find(ii => ii.item_id === rItem.itemId);
            if (!matched) throw new ValidationError(`Item ${rItem.itemId} not found on this invoice`);

            const qtyToReceive = Number(rItem.quantityReceived);
            if (isNaN(qtyToReceive) || qtyToReceive <= 0) {
                throw new ValidationError(`Invalid quantity to receive: ${rItem.quantityReceived}`);
            }

            // Setup transaction item
            const txnItem = {
                product_id: matched.product_id || null,
                spare_part_id: matched.spare_part_id || null,
                quantity: qtyToReceive,
                unit_cost: Number(rItem.unitCost || matched.unit_price || 0),
                condition: 'NEW',
                location_notes: rItem.notes || `Received from Invoice #${invoice.invoice_number}`
            };

            // If it is a device (has product_id), generate a unique base serial number
            if (matched.product_id) {
                txnItem.serial_number = `SN-${generateId().slice(0, 8).toUpperCase()}`;
            }

            txnItems.push(txnItem);
        }

        // Perform stock receive transaction
        const txnResult = await this.inventoryTransactionService.receiveStock({
            supplier_id: invoice.supplier_id,
            warehouse_id: warehouseId,
            bin_id: binId,
            user_id: userId || 1,
            invoice_id: invoice.id,
            notes: receivingData.notes || `Received from Invoice #${invoice.invoice_number}`,
            items: txnItems
        });

        // Recalculate invoice verification status
        const manifest = await this.getReceivingManifest(invoiceUuid);
        const allComplete = manifest.items.every(i => i.receiving_complete);
        const anyReceived = manifest.items.some(i => i.quantity_remaining < i.quantity);

        let newVerificationStatus = 'PENDING';
        if (allComplete) {
            newVerificationStatus = 'VERIFIED';
        } else if (anyReceived) {
            newVerificationStatus = 'PARTIAL';
        }

        await sequelizeMaster.query(`
            UPDATE invoices SET verification_status = ?, updated_at = NOW() WHERE id = ?
        `, { replacements: [newVerificationStatus, invoice.id], type: QueryTypes.UPDATE });

        return {
            success: true,
            transaction_id: txnResult.receipt_id,
            verification_status: newVerificationStatus
        };
    }

    async resetReceivingForItem(invoiceUuid, itemId, _productUuid) {
        // Fetch invoice
        const [invoice] = await sequelizeMaster.query(`
            SELECT id FROM invoices WHERE uuid = ? OR id = ?
        `, { replacements: [invoiceUuid, invoiceUuid], type: QueryTypes.SELECT });

        if (!invoice) throw new NotFoundError('Invoice not found');

        // Fetch invoice item
        const [item] = await sequelizeMaster.query(`
            SELECT id, product_id, spare_part_id FROM invoice_items WHERE id = ? AND invoice_id = ?
        `, { replacements: [itemId, invoice.id], type: QueryTypes.SELECT });

        if (!item) throw new ValidationError('Invoice item not found');

        const productId = item.product_id;
        const sparePartId = item.spare_part_id;

        return await sequelizeMaster.transaction(async (t) => {
            // Find all transaction items matching this product/part under this invoice
            const txItems = await sequelizeMaster.query(`
                SELECT ti.id, ti.transaction_id, ti.quantity_changed, t.warehouse_id, ti.to_bin_id, ti.serial_number
                FROM transaction_items ti
                JOIN transactions t ON ti.transaction_id = t.id
                WHERE t.invoice_id = ? AND t.transaction_type = 'incoming'
                  AND (ti.product_id <=> ? AND ti.spare_part_id <=> ?)
            `, {
                replacements: [invoice.id, productId || null, sparePartId || null],
                type: QueryTypes.SELECT,
                transaction: t
            });

            for (const txItem of txItems) {
                // Delete serialised inventory items if applicable
                if (productId && txItem.serial_number) {
                    await sequelizeMaster.query(`
                        DELETE FROM inventory
                        WHERE product_id = ? AND (serial_number = ? OR imei_1 = ?) AND import_invoice_id = ?
                    `, {
                        replacements: [productId, txItem.serial_number, txItem.serial_number, invoice.id],
                        type: QueryTypes.DELETE,
                        transaction: t
                    });
                } else if (sparePartId) {
                    // For spare parts, reduce quantity in inventory
                    const [invRow] = await sequelizeMaster.query(`
                        SELECT id, quantity FROM inventory
                        WHERE spare_part_id = ? AND warehouse_id = ? AND bin_id <=> ?
                        LIMIT 1
                        FOR UPDATE
                    `, {
                        replacements: [sparePartId, txItem.warehouse_id, txItem.to_bin_id || null],
                        type: QueryTypes.SELECT,
                        transaction: t
                    });

                    if (invRow) {
                        const newQty = Math.max(0, Number(invRow.quantity) - Number(txItem.quantity_changed));
                        if (newQty === 0) {
                            await sequelizeMaster.query('DELETE FROM inventory WHERE id = ?', {
                                replacements: [invRow.id],
                                type: QueryTypes.DELETE,
                                transaction: t
                            });
                        } else {
                            await sequelizeMaster.query('UPDATE inventory SET quantity = ? WHERE id = ?', {
                                replacements: [newQty, invRow.id],
                                type: QueryTypes.UPDATE,
                                transaction: t
                            });
                        }
                    }
                } else if (productId) {
                    // Bulk product, decrement quantity
                    const [invRow] = await sequelizeMaster.query(`
                        SELECT id, quantity FROM inventory
                        WHERE product_id = ? AND warehouse_id = ? AND bin_id <=> ? AND inventory_type = 'bulk'
                        LIMIT 1
                        FOR UPDATE
                    `, {
                        replacements: [productId, txItem.warehouse_id, txItem.to_bin_id || null],
                        type: QueryTypes.SELECT,
                        transaction: t
                    });

                    if (invRow) {
                        const newQty = Math.max(0, Number(invRow.quantity) - Number(txItem.quantity_changed));
                        if (newQty === 0) {
                            await sequelizeMaster.query('DELETE FROM inventory WHERE id = ?', {
                                replacements: [invRow.id],
                                type: QueryTypes.DELETE,
                                transaction: t
                            });
                        } else {
                            await sequelizeMaster.query('UPDATE inventory SET quantity = ? WHERE id = ?', {
                                replacements: [newQty, invRow.id],
                                type: QueryTypes.UPDATE,
                                transaction: t
                            });
                        }
                    }
                }

                // Delete the transaction item
                await sequelizeMaster.query('DELETE FROM transaction_items WHERE id = ?', {
                    replacements: [txItem.id],
                    type: QueryTypes.DELETE,
                    transaction: t
                });

                // Check if transaction has other items left, if not, delete the parent transaction
                const [remaining] = await sequelizeMaster.query(`
                    SELECT COUNT(*) as count FROM transaction_items WHERE transaction_id = ?
                `, {
                    replacements: [txItem.transaction_id],
                    type: QueryTypes.SELECT,
                    transaction: t
                });

                if (Number(remaining.count) === 0) {
                    await sequelizeMaster.query('DELETE FROM transactions WHERE id = ?', {
                        replacements: [txItem.transaction_id],
                        type: QueryTypes.DELETE,
                        transaction: t
                    });
                }
            }

            // Recalculate invoice verification status
            const [manifestStats] = await sequelizeMaster.query(`
                SELECT ii.quantity, COALESCE(SUM(ti.quantity_changed), 0) as qty_received
                FROM invoice_items ii
                LEFT JOIN transaction_items ti ON (ii.product_id <=> ti.product_id AND ii.spare_part_id <=> ti.spare_part_id)
                LEFT JOIN transactions t ON ti.transaction_id = t.id AND t.invoice_id = ii.invoice_id AND t.transaction_type = 'incoming'
                WHERE ii.invoice_id = ?
                GROUP BY ii.id
            `, { replacements: [invoice.id], type: QueryTypes.SELECT, transaction: t });

            let allComplete = true;
            let anyReceived = false;

            for (const ms of manifestStats) {
                const req = Number(ms.quantity || 0);
                const rec = Number(ms.qty_received || 0);
                if (rec < req) allComplete = false;
                if (rec > 0) anyReceived = true;
            }

            let newVerificationStatus = 'PENDING';
            if (allComplete && manifestStats.length > 0) {
                newVerificationStatus = 'VERIFIED';
            } else if (anyReceived) {
                newVerificationStatus = 'PARTIAL';
            }

            await sequelizeMaster.query(`
                UPDATE invoices SET verification_status = ?, updated_at = NOW() WHERE id = ?
            `, { replacements: [newVerificationStatus, invoice.id], type: QueryTypes.UPDATE, transaction: t });

            return { success: true, verification_status: newVerificationStatus };
        });
    }
}

module.exports = InvoiceReceivingService;
