/**
 * SYNOPSIS: Heading pass extension for large exports.
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */
import fs from 'fs/promises';
import path from 'path';

/**
 * Extends the heading pass to handle exports over 500KB.
 * Appends details to Stream subsection or portfolio table.
 */
export async function runHeadingPass(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });

  for (const file of files) {
    if (file.isFile() && path.extname(file.name) === '.js') {
      const filePath = path.join(dir, file.name);
      const stats = await fs.stat(filePath);

      if (stats.size > 500 * 1024) {
        await handleLargeFile(filePath, stats.size);
      }
    }
  }
}

/**
 * Handles files over 500KB by appending to the Stream subsection.
 */
async function handleLargeFile(filePath, size) {
  const content = `File: ${path.basename(filePath)}, Size: ${size} bytes\n`;
  const streamSubsectionPath = path.join(path.dirname(filePath), 'StreamSubsection.txt');

  try {
    const headerContent = '--- Stream Subsection ---\n';
    await fs.appendFile(streamSubsectionPath, headerContent + content);
  } catch (error) {
    console.error(`Failed to append to StreamSubsection: ${error}`);
  }
}

// Export headingPass for use in other modules
export const headingPass = {
  runHeadingPass,
  handleLargeFile
};

export default headingPass;
