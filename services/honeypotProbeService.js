/**
 * SYNOPSIS: A map to store probe routes and their handlers
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
import express from 'express';

// A map to store probe routes and their handlers
const probeRoutes = new Map();

// Dummy database function to simulate inserting into honeypot_probe_routes table
function insertProbeReceipt(routePath, probeData) {
  // Simulate database insertion logic
  console.log(`Inserting probe data for ${routePath}:`, probeData);
}

// Add a honeypot probe route and its corresponding handler
export function addHoneypotProbeRoute(routePath, handler) {
  if (!probeRoutes.has(routePath)) {
    probeRoutes.set(routePath, handler);
  }
}

// Write the probe receipt into the honeypot_probe_routes table
export function writeProbeReceipt(routePath, probeData) {
  if (probeRoutes.has(routePath)) {
    insertProbeReceipt(routePath, probeData);
    const handler = probeRoutes.get(routePath);
    handler(probeData);
  }
}

// Get the list of probe routes for external use
export function getProbeRoutes() {
  return Array.from(probeRoutes.keys());
}

// Example usage with an express app
const app = express();

app.use(express.json());

// Dynamically add routes based on the probeRoutes map
probeRoutes.forEach((handler, routePath) => {
  app.post(routePath, (req, res) => {
    writeProbeReceipt(routePath, req.body); // Use writeProbeReceipt to log the data
    res.status(200).send('Probe received');
  });
});

export { app as honeypotApp };
