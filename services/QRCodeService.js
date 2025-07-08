/**
 * QR Code Service
 * Provides functionality to generate QR codes for inventory items,
 * locations/bins, and scanning capabilities.
 */

const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

class QRCodeService {
    /**
     * Create a new QRCodeService instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            errorCorrectionLevel: 'M', // L, M, Q, H (Low, Medium, Quartile, High)
            type: 'png',
            quality: 0.92,
            margin: 1,
            scale: 4,
            ...options
        };
        
        // Ensure the QR code storage directory exists
        this.storageDir = path.join(__dirname, '..', 'public', 'qrcodes');
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
    }
    
    /**
     * Generate a QR code data URL
     * @param {string} data - The data to encode in the QR code
     * @returns {Promise<string>} The QR code as a data URL
     */
    async generateQRCodeDataURL(data) {
        try {
            return await QRCode.toDataURL(data, this.options);
        } catch (error) {
            console.error('Error generating QR code data URL:', error);
            throw error;
        }
    }
    
    /**
     * Generate and save a QR code image
     * @param {string} data - The data to encode in the QR code
     * @param {string} filename - The filename for the saved QR code
     * @returns {Promise<string>} The path to the saved QR code
     */
    async generateAndSaveQRCode(data, filename) {
        try {
            const filePath = path.join(this.storageDir, `${filename}.png`);
            await QRCode.toFile(filePath, data, this.options);
            return `/qrcodes/${filename}.png`; // Return public URL path
        } catch (error) {
            console.error('Error generating QR code file:', error);
            throw error;
        }
    }
    
    /**
     * Generate a product QR code
     * @param {Object} product - The product data
     * @returns {Promise<string>} The path to the saved QR code
     */
    async generateProductQRCode(product) {
        const data = JSON.stringify({
            type: 'product',
            id: product.product_id,
            name: product.device_name,
            maker: product.device_maker,
            timestamp: new Date().toISOString()
        });
        
        return this.generateAndSaveQRCode(data, `product_${product.product_id}`);
    }
    
    /**
     * Generate a location/bin QR code
     * @param {Object} location - The location/bin data
     * @returns {Promise<string>} The path to the saved QR code
     */
    async generateLocationQRCode(location) {
        const data = JSON.stringify({
            type: 'location',
            id: location.id,
            name: location.name,
            warehouse: location.warehouse_id,
            timestamp: new Date().toISOString()
        });
        
        return this.generateAndSaveQRCode(data, `location_${location.id}`);
    }
    
    /**
     * Generate a batch QR code for inventory movement
     * @param {Object} batch - The batch movement data
     * @returns {Promise<string>} The path to the saved QR code
     */
    async generateBatchQRCode(batch) {
        const data = JSON.stringify({
            type: 'batch',
            id: batch.id,
            product_id: batch.product_id,
            quantity: batch.quantity,
            created: batch.created_at,
            timestamp: new Date().toISOString()
        });
        
        return this.generateAndSaveQRCode(data, `batch_${batch.id}`);
    }
    
    /**
     * Generate a transaction QR code
     * @param {Object} transaction - The transaction data
     * @returns {Promise<string>} The path to the saved QR code
     */
    async generateTransactionQRCode(transaction) {
        const data = JSON.stringify({
            type: 'transaction',
            id: transaction.log_id || transaction.id,
            transaction_type: transaction.transaction_type,
            timestamp: new Date().toISOString()
        });
        
        return this.generateAndSaveQRCode(data, `transaction_${transaction.log_id || transaction.id}`);
    }
    
    /**
     * Parse QR code data
     * @param {string} qrData - The data from the scanned QR code
     * @returns {Object|null} The parsed data or null if invalid
     */
    parseQRCodeData(qrData) {
        try {
            return JSON.parse(qrData);
        } catch (error) {
            console.error('Error parsing QR code data:', error);
            return null;
        }
    }
}

module.exports = QRCodeService;
