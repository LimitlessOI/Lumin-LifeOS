/**
 * SYNOPSIS: Exports persistCooldowns — services/providerCooldownManager.js.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */

const db = {
    cooldowns: {}
};

export function persistCooldowns(providerId, cooldown) {
    db.cooldowns[providerId] = cooldown;
}

export function getCooldowns(providerId) {
    return db.cooldowns[providerId] || null;
}