/**
 * SYNOPSIS: Registers PwaInstallRoutes routes/handlers (routes/pwaInstall.js).
 */
import express from 'express';

const router = express.Router();

router.post('/install', (req, res) => {
  // Track the PWA installation
  // You can add logic here to handle the installation tracking
  res.status(200).send('PWA installation tracked');
});

export function registerPwaInstallRoutes(app) {
  app.use('/pwa', router);
}
