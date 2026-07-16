/**
 * SYNOPSIS: services/partner-key-schema.js
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
// services/partner-key-schema.js

// Define the Partner Key Schema
const partnerKeySchema = {
  partnerId: {
    type: String,
    required: true,
    unique: true,
  },
  key: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  permissions: {
    type: Array,
    default: [],
  },
};

// Export the schema using ES module syntax
export { partnerKeySchema };
