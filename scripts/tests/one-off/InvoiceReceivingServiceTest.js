const { withConnection, withTransaction } = require('../backend/utils/queryHelper');

class InvoiceReceivingServiceTest {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * Get invoices that are pending receiving
     */
    async getPendingInvoices(filters = {}) {
        return withConnection(this.pool, async (conn) => {
            const {
                supplierId = null,
                status = null,
                dateFrom = null,
                dateTo = null,
                hasExpectedSerials = null,
                limit = 100
            } = filters;

            let query = `
                SELECT DISTINCT
                    i.uuid,
                    i.invoice_number,
                    s.name as supplier_name,
                    i.invoice_date,
                    i.total_amount,
                    i.currency,
                    i.status as invoice_status,
                    COALESCE(i.verification_status, 'PENDING') as receiving_status,
                    COUNT(DISTINCT ii.id) as total_items,
                    COUNT(DISTINCT es.id) as expected_serials_count,
                    COUNT(DISTINCT CASE WHEN es.is_received = 1 THEN es.id END) as received_serials_count,
                    SUM(ii.quantity) as total_quantity,
                    0 as total_received
                FROM invoices i
                LEFT JOIN suppliers s ON i.supplier_id = s.id
                LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
                LEFT JOIN expected_serials es ON i.id = es.invoice_id AND ii.product_uuid = es.product_id COLLATE utf8mb4_unicode_ci
                WHERE i.status != 'cancelled'
                    AND (i.verification_status IS NULL OR i.verification_status IN ('PENDING', 'PARTIAL'))
            `;

            const params = [];

            if (supplierId) {
                query += ` AND i.supplier_id = ?`;
                params.push(supplierId);
            }

            if (status) {
                query += ` AND i.verification_status = ?`;
                params.push(status);
            }

            if (dateFrom) {
                query += ` AND i.invoice_date >= ?`;
                params.push(dateFrom);
            }

            if (dateTo) {
                query += ` AND i.invoice_date <= ?`;
                params.push(dateTo);
            }

            if (hasExpectedSerials !== null) {
                if (hasExpectedSerials) {
                    query += ` AND es.uuid IS NOT NULL`;
                } else {
                    query += ` AND es.uuid IS NULL`;
                }
            }

            query += `
                GROUP BY i.uuid, i.invoice_number, s.name, i.invoice_date, i.total_amount, i.currency, i.status, i.verification_status
                ORDER BY i.invoice_date DESC, i.created_at DESC
                LIMIT ?
            `;
            params.push(limit);

            const invoices = await conn.query(query, params);
            return { success: true, data: invoices };
        });
    }

    /**
     * Get detailed receiving manifest for a specific invoice
     */
    async getReceivingManifest(invoiceUuid) {
        return withConnection(this.pool, async (conn) => {
            // Get invoice details
            const invoiceQuery = `
                SELECT i.uuid, i.invoice_number, s.name as supplier_name, i.supplier_id, 
                       i.invoice_date, i.total_amount, i.currency, i.status, 
                       i.verification_status as receiving_status, i.notes
                FROM invoices i
                LEFT JOIN suppliers s ON i.supplier_id = s.id
                WHERE i.uuid = ?
            `;
            const invoiceResult = await conn.query(invoiceQuery, [invoiceUuid]);
            
            if (invoiceResult.length === 0) {
                return { success: false, error: 'Invoice not found' };
            }

            const invoice = invoiceResult[0];

            // Get invoice items with products and expected serials
            const itemsQuery = `
                SELECT 
                    ii.id as item_id,
                    ii.product_uuid,
                    ii.product_name,
                    ii.product_id as product_code,
                    ii.quantity,
                    ii.unit_price,
                    ii.total_amount as item_total,
                    0 as quantity_received,
                    ii.quantity as quantity_remaining,
                    p.name as catalog_product_name,
                    p.sku as catalog_sku,
                    p.sku as catalog_upc,
                    p.requires_serial_tracking as requires_serial_number,
                    COUNT(DISTINCT es.id) as expected_serials_count,
                    COUNT(DISTINCT CASE WHEN es.is_received = 1 THEN es.id END) as received_serials_count
                FROM invoice_items ii
                LEFT JOIN products p ON ii.product_uuid = p.product_id COLLATE utf8mb4_unicode_ci
                LEFT JOIN expected_serials es ON ii.invoice_id = es.invoice_id AND ii.product_uuid = es.product_id COLLATE utf8mb4_unicode_ci
                WHERE ii.invoice_id = (SELECT id FROM invoices WHERE uuid = ?)
                GROUP BY ii.id, ii.product_uuid, ii.product_name, ii.product_id, 
                         ii.quantity, ii.unit_price, ii.total_amount,
                         p.name, p.sku, p.requires_serial_tracking
                ORDER BY ii.product_name
            `;
            const items = await conn.query(itemsQuery, [invoiceUuid]);

            // Get expected serials for each item
            for (let item of items) {
                const serialsQuery = `
                    SELECT expected_serial, is_received, received_at, created_at
                    FROM expected_serials 
                    WHERE invoice_id = (SELECT id FROM invoices WHERE uuid = ?) 
                      AND product_id = ? COLLATE utf8mb4_unicode_ci
                    ORDER BY expected_serial
                `;
                const serials = await conn.query(serialsQuery, [invoiceUuid, item.product_uuid]);
                item.expected_serials = serials;
            }

            // Calculate summary
            const summary = {
                total_items: items.length,
                total_quantity: items.reduce((sum, item) => sum + Number(item.quantity), 0),
                total_received: items.reduce((sum, item) => sum + Number(item.quantity_received), 0),
                total_remaining: items.reduce((sum, item) => sum + Number(item.quantity_remaining), 0),
                expected_serials_count: items.reduce((sum, item) => sum + Number(item.expected_serials_count), 0),
                received_serials_count: items.reduce((sum, item) => sum + Number(item.received_serials_count), 0),
            };
            
            summary.receiving_progress = summary.total_quantity > 0 
                ? Math.round((summary.total_received / summary.total_quantity) * 100) 
                : 0;

            const result = {
                invoice,
                items,
                summary
            };

            return { success: true, data: result };
        });
    }
}

module.exports = InvoiceReceivingServiceTest;