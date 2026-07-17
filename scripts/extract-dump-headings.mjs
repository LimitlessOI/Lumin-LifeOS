/**
 * SYNOPSIS: Extract markdown headings from founder conversation dump files.
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */
import fs from 'fs/promises';
import path from 'path';

export async function extractDumpHeadings(dumpFilePath, outputFilePath) {
  try {
    const data = await fs.readFile(dumpFilePath, 'utf8');
    const headings = data.match(/^#+\s.+/gm);
    const toc = headings ? headings.map((heading) => `- ${heading}`).join('\n') : '';
    await fs.writeFile(outputFilePath, toc, 'utf8');
  } catch (error) {
    console.error('Error extracting headings:', error);
  }
}

export async function generateIdeaVaultHeadingsAppendix() {
  const dumpFilePath = path.resolve('IDEA_VAULT.md');
  const outputFilePath = path.resolve('docs/IDEA_VAULT_HEADINGS_APPENDIX.md');
  
  try {
    const data = await fs.readFile(dumpFilePath, 'utf8');
    const headings = data.match(/^#+\s.+/gm);
    const toc = headings ? headings.map((heading) => `- ${heading}`).join('\n') : '';

    if (toc) { // Check if TOC is non-trivial
      let appendixContent = '';
      try {
        appendixContent = await fs.readFile(outputFilePath, 'utf8');
      } catch {
        // File might not exist, default to empty
      }
      
      if (!appendixContent.includes(toc)) {
        appendixContent += `\n\n${toc}`;
        await fs.writeFile(outputFilePath, appendixContent, 'utf8');
        
        // Propose changes through builder
        console.log('Non-trivial TOC changes were made. Please propose these changes through the builder.');
      }
    }
  } catch (error) {
    console.error('Error generating appendix:', error);
  }
}

export { generateIdeaVaultHeadingsAppendix as extractHeadingsAppendix };
