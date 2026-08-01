/**
 * SYNOPSIS: Registers a route for handling Firefox MV2 extension variants.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
// routes/firefoxExtension.js
// firefox MV2 extension route support

// Registers the Firefox MV2 extension manifest route.
export function registerFirefoxExtension(app, deps = {}) {
  const requireKey = deps.requireKey || ((req, res, next) => next());
  const logger = deps.logger || console;

  app.get('/extensions/firefox/mv2', requireKey, async (req, res, next) => {
    try {
      // In a real scenario, this would involve fetching the MV2 manifest
      // or other relevant data for the Firefox MV2 extension.
      // For this task, we'll return a placeholder success message.
      logger.info('Received request for firefox MV2 extension manifest');
      const manifest = {
        name: "LifeOS Universal Overlay",
        version: "1.0",
        manifest_version: 2,
        description: "A placeholder manifest for firefox MV2 extension variants.",
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
      logger.error({ error }, 'Error in firefoxExtension MV2 route');
      next(error);
    }
  });
}

// Alias for BUILD_QUEUE expected export.
export function registerFirefoxRoutes(app, deps = {}) {
  return registerFirefoxExtension(app, deps);
}

// Alias for the original export name.
export function registerFirefoxExtensionRoutes(app, deps = {}) {
  return registerFirefoxExtension(app, deps);
}
