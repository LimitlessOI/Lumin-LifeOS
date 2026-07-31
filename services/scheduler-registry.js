/**
 * SYNOPSIS: Central registry for background scheduler status in the founder runtime.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
const schedulers = new Map();

export function registerScheduler(name, details = {}) {
  schedulers.set(name, {
    name,
    added_at: new Date().toISOString(),
    ...details,
  });
  return name;
}

export function updateScheduler(name, details = {}) {
  const existing = schedulers.get(name) || { name, added_at: new Date().toISOString() };
  schedulers.set(name, { ...existing, ...details, updated_at: new Date().toISOString() });
}

export function getSchedulerStatus(name) {
  return schedulers.get(name) || null;
}

export function getAllSchedulerStatuses() {
  return Array.from(schedulers.values());
}

export function clearSchedulerRegistry() {
  schedulers.clear();
}
