/**
 * SYNOPSIS: Exports generatePartnerKey — services/partner-key-generation.js.
 */
import crypto from 'crypto';

export function generatePartnerKey(partnerId) {
  const apiKey = crypto.randomBytes(32).toString('hex');
  return `partner-${partnerId}-${apiKey}`;
}
