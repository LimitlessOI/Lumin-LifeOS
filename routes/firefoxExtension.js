/**
 * SYNOPSIS: Ensure we are using ES Module syntax
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
// Ensure we are using ES Module syntax
export function registerFirefoxRoutes(app) {
  // Implement route registration logic here
  app.get('/firefox-extension', (req, res) => {
    // Provide a manifest.json for MV2 Firefox extensions
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      "manifest_version": 2,
      "name": "Universal Overlay Firefox Extension",
      "version": "1.0",
      "description": "MV2 compatible extension for Universal Overlay.",
      "icons": {
        "48": "icons/icon-48.png"
      },
      "permissions": [
        "activeTab",
        "storage",
        "<all_urls>"
      ],
      "browser_action": {
        "default_icon": "icons/icon-48.png",
        "default_popup": "popup/popup.html"
      },
      "background": {
        "scripts": ["background.js"]
      }
    }));
  });
}

// Export the register function to meet the MUST:EXPORT requirement
export default {
  registerFirefoxRoutes
};
