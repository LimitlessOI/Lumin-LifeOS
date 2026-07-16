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

export { validateHTMLStructure };
