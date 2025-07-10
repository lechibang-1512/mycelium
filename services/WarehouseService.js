/**
 * Warehouse Management Service
 * Handles multi-warehouse operations, zone management, and batch/lot tracking
 */

class WarehouseService {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * Get all warehouses
     */
    async getWarehouses(activeOnly = true) {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                SELECT warehouse_id, name, location, is_active, created_at, updated_at
                FROM warehouses
                ${activeOnly ? 'WHERE is_active = TRUE' : ''}
                ORDER BY name
            `;
            const result = await conn.query(query);
            return result;
        } finally {
            conn.end();
        }
    }

    /**
     * Get zones for a warehouse
     */
    async getWarehouseZones(warehouseId, activeOnly = true) {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                SELECT zone_id, warehouse_id, name, description, zone_type, is_active, created_at, updated_at
                FROM warehouse_zones
                WHERE warehouse_id = ?
                ${activeOnly ? 'AND is_active = TRUE' : ''}
                ORDER BY zone_type, name
            `;
            const result = await conn.query(query, [warehouseId]);
            return result;
        } finally {
            conn.end();
        }
    }

    /**
     * Get inventory by warehouse and zone
     */
    async getInventoryByLocation(warehouseId = null, zoneId = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `
                SELECT 
                    io.product_id,
                    io.device_name,
                    io.device_maker,
                    io.device_price,
                    io.warehouse_id,
                    io.warehouse_name,
                    io.zone_id,
                    io.zone_name,
                    io.zone_type,
                    io.warehouse_quantity,
                    io.reserved_quantity,
                    io.available_quantity
                FROM inventory_overview io
                WHERE 1=1
            `;
            const params = [];

            if (warehouseId) {
                query += ' AND io.warehouse_id = ?';
                params.push(warehouseId);
            }

            if (zoneId) {
                query += ' AND io.zone_id = ?';
                params.push(zoneId);
            }

            query += ' ORDER BY io.device_name, io.warehouse_name, io.zone_name';

            const result = await conn.query(query, params);
            return result;
        } finally {
            conn.end();
        }
    }

    /**
     * Get expiring batches
     */
    async getExpiringBatches(daysAhead = 30) {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                SELECT *
                FROM expiring_batches
                WHERE days_until_expiry <= ?
                ORDER BY days_until_expiry ASC
            `;
            const result = await conn.query(query, [daysAhead]);
            return result;
        } finally {
            conn.end();
        }
    }

    /**
     * Get serial inventory status
     */
    async getSerialInventoryStatus(status = null, warehouseId = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `
                SELECT *
                FROM serial_inventory_status
                WHERE 1=1
            `;
            const params = [];

            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }

            if (warehouseId) {
                query += ' AND warehouse_id = ?';
                params.push(warehouseId);
            }

            query += ' ORDER BY serial_number';

            const result = await conn.query(query, params);
            return result;
        } finally {
            conn.end();
        }
    }

    /**
     * Transfer inventory between warehouses/zones
     */
    async transferInventory(productId, fromWarehouseId, toWarehouseId, quantity, fromZoneId = null, toZoneId = null, notes = null) {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();

            // Update from location
            await this.updateWarehouseProductLocation(conn, productId, fromWarehouseId, fromZoneId, -quantity);

            // Update to location
            await this.updateWarehouseProductLocation(conn, productId, toWarehouseId, toZoneId, quantity);

            // Log the transfer
            await this.logInventoryTransfer(conn, productId, fromWarehouseId, toWarehouseId, quantity, fromZoneId, toZoneId, notes);

            await conn.commit();
            return true;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.end();
        }
    }

    /**
     * Update warehouse product location quantity
     */
    async updateWarehouseProductLocation(conn, productId, warehouseId, zoneId, quantityChange) {
        const query = `
            INSERT INTO warehouse_product_locations (phone_id, warehouse_id, zone_id, quantity)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                quantity = quantity + VALUES(quantity),
                last_updated = CURRENT_TIMESTAMP
        `;
        await conn.query(query, [productId, warehouseId, zoneId, quantityChange]);
    }

    /**
     * Log inventory transfer
     */
    async logInventoryTransfer(conn, productId, fromWarehouseId, toWarehouseId, quantity, fromZoneId = null, toZoneId = null, notes = null) {
        // Log outgoing from source
        const outgoingQuery = `
            INSERT INTO inventory_log (
                phone_id, transaction_type, quantity_changed, warehouse_id, zone_id, notes, transaction_date
            ) VALUES (?, 'outgoing', ?, ?, ?, ?, NOW())
        `;
        await conn.query(outgoingQuery, [productId, -quantity, fromWarehouseId, fromZoneId, notes]);

        // Log incoming to destination
        const incomingQuery = `
            INSERT INTO inventory_log (
                phone_id, transaction_type, quantity_changed, warehouse_id, zone_id, notes, transaction_date
            ) VALUES (?, 'incoming', ?, ?, ?, ?, NOW())
        `;
        await conn.query(incomingQuery, [productId, quantity, toWarehouseId, toZoneId, notes]);
    }

    /**
     * Create batch tracking record
     */
    async createBatch(productId, batchNo, lotNo, supplierId, warehouseId, zoneId, quantityReceived, expiryDate, notes = null) {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                INSERT INTO batch_tracking (
                    batch_no, lot_no, phone_id, supplier_id, warehouse_id, zone_id,
                    quantity_received, quantity_remaining, expiry_date, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const result = await conn.query(query, [
                batchNo, lotNo, productId, supplierId, warehouseId, zoneId,
                quantityReceived, quantityReceived, expiryDate, notes
            ]);
            return result.insertId;
        } finally {
            conn.end();
        }
    }

    /**
     * Create serialized inventory item
     */
    async createSerializedItem(productId, serialNumber, warehouseId, zoneId, batchNo = null, lotNo = null, expiryDate = null, supplierId = null, notes = null) {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                INSERT INTO serialized_inventory (
                    phone_id, serial_number, warehouse_id, zone_id, batch_no, lot_no,
                    expiry_date, supplier_id, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const result = await conn.query(query, [
                productId, serialNumber, warehouseId, zoneId, batchNo, lotNo,
                expiryDate, supplierId, notes
            ]);
            return result.insertId;
        } finally {
            conn.end();
        }
    }

    /**
     * Update serialized item status
     */
    async updateSerializedItemStatus(serialId, status, notes = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `
                UPDATE serialized_inventory 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
            `;
            const params = [status];

            if (notes) {
                query += ', notes = ?';
                params.push(notes);
            }

            query += ' WHERE serial_id = ?';
            params.push(serialId);

            await conn.query(query, params);
            return true;
        } finally {
            conn.end();
        }
    }

    /**
     * Get batch details
     */
    async getBatchDetails(batchNo, productId = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `
                SELECT 
                    bt.*,
                    sd.device_name,
                    sd.device_maker,
                    w.name as warehouse_name,
                    wz.name as zone_name
                FROM batch_tracking bt
                JOIN specs_db sd ON bt.phone_id = sd.product_id
                LEFT JOIN warehouses w ON bt.warehouse_id = w.warehouse_id
                LEFT JOIN warehouse_zones wz ON bt.zone_id = wz.zone_id
                WHERE bt.batch_no = ?
            `;
            const params = [batchNo];

            if (productId) {
                query += ' AND bt.phone_id = ?';
                params.push(productId);
            }

            const result = await conn.query(query, params);
            return result[0] || null;
        } finally {
            conn.end();
        }
    }

    /**
     * Update batch quantity (for FIFO/LIFO inventory management)
     */
    async updateBatchQuantity(batchId, quantityUsed, notes = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `
                UPDATE batch_tracking 
                SET quantity_remaining = quantity_remaining - ?,
                    updated_at = CURRENT_TIMESTAMP
            `;
            const params = [quantityUsed];

            if (notes) {
                query += ', notes = CONCAT(COALESCE(notes, ""), " | ", ?)';
                params.push(notes);
            }

            query += ' WHERE batch_id = ? AND quantity_remaining >= ?';
            params.push(batchId, quantityUsed);

            const result = await conn.query(query, params);
            
            // Update status if depleted
            if (result.affectedRows > 0) {
                await conn.query(`
                    UPDATE batch_tracking 
                    SET status = 'depleted' 
                    WHERE batch_id = ? AND quantity_remaining = 0
                `, [batchId]);
            }

            return result.affectedRows > 0;
        } finally {
            conn.end();
        }
    }

    /**
     * Get warehouse summary statistics
     */
    async getWarehouseSummary(warehouseId = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `
                SELECT 
                    w.warehouse_id,
                    w.name as warehouse_name,
                    COUNT(DISTINCT wpl.phone_id) as unique_products,
                    SUM(wpl.quantity) as total_items,
                    SUM(wpl.reserved_quantity) as total_reserved,
                    SUM(wpl.quantity - wpl.reserved_quantity) as total_available,
                    COUNT(DISTINCT wz.zone_id) as total_zones
                FROM warehouses w
                LEFT JOIN warehouse_product_locations wpl ON w.warehouse_id = wpl.warehouse_id
                LEFT JOIN warehouse_zones wz ON w.warehouse_id = wz.warehouse_id AND wz.is_active = TRUE
                WHERE w.is_active = TRUE
            `;
            const params = [];

            if (warehouseId) {
                query += ' AND w.warehouse_id = ?';
                params.push(warehouseId);
            }

            query += ' GROUP BY w.warehouse_id, w.name ORDER BY w.name';

            const result = await conn.query(query, params);
            return result;
        } finally {
            conn.end();
        }
    }

    /**
     * Search serialized inventory by serial number
     */
    async findBySerialNumber(serialNumber) {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                SELECT *
                FROM serial_inventory_status
                WHERE serial_number = ?
            `;
            const result = await conn.query(query, [serialNumber]);
            return result[0] || null;
        } finally {
            conn.end();
        }
    }

    /**
     * Get FIFO batch for product (First In, First Out)
     */
    async getFIFOBatch(productId, warehouseId = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `
                SELECT *
                FROM batch_tracking
                WHERE phone_id = ? AND status = 'active' AND quantity_remaining > 0
            `;
            const params = [productId];

            if (warehouseId) {
                query += ' AND warehouse_id = ?';
                params.push(warehouseId);
            }

            query += ' ORDER BY received_date ASC, batch_id ASC LIMIT 1';

            const result = await conn.query(query, params);
            return result[0] || null;
        } finally {
            conn.end();
        }
    }

    /**
     * Get LIFO batch for product (Last In, First Out)
     */
    async getLIFOBatch(productId, warehouseId = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `
                SELECT *
                FROM batch_tracking
                WHERE phone_id = ? AND status = 'active' AND quantity_remaining > 0
            `;
            const params = [productId];

            if (warehouseId) {
                query += ' AND warehouse_id = ?';
                params.push(warehouseId);
            }

            query += ' ORDER BY received_date DESC, batch_id DESC LIMIT 1';

            const result = await conn.query(query, params);
            return result[0] || null;
        } finally {
            conn.end();
        }
    }
}

module.exports = WarehouseService;
