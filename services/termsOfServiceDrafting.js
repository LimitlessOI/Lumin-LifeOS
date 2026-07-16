/**
 * SYNOPSIS: services/termsOfServiceDrafting.js
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
// services/termsOfServiceDrafting.js

/**
 * draftFinancialDisclaimer - Generates a financial disclaimer for use in terms of service.
 * 
 * This disclaimer specifies that the information provided is not financial advice and
 * users should consult with a professional for financial decisions.
 * 
 * @returns {string} The financial disclaimer text.
 */
export function draftFinancialDisclaimer() {
  return `
    Financial Disclaimer: The information provided on this platform is for informational purposes only and does not constitute financial advice. 
    We recommend consulting with a qualified financial advisor before making any financial decisions. 
    We are not responsible for any financial decisions made based on the information provided on this platform.
  `;
}
