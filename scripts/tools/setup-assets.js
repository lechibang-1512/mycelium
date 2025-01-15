const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../..');
const srcDir = path.join(rootDir, 'node_modules/@fortawesome/fontawesome-free');
const destDir = path.join(rootDir, 'backend/public/assets/fontawesome');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            // Copy file
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

try {
    console.log('📦 Copying static assets...');
    
    // We explicitly only copy css/all.min.css and webfonts to minimize size
    const cssDest = path.join(destDir, 'css');
    fs.mkdirSync(cssDest, { recursive: true });
    
    const srcCssItem = path.join(srcDir, 'css/all.min.css');
    const targetCssItem = path.join(cssDest, 'all.min.css');
    
    if (fs.existsSync(srcCssItem)) {
        fs.copyFileSync(srcCssItem, targetCssItem);
    } else {
        console.warn('⚠️ Source file not found: ' + srcCssItem + '. Skipping FontAwesome copy.');
    }
    
    const webfontsDest = path.join(destDir, 'webfonts');
    const webfontsSrc = path.join(srcDir, 'webfonts');
    
    if (fs.existsSync(webfontsSrc)) {
        copyDir(webfontsSrc, webfontsDest);
    }
    
    console.log('✅ Default static assets copied successfully.');
} catch (error) {
    console.error('❌ Failed to copy assets:', error.message);
    process.exit(1);
}
