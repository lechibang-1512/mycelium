/**
 * Device Search Service (MongoDB Version)
 * Provides device-centric search across repair jobs and RMAs
 */

const RepairJob = require('../models/RepairJob');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');

class DeviceSearchService {
    constructor(_pool) { }

    async searchDevice(identifier, type = 'auto') {
        const results = {
            identifier,
            search_type: type,
            repair_jobs: [],
            rma_items: [],
            inventory: [],
            summary: { total_repair_jobs: 0, total_rma_items: 0, total_inventory: 0, device_matches: [] }
        };

        // Build search conditions
        const searchConditions = [];
        if (type === 'imei' || type === 'auto') {
            searchConditions.push({ device_imei: identifier });
        }
        if (type === 'serial' || type === 'auto') {
            searchConditions.push({ device_serial_number: identifier });
        }
        if (type === 'auto') {
            searchConditions.push({ device_name: new RegExp(identifier, 'i') });
            searchConditions.push({ 'customer.name': new RegExp(identifier, 'i') });
        }

        // Search repair jobs
        const repairJobs = await RepairJob.find({ $or: searchConditions })
            .sort({ created_at: -1 })
            .limit(50)
            .lean();

        results.repair_jobs = repairJobs.map(rj => ({
            repair_job_id: rj.repair_job_id,
            job_number: rj.job_number,
            device_name: rj.device_name,
            device_imei: rj.device_imei,
            device_serial_number: rj.device_serial_number,
            customer_name: rj.customer?.name,
            status: rj.status,
            created_at: rj.created_at,
            record_type: 'repair_job'
        }));

        // Search inventory (serialized items)
        const invConditions = [];
        if (type === 'imei' || type === 'auto') {
            invConditions.push({ imei_1: identifier });
            invConditions.push({ imei_2: identifier });
        }
        if (type === 'serial' || type === 'auto') {
            invConditions.push({ serial_number: identifier });
        }

        if (invConditions.length > 0) {
            const inventory = await Inventory.find({
                inventory_type: 'serialized',
                $or: invConditions
            }).limit(50).lean();

            // Enrich with product names
            const productIds = [...new Set(inventory.map(i => i.product_id))];
            const products = await Product.find({ product_id: { $in: productIds } }).lean();
            const productMap = {};
            products.forEach(p => { productMap[p.product_id] = p; });

            results.inventory = inventory.map(inv => ({
                id: inv._id,
                serial_number: inv.serial_number,
                imei_1: inv.imei_1,
                imei_2: inv.imei_2,
                status: inv.status,
                warehouse_id: inv.warehouse_id,
                device_name: productMap[inv.product_id]?.device_name,
                device_maker: productMap[inv.product_id]?.device_maker,
                record_type: 'inventory'
            }));
        }

        // Update summary
        results.summary.total_repair_jobs = results.repair_jobs.length;
        results.summary.total_inventory = results.inventory.length;

        // Extract unique device matches
        const deviceSet = new Set();
        [...results.repair_jobs, ...results.inventory].forEach(item => {
            if (item.device_imei) deviceSet.add(`IMEI: ${item.device_imei}`);
            if (item.imei_1) deviceSet.add(`IMEI: ${item.imei_1}`);
            if (item.device_serial_number) deviceSet.add(`Serial: ${item.device_serial_number}`);
            if (item.serial_number) deviceSet.add(`Serial: ${item.serial_number}`);
            if (item.device_name) deviceSet.add(`Device: ${item.device_name}`);
        });
        results.summary.device_matches = Array.from(deviceSet);

        return results;
    }

    async getDeviceSuggestions(partial) {
        if (!partial || partial.length < 2) return [];

        const regex = new RegExp(partial, 'i');

        // Search repair jobs
        const suggestions = await RepairJob.find({
            $or: [
                { device_imei: regex },
                { device_serial_number: regex },
                { device_name: regex }
            ]
        })
            .select('device_imei device_serial_number device_name')
            .limit(10)
            .lean();

        // Also search inventory
        const invSuggestions = await Inventory.find({
            inventory_type: 'serialized',
            $or: [
                { serial_number: regex },
                { imei_1: regex },
                { imei_2: regex }
            ]
        })
            .select('serial_number imei_1 imei_2 product_id')
            .limit(10)
            .lean();

        const combined = [];

        suggestions.forEach(s => {
            combined.push({
                device_imei: s.device_imei,
                device_serial: s.device_serial_number,
                device_name: s.device_name,
                display: `${s.device_name || 'Unknown'} - ${s.device_imei || s.device_serial_number || 'No ID'}`
            });
        });

        invSuggestions.forEach(s => {
            combined.push({
                device_imei: s.imei_1,
                device_serial: s.serial_number,
                display: `Serial: ${s.serial_number || s.imei_1}`
            });
        });

        return combined.slice(0, 10);
    }
}

module.exports = DeviceSearchService;
