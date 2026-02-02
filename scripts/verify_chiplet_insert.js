const mongoose = require('mongoose');
const PhonesService = require('../backend/services/PhonesService');
const Product = require('../backend/models/Product');
const { v4: uuidv4 } = require('uuid');

async function testChipletInsert() {
    const uri = 'mongodb://lechibang:1212@localhost:27017/mycelium?authSource=admin';

    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const service = new PhonesService();

        const samplePhone = {
            device_name: `Test Phone ${uuidv4().substring(0, 4)}`,
            device_maker: 'BenchmarkTest',
            device_price: 999,
            device_type: 'smartphone',
            attributes: {
                processor: {
                    name: 'Snapdragon 8 Gen 4',
                    manufacturer: 'Qualcomm',
                    cores: [
                        { type: 'Cortex-X4', count: 1, frequency: '3.3GHz' },
                        { type: 'Cortex-A720', count: 5, frequency: '3.2GHz' },
                        { type: 'Cortex-A520', count: 2, frequency: '2.3GHz' }
                    ]
                }
            }
        };

        console.log('Creating phone with chiplet array...');
        const result = await service.createPhone(samplePhone);
        console.log('Creation result:', result);

        if (result.success) {
            console.log('Fetching created phone to verify...');
            // Bypass service 'getPhoneById' slightly to inspect raw attrs if service masks it, 
            // though service.getPhoneById returns raw attributes too.
            // But let's use direct model access to be 100% sure of what's in DB.
            const savedProduct = await Product.findOne({ product_id: result.product_id }).lean();

            console.log('Saved Product ID:', savedProduct.product_id);
            console.log('Saved Processor Attributes:', JSON.stringify(savedProduct.attributes.processor, null, 2));

            const cores = savedProduct.attributes.processor.cores;
            if (Array.isArray(cores) && cores.length === 3) {
                console.log('SUCCESS: "cores" is an array with 3 elements.');
            } else {
                console.error('FAILURE: "cores" is NOT an array or has incorrect length:', cores);
            }
        }

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

testChipletInsert();
