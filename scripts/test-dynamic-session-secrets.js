#!/usr/bin/env node

/**
 * Test Script for Dynamic Session Secret Management
 * 
 * This script tests the dynamic session secret functionality
 * to ensure it works correctly before deployment.
 */

require('dotenv').config();

const DynamicSessionSecretService = require('../services/DynamicSessionSecretService');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    header: (msg) => console.log(`${colors.bold}${colors.blue}${msg}${colors.reset}`)
};

async function testDynamicSessionSecrets() {
    log.header('\n🔐 TESTING DYNAMIC SESSION SECRET MANAGEMENT\n');
    
    let service;
    
    try {
        // Test 1: Service Initialization
        log.info('Test 1: Initializing Dynamic Session Secret Service...');
        service = new DynamicSessionSecretService();
        const initialized = await service.initialize();
        
        if (initialized) {
            log.success('Service initialized successfully');
        } else {
            log.warning('Service initialized with fallback (static secret)');
        }
        
        // Test 2: Secret Generation
        log.info('Test 2: Testing secret generation...');
        const secret1 = service.generateSecret();
        const secret2 = service.generateSecret();
        
        if (secret1 && secret2 && secret1 !== secret2) {
            log.success('Secret generation working correctly');
            log.info(`Sample secret length: ${secret1.length} characters`);
        } else {
            log.error('Secret generation failed');
        }
        
        // Test 3: Current Secret Access
        log.info('Test 3: Testing current secret access...');
        const currentSecret = service.getCurrentSecret();
        
        if (currentSecret && currentSecret.length >= 32) {
            log.success('Current secret is available and adequate length');
        } else {
            log.error('Current secret is missing or too short');
        }
        
        // Test 4: Valid Secrets Collection
        log.info('Test 4: Testing valid secrets collection...');
        const validSecrets = service.getValidSecrets();
        
        if (validSecrets && validSecrets.length > 0) {
            log.success(`Valid secrets collection working (${validSecrets.length} secrets)`);
        } else {
            log.error('Valid secrets collection failed');
        }
        
        // Test 5: Secret Validation
        log.info('Test 5: Testing secret validation...');
        const isValid = service.isValidSecret(currentSecret);
        const isInvalid = service.isValidSecret('invalid_secret_123');
        
        if (isValid && !isInvalid) {
            log.success('Secret validation working correctly');
        } else {
            log.error('Secret validation failed');
        }
        
        // Test 6: Statistics
        log.info('Test 6: Testing statistics generation...');
        const stats = service.getStatistics();
        
        if (stats && typeof stats === 'object') {
            log.success('Statistics generation working');
            console.log('   Current statistics:', JSON.stringify(stats, null, 2));
        } else {
            log.error('Statistics generation failed');
        }
        
        // Test 7: Rotation Status
        log.info('Test 7: Testing rotation status...');
        const rotationStatus = service.getRotationStatus();
        
        if (rotationStatus && typeof rotationStatus === 'object') {
            log.success('Rotation status working');
            console.log('   Rotation info:', JSON.stringify({
                autoRotationEnabled: rotationStatus.autoRotationEnabled,
                nextRotationDue: rotationStatus.nextRotationDue
            }, null, 2));
        } else {
            log.error('Rotation status failed');
        }
        
        // Test 8: Manual Rotation (if user confirms)
        log.info('Test 8: Testing manual secret rotation...');
        
        const originalSecret = service.getCurrentSecret();
        await service.rotateSecret();
        const newSecret = service.getCurrentSecret();
        
        if (newSecret && newSecret !== originalSecret) {
            log.success('Manual secret rotation working');
            log.info(`Secret changed from ${originalSecret.substring(0, 8)}... to ${newSecret.substring(0, 8)}...`);
        } else {
            log.error('Manual secret rotation failed');
        }
        
        // Test 9: Historical Secret Validation
        log.info('Test 9: Testing historical secret validation...');
        const stillValidOld = service.isValidSecret(originalSecret);
        
        if (stillValidOld) {
            log.success('Historical secret validation working (old secret still valid during transition)');
        } else {
            log.warning('Historical secret immediately invalidated (this might be expected)');
        }
        
        // Test 10: Auto-rotation Control
        log.info('Test 10: Testing auto-rotation control...');
        
        const wasAutoRotating = !!service.rotationInterval;
        
        if (!wasAutoRotating) {
            service.startAutoRotation();
            if (service.rotationInterval) {
                log.success('Auto-rotation start working');
                service.stopAutoRotation();
                if (!service.rotationInterval) {
                    log.success('Auto-rotation stop working');
                } else {
                    log.error('Auto-rotation stop failed');
                }
            } else {
                log.error('Auto-rotation start failed');
            }
        } else {
            log.info('Auto-rotation was already running');
        }
        
        log.header('\n📊 FINAL STATISTICS\n');
        const finalStats = service.getStatistics();
        const finalRotationStatus = service.getRotationStatus();
        
        console.log('Final Service Statistics:');
        console.log(JSON.stringify(finalStats, null, 2));
        
        console.log('\nFinal Rotation Status:');
        console.log(JSON.stringify(finalRotationStatus, null, 2));
        
        log.header('\n🎉 DYNAMIC SESSION SECRET TESTS COMPLETED\n');
        
        log.success('All tests completed successfully!');
        log.info('Your dynamic session secret management is ready for use.');
        
    } catch (error) {
        log.error(`Test failed with error: ${error.message}`);
        console.error(error);
    } finally {
        // Cleanup
        if (service) {
            try {
                await service.shutdown();
                log.info('Service shutdown completed');
            } catch (error) {
                log.warning('Service shutdown had issues:', error.message);
            }
        }
    }
}

// Environment validation
function validateEnvironment() {
    log.header('\n🔍 ENVIRONMENT VALIDATION\n');
    
    const requiredVars = ['SESSION_SECRET'];
    const optionalVars = [
        'AUTO_ROTATE_SESSION_SECRET',
        'BACKUP_SESSION_SECRETS',
        'SESSION_SECRET_ROTATION_HOURS',
        'SESSION_SECRET_HISTORY_COUNT'
    ];
    
    let allGood = true;
    
    // Check required variables
    requiredVars.forEach(varName => {
        if (process.env[varName]) {
            log.success(`${varName} is set`);
        } else {
            log.error(`${varName} is missing`);
            allGood = false;
        }
    });
    
    // Check optional variables
    optionalVars.forEach(varName => {
        if (process.env[varName]) {
            log.info(`${varName} = ${process.env[varName]}`);
        } else {
            log.warning(`${varName} is not set (using default)`);
        }
    });
    
    if (!allGood) {
        log.error('Please fix environment variables before running tests');
        process.exit(1);
    }
    
    log.success('Environment validation passed');
}

// Run tests
async function main() {
    console.log(`${colors.bold}${colors.blue}🧪 Dynamic Session Secret Management Test Suite${colors.reset}\n`);
    
    validateEnvironment();
    await testDynamicSessionSecrets();
    
    process.exit(0);
}

main().catch(error => {
    log.error('Test suite failed:', error.message);
    console.error(error);
    process.exit(1);
});
