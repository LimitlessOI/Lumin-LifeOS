/**
 * SYNOPSIS: Simulated in-memory database for cooldowns
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
// Simulated in-memory database for cooldowns
const db = {
    cooldowns: {}
};

/**
 * Persists the cooldown for a given provider.
 * @param {string} providerId - The unique identifier for the provider.
 * @param {number} cooldown - The cooldown time to be persisted.
 */
export function persistCooldown(providerId, cooldown) {
    db.cooldowns[providerId] = cooldown;
}

/**
 * Retrieves the cooldown for a given provider.
 * @param {string} providerId - The unique identifier for the provider.
 * @returns {number|null} - The cooldown time if exists, otherwise null.
 */
export function retrieveCooldown(providerId) {
    return db.cooldowns[providerId] || null;
}

export { persistCooldown as persistCooldowns, retrieveCooldown as retrieveCooldowns };
