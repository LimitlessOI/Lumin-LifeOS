/**
 * SYNOPSIS: Real, minimal shared runtime store for the Taloa overlay service
 * chain — in-memory by default (safe: no untested schema assumptions against
 * a live production database), structured so a real Postgres-backed
 * implementation can replace the internals later without changing any
 * caller's contract. Every method here does real work; nothing is mocked.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

export function createTaloaRuntimeStore() {
  const tasks = new Map();
  const receipts = [];
  const capsules = new Map();
  const preferences = new Map();

  return {
    // --- Tasks ---
    createTask(task) {
      tasks.set(task.id, { ...task });
      return { ...task };
    },
    getTask(taskId) {
      return tasks.get(taskId) || null;
    },
    updateTask(taskId, patch) {
      const existing = tasks.get(taskId);
      if (!existing) return null;
      const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
      tasks.set(taskId, updated);
      return { ...updated };
    },

    // --- Receipts (append-only per §14a ReceiptLedger role) ---
    appendReceipt(receipt) {
      const stamped = { ...receipt, id: `receipt-${receipts.length + 1}`, recorded_at: new Date().toISOString() };
      receipts.push(stamped);
      return { ...stamped };
    },
    getReceipt(receiptId) {
      return receipts.find((r) => r.id === receiptId) || null;
    },
    getReceiptsForTask(taskId) {
      return receipts.filter((r) => r.task_id === taskId).map((r) => ({ ...r }));
    },
    allReceipts() {
      return receipts.map((r) => ({ ...r }));
    },

    // --- Capsules ---
    registerCapsule(capsule) {
      capsules.set(capsule.id, { ...capsule });
      return { ...capsule };
    },
    getCapsule(capsuleId) {
      return capsules.get(capsuleId) || null;
    },

    // --- Preferences (minimal PreferenceStore stand-in, §65b.E) ---
    getPreference(userId, key, fallback = null) {
      return preferences.get(`${userId}:${key}`) ?? fallback;
    },
    setPreference(userId, key, value) {
      preferences.set(`${userId}:${key}`, value);
      return value;
    },
  };
}

export default createTaloaRuntimeStore;
