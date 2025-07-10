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

    /**
     * Get warehouse distribution overview
     */
    async getWarehouseDistributionOverview() {
        const conn = await this.pool.getConnection();
        try {
            const query = `SELECT * FROM warehouse_distribution_overview`;
            const result = await conn.query(query);
            return result;
        } finally {
            conn.end();
        }
    }

    /**
     * Get zone distribution efficiency
     */
    async getZoneDistributionEfficiency(warehouseId = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `SELECT * FROM zone_distribution_efficiency`;
            const params = [];

            if (warehouseId) {
                query += ' WHERE warehouse_id = ?';
                params.push(warehouseId);
            }

            query += ' ORDER BY efficiency_status DESC, utilization_percent DESC';

            const result = await conn.query(query, params);
            return result;
        } finally {
            conn.end();
        }
    }

    /**
     * Get inventory movement tracking
     */
    async getInventoryMovementTracking(filters = {}) {
        const conn = await this.pool.getConnection();
        try {
            let query = `SELECT * FROM inventory_movement_tracking WHERE 1=1`;
            const params = [];

            if (filters.productId) {
                query += ' AND phone_id = ?';
                params.push(filters.productId);
            }

            if (filters.warehouseId) {
                query += ' AND warehouse_id = ?';
                params.push(filters.warehouseId);
            }

            if (filters.zoneId) {
                query += ' AND zone_id = ?';
                params.push(filters.zoneId);
            }

            if (filters.transactionType) {
                query += ' AND transaction_type = ?';
                params.push(filters.transactionType);
            }

            if (filters.fromDate) {
                query += ' AND transaction_date >= ?';
                params.push(filters.fromDate);
            }

            if (filters.toDate) {
                query += ' AND transaction_date <= ?';
                params.push(filters.toDate);
            }

            query += ' ORDER BY transaction_date DESC LIMIT 1000';

            const result = await conn.query(query, params);
            return result;
        } finally {
            conn.end();
        }
    }

    /**
     * Get low stock alerts
     */
    async getLowStockAlerts(warehouseId = null, alertLevel = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `SELECT * FROM low_stock_alerts WHERE 1=1`;
            const params = [];

            if (warehouseId) {
                query += ' AND warehouse_id = ?';
                params.push(warehouseId);
            }

            if (alertLevel) {
                query += ' AND alert_level = ?';
                params.push(alertLevel);
            }

            const result = await conn.query(query, params);
            return result;
        } finally {
            conn.end();
        }
    }

    /**
     * Create or update warehouse
     */
    async createOrUpdateWarehouse(warehouseData, warehouseId = null) {
        const conn = await this.pool.getConnection();
        try {
            const { name, location, description, contactInfo, isActive } = warehouseData;

            if (warehouseId) {
                // Update existing warehouse
                const query = `
                    UPDATE warehouses 
                    SET name = ?, location = ?, description = ?, contact_info = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE warehouse_id = ?
                `;
                await conn.query(query, [name, location, description, JSON.stringify(contactInfo), isActive, warehouseId]);
                return warehouseId;
            } else {
                // Create new warehouse
                const query = `
                    INSERT INTO warehouses (name, location, description, contact_info, is_active)
                    VALUES (?, ?, ?, ?, ?)
                `;
                const result = await conn.query(query, [name, location, description, JSON.stringify(contactInfo), isActive]);
                return result.insertId;
            }
        } finally {
            conn.end();
        }
    }

    /**
     * Create or update warehouse zone
     */
    async createOrUpdateZone(zoneData, zoneId = null) {
        const conn = await this.pool.getConnection();
        try {
            const { warehouseId, name, description, zoneType, capacityLimit, isActive } = zoneData;

            if (zoneId) {
                // Update existing zone
                const query = `
                    UPDATE warehouse_zones 
                    SET warehouse_id = ?, name = ?, description = ?, zone_type = ?, capacity_limit = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE zone_id = ?
                `;
                await conn.query(query, [warehouseId, name, description, zoneType, capacityLimit, isActive, zoneId]);
                return zoneId;
            } else {
                // Create new zone
                const query = `
                    INSERT INTO warehouse_zones (warehouse_id, name, description, zone_type, capacity_limit, is_active)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                const result = await conn.query(query, [warehouseId, name, description, zoneType, capacityLimit, isActive]);
                return result.insertId;
            }
        } finally {
            conn.end();
        }
    }

    /**
     * Multi-zone inventory distribution
     */
    async distributeInventoryAcrossZones(productId, warehouseId, totalQuantity, distributionStrategy = 'even') {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();

            // Get available zones in warehouse
            const zones = await this.getWarehouseZones(warehouseId, true);
            const storageZones = zones.filter(z => ['storage', 'receiving'].includes(z.zone_type));

            if (storageZones.length === 0) {
                throw new Error('No storage zones available in warehouse');
            }

            let distributions = [];

            switch (distributionStrategy) {
                case 'even':
                    // Distribute evenly across all storage zones
                    const evenQuantity = Math.floor(totalQuantity / storageZones.length);
                    const remainder = totalQuantity % storageZones.length;

                    storageZones.forEach((zone, index) => {
                        const quantity = evenQuantity + (index < remainder ? 1 : 0);
                        if (quantity > 0) {
                            distributions.push({ zoneId: zone.zone_id, quantity });
                        }
                    });
                    break;

                case 'capacity_based':
                    // Distribute based on zone capacity
                    const totalCapacity = storageZones.reduce((sum, zone) => sum + (zone.capacity_limit || 1000), 0);
                    
                    storageZones.forEach(zone => {
                        const capacity = zone.capacity_limit || 1000;
                        const proportion = capacity / totalCapacity;
                        const quantity = Math.floor(totalQuantity * proportion);
                        if (quantity > 0) {
                            distributions.push({ zoneId: zone.zone_id, quantity });
                        }
                    });
                    break;

                case 'priority_zones':
                    // Prioritize certain zone types
                    const priorityOrder = ['storage', 'receiving'];
                    let remaining = totalQuantity;

                    for (const zoneType of priorityOrder) {
                        const zonesOfType = storageZones.filter(z => z.zone_type === zoneType);
                        if (zonesOfType.length > 0 && remaining > 0) {
                            const perZone = Math.floor(remaining / zonesOfType.length);
                            zonesOfType.forEach(zone => {
                                const quantity = Math.min(perZone, remaining);
                                if (quantity > 0) {
                                    distributions.push({ zoneId: zone.zone_id, quantity });
                                    remaining -= quantity;
                                }
                            });
                        }
                    }
                    break;

                default:
                    // Default to even distribution
                    distributions = [{ zoneId: storageZones[0].zone_id, quantity: totalQuantity }];
            }

            // Apply the distributions
            for (const dist of distributions) {
                await this.updateWarehouseProductLocation(conn, productId, warehouseId, dist.zoneId, dist.quantity);
            }

            await conn.commit();
            return distributions;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.end();
        }
    }

    /**
     * Optimize zone allocation for a product
     */
    async optimizeZoneAllocation(productId, warehouseId) {
        const conn = await this.pool.getConnection();
        try {
            // Get current distribution
            const currentDistribution = await this.getInventoryByLocation(warehouseId, null);
            const productInventory = currentDistribution.filter(item => item.product_id === productId);

            // Get zone efficiency data
            const zoneEfficiency = await this.getZoneDistributionEfficiency(warehouseId);

            // Analyze and suggest optimizations
            const suggestions = [];

            for (const item of productInventory) {
                const zoneInfo = zoneEfficiency.find(z => z.zone_id === item.zone_id);
                
                if (zoneInfo) {
                    if (zoneInfo.efficiency_status === 'over_capacity') {
                        suggestions.push({
                            type: 'move_excess',
                            fromZone: item.zone_id,
                            quantity: Math.floor(item.warehouse_quantity * 0.3),
                            reason: 'Zone over capacity'
                        });
                    } else if (zoneInfo.efficiency_status === 'under_utilized' && item.warehouse_quantity < 10) {
                        suggestions.push({
                            type: 'consolidate',
                            fromZone: item.zone_id,
                            quantity: item.warehouse_quantity,
                            reason: 'Consolidate small quantities'
                        });
                    }
                }
            }

            return suggestions;
        } finally {
            conn.end();
        }
    }

    /**
     * Bulk inventory operation across multiple zones
     */
    async bulkInventoryOperation(operations) {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();

            const results = [];

            for (const operation of operations) {
                const { type, productId, warehouseId, zoneId, quantity, notes } = operation;

                switch (type) {
                    case 'receive':
                        await this.updateWarehouseProductLocation(conn, productId, warehouseId, zoneId, quantity);
                        await this.logInventoryChange(conn, productId, 'incoming', quantity, warehouseId, zoneId, notes);
                        break;

                    case 'ship':
                        await this.updateWarehouseProductLocation(conn, productId, warehouseId, zoneId, -quantity);
                        await this.logInventoryChange(conn, productId, 'outgoing', -quantity, warehouseId, zoneId, notes);
                        break;

                    case 'move':
                        const { fromZoneId, toZoneId } = operation;
                        await this.updateWarehouseProductLocation(conn, productId, warehouseId, fromZoneId, -quantity);
                        await this.updateWarehouseProductLocation(conn, productId, warehouseId, toZoneId, quantity);
                        await this.logInventoryChange(conn, productId, 'outgoing', -quantity, warehouseId, fromZoneId, `Move to zone ${toZoneId}: ${notes}`);
                        await this.logInventoryChange(conn, productId, 'incoming', quantity, warehouseId, toZoneId, `Move from zone ${fromZoneId}: ${notes}`);
                        break;

                    case 'adjust':
                        const currentQty = await this.getCurrentQuantity(conn, productId, warehouseId, zoneId);
                        const adjustment = quantity - currentQty;
                        await this.updateWarehouseProductLocation(conn, productId, warehouseId, zoneId, adjustment);
                        await this.logInventoryChange(conn, productId, adjustment > 0 ? 'incoming' : 'outgoing', adjustment, warehouseId, zoneId, `Adjustment: ${notes}`);
                        break;
                }

                results.push({ operation: type, success: true });
            }

            await conn.commit();
            return results;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.end();
        }
    }

    /**
     * Helper method to log inventory changes
     */
    async logInventoryChange(conn, productId, transactionType, quantityChanged, warehouseId, zoneId, notes) {
        const query = `
            INSERT INTO inventory_log (
                phone_id, transaction_type, quantity_changed, warehouse_id, zone_id, notes, transaction_date
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        await conn.query(query, [productId, transactionType, quantityChanged, warehouseId, zoneId, notes]);
    }

    /**
     * Helper method to get current quantity
     */
    async getCurrentQuantity(conn, productId, warehouseId, zoneId) {
        const query = `
            SELECT quantity FROM warehouse_product_locations 
            WHERE phone_id = ? AND warehouse_id = ? AND zone_id = ?
        `;
        const result = await conn.query(query, [productId, warehouseId, zoneId]);
        return result[0]?.quantity || 0;
    }

    /**
     * Single-zone replacement: Replace inventory from one zone to another
     */
    async singleZoneReplacement(productId, warehouseId, fromZoneId, toZoneId, quantity, reason = null) {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();

            // Check if enough stock exists in the source zone
            const [sourceStock] = await conn.query(`
                SELECT quantity, reserved_quantity 
                FROM warehouse_product_locations 
                WHERE phone_id = ? AND warehouse_id = ? AND zone_id = ?
            `, [productId, warehouseId, fromZoneId]);

            if (!sourceStock || (sourceStock.quantity - sourceStock.reserved_quantity) < quantity) {
                throw new Error('Insufficient available stock in source zone for replacement');
            }

            // Move inventory from source to destination zone
            await this.updateWarehouseProductLocation(conn, productId, warehouseId, fromZoneId, -quantity);
            await this.updateWarehouseProductLocation(conn, productId, warehouseId, toZoneId, quantity);

            // Log the replacement operation
            const notes = `Single-zone replacement: ${quantity} units from zone ${fromZoneId} to zone ${toZoneId}${reason ? `. Reason: ${reason}` : ''}`;
            await this.logInventoryChange(conn, productId, 'outgoing', -quantity, warehouseId, fromZoneId, notes);
            await this.logInventoryChange(conn, productId, 'incoming', quantity, warehouseId, toZoneId, notes);

            await conn.commit();
            return {
                success: true,
                fromZone: fromZoneId,
                toZone: toZoneId,
                quantity,
                message: 'Single-zone replacement completed successfully'
            };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.end();
        }
    }

    /**
     * Multi-zone replacement: Replace inventory across multiple zones optimally
     */
    async multiZoneReplacement(productId, warehouseId, targetZoneDistribution, strategy = 'optimize') {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();

            // Get current distribution
            const currentDistribution = await conn.query(`
                SELECT zone_id, quantity, reserved_quantity, 
                       (quantity - COALESCE(reserved_quantity, 0)) as available_quantity
                FROM warehouse_product_locations 
                WHERE phone_id = ? AND warehouse_id = ?
            `, [productId, warehouseId]);

            // Get zone information for capacity planning
            const zones = await this.getWarehouseZones(warehouseId, true);
            const zoneMap = zones.reduce((map, zone) => {
                map[zone.zone_id] = zone;
                return map;
            }, {});

            const operations = [];
            let totalAvailable = currentDistribution.reduce((sum, zone) => sum + zone.available_quantity, 0);
            let totalTarget = Object.values(targetZoneDistribution).reduce((sum, qty) => sum + qty, 0);

            if (totalTarget > totalAvailable) {
                throw new Error('Target distribution exceeds available inventory');
            }

            // Calculate movements needed
            const movements = this.calculateOptimalMovements(
                currentDistribution, 
                targetZoneDistribution, 
                zoneMap, 
                strategy
            );

            // Execute movements
            for (const movement of movements) {
                if (movement.quantity > 0) {
                    await this.updateWarehouseProductLocation(conn, productId, warehouseId, movement.fromZone, -movement.quantity);
                    await this.updateWarehouseProductLocation(conn, productId, warehouseId, movement.toZone, movement.quantity);

                    const notes = `Multi-zone replacement: ${movement.quantity} units from zone ${movement.fromZone} to zone ${movement.toZone}. Strategy: ${strategy}`;
                    await this.logInventoryChange(conn, productId, 'outgoing', -movement.quantity, warehouseId, movement.fromZone, notes);
                    await this.logInventoryChange(conn, productId, 'incoming', movement.quantity, warehouseId, movement.toZone, notes);

                    operations.push(movement);
                }
            }

            await conn.commit();
            return {
                success: true,
                operations,
                strategy,
                message: `Multi-zone replacement completed with ${operations.length} movements`
            };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.end();
        }
    }

    /**
     * Calculate optimal movements for multi-zone replacement
     */
    calculateOptimalMovements(currentDistribution, targetDistribution, zoneMap, strategy) {
        const movements = [];
        const current = {};
        const target = {};

        // Initialize current distribution map
        currentDistribution.forEach(zone => {
            current[zone.zone_id] = zone.available_quantity;
        });

        // Initialize target distribution map
        Object.keys(targetDistribution).forEach(zoneId => {
            target[parseInt(zoneId)] = targetDistribution[zoneId];
        });

        // Calculate surplus and deficit for each zone
        const surplus = [];
        const deficit = [];

        Object.keys(target).forEach(zoneId => {
            const zoneIdInt = parseInt(zoneId);
            const currentQty = current[zoneIdInt] || 0;
            const targetQty = target[zoneIdInt];
            const difference = currentQty - targetQty;

            if (difference > 0) {
                surplus.push({ zoneId: zoneIdInt, quantity: difference });
            } else if (difference < 0) {
                deficit.push({ zoneId: zoneIdInt, quantity: Math.abs(difference) });
            }
        });

        // Match surplus with deficit
        switch (strategy) {
            case 'minimize_distance':
                // Sort by zone type preference for minimal "distance"
                surplus.sort((a, b) => this.getZonePriority(zoneMap[a.zoneId]) - this.getZonePriority(zoneMap[b.zoneId]));
                deficit.sort((a, b) => this.getZonePriority(zoneMap[a.zoneId]) - this.getZonePriority(zoneMap[b.zoneId]));
                break;

            case 'capacity_based':
                // Prioritize zones based on capacity utilization
                surplus.sort((a, b) => (zoneMap[b.zoneId]?.capacity_limit || 1000) - (zoneMap[a.zoneId]?.capacity_limit || 1000));
                deficit.sort((a, b) => (zoneMap[a.zoneId]?.capacity_limit || 1000) - (zoneMap[b.zoneId]?.capacity_limit || 1000));
                break;

            default: // 'optimize' - default greedy matching
                break;
        }

        // Create movements by matching surplus with deficit
        let surplusIndex = 0;
        let deficitIndex = 0;

        while (surplusIndex < surplus.length && deficitIndex < deficit.length) {
            const surplusZone = surplus[surplusIndex];
            const deficitZone = deficit[deficitIndex];

            const moveQuantity = Math.min(surplusZone.quantity, deficitZone.quantity);

            if (moveQuantity > 0) {
                movements.push({
                    fromZone: surplusZone.zoneId,
                    toZone: deficitZone.zoneId,
                    quantity: moveQuantity,
                    strategy
                });

                surplusZone.quantity -= moveQuantity;
                deficitZone.quantity -= moveQuantity;
            }

            if (surplusZone.quantity === 0) surplusIndex++;
            if (deficitZone.quantity === 0) deficitIndex++;
        }

        return movements;
    }

    /**
     * Get zone priority for movement optimization
     */
    getZonePriority(zone) {
        const priorities = {
            'receiving': 1,
            'storage': 2,
            'picking': 3,
            'staging': 4,
            'shipping': 5
        };
        return priorities[zone?.zone_type] || 3;
    }

    /**
     * Get bin location details for a product in a specific warehouse/zone
     */
    async getBinLocationDetails(productId, warehouseId, zoneId = null) {
        const conn = await this.pool.getConnection();
        try {
            let query = `
                SELECT 
                    wpl.location_id,
                    wpl.warehouse_id,
                    wpl.zone_id,
                    wpl.phone_id,
                    wpl.aisle,
                    wpl.shelf,
                    wpl.bin,
                    wpl.quantity,
                    wpl.reserved_quantity,
                    wpl.quantity - COALESCE(wpl.reserved_quantity, 0) as available_quantity,
                    w.name as warehouse_name,
                    wz.name as zone_name,
                    wz.zone_type,
                    sd.device_name
                FROM warehouse_product_locations wpl
                JOIN warehouses w ON wpl.warehouse_id = w.warehouse_id
                LEFT JOIN warehouse_zones wz ON wpl.zone_id = wz.zone_id
                JOIN specs_db sd ON wpl.phone_id = sd.product_id
                WHERE wpl.phone_id = ? AND wpl.warehouse_id = ?
            `;
            const params = [productId, warehouseId];

            if (zoneId) {
                query += ' AND wpl.zone_id = ?';
                params.push(zoneId);
            }

            query += ' ORDER BY wz.zone_type, wpl.aisle, wpl.shelf, wpl.bin';

            const result = await conn.query(query, params);
            return result;
        } finally {
            conn.end();
        }
    }

    /**
     * Update bin location for a product
     */
    async updateBinLocation(productId, warehouseId, zoneId, aisle, shelf, bin) {
        const conn = await this.pool.getConnection();
        try {
            const query = `
                UPDATE warehouse_product_locations 
                SET aisle = ?, shelf = ?, bin = ?, updated_at = NOW()
                WHERE phone_id = ? AND warehouse_id = ? AND zone_id = ?
            `;
            
            const result = await conn.query(query, [aisle, shelf, bin, productId, warehouseId, zoneId]);
            return result.affectedRows > 0;
        } finally {
            conn.end();
        }
    }

    /**
     * Find available bin locations in a zone
     */
    async findAvailableBinLocations(warehouseId, zoneId, limit = 10) {
        const conn = await this.pool.getConnection();
        try {
            // This is a simplified approach - in a real system, you'd have a dedicated bin locations table
            const query = `
                SELECT DISTINCT 
                    wpl.aisle,
                    wpl.shelf,
                    wpl.bin,
                    COUNT(*) as products_in_bin,
                    SUM(wpl.quantity) as total_quantity,
                    wz.capacity_limit
                FROM warehouse_product_locations wpl
                JOIN warehouse_zones wz ON wpl.zone_id = wz.zone_id
                WHERE wpl.warehouse_id = ? AND wpl.zone_id = ?
                    AND wpl.aisle IS NOT NULL 
                    AND wpl.shelf IS NOT NULL 
                    AND wpl.bin IS NOT NULL
                GROUP BY wpl.aisle, wpl.shelf, wpl.bin
                HAVING total_quantity < COALESCE(wz.capacity_limit / 100, 50) -- Assume 1% of zone capacity per bin
                ORDER BY total_quantity ASC
                LIMIT ?
            `;
            
            const result = await conn.query(query, [warehouseId, zoneId, limit]);
            return result;
        } finally {
            conn.end();
        }
    }
}

module.exports = WarehouseService;
