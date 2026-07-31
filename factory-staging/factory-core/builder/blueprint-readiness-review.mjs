/**
 * SYNOPSIS: Blueprint Readiness Review gate — rejects blueprints with missing
 * requirements, ambiguous acceptance, or undefined edge cases and routes them
 * back for revision.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
export { reviewBlueprint } from './blueprint-generator.mjs';
