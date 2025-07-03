const fs = require('fs');
const path = require('path');

class ReceiptService {
    constructor() {
        this.config = {
            COMPANY_NAME: 'InventoryApp Solutions',
            COMPANY_ADDRESS: '123 Business Street, City, State 12345',
            COMPANY_PHONE: '+1 (555) 123-4567',
            COMPANY_EMAIL: 'info@inventoryapp.com',
            TAX_RATE: 0.10, // 10% default tax rate
            VAT_RATE: 0.20  // 20% default VAT rate
        };
    }

    /**
     * Generate a receipt for stock receipt (purchase)
     */
    generateReceiveReceipt(data) {
        const {
            receiptId,
            date,
            phone,
            supplier,
            quantity,
            unitPrice,
            vatRate = this.config.VAT_RATE,
            notes = ''
        } = data;

        const subtotal = quantity * unitPrice;
        const vatAmount = subtotal * vatRate;
        const total = subtotal + vatAmount;

        const receipt = {
            type: 'PURCHASE_RECEIPT',
            receiptId,
            date: this.formatDate(date),
            company: {
                name: this.config.COMPANY_NAME,
                address: this.config.COMPANY_ADDRESS,
                phone: this.config.COMPANY_PHONE,
                email: this.config.COMPANY_EMAIL
            },
            supplier: {
                name: supplier.name,
                contactPerson: supplier.contact_person,
                email: supplier.contact_email || supplier.email,
                phone: supplier.phone,
                address: supplier.address
            },
            items: [{
                description: `${phone.sm_maker} ${phone.sm_name}`,
                specifications: this.formatSpecs(phone),
                quantity,
                unitPrice: this.formatCurrency(unitPrice),
                lineTotal: this.formatCurrency(subtotal)
            }],
            financials: {
                subtotal: this.formatCurrency(subtotal),
                vatRate: `${(vatRate * 100).toFixed(1)}%`,
                vatAmount: this.formatCurrency(vatAmount),
                total: this.formatCurrency(total)
            },
            notes,
            metadata: {
                phoneId: phone.id,
                supplierId: supplier.supplier_id,
                generatedAt: new Date().toISOString()
            }
        };

        return receipt;
    }

    /**
     * Generate a receipt for stock sale
     */
    generateSaleReceipt(data) {
        const {
            receiptId,
            date,
            phone,
            quantity,
            unitPrice,
            taxRate = this.config.TAX_RATE,
            customerInfo = {},
            notes = ''
        } = data;

        const subtotal = quantity * unitPrice;
        const taxAmount = subtotal * taxRate;
        const total = subtotal + taxAmount;

        const receipt = {
            type: 'SALES_RECEIPT',
            receiptId,
            date: this.formatDate(date),
            company: {
                name: this.config.COMPANY_NAME,
                address: this.config.COMPANY_ADDRESS,
                phone: this.config.COMPANY_PHONE,
                email: this.config.COMPANY_EMAIL
            },
            customer: {
                name: customerInfo.name || 'Walk-in Customer',
                email: customerInfo.email || '',
                phone: customerInfo.phone || '',
                address: customerInfo.address || ''
            },
            items: [{
                description: `${phone.sm_maker} ${phone.sm_name}`,
                specifications: this.formatSpecs(phone),
                quantity,
                unitPrice: this.formatCurrency(unitPrice),
                lineTotal: this.formatCurrency(subtotal)
            }],
            financials: {
                subtotal: this.formatCurrency(subtotal),
                taxRate: `${(taxRate * 100).toFixed(1)}%`,
                taxAmount: this.formatCurrency(taxAmount),
                total: this.formatCurrency(total)
            },
            notes,
            metadata: {
                phoneId: phone.id,
                generatedAt: new Date().toISOString()
            }
        };

        return receipt;
    }

    /**
     * Format phone specifications for receipt
     */
    formatSpecs(phone) {
        const specs = [];
        if (phone.ram) specs.push(`RAM: ${phone.ram}`);
        if (phone.rom) specs.push(`Storage: ${phone.rom}`);
        if (phone.color) specs.push(`Color: ${phone.color}`);
        if (phone.display_size) specs.push(`Display: ${phone.display_size}"`);
        
        return specs.join(', ');
    }

    /**
     * Format currency for display
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    /**
     * Format date for display
     */
    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }

    /**
     * Generate receipt ID
     */
    generateReceiptId(type = 'REC') {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `${type}-${timestamp}-${random}`;
    }

    /**
     * Convert receipt to HTML for display/printing
     */
    generateHTML(receipt) {
        const isReceive = receipt.type === 'PURCHASE_RECEIPT';
        const entityInfo = isReceive ? receipt.supplier : receipt.customer;
        const entityLabel = isReceive ? 'Supplier' : 'Customer';

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - ${receipt.receiptId}</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #ddd; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
        .header p { margin: 5px 0 0 0; opacity: 0.9; }
        .receipt-info { background: #f8f9fa; padding: 20px; display: flex; justify-content: space-between; }
        .receipt-info div { flex: 1; }
        .receipt-info h3 { margin: 0 0 10px 0; color: #495057; font-size: 16px; }
        .content { padding: 30px; }
        .section { margin-bottom: 30px; }
        .section h3 { color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px; margin-bottom: 15px; }
        .address { line-height: 1.6; color: #6c757d; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { padding: 15px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .items-table th { background: #f8f9fa; font-weight: 600; color: #495057; }
        .items-table .specs { font-size: 12px; color: #6c757d; margin-top: 5px; }
        .financial-summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .financial-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .financial-row.total { border-top: 2px solid #dee2e6; margin-top: 10px; padding-top: 15px; font-weight: bold; font-size: 18px; color: #495057; }
        .notes { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; background: #f8f9fa; color: #6c757d; font-size: 12px; }
        .print-btn { background: #28a745; color: white; border: none; padding: 12px 30px; border-radius: 5px; cursor: pointer; margin: 20px; font-size: 16px; }
        .print-btn:hover { background: #218838; }
        @media print {
            .print-btn, .no-print { display: none; }
            body { margin: 0; padding: 0; }
            .receipt { border: none; box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <h1>${receipt.company.name}</h1>
            <p>${receipt.company.address}</p>
            <p>${receipt.company.phone} | ${receipt.company.email}</p>
        </div>

        <div class="receipt-info">
            <div>
                <h3>${isReceive ? 'Purchase Receipt' : 'Sales Receipt'}</h3>
                <strong>Receipt #: ${receipt.receiptId}</strong><br>
                <strong>Date: ${receipt.date}</strong>
            </div>
            <div style="text-align: right;">
                <h3>${entityLabel} Information</h3>
                <strong>${entityInfo.name}</strong><br>
                ${entityInfo.contactPerson ? `Contact: ${entityInfo.contactPerson}<br>` : ''}
                ${entityInfo.email ? `Email: ${entityInfo.email}<br>` : ''}
                ${entityInfo.phone ? `Phone: ${entityInfo.phone}` : ''}
            </div>
        </div>

        <div class="content">
            <div class="section">
                <h3>Items</h3>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${receipt.items.map(item => `
                        <tr>
                            <td>
                                <strong>${item.description}</strong>
                                ${item.specifications ? `<div class="specs">${item.specifications}</div>` : ''}
                            </td>
                            <td>${item.quantity}</td>
                            <td>${item.unitPrice}</td>
                            <td>${item.lineTotal}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="financial-summary">
                <div class="financial-row">
                    <span>Subtotal:</span>
                    <span>${receipt.financials.subtotal}</span>
                </div>
                <div class="financial-row">
                    <span>${isReceive ? 'VAT' : 'Tax'} (${isReceive ? receipt.financials.vatRate : receipt.financials.taxRate}):</span>
                    <span>${isReceive ? receipt.financials.vatAmount : receipt.financials.taxAmount}</span>
                </div>
                <div class="financial-row total">
                    <span>Total Amount:</span>
                    <span>${receipt.financials.total}</span>
                </div>
            </div>

            ${receipt.notes ? `
            <div class="notes">
                <strong>Notes:</strong><br>
                ${receipt.notes}
            </div>
            ` : ''}
        </div>

        <div class="footer">
            <p>Receipt generated on ${new Date().toLocaleString()}</p>
            <p>Thank you for your business!</p>
        </div>
    </div>

    <div class="no-print" style="text-align: center;">
        <button class="print-btn" onclick="window.print()">
            <i class="fas fa-print"></i> Print Receipt
        </button>
        <button class="print-btn" style="background: #6c757d; margin-left: 10px;" onclick="window.close()">
            <i class="fas fa-times"></i> Close
        </button>
    </div>
</body>
</html>`;
    }

    /**
     * Save receipt to database
     */
    async saveReceipt(conn, receipt, transactionData) {
        const receiptData = {
            receipt_id: receipt.receiptId,
            receipt_type: receipt.type,
            receipt_data: JSON.stringify(receipt),
            phone_id: receipt.metadata.phoneId,
            supplier_id: receipt.metadata.supplierId || null,
            transaction_date: new Date(),
            subtotal: this.parseAmount(receipt.financials.subtotal),
            tax_amount: this.parseAmount(receipt.financials.taxAmount || receipt.financials.vatAmount),
            total_amount: this.parseAmount(receipt.financials.total),
            notes: receipt.notes || null
        };

        const query = `
            INSERT INTO receipts (
                receipt_id, receipt_type, receipt_data, phone_id, supplier_id, 
                transaction_date, subtotal, tax_amount, total_amount, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            receiptData.receipt_id,
            receiptData.receipt_type,
            receiptData.receipt_data,
            receiptData.phone_id,
            receiptData.supplier_id,
            receiptData.transaction_date,
            receiptData.subtotal,
            receiptData.tax_amount,
            receiptData.total_amount,
            receiptData.notes
        ];

        await conn.query(query, values);
        return receiptData.receipt_id;
    }

    /**
     * Parse currency amount back to number
     */
    parseAmount(currencyString) {
        return parseFloat(currencyString.replace(/[$,]/g, ''));
    }

    /**
     * Get receipt by ID
     */
    async getReceipt(conn, receiptId) {
        const result = await conn.query('SELECT * FROM receipts WHERE receipt_id = ?', [receiptId]);
        if (result.length === 0) return null;
        
        const receiptRecord = result[0];
        
        // Handle the receipt_data based on its type
        let parsedData;
        if (typeof receiptRecord.receipt_data === 'string') {
            parsedData = JSON.parse(receiptRecord.receipt_data);
        } else {
            // It's already an object
            parsedData = receiptRecord.receipt_data;
        }
        
        return {
            ...receiptRecord,
            receipt_data: parsedData
        };
    }
}

module.exports = ReceiptService;
