const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const Ajv = require('ajv');
const fs = require('fs');
const path = require('path');

class InvoiceParser {
    constructor() {
        this.xmlParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            allowBooleanAttributes: true,
            parseAttributeValue: true
        });

        this.xmlBuilder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            format: true
        });

        this.ajv = new Ajv({ allErrors: true });
        this.schemaPath = path.join(__dirname, '../../templates/invoice_schema.json');

        // Load schema if available
        try {
            if (fs.existsSync(this.schemaPath)) {
                this.schema = JSON.parse(fs.readFileSync(this.schemaPath, 'utf-8'));
                this.validate = this.ajv.compile(this.schema);
            }
        } catch (error) {
            console.warn('Could not load invoice schema:', error.message);
        }
    }

    /**
     * Parse invoice from various formats (XML, JSON, CSV)
     * @param {string} content - Raw content
     * @param {string} format - Format type ('xml', 'json', 'csv', 'auto')
     * @returns {Object} Parsed invoice data
     */
    async parse(content, format = 'auto') {
        try {
            // Auto-detect format if not specified
            if (format === 'auto') {
                format = this.detectFormat(content);
            }

            let parsedData;
            switch (format.toLowerCase()) {
                case 'xml':
                    parsedData = this.parseXML(content);
                    break;
                case 'json':
                    parsedData = this.parseJSON(content);
                    break;
                case 'csv':
                    parsedData = this.parseCSV(content);
                    break;
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            // Validate against schema if available
            // TODO: Re-enable schema validation after fixing AJV null handling
            /*
            if (this.validate) {
                const valid = this.validate(parsedData);
                if (!valid) {
                    const errors = this.validate.errors.map(err =>
                        `${err.instancePath} ${err.message}`
                    ).join('; ');
                    throw new Error(`Validation failed: ${errors}`);
                }
            }
            */

            // Normalize the data structure
            return this.normalizeInvoiceData(parsedData);

        } catch (error) {
            throw new Error(`Invoice parsing failed: ${error.message}`);
        }
    }

    /**
     * Detect format from content
     */
    detectFormat(content) {
        const trimmed = content.trim();

        if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
            return 'xml';
        }

        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                JSON.parse(trimmed);
                return 'json';
            } catch {
                // Not valid JSON
            }
        }

        // Check for CSV patterns (comma-separated values with headers)
        const lines = trimmed.split('\n').filter(line => line.trim());
        if (lines.length >= 2) {
            const firstLine = lines[0].toLowerCase();
            if (firstLine.includes('product') && firstLine.includes('quantity') && firstLine.includes('price')) {
                return 'csv';
            }
        }

        throw new Error('Could not auto-detect invoice format');
    }

    /**
     * Parse XML invoice
     */
    parseXML(xmlContent) {
        try {
            const jsonObj = this.xmlParser.parse(xmlContent);

            // Handle different XML root structures (camelCase, Vietnamese, and snake_case/lowercase)
            const root = jsonObj.Invoice || jsonObj.invoice || jsonObj.HDon || jsonObj;

            return {
                invoice: {
                    generalInfo: this.extractGeneralInfo(root),
                    seller: this.extractSellerInfo(root),
                    summary: this.extractSummary(root),
                    items: this.extractItems(root),
                    notes: root.notes || root.Notes || ''
                }
            };
        } catch (error) {
            throw new Error(`XML parsing failed: ${error.message}`);
        }
    }

    /**
     * Parse JSON invoice
     */
    parseJSON(jsonContent) {
        try {
            return JSON.parse(jsonContent);
        } catch (error) {
            throw new Error(`JSON parsing failed: ${error.message}`);
        }
    }

    /**
     * Parse CSV invoice (basic implementation)
     */
    parseCSV(csvContent) {
        const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length < 2) {
            throw new Error('CSV must have at least header and one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const dataRows = lines.slice(1);

        // Basic CSV structure validation
        const requiredHeaders = ['productname', 'quantity', 'unitprice'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
            throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
        }

        const items = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            const item = {};

            headers.forEach((header, index) => {
                const value = values[index] || '';
                switch (header) {
                    case 'quantity':
                    case 'unitprice':
                    case 'totalamount':
                    case 'taxrate':
                    case 'taxamount':
                    case 'discountamount':
                        item[header] = parseFloat(value) || 0;
                        break;
                    default:
                        item[header] = value;
                }
            });

            return item;
        });

        return {
            invoice: {
                generalInfo: {
                    invoiceNumber: `CSV-${Date.now()}`,
                    date: new Date().toISOString().split('T')[0],
                    currency: 'VND'
                },
                seller: {
                    name: 'Unknown Supplier'
                },
                items: items,
                summary: this.calculateSummaryFromItems(items)
            }
        };
    }

    /**
     * Extract general info from XML
     */
    extractGeneralInfo(root) {
        // Support multiple root structures: camelCase, Vietnamese, or snake_case
        const general = root.GeneralInfo || root.TTChung || root.invoice_header || {};

        return {
            invoiceNumber: general.invoiceNumber || general.SHDon || general.invoice_number,
            pattern: general.pattern || general.KHHDon || general.pattern_number || '01GTKT0/001',
            serial: general.serial || general.KHMSHDon || general.serial_number || 'AA/24P',
            date: this.parseDate(general.date || general.NLap || general.invoice_date),
            dueDate: this.parseDate(general.dueDate || general.due_date),
            currency: general.currency || general.DVTien || 'VND',
            paymentMethod: general.paymentMethod || general.HTHDon || general.payment_method || 'TM/CK'
        };
    }

    /**
     * Extract seller info from XML
     */
    extractSellerInfo(root) {
        // Support multiple seller element names: Seller (camel), NBan (Vietnamese), seller (lowercase)
        const seller = root.Seller || root.NBan || root.seller || {};

        return {
            name: seller.name || seller.Ten,
            taxCode: seller.taxCode || seller.MST || seller.tax_code,
            address: seller.address || seller.DCChi,
            email: seller.email || seller.Email,
            phone: seller.phone || seller.SDThoai
        };
    }

    /**
     * Extract summary from XML
     */
    extractSummary(root) {
        // Support multiple summary element names: Summary, TToan (Vietnamese), totals (snake_case)
        const summary = root.Summary || root.TToan || root.totals || {};

        return {
            subtotal: this.parseNumber(summary.subtotal || summary.TgTCThue),
            taxRate: this.parseNumber(summary.taxRate || summary.TSuat || summary.tax_rate),
            taxAmount: this.parseNumber(summary.taxAmount || summary.TgTThue || summary.total_tax),
            shippingFee: this.parseNumber(summary.shippingFee || 0),
            discountAmount: this.parseNumber(summary.discountAmount || summary.total_discount || 0),
            totalAmount: this.parseNumber(summary.totalAmount || summary.TgTTTBSo || summary.grand_total)
        };
    }

    /**
     * Extract items from XML
     */
    extractItems(root) {
        // Support multiple container names: Items (camel), ChiTiet (Vietnamese), items (snake_case lowercase)
        const itemsContainer = root.Items || root.ChiTiet || root.items || {};
        // Support multiple item element names: Item (camel), HangHoa (Vietnamese), item (lowercase)
        let itemsList = itemsContainer.Item || itemsContainer.HangHoa || itemsContainer.item || [];

        // Ensure it's an array
        if (!Array.isArray(itemsList)) {
            itemsList = [itemsList];
        }

        return itemsList.map(item => ({
            productName: item.productName || item.THHDVu || item.product_name,
            productId: item.productId || item.product_id,  // Capture product_id for linking
            unit: item.unit || item.DVTinh || 'Cái',
            quantity: this.parseNumber(item.quantity || item.SLuong),
            unitPrice: this.parseNumber(item.unitPrice || item.DGia || item.unit_price),
            totalAmount: this.parseNumber(item.totalAmount || item.ThTien || item.line_total),
            taxRate: this.parseNumber(item.taxRate || item.TSuat || item.tax_rate),
            taxAmount: this.parseNumber(item.taxAmount || item.tax_amount),
            discountAmount: this.parseNumber(item.discount || item.discountAmount || item.discount_amount),
            serials: item.serials || item.IMEI || item.imei_numbers || ''
        }));
    }

    /**
     * Normalize invoice data to standard format
     */
    normalizeInvoiceData(data) {
        const invoice = data.invoice || data;

        // Ensure all required fields exist
        const normalized = {
            invoiceNumber: invoice.generalInfo?.invoiceNumber || `AUTO-${Date.now()}`,
            pattern: invoice.generalInfo?.pattern || '01GTKT0/001',
            serial: invoice.generalInfo?.serial || 'AA/24P',
            invoiceDate: this.parseDate(invoice.generalInfo?.date) || new Date().toISOString().split('T')[0],
            dueDate: this.parseDate(invoice.generalInfo?.dueDate) || null,
            currency: invoice.generalInfo?.currency || 'VND',
            paymentMethod: invoice.generalInfo?.paymentMethod || 'TM/CK',
            seller: {
                name: invoice.seller?.name || 'Unknown Supplier',
                taxCode: invoice.seller?.taxCode || null,
                address: invoice.seller?.address || null,
                email: invoice.seller?.email || null,
                phone: invoice.seller?.phone || null
            },
            subtotal: this.parseNumber(invoice.summary?.subtotal),
            taxRate: this.parseNumber(invoice.summary?.taxRate) || 10,
            taxAmount: this.parseNumber(invoice.summary?.taxAmount),
            shippingFee: this.parseNumber(invoice.summary?.shippingFee) || 0,
            discountAmount: this.parseNumber(invoice.summary?.discountAmount) || 0,
            totalAmount: this.parseNumber(invoice.summary?.totalAmount),
            notes: invoice.notes || '',
            items: (invoice.items || []).map(item => ({
                name: item.productName || item.product_name || 'Unknown Product',
                productId: item.productId || item.product_id || null,  // For linking to existing products
                productUuid: item.productId || item.product_id || null,  // Alias for InvoiceImportService
                unit: item.unit || 'Cái',
                quantity: this.parseNumber(item.quantity) || 1,
                unitPrice: this.parseNumber(item.unitPrice || item.unit_price) || 0,
                totalAmount: this.parseNumber(item.totalAmount || item.line_total),
                taxRate: this.parseNumber(item.taxRate || item.tax_rate) || 10,
                taxAmount: this.parseNumber(item.taxAmount || item.tax_amount),
                discountAmount: this.parseNumber(item.discountAmount || item.discount_amount) || 0,
                serials: item.serials || (item.serial_numbers ? item.serial_numbers.join(',') : '')
            }))
        };

        // Auto-calculate missing amounts if possible
        this.autoCalculateAmounts(normalized);

        return normalized;
    }

    /**
     * Auto-calculate missing amounts
     */
    autoCalculateAmounts(invoice) {
        // Calculate item totals if missing
        invoice.items.forEach(item => {
            if (!item.totalAmount && item.quantity && item.unitPrice) {
                item.totalAmount = item.quantity * item.unitPrice;
            }
            if (!item.taxAmount && item.totalAmount && item.taxRate) {
                item.taxAmount = item.totalAmount * (item.taxRate / 100);
            }
        });

        // Calculate summary totals if missing
        if (!invoice.subtotal) {
            invoice.subtotal = invoice.items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
        }

        if (!invoice.taxAmount) {
            invoice.taxAmount = invoice.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
        }

        if (!invoice.totalAmount) {
            invoice.totalAmount = invoice.subtotal + invoice.taxAmount + invoice.shippingFee - invoice.discountAmount;
        }
    }

    /**
     * Calculate summary from items (for CSV import)
     */
    calculateSummaryFromItems(items) {
        const subtotal = items.reduce((sum, item) => sum + (item.totalamount || 0), 0);
        const taxAmount = items.reduce((sum, item) => sum + (item.taxamount || 0), 0);

        return {
            subtotal,
            taxRate: 10,
            taxAmount,
            shippingFee: 0,
            discountAmount: 0,
            totalAmount: subtotal + taxAmount
        };
    }

    /**
     * Parse date string to YYYY-MM-DD format
     */
    parseDate(dateStr) {
        if (!dateStr) return null;

        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return null;

            return date.toISOString().split('T')[0];
        } catch {
            return null;
        }
    }

    /**
     * Parse number safely
     */
    parseNumber(value) {
        if (value === null || value === undefined || value === '') return 0;

        const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : parseFloat(value);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Generate template in specified format
     */
    generateTemplate(format = 'xml', sampleData = {}) {
        const defaultData = {
            invoiceNumber: 'INV-2024-001',
            pattern: '01GTKT0/001',
            serial: 'AA/24P',
            date: new Date().toISOString().split('T')[0],
            currency: 'VND',
            paymentMethod: 'TM/CK',
            seller: {
                name: 'Sample Supplier Co., Ltd',
                taxCode: '0101234567',
                address: '123 Sample Street, District 1, City',
                email: 'invoice@sample.com',
                phone: '0909123456'
            },
            items: [{
                productName: 'Sample Product',
                unit: 'Cái',
                quantity: 1,
                unitPrice: 1000000,
                totalAmount: 1000000,
                taxRate: 10,
                taxAmount: 100000,
                discountAmount: 0,
                serials: 'SAMPLE123456'
            }],
            subtotal: 1000000,
            taxRate: 10,
            taxAmount: 100000,
            shippingFee: 0,
            discountAmount: 0,
            totalAmount: 1100000,
            notes: 'Generated template'
        };

        const data = { ...defaultData, ...sampleData };

        switch (format.toLowerCase()) {
            case 'xml':
                return this.generateXMLTemplate(data);
            case 'json':
                return JSON.stringify({ invoice: data }, null, 2);
            case 'csv':
                return this.generateCSVTemplate(data);
            default:
                throw new Error(`Unsupported template format: ${format}`);
        }
    }

    /**
     * Generate XML template
     */
    generateXMLTemplate(data) {
        const xmlData = {
            Invoice: {
                GeneralInfo: {
                    invoiceNumber: data.invoiceNumber,
                    pattern: data.pattern,
                    serial: data.serial,
                    date: data.date,
                    currency: data.currency,
                    paymentMethod: data.paymentMethod
                },
                Seller: {
                    name: data.seller.name,
                    taxCode: data.seller.taxCode,
                    address: data.seller.address,
                    email: data.seller.email,
                    phone: data.seller.phone
                },
                Summary: {
                    subtotal: data.subtotal,
                    taxRate: data.taxRate,
                    taxAmount: data.taxAmount,
                    shippingFee: data.shippingFee,
                    discountAmount: data.discountAmount,
                    totalAmount: data.totalAmount
                },
                Items: {
                    Item: data.items.map(item => ({
                        productName: item.productName,
                        unit: item.unit,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalAmount: item.totalAmount,
                        taxRate: item.taxRate,
                        taxAmount: item.taxAmount,
                        discountAmount: item.discountAmount,
                        serials: item.serials
                    }))
                }
            }
        };

        return this.xmlBuilder.build(xmlData);
    }

    /**
     * Generate CSV template
     */
    generateCSVTemplate(data) {
        const headers = ['productName', 'unit', 'quantity', 'unitPrice', 'totalAmount', 'taxRate', 'taxAmount', 'discountAmount', 'serials'];
        const rows = data.items.map(item =>
            headers.map(header => item[header] || '').join(',')
        );

        return [headers.join(','), ...rows].join('\n');
    }
}

module.exports = InvoiceParser;