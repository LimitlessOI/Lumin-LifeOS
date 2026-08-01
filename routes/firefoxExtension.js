/**
 * SYNOPSIS: Registers a route for handling Firefox MV2 extension variants.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
// routes/firefoxExtension.js

// Function to register routes specific to the Firefox extension
export function registerFirefoxExtension(app, deps) {
  app.get('/extensions/firefox/mv2', deps.requireKey, async (req, res, next) => {
    try {
      // In a real scenario, this would involve fetching the MV2 manifest
      // or other relevant data for the Firefox MV2 extension.
      // For this task, we'll return a placeholder success message.
      deps.logger.info('Received request for firefox MV2 extension manifest');
      const manifest = {
        name: "LifeOS Universal Overlay",
        version: "1.0",
        manifest_version: 2,
        description: "A placeholder manifest for Firefox MV2 extension variants.",
        icons: {
          "48": "icons/lifeos-48.png"
        },
        browser_action: {
          default_icon: "icons/lifeos-48.png",
          default_popup: "popup/popup.html"
        },
        permissions: [
          "activeTab",
          "storage",
          "<all_urls>"
        ]
      };
      res.json(manifest);
    } catch (error) {
      deps.logger.error({ error }, 'Error in firefoxExtension MV2 route');
      next(error);
    }
  });
}

// Renamed from registerFirefoxRoutes to align with task requirements for the export name.
export { registerFirefoxExtension as registerFirefoxRoutes };