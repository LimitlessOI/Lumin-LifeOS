/**
 * SYNOPSIS: Therapist integration setup wiring communication-profile and truth-delivery.
 * @ssot docs/products/wellness-studio/PRODUCT_HOME.md
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Sets up the therapist integration.
 */
export function setupIntegration() {
  // Wire communication-profile.js and truth-delivery.js for therapist integration.
  const communicationProfile = require('communication-profile');
  const truthDelivery = require('truth-delivery');

  return {
    ok: true,
    communicationProfile,
    truthDelivery,
  };
}
