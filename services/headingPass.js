/**
 * SYNOPSIS: Exports runHeadingPass — services/headingPass.js.
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */
import fs from 'fs/promises';
import path from 'path';

export async function runHeadingPass(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });

  for (const file of files) {
    if (file.isFile() && path.extname(file.name) === '.js') {
      const filePath = path.join(dir, file.name);
      const stats = await fs.stat(filePath);

      if (stats.size > 500 * 1024) {
        await appendToStreamSubsection(filePath, stats.size);
      }
    }
  }
}

async function appendToStreamSubsection(filePath, size) {
  const content = `File: ${path.basename(filePath)}, Size: ${size} bytes\n`;
  const streamSubsectionPath = path.join(path.dirname(filePath), 'StreamSubsection.txt');

  try {
    const headerContent = '--- Stream Subsection ---\n';
    await fs.appendFile(streamSubsectionPath, headerContent + content);
  } catch (error) {
    console.error(`Failed to append to StreamSubsection: ${error}`);
  }
}
