/**
 * InvoiceReceivingService (MongoDB Version)
 * Handles receiving stock against supplier invoices
 */

const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Warehouse = require('../models/Warehouse');
const { v4: uuidv4 } = require('uuid');

class InvoiceReceivingService {
    constructor(_pool) {
        this.transactionService = null;
    }

    setTransactionService(transactionService) {
        this.transactionService = transactionService;
    }

    async getPendingInvoices(filters = {}) {
        const query = {
            invoice_type: 'supplier',
            receiving_status: { $in: ['pending', 'partial'] }
        };

        if (filters.supplier_id) query.supplier_id = filters.supplier_id;
        if (filters.start_date) query.invoice_date = { $gte: new Date(filters.start_date) };
        if (filters.end_date) {
            query.invoice_date = query.invoice_date || {};
            query.invoice_date.$lte = new Date(filters.end_date);
        }

        const invoices = await Invoice.find(query)
            .sort({ invoice_date: -1 })
            .limit(filters.limit || 100)
            .lean();

        return invoices.map(inv => ({
            invoice_id: inv.invoice_id,
            invoice_number: inv.invoice_number,
            supplier_id: inv.supplier_id,
            supplier_name: inv.supplier_name,
            invoice_date: inv.invoice_date,
            total_amount: inv.total_amount,
            receiving_status: inv.receiving_status,
            item_count: inv.items?.length || 0,
            items_received: inv.items?.filter(i => i.quantity_received >= i.quantity).length || 0
        }));
    }

    async getReceivingManifest(invoiceId) {
        const query = typeof invoiceId === 'number'
            ? { invoice_id: invoiceId }
            : { invoice_number: invoiceId };

        const invoice = await Invoice.findOne(query).lean();
        if (!invoice) return null;

        // Enrich items with product details
        const productIds = invoice.items.map(i => i.product_id);
        const products = await Product.find({ product_id: { $in: productIds } }).lean();
        const prodMap = {};
        products.forEach(p => { prodMap[p.product_id] = p; });

        const items = invoice.items.map(item => ({
            item_id: item.item_id,
            product_id: item.product_id,
            product_name: prodMap[item.product_id]?.device_name || item.description,
            sku: prodMap[item.product_id]?.sku,
            quantity_ordered: item.quantity,
            quantity_received: item.quantity_received || 0,
            quantity_pending: item.quantity - (item.quantity_received || 0),
            unit_cost: item.unit_price,
            notes: item.notes
        }));

        return {
            invoice_id: invoice.invoice_id,
            invoice_number: invoice.invoice_number,
            supplier_id: invoice.supplier_id,
            supplier_name: invoice.supplier_name,
            invoice_date: invoice.invoice_date,
            receiving_status: invoice.receiving_status,
            items,
            summary: {
                total_items: items.length,
                fully_received: items.filter(i => i.quantity_pending === 0).length,
                partially_received: items.filter(i => i.quantity_received > 0 && i.quantity_pending > 0).length,
                not_received: items.filter(i => i.quantity_received === 0).length
            }
        };
    }

    async receiveStockFromInvoice(invoiceId, receivingData) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const query = typeof invoiceId === 'number'
                ? { invoice_id: invoiceId }
                : { invoice_number: invoiceId };

            const invoice = await Invoice.findOne(query).session(session);
            if (!invoice) {
                await session.abortTransaction();
                return { success: false, error: 'Invoice not found' };
            }

            const { items: receivedItems, warehouse_id, bin_id, user_id } = receivingData;
            const results = { received: [], skipped: [], errors: [] };

            for (const received of receivedItems) {
                const invoiceItem = invoice.items.find(i =>
                    i.item_id === received.item_id || i.product_id === received.product_id
                );

                if (!invoiceItem) {
                    results.errors.push({ item: received, error: 'Item not found on invoice' });
                    continue;
                }

                const qtyToReceive = received.quantity || received.quantity_received || 1;
                const pendingQty = invoiceItem.quantity - (invoiceItem.quantity_received || 0);

                if (qtyToReceive > pendingQty) {
                    results.errors.push({
                        item: received,
                        error: `Cannot receive ${qtyToReceive}, only ${pendingQty} pending`
                    });
                    continue;
                }

                // Determine inventory type
                const inventoryType = received.serial_numbers?.length > 0 ? 'serialized' : 'bulk';

                if (inventoryType === 'serialized') {
                    // Create individual inventory records for each serial
                    for (const serial of received.serial_numbers) {
                        await Inventory.create([{
                            inventory_type: 'serialized',
                            product_id: invoiceItem.product_id,
                            serial_number: serial.serial_number || serial,
                            imei_1: serial.imei_1 || serial.imei,
                            imei_2: serial.imei_2,
                            warehouse_id,
                            bin_id,
                            status: 'available',
                            condition_grade: received.condition || 'A',
                            quantity: 1,
                            cost_price: invoiceItem.unit_price,
                            source_invoice_id: invoice.invoice_id
                        }], { session });
                    }
                } else {
                    // Bulk inventory - update or create
                    await Inventory.updateOne(
                        { product_id: invoiceItem.product_id, warehouse_id, bin_id, inventory_type: 'bulk' },
                        { $inc: { quantity: qtyToReceive } },
                        { upsert: true, session }
                    );
                }

                // Update invoice item
                invoiceItem.quantity_received = (invoiceItem.quantity_received || 0) + qtyToReceive;
                results.received.push({
                    product_id: invoiceItem.product_id,
                    quantity: qtyToReceive
                });
            }

            // Update invoice receiving status
            const allReceived = invoice.items.every(i => i.quantity_received >= i.quantity);
            const anyReceived = invoice.items.some(i => (i.quantity_received || 0) > 0);
            invoice.receiving_status = allReceived ? 'complete' : (anyReceived ? 'partial' : 'pending');

            await invoice.save({ session });

            // Log transaction
            await Transaction.create([{
                transaction_type: 'purchase_receive',
                transaction_date: new Date(),
                warehouse_id,
                user_id,
                reference_type: 'invoice',
                reference_id: invoice.invoice_number,
                notes: `Received stock from invoice ${invoice.invoice_number}`,
                items: results.received.map(r => ({
                    product_id: r.product_id,
                    quantity_changed: r.quantity,
                    to_location: { warehouse_id, bin_id }
                }))
            }], { session });

            await session.commitTransaction();

            return {
                success: true,
                received: results.received.length,
                skipped: results.skipped.length,
                errors: results.errors,
                invoice_status: invoice.receiving_status
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async resetReceivingForItem(invoiceId, itemId, productId) {
        const query = typeof invoiceId === 'number'
            ? { invoice_id: invoiceId }
            : { invoice_number: invoiceId };

        const invoice = await Invoice.findOne(query);
        if (!invoice) return { success: false, error: 'Invoice not found' };

        const item = invoice.items.find(i => i.item_id === itemId || i.product_id === productId);
        if (item) {
            item.quantity_received = 0;
            await invoice.save();
        }

        return { success: true };
    }

    async getReceivingHistory(invoiceId) {
        const query = typeof invoiceId === 'number'
            ? { invoice_id: invoiceId }
            : { invoice_number: invoiceId };

        const invoice = await Invoice.findOne(query).lean();
        if (!invoice) return [];

        const transactions = await Transaction.find({
            reference_type: 'invoice',
            reference_id: { $in: [invoice.invoice_number, String(invoice.invoice_id)] },
            transaction_type: 'purchase_receive'
        }).sort({ transaction_date: -1 }).lean();

        return transactions;
    }
}

module.exports = InvoiceReceivingService;