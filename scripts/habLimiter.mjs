/**
 * SYNOPSIS: HAB (Human/AI Budget) limiter — enforce a daily call cap per key.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */

const DAILY_LIMIT = 100;
const usage = new Map(); // key -> { date: YYYY-MM-DD, count: number }

/**
 * enforceHABLimit(key)
 * Returns true if the call is allowed, false if the daily cap is exceeded.
 * Resets the counter at UTC midnight.
 */
export function enforceHABLimit(key) {
  if (!key) return false;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const record = usage.get(key) || { date: today, count: 0 };
  if (record.date !== today) {
    record.date = today;
    record.count = 0;
  }
  if (record.count >= DAILY_LIMIT) {
    return false;
  }
  record.count += 1;
  usage.set(key, record);
  return true;
}

/**
 * getHABUsage(key)
 * Expose current usage for observability.
 */
export function getHABUsage(key) {
  return usage.get(key) || { date: new Date().toISOString().slice(0, 10), count: 0 };
}
