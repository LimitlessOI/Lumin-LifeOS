/**
 * Clamps a given count to be within the range of 1 to 6, inclusive.
 * Useful for limiting the number of mobile widgets displayed.
 * @param {number} count - The raw widget count.
 * @returns {number} The clamped widget count (1-6).
 */
export function clampMobileWidgetCount(count) {