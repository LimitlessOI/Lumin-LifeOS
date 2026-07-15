/**
 * SYNOPSIS: services/honeypotProbeService.js
 */
// services/honeypotProbeService.js

import express from 'express';

const probeRoutes = new Map(); // A map to store probe routes and their handlers

export function createProbeRoute(routePath, handler) {
  if (!probeRoutes.has(routePath)) {
    probeRoutes.set(routePath, handler);
  }
}

export function writeProbeReceipt(routePath, probeData) {
  if (probeRoutes.has(routePath)) {
    const handler = probeRoutes.get(routePath);
    handler(probeData);
  }
}

// Example usage with an express app
const app = express();

app.use(express.json());

probeRoutes.forEach((handler, routePath) => {
  app.post(routePath, (req, res) => {
    handler(req.body);
    res.status(200).send('Probe received');
  });
});

export { app as honeypotApp };
