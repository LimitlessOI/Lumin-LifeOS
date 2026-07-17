/**
 * SYNOPSIS: Exports generatePartnerKey — services/partner-key-scheme.js.
 */
import crypto from 'crypto';

export function generatePartnerKey(partnerId) {
  const key = crypto.randomBytes(32).toString('hex');
  const partnerKey = `${partnerId}-${key}`;
  return partnerKey;
}
