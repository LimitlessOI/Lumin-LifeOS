/**
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Exports runHeadingPass — services/headingPass.js.
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

export async function processHeading(filePath, size) {
  const content = `File: ${path.basename(filePath)}, Size: ${size} bytes\n`;
  const streamSubsectionPath = path.join(path.dirname(filePath), 'StreamSubsection.txt');

  try {
    await fs.appendFile(streamSubsectionPath, content);
  } catch (error) {
    console.error(`Failed to append to StreamSubsection: ${error}`);
  }
}
