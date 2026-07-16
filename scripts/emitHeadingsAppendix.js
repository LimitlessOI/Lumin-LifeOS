/**
 * SYNOPSIS: Exports emitHeadingsTOC — scripts/emitHeadingsAppendix.js.
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */
[
  {
    "old_string": "function emitHeadingsTOC() {\n  // Your existing logic\n}",
    "new_string": "import { extractDumpHeadings } from './extract-dump-headings.mjs';\n\nexport function emitHeadingsTOC() {\n  const toc = extractDumpHeadings('docs/products/ideavault/PRODUCT_HOME.md');\n  if (toc && toc.length > 0) {\n    // Logic to write the TOC to 'docs/IDEA_VAULT_HEADINGS_APPENDIX.md'\n  }\n}"
  }
]
