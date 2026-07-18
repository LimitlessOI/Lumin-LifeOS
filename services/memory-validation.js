/**
 * SYNOPSIS: Function to validate basic HTML structure
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */
import fs from 'fs';
import path from 'path';

// Function to validate basic HTML structure
export function validateHTMLStructure(filePath) {
  if (path.extname(filePath) !== '.html') {
    throw new Error('File is not an HTML file.');
  }

  const htmlContent = fs.readFileSync(filePath, 'utf-8');
  const hasDoctype = /<!DOCTYPE html>/i.test(htmlContent);
  const hasHtmlTag = /<html.*?>.*<\/html>/is.test(htmlContent);
  const hasHeadTag = /<head.*?>.*<\/head>/is.test(htmlContent);
  const hasBodyTag = /<body.*?>.*<\/body>/is.test(htmlContent);

  if (!hasDoctype || !hasHtmlTag || !hasHeadTag || !hasBodyTag) {
    throw new Error('Invalid HTML structure.');
  }

  return true;
}

// Example of another existing function
export function someOtherFunction() {
  // Some existing functionality
}
