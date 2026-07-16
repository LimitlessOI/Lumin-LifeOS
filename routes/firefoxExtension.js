/**
 * SYNOPSIS: Ensure we are using ES Module syntax
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
// Ensure we are using ES Module syntax
export function registerFirefoxExtensionRoutes(app) {
  // Implement route registration logic here
  app.get('/firefox-extension', (req, res) => {
    res.send('Firefox Extension Route');
  });
}

// Export the register function to meet the MUST:EXPORT requirement
export default {
  registerFirefoxExtensionRoutes
};
