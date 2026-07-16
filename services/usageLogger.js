/**
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Service module — UsageLogger.
 */
import fs from 'fs';

const token_usage_log = [];

function logUsage(entry) {
  if (!entry || !entry.provider || typeof entry.provider !== 'string') {
    throw new Error('provider must be a non-empty string');
  }
  token_usage_log.push(entry);
  saveLog();
}

function logUsageWithSavings(entry) {
  if (!entry || typeof entry.savings_pct !== 'number' || entry.savings_pct <= 0) {
    throw new Error('savings_pct must be a number greater than 0');
  }
  token_usage_log.push(entry);
  saveLog();
}

function saveLog() {
  fs.writeFileSync('token_usage_log.json', JSON.stringify(token_usage_log, null, 2));
}

export { logUsage, logUsageWithSavings };