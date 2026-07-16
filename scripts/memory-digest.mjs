/**
 * SYNOPSIS: Ensure the function is exported as needed
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */
import fs from 'fs';
import path from 'path';

export function generateDigest() {
  const lessonsDir = path.resolve(process.cwd(), 'lessons');
  const digestPath = path.resolve(process.cwd(), 'docs', 'INSTITUTIONAL_MEMORY_DIGEST.md');

  try {
    const lessonFiles = fs.readdirSync(lessonsDir).filter(file => file.endsWith('.md'));

    const digestContent = lessonFiles.map(file => {
      const filePath = path.join(lessonsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const title = content.split('\n')[0].replace('# ', '');
      
      return `## ${title}\n\n${content}\n`;
    }).join('\n');

    fs.writeFileSync(digestPath, digestContent);
  } catch (error) {
    console.error('Error generating digest:', error);
  }
}

// Ensure the function is exported as needed
export const regenerateDigest = generateDigest;
