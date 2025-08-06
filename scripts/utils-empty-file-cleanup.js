#!/usr/bin/env node

/**
 * Empty File Cleanup Utility
 * Recursively removes empty files from the project directory
 * Can be run from anywhere within the project directory
 */

// Initialize project environment
const { initializeProject } = require('./utils-project-root');
const { projectRoot } = initializeProject({ verbose: false, requireEnv: false });

const fs = require('fs').promises;
const path = require('path');

/**
 * Recursively walk through a directory and remove empty files
 * @param {string} dir - Root directory to start scanning
 * @param {Array<string>} excludePaths - Paths to exclude from scanning
 */
async function removeEmptyFiles(dir, excludePaths = []) {
  let entries;

  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    console.error(`Failed to read directory: ${dir}`, err);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip excluded paths
    if (excludePaths.some(excludePath => fullPath.includes(excludePath))) {
      continue;
    }

    try {
      if (entry.isDirectory()) {
        // Skip common directories that shouldn't be cleaned
        const skipDirs = ['node_modules', '.git', '.vscode', 'dist', 'build'];
        if (!skipDirs.includes(entry.name)) {
          await removeEmptyFiles(fullPath, excludePaths); // Recurse into subdirectory
        }
      } else if (entry.isFile()) {
        const { size } = await fs.stat(fullPath);
        if (size === 0) {
          await fs.unlink(fullPath);
          console.log(`✅ Deleted empty file: ${path.relative(projectRoot, fullPath)}`);
        }
      }
    } catch (err) {
      console.error(`❌ Error processing: ${path.relative(projectRoot, fullPath)}`, err.message);
    }
  }
}

// Entry point
async function main() {
  console.log('🧹 Empty File Cleanup Utility');
  console.log('==============================');
  console.log(`📁 Project root: ${projectRoot}`);
  console.log(`🔍 Scanning for empty files...\n`);
  
  const excludePaths = [
    path.join(projectRoot, 'node_modules'),
    path.join(projectRoot, '.git'),
    path.join(projectRoot, '.vscode'),
    path.join(projectRoot, 'dist'),
    path.join(projectRoot, 'build')
  ];
  
  await removeEmptyFiles(projectRoot, excludePaths);
  console.log('\n✅ Empty file cleanup completed!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  });
}

module.exports = { removeEmptyFiles };
