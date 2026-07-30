/**
 * SYNOPSIS: Registers SalesPageRoutes routes/handlers (routes/salesPageRoutes.js).
 */
import express from 'express';

export function registerSalesPageRoutes(app) {
  const router = express.Router();

  // Route to serve the sales page for a specific offer tier
  router.get('/sales/:tier', (req, res) => {
    const { tier } = req.params;
    // In a real application, you would dynamically load
    // and render the sales page content based on the 'tier'.
    // For now, we'll send a simple placeholder.
    res.send(`<h1>Sales Page for ${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier</h1>
              <p>This is the sales page for the ${tier} offer.</p>
              <p>More details about this tier will go here.</p>`);
  });

  app.use('/', router);
}