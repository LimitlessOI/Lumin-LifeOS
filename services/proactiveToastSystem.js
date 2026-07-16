/**
 * SYNOPSIS: Service module — ProactiveToastSystem.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
let userPreferences = {};

const toasts = [];

function showToast(message, dismissible = true) {
  const toast = { message, dismissible, id: Date.now() };
  toasts.push(toast);
  displayToast(toast);
}

function displayToast(toast) {
  console.log(`Toast: ${toast.message} ${toast.dismissible ? '(Dismissible)' : ''}`);
}

function dismissToast(toastId) {
  const index = toasts.findIndex(t => t.id === toastId);
  if (index !== -1) {
    toasts.splice(index, 1);
    console.log(`Toast with id ${toastId} dismissed.`);
  }
}

function registerProactiveToast(message, userId) {
  const userPref = userPreferences[userId];
  if (userPref && userPref.dismissible === false) {
    showToast(message, false);
  } else {
    showToast(message);
  }
}

function setUserPreferences(userId, preferences) {
  userPreferences[userId] = preferences;
}

function setupProactiveToastSystem() {
  // Placeholder for any initialization logic needed for the toast system
  // For example: loading user preferences from a persistent store
  console.log("Proactive Toast System setup complete.");
}

export { registerProactiveToast, setUserPreferences, dismissToast, setupProactiveToastSystem };
