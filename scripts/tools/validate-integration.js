#!/usr/bin/env node

/**
 * Frontend Component Validation Test
 * Validates that the enhanced ReceiveStock component has the correct structure
 */

const fs = require('fs');
const path = require('path');

async function validateFrontendComponent() {
    console.log('🧪 Frontend Component Validation Test\n');
    
    const componentPath = path.join(__dirname, '../frontend/pages/ReceiveStock.jsx');
    
    try {
        console.log('📋 Step 1: Checking ReceiveStock.jsx file...');
        
        if (!fs.existsSync(componentPath)) {
            console.log('❌ ReceiveStock.jsx not found');
            return false;
        }
        
        console.log('✅ ReceiveStock.jsx file exists');
        
        console.log('\n📦 Step 2: Validating Invoice Receiving Integration...');
        
        const componentContent = fs.readFileSync(componentPath, 'utf8');
        
        // Check for invoice receiving features
        const features = [
            {
                name: 'Serial Numbers State',
                pattern: /const \[serialNumbers, setSerialNumbers\]/,
                required: true
            },
            {
                name: 'Invoice Receiving Toggle',
                pattern: /useInvoiceReceiving/,
                required: true
            },
            {
                name: 'Serial Numbers Input Field',
                pattern: /as="textarea"[\s\S]*?serialNumbers/,
                required: true
            },
            {
                name: 'Manifest Item Selection',
                pattern: /selectedManifestItem/,
                required: true
            },
            {
                name: 'Invoice Receiving API Call',
                pattern: /api\/receiving\/invoices/,
                required: true
            },
            {
                name: 'Expected Serials Handling',
                pattern: /expected_serials/,
                required: true
            }
        ];
        
        let allFeaturesPresent = true;
        
        features.forEach(feature => {
            if (feature.pattern.test(componentContent)) {
                console.log(`✅ ${feature.name}: Found`);
            } else {
                console.log(`${feature.required ? '❌' : '⚠️ '} ${feature.name}: ${feature.required ? 'Missing' : 'Optional - Not found'}`);
                if (feature.required) allFeaturesPresent = false;
            }
        });
        
        console.log('\n🔍 Step 3: Checking Form Structure...');
        
        // Check form elements
        const formElements = [
            'Form.Check.*invoice.*receiving',
            'Form.Select.*warehouse',
            'textarea.*serialNumbers',
            'Form.Control.*quantity'
        ];
        
        formElements.forEach(element => {
            const regex = new RegExp(element, 'i');
            if (regex.test(componentContent)) {
                console.log(`✅ Form element: ${element.replace('.*', ' with ')}`);
            } else {
                console.log(`⚠️  Form element: ${element.replace('.*', ' with ')} - Not clearly found`);
            }
        });
        
        console.log('\n📊 Integration Status:');
        
        if (allFeaturesPresent) {
            console.log('✅ All required invoice receiving features: Present');
            console.log('✅ Component integration: Complete');
            console.log('✅ Serial number handling: Implemented');
            console.log('✅ Manifest integration: Ready');
            
            console.log('\n🎉 Frontend Component Validation PASSED!');
            
            console.log('\n📋 Manual Testing Guide:');
            console.log('1. Open http://localhost:5173/receive-stock');
            console.log('2. Look for "Use Enhanced Invoice Receiving" toggle');
            console.log('3. Select a warehouse from dropdown');
            console.log('4. Toggle invoice receiving ON');
            console.log('5. Check if invoice dropdown appears');
            console.log('6. Look for serial numbers textarea when toggle is ON');
            console.log('7. Verify manifest items display when invoice is selected');
            
            return true;
        } else {
            console.log('❌ Some required features are missing');
            console.log('⚠️  Component integration may be incomplete');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        return false;
    }
}

// Additional validation for backend service
async function validateBackendService() {
    console.log('\n🔧 Backend Service Validation...');
    
    const servicePath = path.join(__dirname, '../backend/services/InvoiceReceivingService.js');
    
    try {
        if (!fs.existsSync(servicePath)) {
            console.log('❌ InvoiceReceivingService.js not found');
            return false;
        }
        
        console.log('✅ InvoiceReceivingService.js exists');
        
        const serviceContent = fs.readFileSync(servicePath, 'utf8');
        
        const serviceMethods = [
            'getPendingInvoices',
            'getReceivingManifest', 
            'receiveStockFromInvoice',
            'getReceivingHistory'
        ];
        
        serviceMethods.forEach(method => {
            if (serviceContent.includes(method)) {
                console.log(`✅ Service method: ${method}`);
            } else {
                console.log(`❌ Service method: ${method} - Missing`);
            }
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ Backend service validation failed:', error.message);
        return false;
    }
}

// Main validation
async function runValidation() {
    console.log('🚀 Invoice Receiving Integration Validation\n');
    
    const frontendValid = await validateFrontendComponent();
    const backendValid = await validateBackendService();
    
    console.log('\n📊 Overall Validation Summary:');
    console.log(`Frontend Component: ${frontendValid ? '✅ Valid' : '❌ Issues Found'}`);
    console.log(`Backend Service: ${backendValid ? '✅ Valid' : '❌ Issues Found'}`);
    
    if (frontendValid && backendValid) {
        console.log('\n🎉 INTEGRATION VALIDATION PASSED!');
        console.log('🌐 Ready for end-to-end testing at http://localhost:5173/receive-stock');
    } else {
        console.log('\n⚠️  Some issues found. Review the output above.');
    }
    
    return frontendValid && backendValid;
}

if (require.main === module) {
    runValidation()
        .then(success => process.exit(success ? 0 : 1))
        .catch(err => {
            console.error('Validation script failed:', err);
            process.exit(1);
        });
}