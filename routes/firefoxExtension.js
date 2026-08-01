/**
 * SYNOPSIS: routes/firefoxExtension.js
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
// routes/firefoxExtension.js
// firefox MV2 extension route support

// Function to register routes specific to the Firefox extension
export function registerFirefoxExtensionRoutes(app, deps = {}) {
    // Implement routing logic for Firefox extension here
    console.log('Registering routes for Firefox extension with MV2 support');
    registerFirefoxRoutes(app, deps);
}

// Register a route specific for Firefox MV2 extension variants
export function registerFirefoxRoutes(app, deps = {}) {
    const requireKey = deps.requireKey || ((req, res, next) => next());

    app.get('/extensions/firefox/mv2', requireKey, (req, res) => {
        res.status(200).json({
            message: 'Firefox MV2 extension variant endpoint active',
            variant: 'mv2',
            firefox: true,
        });
    });

    console.log('Registering routes for Firefox MV2 extension variants');
}
