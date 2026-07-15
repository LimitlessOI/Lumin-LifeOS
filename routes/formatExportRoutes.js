/**
 * SYNOPSIS: Registers FormatExportRoutes routes/handlers (routes/formatExportRoutes.js).
 */
import express from 'express';

const router = express.Router();

export function registerFormatExportRoutes(app) {
  app.use('/export', router);

  router.get('/stories/to-pdf', (req, res) => {
    // Logic to export stories to PDF
    res.send('Exporting stories to PDF format.');
  });

  router.get('/stories/to-csv', (req, res) => {
    // Logic to export stories to CSV
    res.send('Exporting stories to CSV format.');
  });

  router.get('/stories/to-json', (req, res) => {
    // Logic to export stories to JSON
    res.send('Exporting stories to JSON format.');
  });
}