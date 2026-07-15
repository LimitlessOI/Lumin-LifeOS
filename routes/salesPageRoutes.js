/**
 * SYNOPSIS: HTTP route module — SalesPageRoutes.
 */
import express from 'express';

const router = express.Router();

function registerSalesPageRoutes() {
  // Define the route for the basic offer tier
  router.get('/sales/basic', (req, res) => {
    res.send('Sales page for Basic Offer Tier');
  });

  // Define the route for the premium offer tier
  router.get('/sales/premium', (req, res) => {
    res.send('Sales page for Premium Offer Tier');
  });

  // Define the route for the elite offer tier
  router.get('/sales/elite', (req, res) => {
    res.send('Sales page for Elite Offer Tier');
  });
}

export { registerSalesPageRoutes };