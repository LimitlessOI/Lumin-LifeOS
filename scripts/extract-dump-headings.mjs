/**
 * SYNOPSIS: Exports extractDumpHeadings — scripts/extract-dump-headings.mjs.
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */
import fs from 'fs/promises';
import path from 'path';

export async function extractDumpHeadings(dumpFilePath, outputFilePath) {
  try {
    const data = await fs.readFile(dumpFilePath, 'utf8');
    const headings = data.match(/^#+\s.+/gm);
    const toc = headings ? headings.map((heading) => `- ${heading}`).join('\n') : '';
    // Emit the TOC regardless of content
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

    let proposalNeeded = false;

    if (toc) {  // Ensure that the TOC is non-trivial
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
