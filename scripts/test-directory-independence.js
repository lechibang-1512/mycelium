#!/usr/bin/env node

/**
 * Test Directory Independence
 * Tests that all scripts can be run from any directory within the project
 * Can be run from anywhere within the project directory
 */

// Initialize project environment
const { initializeProject, getProjectPath } = require('./utils-project-root');
const { projectRoot } = initializeProject({ verbose: false, requireEnv: false });

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Test directories (relative to project root)
const TEST_DIRECTORIES = [
    '.',                    // Project root
    'scripts',              // Scripts directory
    'config',               // Config directory
    'services',             // Services directory
    'views',                // Views directory
    'routes',               // Routes directory
    'middleware',           // Middleware directory
    'public',               // Public directory
    'sql'                   // SQL directory
];

// Scripts to test
const SCRIPTS_TO_TEST = [
    'utils-verify-env.js',
    'utils-project-root.js',
    'utils-empty-file-cleanup.js',
    'test-admin-login.js',
    'test-csrf.js',
    'test-inactive-login.js',
    'test-user-creation.js',
    'test-warehouse.js',
    'create-admin-user.js',
    'setup-databases.js',
    'utils-extract-schema.js'
];

/**
 * Run a script from a specific directory
 */
async function runScriptFromDirectory(scriptName, fromDirectory) {
    const fullFromPath = path.join(projectRoot, fromDirectory);
    const scriptPath = getProjectPath(`scripts/${scriptName}`);
    
    if (!fs.existsSync(scriptPath)) {
        return {
            success: false,
            error: `Script not found: ${scriptName}`,
            output: ''
        };
    }
    
    if (!fs.existsSync(fullFromPath)) {
        return {
            success: false,
            error: `Directory not found: ${fromDirectory}`,
            output: ''
        };
    }
    
    return new Promise((resolve) => {
        const child = spawn('node', [scriptPath, '--help'], {
            cwd: fullFromPath,
            stdio: 'pipe',
            timeout: 10000
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
            // For most scripts, --help should either show help (exit 0) or be ignored
            // We consider it successful if it doesn't crash with path errors
            const success = !stderr.includes('Cannot find module') && 
                           !stderr.includes('ENOENT') &&
                           !stderr.includes('MODULE_NOT_FOUND') &&
                           !stdout.includes('Error: Cannot find project root') &&
                           !stdout.includes('❌');
            
            resolve({
                success,
                error: success ? null : (stderr || 'Process failed'),
                output: stdout
            });
        });
        
        child.on('error', (err) => {
            resolve({
                success: false,
                error: err.message,
                output: ''
            });
        });
        
        // Handle timeout
        setTimeout(() => {
            if (!child.killed) {
                child.kill('SIGTERM');
                resolve({
                    success: false,
                    error: 'Test timed out',
                    output: ''
                });
            }
        }, 10000);
    });
}

/**
 * Test a single script from all directories
 */
async function testScriptFromAllDirectories(scriptName) {
    console.log(`\n📋 Testing ${scriptName}:`);
    
    const results = [];
    
    for (const directory of TEST_DIRECTORIES) {
        const result = await runScriptFromDirectory(scriptName, directory);
        results.push({ directory, ...result });
        
        const status = result.success ? '✅' : '❌';
        const dir = directory === '.' ? 'root' : directory;
        console.log(`   ${status} from ${dir}`);
        
        if (!result.success) {
            console.log(`      Error: ${result.error}`);
        }
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
        console.log(`   🎉 Perfect! Works from all ${totalCount} directories`);
    } else {
        console.log(`   ⚠️  Works from ${successCount}/${totalCount} directories`);
    }
    
    return results;
}

/**
 * Test project root detection from various directories
 */
async function testProjectRootDetection() {
    console.log('\n🔍 Testing project root detection:');
    
    const testDirs = [
        { path: '.', expected: projectRoot },
        { path: 'scripts', expected: projectRoot },
        { path: 'config', expected: projectRoot },
        { path: 'services', expected: projectRoot },
    ];
    
    for (const testDir of testDirs) {
        const fullPath = path.join(projectRoot, testDir.path);
        if (!fs.existsSync(fullPath)) continue;
        
        try {
            const result = await new Promise((resolve) => {
                const child = spawn('node', ['-e', `
                    const { findProjectRoot } = require('./scripts/utils-project-root');
                    console.log(findProjectRoot());
                `], {
                    cwd: fullPath,
                    stdio: 'pipe',
                    timeout: 5000
                });
                
                let stdout = '';
                child.stdout.on('data', (data) => stdout += data.toString());
                child.on('close', () => resolve(stdout.trim()));
                child.on('error', () => resolve('ERROR'));
            });
            
            const success = result === testDir.expected;
            const status = success ? '✅' : '❌';
            const dir = testDir.path === '.' ? 'root' : testDir.path;
            
            console.log(`   ${status} from ${dir}: ${success ? 'correct' : 'incorrect'} root detected`);
            
            if (!success) {
                console.log(`      Expected: ${testDir.expected}`);
                console.log(`      Got: ${result}`);
            }
        } catch (error) {
            console.log(`   ❌ from ${testDir.path}: ${error.message}`);
        }
    }
}

/**
 * Test environment variable loading from various directories
 */
async function testEnvironmentLoading() {
    console.log('\n🔧 Testing environment variable loading:');
    
    for (const directory of TEST_DIRECTORIES.slice(0, 4)) { // Test first 4 dirs
        const fullPath = path.join(projectRoot, directory);
        if (!fs.existsSync(fullPath)) continue;
        
        try {
            const result = await new Promise((resolve) => {
                const child = spawn('node', ['-e', `
                    const { initializeProject } = require('./scripts/utils-project-root');
                    const { envLoaded } = initializeProject();
                    console.log(envLoaded ? 'LOADED' : 'NOT_LOADED');
                `], {
                    cwd: fullPath,
                    stdio: 'pipe',
                    timeout: 5000
                });
                
                let stdout = '';
                child.stdout.on('data', (data) => stdout += data.toString());
                child.on('close', () => resolve(stdout.trim()));
                child.on('error', () => resolve('ERROR'));
            });
            
            const success = result === 'LOADED';
            const status = success ? '✅' : '❌';
            const dir = directory === '.' ? 'root' : directory;
            
            console.log(`   ${status} from ${dir}: ${success ? 'env loaded' : 'env not loaded'}`);
        } catch (error) {
            console.log(`   ❌ from ${directory}: ${error.message}`);
        }
    }
}

/**
 * Main test function
 */
async function main() {
    console.log('🧪 Directory Independence Test Suite');
    console.log('====================================');
    console.log(`📁 Project root: ${projectRoot}`);
    console.log(`🧪 Testing ${SCRIPTS_TO_TEST.length} scripts from ${TEST_DIRECTORIES.length} directories`);
    
    // Test project root detection
    await testProjectRootDetection();
    
    // Test environment loading
    await testEnvironmentLoading();
    
    // Test each script from all directories
    const allResults = [];
    
    for (const scriptName of SCRIPTS_TO_TEST) {
        const results = await testScriptFromAllDirectories(scriptName);
        allResults.push({ scriptName, results });
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log('===========');
    
    let totalTests = 0;
    let passedTests = 0;
    const failedScripts = [];
    
    for (const { scriptName, results } of allResults) {
        const passed = results.filter(r => r.success).length;
        const total = results.length;
        
        totalTests += total;
        passedTests += passed;
        
        if (passed === total) {
            console.log(`✅ ${scriptName}: ${passed}/${total} directories`);
        } else {
            console.log(`❌ ${scriptName}: ${passed}/${total} directories`);
            failedScripts.push(scriptName);
        }
    }
    
    console.log('');
    console.log(`📋 Total: ${passedTests}/${totalTests} tests passed`);
    console.log(`✅ Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedScripts.length > 0) {
        console.log('');
        console.log('❌ Scripts with issues:');
        failedScripts.forEach(script => {
            console.log(`   • ${script}`);
        });
        console.log('');
        console.log('💡 Fix suggestions:');
        console.log('   • Ensure all scripts use utils-project-root.js');
        console.log('   • Check relative imports in failing scripts');
        console.log('   • Verify environment variable loading');
        
        process.exit(1);
    } else {
        console.log('');
        console.log('🎉 All scripts work correctly from any directory!');
        console.log('');
        console.log('✨ Your test scripts are properly location-independent.');
        process.exit(0);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    });
}

module.exports = { testScriptFromAllDirectories, runScriptFromDirectory };
