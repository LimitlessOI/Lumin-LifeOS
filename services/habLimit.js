/**
 * SYNOPSIS: Service module — HabLimit.
 */
const habLimits = new Map();

function resetLimits() {
  habLimits.clear();
}

setInterval(resetLimits, 24 * 60 * 60 * 1000); // Reset every 24 hours

function enforceHABLimit(apiKey) {
  if (!habLimits.has(apiKey)) {
    habLimits.set(apiKey, 0);
  }

  const currentCount = habLimits.get(apiKey);

  if (currentCount >= 100) {
    return false; // Limit exceeded
  }

  habLimits.set(apiKey, currentCount + 1);
  return true; // Call allowed
}

export { enforceHABLimit };
