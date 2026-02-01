/**
 * Invoice Import Service (MongoDB Version)
 * Parses and imports invoices from various formats (XML, JSON, CSV)
 */

const { XMLParser } = require('fast-xml-parser');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

class InvoiceImportService {
    constructor(_pool) {
        try {
            const InvoiceParser = require('./InvoiceParser');
            this.parser = new InvoiceParser();
        } catch {
            this.parser = null;
        }
    }

    async importInvoice(content, format = 'auto', userId = 1) {
        // Detect format if auto
        if (format === 'auto') {
            if (content.trim().startsWith('<?xml') || content.trim().startsWith('<')) {
                format = 'xml';
            } else if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                format = 'json';
            } else {
                format = 'csv';
            }
        }

        // Parse content
        let parsedData;
        if (this.parser) {
            parsedData = await this.parser.parse(content, format);
        } else {
            parsedData = this._simpleParse(content, format);
        }

        // Ensure supplier exists
        let supplierId = null;
        if (parsedData.seller) {
            supplierId = await this._ensureSupplierExists(parsedData.seller);
        }

        // Ensure products exist
        const items = [];
        for (const item of (parsedData.items || [])) {
            const productId = await this._ensureProductExists(item, supplierId);
            items.push({
                product_id: productId,
                description: item.description || item.name,
                quantity: item.quantity || 1,
                unit_price: item.unit_price || item.price || 0,
                total_price: (item.quantity || 1) * (item.unit_price || item.price || 0)
            });
        }

        // Create invoice
        const invoice = await Invoice.create({
            invoice_type: 'supplier',
            invoice_date: parsedData.invoice_date ? new Date(parsedData.invoice_date) : new Date(),
            supplier_id: supplierId,
            supplier_name: parsedData.seller?.name,
            reference_number: parsedData.invoice_number || parsedData.reference,
            items,
            notes: `Imported from ${format.toUpperCase()} format`,
            created_by: userId,
            receiving_status: 'pending'
        });

        return {
            success: true,
            invoice_id: invoice.invoice_id,
            invoice_number: invoice.invoice_number,
            items_imported: items.length
        };
    }

    _simpleParse(content, format) {
        if (format === 'json') {
            return JSON.parse(content);
        } else if (format === 'xml') {
            const parser = new XMLParser({ ignoreAttributes: false });
            return parser.parse(content);
        } else {
            // Basic CSV parsing
            const lines = content.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            const items = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                const item = {};
                headers.forEach((h, idx) => { item[h] = values[idx]?.trim(); });
                items.push(item);
            }
            return { items };
        }
    }

    async _ensureSupplierExists(sellerData) {
        if (!sellerData?.name) return null;

        let supplier = await Supplier.findOne({ name: sellerData.name });
        if (!supplier) {
            supplier = await Supplier.create({
                name: sellerData.name,
                contact_email: sellerData.email,
                phone: sellerData.phone,
                address: sellerData.address,
                is_active: true
            });
        }
        return supplier.supplier_id;
    }

    async _ensureProductExists(item, supplierId) {
        // Try to find by SKU first
        if (item.sku) {
            const existingBySku = await Product.findOne({ sku: item.sku });
            if (existingBySku) return existingBySku.product_id;
        }

        // Try by name
        if (item.name || item.description) {
            const existingByName = await Product.findOne({
                device_name: new RegExp(`^${item.name || item.description}$`, 'i')
            });
            if (existingByName) return existingByName.product_id;
        }

        // Create new product
        const brand = this._extractBrandFromName(item.name || item.description);
        const product = await Product.create({
            product_id: uuidv4(),
            device_name: item.name || item.description,
            device_maker: brand,
            sku: item.sku || uuidv4().substring(0, 8).toUpperCase(),
            device_type: 'general',
            base_price: item.unit_price || item.price || 0,
            supplier_id: supplierId,
            is_active: true
        });

        return product.product_id;
    }

    _extractBrandFromName(productName) {
        if (!productName) return null;

        const brands = [
            'Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Huawei',
            'Sony', 'LG', 'Motorola', 'Nokia', 'Oppo', 'Vivo', 'Realme'
        ];

        const lowerName = productName.toLowerCase();
        for (const brand of brands) {
            if (lowerName.includes(brand.toLowerCase())) {
                return brand;
            }
        }
        return null;
    }
}

module.exports = InvoiceImportService;
