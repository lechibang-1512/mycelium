#!/usr/bin/env node

/**
 * Test Suite Runner
 * Runs all test scripts from any directory within the project
 * Can be run from anywhere within the project directory
 */

// Initialize project environment
const { initializeProject, getProjectPath } = require('./utils-project-root');
const { projectRoot } = initializeProject({ verbose: false, requireEnv: false });

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIGS = [
    {
        name: 'Environment Variables',
        script: 'utils-verify-env.js',
        description: 'Verify all required environment variables are set',
        required: true,
        timeout: 10000
    },
    {
        name: 'Database Setup',
        script: 'setup-databases.js',
        description: 'Set up all required databases with schemas',
        required: false,
        timeout: 60000,
        skipInQuick: true
    },
    {
        name: 'Admin User Creation',
        script: 'create-admin-user.js',
        description: 'Create admin user account',
        required: false,
        timeout: 30000,
        skipInQuick: true
    },
    {
        name: 'CSRF Protection',
        script: 'test-csrf.js',
        description: 'Test CSRF token generation and validation',
        required: true,
        timeout: 15000,
        requiresServer: true
    },
    {
        name: 'Admin Login',
        script: 'test-admin-login.js',
        description: 'Test admin user login functionality',
        required: true,
        timeout: 15000,
        requiresServer: true
    },
    {
        name: 'Inactive User Login',
        script: 'test-inactive-login.js',
        description: 'Test that inactive users cannot login',
        required: true,
        timeout: 15000,
        requiresServer: true
    },
    {
        name: 'User Creation Flow',
        script: 'test-user-creation.js',
        description: 'Test complete user creation workflow',
        required: true,
        timeout: 20000,
        requiresServer: true
    },
    {
        name: 'Warehouse Service',
        script: 'test-warehouse.js',
        description: 'Test warehouse management functionality',
        required: false,
        timeout: 30000
    },
    {
        name: 'URL Validation Security',
        script: 'test-url-validation.js',
        description: 'Test secure URL validation (CVE: GHSA-9965-vmph-33xx)',
        required: true,
        timeout: 10000
    }
];

/**
 * Run a single test script
 */
async function runTest(testConfig) {
    const scriptPath = getProjectPath(`scripts/${testConfig.script}`);
    
    if (!fs.existsSync(scriptPath)) {
        return {
            name: testConfig.name,
            success: false,
            error: `Script not found: ${testConfig.script}`,
            duration: 0
        };
    }
    
    const startTime = Date.now();
    
    return new Promise((resolve) => {
        const child = spawn('node', [scriptPath], {
            cwd: projectRoot,
            stdio: 'pipe',
            timeout: testConfig.timeout
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            const duration = Date.now() - startTime;
            resolve({
                name: testConfig.name,
                success: code === 0,
                error: code !== 0 ? (stderr || 'Process failed') : null,
                output: stdout,
                duration
            });
        });
        
        child.on('error', (err) => {
            const duration = Date.now() - startTime;
            resolve({
                name: testConfig.name,
                success: false,
                error: err.message,
                duration
            });
        });
        
        // Handle timeout
        setTimeout(() => {
            if (!child.killed) {
                child.kill('SIGTERM');
                const duration = Date.now() - startTime;
                resolve({
                    name: testConfig.name,
                    success: false,
                    error: 'Test timed out',
                    duration
                });
            }
        }, testConfig.timeout);
    });
}

/**
 * Check if server is running
 */
async function checkServerRunning() {
    const http = require('http');
    
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/',
            method: 'GET',
            timeout: 5000
        }, (res) => {
            resolve(res.statusCode < 500);
        });
        
        req.on('error', () => {
            resolve(false);
        });
        
        req.on('timeout', () => {
            resolve(false);
        });
        
        req.end();
    });
}

/**
 * Main test runner
 */
async function runAllTests(options = {}) {
    const { quick = false, skipServerTests = false, verbose = false } = options;
    
    console.log('🧪 Test Suite Runner');
    console.log('===================');
    console.log(`📁 Project root: ${projectRoot}`);
    console.log(`⚙️  Quick mode: ${quick ? 'enabled' : 'disabled'}`);
    console.log(`🌐 Server tests: ${skipServerTests ? 'disabled' : 'enabled'}`);
    console.log('');
    
    // Check if server is needed and running
    let serverRunning = false;
    const serverTests = TEST_CONFIGS.filter(test => test.requiresServer);
    
    if (serverTests.length > 0 && !skipServerTests) {
        console.log('🔍 Checking server status...');
        serverRunning = await checkServerRunning();
        
        if (!serverRunning) {
            console.log('⚠️  Server is not running. Server-dependent tests will be skipped.');
            console.log('   To run server tests, start the server with: npm run dev');
            console.log('');
        } else {
            console.log('✅ Server is running');
            console.log('');
        }
    }
    
    // Filter tests based on options
    let testsToRun = TEST_CONFIGS.filter(test => {
        if (quick && test.skipInQuick) return false;
        if (skipServerTests && test.requiresServer) return false;
        if (test.requiresServer && !serverRunning) return false;
        return true;
    });
    
    console.log(`📋 Running ${testsToRun.length} tests...\n`);
    
    const results = [];
    
    for (const [index, testConfig] of testsToRun.entries()) {
        console.log(`${index + 1}/${testsToRun.length} 🧪 ${testConfig.name}`);
        console.log(`   ${testConfig.description}`);
        
        const result = await runTest(testConfig);
        results.push(result);
        
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const duration = result.duration < 1000 ? `${result.duration}ms` : `${(result.duration / 1000).toFixed(1)}s`;
        
        console.log(`   ${status} (${duration})`);
        
        if (!result.success) {
            console.log(`   ❌ Error: ${result.error}`);
            if (verbose && result.output) {
                console.log(`   📄 Output: ${result.output.substring(0, 200)}...`);
            }
        }
        
        console.log('');
    }
    
    // Summary
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('📊 Test Results Summary');
    console.log('======================');
    console.log(`   Total tests: ${results.length}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏱️  Total time: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log('');
    
    if (failed > 0) {
        console.log('❌ Failed tests:');
        results.filter(r => !r.success).forEach(result => {
            console.log(`   • ${result.name}: ${result.error}`);
        });
        console.log('');
    }
    
    // Required test failures
    const requiredFailures = results.filter(r => !r.success && 
        testsToRun.find(t => t.script === r.name.toLowerCase().replace(/\s+/g, '-') + '.js')?.required
    );
    
    if (requiredFailures.length > 0) {
        console.log('🚨 Critical failures detected in required tests!');
        console.log('   Please fix these issues before proceeding.');
        process.exit(1);
    } else if (failed === 0) {
        console.log('🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log('⚠️  Some optional tests failed, but no critical issues detected.');
        process.exit(0);
    }
}

/**
 * CLI interface
 */
function main() {
    const args = process.argv.slice(2);
    const options = {
        quick: args.includes('--quick') || args.includes('-q'),
        skipServerTests: args.includes('--no-server') || args.includes('-n'),
        verbose: args.includes('--verbose') || args.includes('-v')
    };
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('🧪 Test Suite Runner');
        console.log('');
        console.log('Usage: node run-all-tests.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --quick, -q         Run only essential tests (skip setup scripts)');
        console.log('  --no-server, -n     Skip server-dependent tests');
        console.log('  --verbose, -v       Show detailed output from failed tests');
        console.log('  --help, -h          Show this help message');
        console.log('');
        console.log('Examples:');
        console.log('  node run-all-tests.js              # Run all tests');
        console.log('  node run-all-tests.js --quick      # Run only essential tests');
        console.log('  node run-all-tests.js --no-server  # Skip server tests');
        console.log('');
        process.exit(0);
    }
    
    runAllTests(options).catch(error => {
        console.error('❌ Test runner failed:', error.message);
        process.exit(1);
    });
}

if (require.main === module) {
    main();
}

module.exports = { runAllTests, runTest };
