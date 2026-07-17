/**
 * SYNOPSIS: Service module — ProactiveToastSystem.
 */
let userPreferences = {};

class Toast {
  constructor(message, options = {}) {
    this.message = message;
    this.dismissible = options.dismissible || true;
    this.autoDismiss = options.autoDismiss || false;
    this.duration = options.duration || 5000;
    this.id = options.id || new Date().getTime();
  }
}

class ProactiveToastSystem {
  constructor() {
    this.toasts = [];
  }

  showToast(message, options) {
    const toast = new Toast(message, options);
    this.toasts.push(toast);
    this.renderToast(toast);
    if (toast.autoDismiss) {
      setTimeout(() => this.dismissToast(toast.id), toast.duration);
    }
  }

  dismissToast(id) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.removeToastFromUI(id);
  }

  renderToast(toast) {
    console.log(`Displaying toast: ${toast.message}`);
    // Add code to display toast in UI
    if (toast.dismissible) {
      console.log(`Toast is dismissible`);
      // Add dismiss button to UI
    }
  }

  removeToastFromUI(id) {
    console.log(`Removing toast with id: ${id}`);
    // Add code to remove toast from UI
  }

  saveUserPreference(key, value) {
    userPreferences[key] = value;
  }

  getUserPreference(key) {
    return userPreferences[key];
  }
}

export { ProactiveToastSystem };
