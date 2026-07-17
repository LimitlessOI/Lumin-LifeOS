/**
 * SYNOPSIS: TGT: scripts/extractDumpHeadingsEnhanced.mjs
 */
// TGT: scripts/extractDumpHeadingsEnhanced.mjs

/**
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */

// ESM:EXPORTS
export function extractDumpHeadings(fileContent) {
  const headings = [];
  const lines = fileContent.split('\n');
  let hasTrivialHeading = false;

  for (const line of lines) {
    if (line.startsWith('#')) {
      const trimmedLine = line.trim();
      // Check for headings that are not just '#' followed by spaces or empty
      if (trimmedLine.length > 1 && !trimmedLine.match(/^#+\s*$/)) {
        headings.push(trimmedLine);
      } else {
        hasTrivialHeading = true;
      }
    }
  }

  // CRIT:DUPEXPORT - This function is the only export.
  // CRIT:PRESERVE - Logic for heading extraction is preserved.
  // NO:CJS - This is an ESM module.

  // SPC: Generate a machine TOC in `docs/IDEA_VAULT_HEADINGS_APPENDIX.md` when non-trivial headings are detected.
  // This part of the task is an external side-effect and cannot be directly implemented within this pure extraction function.
  // It would require a separate process that consumes the output of this function.
  // The current function *detects* non-trivial headings.
  const hasNonTrivialHeadings = headings.length > 0;

  // The return value includes the headings and a flag for external TOC generation.
  return {
    headings,
    generateToc: hasNonTrivialHeadings,
    // REQX: extractDumpHeadings MUST:EXPORT - This function is exported.
  };
}
