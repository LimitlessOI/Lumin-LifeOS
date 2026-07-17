/**
 * SYNOPSIS: Exports validateEmailConfig — services/email-service.js.
 * @ssot docs/products/outreach-crm/PRODUCT_HOME.md
 */
export function validateEmailConfig(config) {
  if (!config || !config.emailProvider) {
    throw new Error('Email provider is not configured.');
  }
}
