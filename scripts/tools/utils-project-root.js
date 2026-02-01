#!/usr/bin/env node

/**
 * utils-project-root.js
 * 
 * Utility to find and initialize the project root directory.
 * Used by other utility scripts to ensure consistent paths.
 */

const fs = require('fs');
const path = require('path');

/**
 * Find the project root by looking for package.json
 * @param {string} startDir - Directory to start searching from
 * @returns {string|null} - Project root path or null
 */
function findProjectRoot(startDir = __dirname) {
    let currentDir = startDir;

    while (currentDir !== path.dirname(currentDir)) {
        const packagePath = path.join(currentDir, 'package.json');
        if (fs.existsSync(packagePath)) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }

    return null;
}

/**
 * Get the project root, with caching
 */
const projectRoot = findProjectRoot() || process.cwd();

/**
 * Initialize project environment
 * @param {object} options - Options
 * @param {boolean} options.verbose - Show verbose output
 * @param {boolean} options.requireEnv - Require .env file to exist
 * @returns {object} - Project info
 */
function initializeProject(options = {}) {
    const { verbose = false, requireEnv = true } = options;

    if (verbose) {
        console.log(`📁 Project root: ${projectRoot}`);
    }

    // Load dotenv if available
    try {
        require('dotenv').config({ path: path.join(projectRoot, '.env') });
        if (verbose) {
            console.log('✅ Loaded .env file');
        }
    } catch (err) {
        if (requireEnv) {
            console.warn('⚠️  Could not load .env file:', err.message);
        }
    }

    return { projectRoot };
}

/**
 * Get a path relative to the project root
 * @param {...string} pathSegments - Path segments to join
 * @returns {string} - Absolute path
 */
function getProjectPath(...pathSegments) {
    return path.join(projectRoot, ...pathSegments);
}

module.exports = {
    findProjectRoot,
    projectRoot,
    initializeProject,
    getProjectPath
};
