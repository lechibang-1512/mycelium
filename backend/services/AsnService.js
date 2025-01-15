/**
 * Advance Shipping Notice (ASN) Service
 * Handles ASN XML ingestion, CRUD, and PO cross-referencing.
 *
 * Expected ASN XML structure:
 *
 * <AdvanceShippingNotice>
 *   <ASNNumber>ASN-2026-001</ASNNumber>
 *   <PONumber>PO-20260317-0001</PONumber>
 *   <SupplierID>uuid</SupplierID>
 *   <ShipDate>2026-03-17</ShipDate>
 *   <ExpectedArrival>2026-03-20</ExpectedArrival>
 *   <Carrier>Viettel Post</Carrier>
 *   <TrackingNumber>VTP123456</TrackingNumber>
 *   <Notes>Quarterly shipment</Notes>
 *   <Items>
 *     <Item>
 *       <ProductID>uuid</ProductID>
 *       <SparePartID>uuid</SparePartID>
 *       <ProductName>iPhone 15 Screen</ProductName>
 *       <QuantityShipped>5</QuantityShipped>
 *       <SerialNumbers>
 *         <Serial>IMEI-001</Serial>
 *         <Serial>IMEI-002</Serial>
 *       </SerialNumbers>
 *       <BatchNumber>BATCH-2026-Q1</BatchNumber>
 *     </Item>
 *   </Items>
 * </AdvanceShippingNotice>
 */

const { XMLParser } = require('fast-xml-parser');
const { QueryTypes } = require('sequelize');
const { sequelizeMaster } = require('../config/sequelize');
const { generateId } = require('../utils/generateId');
const { ValidationError, NotFoundError } = require('../utils/errors');

class AsnService {
    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            parseTagValue: true,
            trimValues: true,
            isArray: (name) => ['Item', 'Serial'].includes(name)
        });
    }

    // =========================================================================
    // XML INGESTION
    // =========================================================================

    async ingestAsnXml(xmlString) {
        if (!xmlString || typeof xmlString !== 'string' || xmlString.trim().length === 0) {
            throw new ValidationError('XML content is required');
        }

        const parsed = this._parseXml(xmlString);
        const asnData = this._mapXmlToAsnData(parsed);

        return await sequelizeMaster.transaction(async (t) => {
            // Validate PO exists
            const [po] = await sequelizeMaster.query(
                `SELECT id, supplier_id, status FROM purchase_orders WHERE po_number = ? OR id = ?`,
                { replacements: [asnData.po_number, asnData.po_number], type: QueryTypes.SELECT, transaction: t }
            );
            if (!po) throw new ValidationError(`Purchase order not found: ${asnData.po_number}`);

            // Check for duplicate ASN number
            const [existingAsn] = await sequelizeMaster.query(
                `SELECT id FROM advance_shipping_notices WHERE asn_number = ?`,
                { replacements: [asnData.asn_number], type: QueryTypes.SELECT, transaction: t }
            );
            if (existingAsn) throw new ValidationError(`ASN number ${asnData.asn_number} already exists`);

            // Create ASN
            const asnId = generateId();
            await sequelizeMaster.query(`
                INSERT INTO advance_shipping_notices (
                    id, asn_number, po_id, supplier_id, ship_date, expected_arrival_date,
                    carrier, tracking_number, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            `, {
                replacements: [
                    asnId, asnData.asn_number, po.id,
                    asnData.supplier_id || po.supplier_id,
                    asnData.ship_date || null,
                    asnData.expected_arrival_date || null,
                    asnData.carrier || null,
                    asnData.tracking_number || null,
                    asnData.notes || null
                ],
                type: QueryTypes.INSERT,
                transaction: t
            });

            // Load PO items for cross-referencing
            const poItems = await sequelizeMaster.query(
                `SELECT id, product_id, spare_part_id, product_name, quantity FROM purchase_order_items WHERE po_id = ?`,
                { replacements: [po.id], type: QueryTypes.SELECT, transaction: t }
            );

            // Create ASN items
            let totalSerials = 0;
            for (const item of asnData.items) {
                // Try to match to PO item by product_id or spare_part_id
                const matchedPoItem = poItems.find(pi =>
                    (item.product_id && pi.product_id === item.product_id) ||
                    (item.spare_part_id && pi.spare_part_id === item.spare_part_id)
                );

                if (item.serials && item.serials.length > 0) {
                    // One ASN item row per serial number
                    for (const serial of item.serials) {
                        const itemId = generateId();
                        await sequelizeMaster.query(`
                            INSERT INTO asn_items (
                                id, asn_id, po_item_id, product_id, spare_part_id, product_name,
                                quantity_shipped, serial_number, imei, batch_number
                            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
                        `, {
                            replacements: [
                                itemId, asnId,
                                matchedPoItem ? matchedPoItem.id : null,
                                item.product_id || null,
                                item.spare_part_id || null,
                                item.product_name || 'Unknown',
                                serial, serial,
                                item.batch_number || null
                            ],
                            type: QueryTypes.INSERT,
                            transaction: t
                        });
                        totalSerials++;
                    }
                } else {
                    // Bulk item without serials
                    const itemId = generateId();
                    await sequelizeMaster.query(`
                        INSERT INTO asn_items (
                            id, asn_id, po_item_id, product_id, spare_part_id, product_name,
                            quantity_shipped, batch_number
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, {
                        replacements: [
                            itemId, asnId,
                            matchedPoItem ? matchedPoItem.id : null,
                            item.product_id || null,
                            item.spare_part_id || null,
                            item.product_name || 'Unknown',
                            item.quantity_shipped,
                            item.batch_number || null
                        ],
                        type: QueryTypes.INSERT,
                        transaction: t
                    });
                }
            }

            // Update PO status if still in 'sent' or 'acknowledged'
            if (['sent', 'acknowledged'].includes(po.status)) {
                await sequelizeMaster.query(
                    `UPDATE purchase_orders SET status = 'acknowledged' WHERE id = ?`,
                    { replacements: [po.id], type: QueryTypes.UPDATE, transaction: t }
                );
            }

            return {
                success: true,
                asn_id: asnId,
                asn_number: asnData.asn_number,
                po_id: po.id,
                po_number: asnData.po_number,
                item_count: asnData.items.length,
                serial_count: totalSerials
            };
        });
    }

    // =========================================================================
    // CRUD
    // =========================================================================

    async getAdvanceShippingNotices(filters = {}) {
        let sql = `
            SELECT asn.*,
                   s.name AS supplier_name,
                   po.po_number,
                   COUNT(ai.id) AS item_count,
                   SUM(ai.quantity_shipped) AS total_shipped,
                   SUM(ai.quantity_received) AS total_received
            FROM advance_shipping_notices asn
            LEFT JOIN suppliers s ON asn.supplier_id = s.supplier_id
            LEFT JOIN purchase_orders po ON asn.po_id = po.id
            LEFT JOIN asn_items ai ON asn.id = ai.asn_id
            WHERE 1=1
        `;
        const params = [];

        if (filters.status) {
            sql += ` AND asn.status = ?`;
            params.push(filters.status);
        }

        if (filters.po_id) {
            sql += ` AND asn.po_id = ?`;
            params.push(filters.po_id);
        }

        if (filters.search) {
            sql += ` AND (asn.asn_number LIKE ? OR po.po_number LIKE ? OR s.name LIKE ?)`;
            params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }

        sql += ` GROUP BY asn.id ORDER BY asn.created_at DESC`;

        if (filters.limit) {
            sql += ` LIMIT ?`;
            params.push(parseInt(filters.limit));
        }

        const rows = await sequelizeMaster.query(sql, { replacements: params, type: QueryTypes.SELECT });
        return rows.map(r => ({
            id: r.id,
            asn_number: r.asn_number,
            po_id: r.po_id,
            po_number: r.po_number,
            supplier_id: r.supplier_id,
            supplier_name: r.supplier_name,
            ship_date: r.ship_date,
            expected_arrival_date: r.expected_arrival_date,
            carrier: r.carrier,
            tracking_number: r.tracking_number,
            status: r.status,
            notes: r.notes,
            item_count: Number(r.item_count || 0),
            total_shipped: Number(r.total_shipped || 0),
            total_received: Number(r.total_received || 0),
            created_at: r.created_at
        }));
    }

    async getAsnById(id) {
        if (!id) return null;

        const [asn] = await sequelizeMaster.query(`
            SELECT asn.*, s.name AS supplier_name, po.po_number
            FROM advance_shipping_notices asn
            LEFT JOIN suppliers s ON asn.supplier_id = s.supplier_id
            LEFT JOIN purchase_orders po ON asn.po_id = po.id
            WHERE asn.id = ? OR asn.asn_number = ?
        `, { replacements: [id, id], type: QueryTypes.SELECT });

        if (!asn) return null;

        const items = await sequelizeMaster.query(`
            SELECT ai.*
            FROM asn_items ai
            WHERE ai.asn_id = ?
            ORDER BY ai.product_name, ai.serial_number
        `, { replacements: [asn.id], type: QueryTypes.SELECT });

        return {
            id: asn.id,
            asn_number: asn.asn_number,
            po_id: asn.po_id,
            po_number: asn.po_number,
            supplier_id: asn.supplier_id,
            supplier_name: asn.supplier_name,
            ship_date: asn.ship_date,
            expected_arrival_date: asn.expected_arrival_date,
            carrier: asn.carrier,
            tracking_number: asn.tracking_number,
            status: asn.status,
            notes: asn.notes,
            created_at: asn.created_at,
            items: items.map(i => ({
                id: i.id,
                po_item_id: i.po_item_id,
                product_id: i.product_id,
                spare_part_id: i.spare_part_id,
                product_name: i.product_name,
                quantity_shipped: i.quantity_shipped,
                quantity_received: i.quantity_received,
                serial_number: i.serial_number,
                imei: i.imei,
                batch_number: i.batch_number,
                receive_status: i.receive_status,
                notes: i.notes
            }))
        };
    }

    async updateAsnStatus(id, status) {
        const allowed = ['pending', 'arrived', 'receiving', 'received', 'discrepancy'];
        if (!allowed.includes(status)) throw new ValidationError(`Invalid ASN status: ${status}`);

        const [asn] = await sequelizeMaster.query(
            `SELECT id FROM advance_shipping_notices WHERE id = ? OR asn_number = ?`,
            { replacements: [id, id], type: QueryTypes.SELECT }
        );
        if (!asn) throw new NotFoundError('ASN not found');

        await sequelizeMaster.query(
            `UPDATE advance_shipping_notices SET status = ? WHERE id = ?`,
            { replacements: [status, asn.id], type: QueryTypes.UPDATE }
        );

        return { success: true };
    }

    /**
     * Receive items against an ASN by scanning serials/quantities.
     * @param {string} asnId
     * @param {Object} receiveData - { warehouse_id, items: [{ asn_item_id, serial_number?, quantity? }] }
     * @param {number} userId
     */
    async receiveAsnItems(asnId, receiveData, userId) {
        const asn = await this.getAsnById(asnId);
        if (!asn) throw new NotFoundError('ASN not found');
        if (asn.status === 'received') throw new ValidationError('ASN already fully received');

        const { warehouse_id, items } = receiveData;
        if (!warehouse_id) throw new ValidationError('Warehouse ID is required');
        if (!items || items.length === 0) throw new ValidationError('At least one item is required');

        const InventoryTransactionService = require('./InventoryTransactionService');
        const inventoryTxn = new InventoryTransactionService();

        return await sequelizeMaster.transaction(async (t) => {
            const receivedItems = [];

            for (const scanItem of items) {
                // Find matching ASN item
                let asnItem;
                if (scanItem.asn_item_id) {
                    asnItem = asn.items.find(i => i.id === scanItem.asn_item_id);
                } else if (scanItem.serial_number) {
                    asnItem = asn.items.find(i => i.serial_number === scanItem.serial_number);
                }

                if (!asnItem) {
                    // Scanned item not in ASN — discrepancy
                    receivedItems.push({
                        serial_number: scanItem.serial_number,
                        status: 'discrepancy',
                        reason: 'Not found in ASN'
                    });
                    continue;
                }

                if (asnItem.receive_status === 'received') {
                    receivedItems.push({
                        asn_item_id: asnItem.id,
                        serial_number: asnItem.serial_number,
                        status: 'already_received'
                    });
                    continue;
                }

                const qtyToReceive = scanItem.quantity || asnItem.quantity_shipped;

                // Mark ASN item as received
                await sequelizeMaster.query(`
                    UPDATE asn_items SET
                        quantity_received = ?,
                        receive_status = 'received'
                    WHERE id = ?
                `, {
                    replacements: [qtyToReceive, asnItem.id],
                    type: QueryTypes.UPDATE,
                    transaction: t
                });

                receivedItems.push({
                    asn_item_id: asnItem.id,
                    product_id: asnItem.product_id,
                    spare_part_id: asnItem.spare_part_id,
                    serial_number: asnItem.serial_number,
                    quantity: qtyToReceive,
                    status: 'received'
                });
            }

            // Receive into inventory via InventoryTransactionService
            const inventoryItems = receivedItems
                .filter(i => i.status === 'received')
                .map(i => ({
                    product_id: i.product_id || null,
                    spare_part_id: i.spare_part_id || null,
                    serial_number: i.serial_number || null,
                    quantity: i.quantity || 1,
                    batch_no: null,
                    condition: 'NEW'
                }));

            let receiptResult = null;
            if (inventoryItems.length > 0) {
                receiptResult = await inventoryTxn.receiveStock({
                    supplier_id: asn.supplier_id,
                    warehouse_id,
                    items: inventoryItems,
                    user_id: userId,
                    po_id: asn.po_id,
                    notes: `ASN receiving: ${asn.asn_number}`
                });
            }

            // Check if all ASN items are now received
            const [stats] = await sequelizeMaster.query(`
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN receive_status = 'received' THEN 1 ELSE 0 END) AS received
                FROM asn_items WHERE asn_id = ?
            `, { replacements: [asn.id], type: QueryTypes.SELECT, transaction: t });

            const allReceived = Number(stats.total) === Number(stats.received);

            await sequelizeMaster.query(
                `UPDATE advance_shipping_notices SET status = ? WHERE id = ?`,
                {
                    replacements: [allReceived ? 'received' : 'receiving', asn.id],
                    type: QueryTypes.UPDATE,
                    transaction: t
                }
            );

            // Update PO status
            if (allReceived) {
                // Check if there are other pending ASNs for this PO
                const [otherAsns] = await sequelizeMaster.query(`
                    SELECT COUNT(*) AS cnt FROM advance_shipping_notices
                    WHERE po_id = ? AND id != ? AND status != 'received'
                `, { replacements: [asn.po_id, asn.id], type: QueryTypes.SELECT, transaction: t });

                const poStatus = Number(otherAsns.cnt) === 0 ? 'received' : 'partially_received';
                await sequelizeMaster.query(
                    `UPDATE purchase_orders SET status = ? WHERE id = ?`,
                    { replacements: [poStatus, asn.po_id], type: QueryTypes.UPDATE, transaction: t }
                );
            } else {
                await sequelizeMaster.query(
                    `UPDATE purchase_orders SET status = 'partially_received' WHERE id = ?`,
                    { replacements: [asn.po_id], type: QueryTypes.UPDATE, transaction: t }
                );
            }

            return {
                success: true,
                asn_id: asn.id,
                asn_status: allReceived ? 'received' : 'receiving',
                items: receivedItems,
                receipt_id: receiptResult ? receiptResult.receipt_id : null,
                total_items: Number(stats.total),
                total_received: Number(stats.received)
            };
        });
    }

    // =========================================================================
    // INTERNAL
    // =========================================================================

    _parseXml(xmlString) {
        try {
            const result = this.parser.parse(xmlString);
            if (!result || !result.AdvanceShippingNotice) {
                throw new ValidationError('Invalid XML structure: missing <AdvanceShippingNotice> root element');
            }
            return result.AdvanceShippingNotice;
        } catch (err) {
            if (err instanceof ValidationError) throw err;
            throw new ValidationError(`Failed to parse ASN XML: ${err.message}`);
        }
    }

    _mapXmlToAsnData(xmlDoc) {
        const asnNumber = xmlDoc.ASNNumber;
        const poNumber = xmlDoc.PONumber;

        if (!asnNumber) throw new ValidationError('XML missing required field: <ASNNumber>');
        if (!poNumber) throw new ValidationError('XML missing required field: <PONumber>');

        const rawItems = xmlDoc.Items?.Item;
        if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
            throw new ValidationError('XML must contain at least one <Item> inside <Items>');
        }

        const items = rawItems.map((item, idx) => {
            const quantityShipped = parseInt(item.QuantityShipped, 10);
            if (!quantityShipped || quantityShipped <= 0) {
                throw new ValidationError(`Item #${idx + 1}: invalid or missing <QuantityShipped>`);
            }

            let serials = [];
            if (item.SerialNumbers?.Serial) {
                serials = Array.isArray(item.SerialNumbers.Serial)
                    ? item.SerialNumbers.Serial.map(String)
                    : [String(item.SerialNumbers.Serial)];
            }

            return {
                product_id: item.ProductID || null,
                spare_part_id: item.SparePartID || null,
                product_name: item.ProductName || `Item ${idx + 1}`,
                quantity_shipped: quantityShipped,
                serials,
                batch_number: item.BatchNumber || null
            };
        });

        return {
            asn_number: String(asnNumber),
            po_number: String(poNumber),
            supplier_id: xmlDoc.SupplierID || null,
            ship_date: xmlDoc.ShipDate || null,
            expected_arrival_date: xmlDoc.ExpectedArrival || null,
            carrier: xmlDoc.Carrier || null,
            tracking_number: xmlDoc.TrackingNumber || null,
            notes: xmlDoc.Notes || null,
            items
        };
    }
}

module.exports = AsnService;
