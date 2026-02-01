#!/usr/bin/env node

/**
 * Cross-Platform Clean Script
 * Works on Windows, macOS, and Linux
 * 
 * This script removes ALL build artifacts and cache directories
 * to ensure a completely fresh build.
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

console.log(`${colors.cyan}🧹 Cleaning ALL build artifacts and caches...${colors.reset}\n`);

const rootDir = path.join(__dirname, '..');

// Directories and files to clean (at root level)
const pathsToClean = [
  path.join(rootDir, 'dist'),
  path.join(rootDir, 'build'),
  path.join(rootDir, '.vite'),
  path.join(rootDir, 'node_modules', '.vite'),
  path.join(rootDir, 'node_modules', '.cache'),
];

// Additional glob patterns for thorough cleaning (unused currently)
// const _additionalPatterns = [
//   '**/.vite',
//   '**/dist',
//   '**/build',
// ];

let cleaned = 0;
let skipped = 0;

console.log(`${colors.cyan}Cleaning directories:${colors.reset}`);

pathsToClean.forEach((targetPath) => {
  const relativePath = path.relative(rootDir, targetPath);
  
  if (fs.existsSync(targetPath)) {
    try {
      fs.statSync(targetPath); // Check if path exists
      const size = getDirectorySize(targetPath);
      const sizeStr = formatBytes(size);
      
      console.log(`${colors.yellow}📁 Removing: ${relativePath} (${sizeStr})${colors.reset}`);
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`${colors.green}   ✓ Removed successfully${colors.reset}\n`);
      cleaned++;
    } catch (err) {
      console.error(`${colors.red}   ✗ Failed: ${err.message}${colors.reset}\n`);
    }
  } else {
    console.log(`${colors.yellow}⏭  Skipping: ${relativePath} (not found)${colors.reset}`);
    skipped++;
  }
});

console.log(`\n${colors.green}═══════════════════════════════════════${colors.reset}`);
console.log(`${colors.green}✅ Clean complete!${colors.reset}`);
console.log(`${colors.green}   Removed: ${cleaned} items${colors.reset}`);
console.log(`${colors.yellow}   Skipped: ${skipped} items${colors.reset}`);
console.log(`${colors.green}═══════════════════════════════════════${colors.reset}\n`);

// Helper function to get directory size
function getDirectorySize(dirPath) {
  let size = 0;
  
  try {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          size += getDirectorySize(filePath);
        } else {
          size += stats.size;
        }
      }
    }
  } catch {
    // Ignore errors
  }
  
  return size;
}

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
