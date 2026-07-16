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

export { validateHTMLStructure, validateSQLSyntax };
