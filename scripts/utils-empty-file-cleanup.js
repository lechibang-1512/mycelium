const fs = require('fs').promises;
const path = require('path');

/**
 * Recursively walk through a directory and remove empty files
 * @param {string} dir - Root directory to start scanning
 */
async function removeEmptyFiles(dir) {
  let entries;

  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    console.error(`Failed to read directory: ${dir}`, err);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    try {
      if (entry.isDirectory()) {
        await removeEmptyFiles(fullPath); // Recurse into subdirectory
      } else if (entry.isFile()) {
        const { size } = await fs.stat(fullPath);
        if (size === 0) {
          await fs.unlink(fullPath);
          console.log(`Deleted empty file: ${fullPath}`);
        }
      }
    } catch (err) {
      console.error(`Error processing: ${fullPath}`, err);
    }
  }
}

// Entry point
(async () => {
  const rootDir = path.resolve(__dirname); // Change this if needed
  console.log(`Scanning for empty files in: ${rootDir}`);
  await removeEmptyFiles(rootDir);
})();
