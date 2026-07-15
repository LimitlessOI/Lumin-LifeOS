/**
 * SYNOPSIS: Exports extractDumpHeadings — scripts/extract-dump-headings.mjs.
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
  const outputFilePath = path.resolve('IDEA_VAULT_HEADINGS_APPENDIX.md');
  await extractDumpHeadings(dumpFilePath, outputFilePath);
}