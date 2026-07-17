/**
 * SYNOPSIS: Export the extractHeadings function
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */
import fs from 'fs/promises';
import path from 'path';

/**
 * Extracts and returns the headings from a given markdown file.
 * 
 * @param {string} filePath - The path to the markdown file.
 * @returns {Promise<string[]>} - A promise that resolves to an array of headings.
 */
async function extractHeadings(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const headings = data.match(/^#+\s.+/gm);
    return headings || [];
  } catch (error) {
    console.error('Error extracting headings:', error);
    return [];
  }
}

// Export the extractHeadings function
export { extractHeadings };

// Existing function implementations
/**
 * Extracts headings from a given dump file and writes them to an output file.
 * Each heading is prefixed with a hyphen.
 *
 * @param {string} dumpFilePath - The path to the input markdown dump file.
 * @param {string} outputFilePath - The path to the output file where headings will be written.
 * @returns {Promise<void>} - A Promise that resolves when the operation is complete.
 */
export async function extractDumpHeadings(dumpFilePath, outputFilePath) {
  try {
    const headings = await extractHeadings(dumpFilePath);
    const toc = headings.map(heading => `- ${heading}`).join('\n');
    await fs.writeFile(outputFilePath, toc, 'utf8');
  } catch (error) {
    console.error('Error extracting dump headings:', error);
  }
}

/**
 * Generates or updates the 'docs/IDEA_VAULT_HEADINGS_APPENDIX.md' file
 * with headings extracted from 'IDEA_VAULT.md'.
 * If the extracted headings are not already present in the appendix, they are appended.
 * A console message indicates whether an update occurred and if a proposal is needed.
 *
 * @returns {Promise<void>} - A Promise that resolves when the operation is complete.
 */
export async function generateIdeaVaultHeadingsAppendix() {
  const dumpFilePath = path.resolve('IDEA_VAULT.md');
  const outputFilePath = path.resolve('docs/IDEA_VAULT_HEADINGS_APPENDIX.md');

  try {
    const headings = await extractHeadings(dumpFilePath);
    const toc = headings.map(heading => `- ${heading}`).join('\n');

    let proposalNeeded = false;

    if (toc) {
      let appendixContent = '';
      try {
        appendixContent = await fs.readFile(outputFilePath, 'utf8');
      } catch (readError) {
        // If file doesn't exist, continue with empty content
      }
      
      if (!appendixContent.includes(toc)) {
        appendixContent = appendixContent ? `${appendixContent}\n\n${toc}` : toc;
        await fs.writeFile(outputFilePath, appendixContent, 'utf8');
        proposalNeeded = true;
      }
    }

    if (proposalNeeded) {
      console.log('Appendix updated with new TOC. Proposal needed.');
    } else {
      console.log('No new TOC to append. No proposal needed.');
    }

  } catch (error) {
    console.error('Error generating appendix:', error);
  }
}

export { generateIdeaVaultHeadingsAppendix as extractHeadingsAppendix };
