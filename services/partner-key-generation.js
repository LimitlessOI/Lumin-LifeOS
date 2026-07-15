/**
 * SYNOPSIS: Import necessary libraries
 */
// Import necessary libraries
import crypto from 'crypto';

// Define schemas for partner keys and platform keys
const partnerKeySchema = {
  prefix: 'PARTNER',
  length: 32
};

const platformKeySchema = {
  prefix: 'PLATFORM',
  length: 32
};

// Helper function to generate a random key based on a schema
function generateKey(schema) {
  const randomPart = crypto.randomBytes(schema.length).toString('hex').slice(0, schema.length);
  return `${schema.prefix}_${randomPart}`;
}

// Function to generate a partner key
export function generatePartnerKey() {
  return generateKey(partnerKeySchema);
}

// Function to generate a platform key (if needed in future)
// export function generatePlatformKey() {
//   return generateKey(platformKeySchema);
// }
