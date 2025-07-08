/**
 * QR Code Routes
 * Handles routes for QR code generation and processing
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated, isStaffOrAdmin } = require('../middleware/auth');
const QRCodeService = require('../services/QRCodeService');

module.exports = (pool, suppliersPool, convertBigIntToNumber) => {
    const qrCodeService = new QRCodeService();

    // Route to display QR code scanner interface
    router.get('/qrcode/scan', isAuthenticated, (req, res) => {
        res.render('qrcode-scanner', {
            title: 'QR Code Scanner',
            csrfToken: req.csrfToken()
        });
    });
    
    // Route to display QR code generator interface
    router.get('/qrcode/generate', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            // Get all products for generating product QR codes
            const products = await conn.query('SELECT product_id, device_name, device_maker FROM specs_db ORDER BY device_name');
            
            res.render('qrcode-generator', {
                title: 'Generate QR Codes',
                products: convertBigIntToNumber(products),
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });
    
    // API route to generate a product QR code
    router.post('/api/qrcode/product/:id', isStaffOrAdmin, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            
            const productId = req.params.id;
            const [product] = await conn.query('SELECT * FROM specs_db WHERE product_id = ?', [productId]);
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            const qrCodeUrl = await qrCodeService.generateProductQRCode(product);
            
            res.json({
                success: true,
                qrCodeUrl,
                product: {
                    id: product.product_id,
                    name: product.device_name,
                    maker: product.device_maker
                }
            });
        } catch (err) {
            console.error('Error generating product QR code:', err);
            res.status(500).json({
                success: false,
                message: 'Error generating QR code',
                error: err.message
            });
        } finally {
            if (conn) conn.release();
        }
    });
    
    // API route to generate a location QR code
    router.post('/api/qrcode/location/:id', isStaffOrAdmin, async (req, res, next) => {
        try {
            const locationId = req.params.id;
            const location = req.body;
            
            if (!location.name || !location.warehouse_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing location information'
                });
            }
            
            // Construct location object
            const locationObj = {
                id: locationId,
                name: location.name,
                warehouse_id: location.warehouse_id
            };
            
            const qrCodeUrl = await qrCodeService.generateLocationQRCode(locationObj);
            
            res.json({
                success: true,
                qrCodeUrl,
                location: locationObj
            });
        } catch (err) {
            console.error('Error generating location QR code:', err);
            res.status(500).json({
                success: false,
                message: 'Error generating QR code',
                error: err.message
            });
        }
    });
    
    // API route to process a scanned QR code
    router.post('/api/qrcode/process', isAuthenticated, async (req, res, next) => {
        try {
            const { qrData } = req.body;
            
            if (!qrData) {
                return res.status(400).json({
                    success: false,
                    message: 'No QR code data provided'
                });
            }
            
            // Parse the QR code data
            const parsedData = qrCodeService.parseQRCodeData(qrData);
            
            if (!parsedData) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid QR code data format'
                });
            }
            
            // Process based on QR code type
            switch (parsedData.type) {
                case 'product':
                    return res.json({
                        success: true,
                        action: 'redirect',
                        url: `/phones/${parsedData.id}`,
                        data: parsedData
                    });
                    
                case 'location':
                    return res.json({
                        success: true,
                        action: 'redirect',
                        url: `/inventory/location/${parsedData.id}`,
                        data: parsedData
                    });
                    
                case 'batch':
                case 'transaction':
                    return res.json({
                        success: true,
                        action: 'show',
                        data: parsedData
                    });
                    
                default:
                    return res.json({
                        success: true,
                        action: 'display',
                        data: parsedData
                    });
            }
        } catch (err) {
            console.error('Error processing QR code:', err);
            res.status(500).json({
                success: false,
                message: 'Error processing QR code',
                error: err.message
            });
        }
    });
    
    return router;
};
