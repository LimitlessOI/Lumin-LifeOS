/**
 * SYNOPSIS: Import necessary libraries
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
// Import necessary libraries
import crypto from 'crypto';

// Define schemas for partner keys
const partnerKeySchema = {
  prefix: 'PARTNER',
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
