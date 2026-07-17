/**
 * SYNOPSIS: services/memory-validation.js
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */
// services/memory-validation.js

function validateHTMLStructure(htmlContent) {
  // Basic checks for essential HTML tags
  const hasHtmlTag = /<html[^>]*>/i.test(htmlContent);
  const hasHeadTag = /<head[^>]*>/i.test(htmlContent);
  const hasBodyTag = /<body[^>]*>/i.test(htmlContent);

  return hasHtmlTag && hasHeadTag && hasBodyTag;
}

function validateSQLSyntax(sqlContent) {
  // Basic checks for SQL syntax
  // This is a simplistic validation example
  const hasSelectStatement = /^\s*SELECT\s+/i.test(sqlContent);
  const hasFromClause = /\s+FROM\s+/i.test(sqlContent);

  return hasSelectStatement && hasFromClause;
}

function validateSQL(fileContent) {
  // Placeholder for SQL validation logic before commit
  return validateSQLSyntax(fileContent);
}

function checkEvidenceLadder(content) {
  // Check for evidence ladder and ensure it is not merged with governance ladder
  const hasEvidenceLadder = /evidence ladder/i.test(content);
  const hasGovernanceLadder = /governance ladder/i.test(content);

  // Ensure evidence ladder is not merged with governance ladder
  if (hasEvidenceLadder && hasGovernanceLadder) {
    // Check if they appear in the same context
    const evidenceIndex = content.search(/evidence ladder/i);
    const governanceIndex = content.search(/governance ladder/i);

    // If they are too close (e.g., within 100 characters), consider them merged
    const areMerged = Math.abs(evidenceIndex - governanceIndex) < 100;
    return hasEvidenceLadder && !areMerged;
  }

  return hasEvidenceLadder;
}

export { validateHTMLStructure, validateSQLSyntax, validateSQL, checkEvidenceLadder };
