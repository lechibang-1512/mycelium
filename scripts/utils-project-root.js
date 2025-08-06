#!/usr/bin/env node

/**
 * Project Root Detection Utility
 * 
 * This utility helps scripts find the project root directory regardless of
 * where they are executed from within the project structure.
 */

const fs = require('fs');
const path = require('path');

/**
 * Find the project root directory by looking for package.json
 * @param {string} startDir - Starting directory (defaults to script location)
 * @returns {string} - Project root directory path
 */
function findProjectRoot(startDir = __dirname) {
    let currentDir = startDir;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
        // Check if this looks like project root (has package.json)
        const packageJsonPath = path.join(currentDir, 'package.json');
        
        try {
            if (fs.existsSync(packageJsonPath)) {
                return currentDir;
            }
        } catch (error) {
            // Continue searching
        }
        
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            // Reached filesystem root
            break;
        }
        
        currentDir = parentDir;
        attempts++;
    }
    
    // If we can't find package.json, try some common fallbacks
    const fallbacks = [
        path.dirname(__dirname), // Parent of scripts directory
        process.cwd(),           // Current working directory
        __dirname               // Scripts directory itself
    ];
    
    for (const fallback of fallbacks) {
        const packageJsonPath = path.join(fallback, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            return fallback;
        }
    }
    
    // Last resort: use parent of scripts directory
    return path.dirname(__dirname);
}

/**
 * Load environment variables from .env file in project root
 * @param {string} projectRoot - Project root directory
 * @returns {boolean} - True if .env was found and loaded
 */
function loadEnvironmentVariables(projectRoot = null) {
    if (!projectRoot) {
        projectRoot = findProjectRoot();
    }
    
    const possiblePaths = [
        path.join(projectRoot, '.env'),
        path.join(process.cwd(), '.env'),
        path.join(__dirname, '.env'),
        path.join(__dirname, '..', '.env')
    ];
    
    for (const envPath of possiblePaths) {
        try {
            if (fs.existsSync(envPath)) {
                require('dotenv').config({ path: envPath });
                return true;
            }
        } catch (error) {
            // Continue searching
        }
    }
    
    return false;
}

/**
 * Get absolute path to a file/directory relative to project root
 * @param {string} relativePath - Path relative to project root
 * @param {string} projectRoot - Project root directory (auto-detected if not provided)
 * @returns {string} - Absolute path
 */
function getProjectPath(relativePath, projectRoot = null) {
    if (!projectRoot) {
        projectRoot = findProjectRoot();
    }
    return path.join(projectRoot, relativePath);
}

/**
 * Initialize project environment (find root and load env vars)
 * @param {object} options - Options object
 * @param {boolean} options.verbose - Whether to log initialization details
 * @param {boolean} options.requireEnv - Whether to exit if .env is not found
 * @returns {object} - Object with projectRoot and envLoaded properties
 */
function initializeProject(options = {}) {
    const { verbose = false, requireEnv = false } = options;
    
    const projectRoot = findProjectRoot();
    const envLoaded = loadEnvironmentVariables(projectRoot);
    
    if (verbose) {
        console.log('📁 Project Initialization:');
        console.log(`   Root directory: ${projectRoot}`);
        console.log(`   Environment file: ${envLoaded ? '✅ Found' : '❌ Not found'}`);
        console.log(`   Current working directory: ${process.cwd()}`);
        console.log(`   Script location: ${__dirname}`);
        console.log('');
    }
    
    if (requireEnv && !envLoaded) {
        console.error('❌ .env file not found. Please ensure .env exists in the project root.');
        process.exit(1);
    }
    
    return { projectRoot, envLoaded };
}

module.exports = {
    findProjectRoot,
    loadEnvironmentVariables,
    getProjectPath,
    initializeProject
};

// If run directly, show project info
if (require.main === module) {
    const { projectRoot, envLoaded } = initializeProject({ verbose: true });
    
    console.log('🔍 Project Structure Analysis:');
    
    // Check for common project files
    const importantFiles = [
        'package.json',
        '.env',
        '.env.example',
        'server.js',
        'README.md'
    ];
    
    importantFiles.forEach(file => {
        const filePath = path.join(projectRoot, file);
        const exists = fs.existsSync(filePath);
        console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    });
    
    // Check for important directories
    const importantDirs = [
        'scripts',
        'config',
        'services',
        'middleware',
        'routes',
        'views',
        'sql'
    ];
    
    console.log('\n📂 Directory Structure:');
    importantDirs.forEach(dir => {
        const dirPath = path.join(projectRoot, dir);
        const exists = fs.existsSync(dirPath);
        console.log(`   ${exists ? '✅' : '❌'} ${dir}/`);
    });
}
