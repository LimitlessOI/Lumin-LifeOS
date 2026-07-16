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
function persistCooldown(providerId, cooldown) {
    db.cooldowns[providerId] = cooldown;
}

/**
 * Retrieves the cooldown for a given provider.
 * @param {string} providerId - The unique identifier for the provider.
 * @returns {number|null} - The cooldown time if exists, otherwise null.
 */
function retrieveCooldown(providerId) {
    return db.cooldowns[providerId] || null;
}

/**
 * Retrieves all provider cooldowns.
 * @returns {Object} - An object containing all provider cooldowns.
 */
function getCooldowns() {
    return db.cooldowns;
}

export { persistCooldown as persistCooldowns, retrieveCooldown as retrieveCooldowns, getCooldowns };
