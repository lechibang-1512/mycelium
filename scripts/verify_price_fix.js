const mongoose = require('mongoose');
const PhonesService = require('../backend/services/PhonesService');
const Product = require('../backend/models/Product');
const { v4: uuidv4 } = require('uuid');

async function verifyPriceFix() {
    const uri = 'mongodb://lechibang:1212@localhost:27017/mycelium?authSource=admin';

    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const service = new PhonesService();

        const samplePhone = {
            device_name: `Price Test ${uuidv4().substring(0, 4)}`,
            device_maker: 'BenchmarkTest',
            device_price: 1299.99, // Use device_price as per new API contract
            device_type: 'smartphone'
        };

        console.log('Creating phone with price 1299.99...');
        const result = await service.createPhone(samplePhone);
        console.log('Result:', result);

        if (result.success) {
            const savedProduct = await Product.findOne({ product_id: result.product_id }).lean();
            console.log('Saved Product Price (DB):', savedProduct.device_price);

            if (savedProduct.device_price === 1299.99) {
                console.log('SUCCESS: Price correctly saved as device_price.');
            } else {
                console.error('FAILURE: Price is incorrect:', savedProduct.device_price);
            }

            // Verify Service View
            const view = await service.getPhoneById(result.product_id);
            console.log('Service View Price:', view.device_price);
            if (view.device_price === 1299.99) {
                console.log('SUCCESS: Service view returns correct device_price.');
            } else {
                console.error('FAILURE: Service view returns incorrect price:', view.device_price);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

verifyPriceFix();
