/**
 * Invoice Receiving Service (Sequelize Version)
 * Handles receiving stock from invoices
 */

const { sequelizeMaster } = require('../config/sequelize');
const { Invoice, InvoiceItem } = require('../models/master');
const InventoryTransactionService = require('./InventoryTransactionService');
const InvoiceService = require('./InvoiceService');
const { ValidationError, NotFoundError, ConflictError, InsufficientStockError, CapacityError } = require('../utils/errors');


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
}

module.exports = InvoiceReceivingService;
