/**
 * SYNOPSIS: ... (existing code in extractDumpHeadingsEnhanced.mjs) ...
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */
// ... (existing code in extractDumpHeadingsEnhanced.mjs) ...

export function extractDumpHeadings(dumpContent) {
    const headings = [];
    const lines = dumpContent.split('\n');

    for (const line of lines) {
        // Basic heading detection (adjust regex for "non-trivial" as needed)
        const match = line.match(/^(#+)\s(.+)$/);
        if (match) {
            headings.push({ level: match[1].length, text: match[2].trim() });
        }
    }

    // Logic for generating TOC if non-trivial headings exist
    if (headings.length > 0) { // Define "non-trivial" more specifically if needed
        generateMachineTOC(headings);
    }

    return headings; // Ensure this function returns the extracted headings
}

function generateMachineTOC(headings) {
    let tocContent = "# Idea Vault Headings Appendix\n\n";
    for (const heading of headings) {
        const indent = "  ".repeat(heading.level - 1);
        const anchor = heading.text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-');
        tocContent += `${indent}- [${heading.text}](#${anchor})\n`;
    }
    // Write tocContent to docs/IDEA_VAULT_HEADINGS_APPENDIX.md
    // Example (requires fs module, assuming Node.js environment):
    // import fs from 'fs';
    // fs.writeFileSync('docs/IDEA_VAULT_HEADINGS_APPENDIX.md', tocContent);
}

// ... (other exports if any) ...
