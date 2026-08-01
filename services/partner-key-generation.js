/**
 * SYNOPSIS: Generates partner API keys distinct from platform keys.
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
import crypto from 'crypto';

// module.exports = { generatePartnerKey }

export function generatePartnerKey(partnerId) {
  const apiKey = crypto.randomBytes(32).toString('hex');
  return `partner-${partnerId}-${apiKey}`;
}
