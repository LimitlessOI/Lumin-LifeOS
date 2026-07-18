/**
 * SYNOPSIS: Exports ensureEmailProviderConfigured — services/email-service.js.
 */
export function ensureEmailProviderConfigured(config) {
  if (!config || !config.emailProvider) {
    throw new Error('Email provider is not configured.');
  }
}