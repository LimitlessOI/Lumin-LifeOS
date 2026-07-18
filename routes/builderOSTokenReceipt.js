/**
 * SYNOPSIS: Registers BuilderOSTokenReceiptRoutes routes/handlers (routes/builderOSTokenReceipt.js).
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
import express from 'express';
import * as builderOSTokenReceiptService from '../services/builderOSTokenReceipt.js'; // Assuming this path for the service

export function registerBuilderOSTokenReceiptRoutes(app) {
  app.post('/builderOS/token-receipt', async (req, res) => {
    try {
      // Assuming the service function handles the necessary logic and input from req.body
      await builderOSTokenReceiptService.generateTokenReceipt(req.body); 
      res.status(200).send({ status: 'success', message: 'Token receipt generation triggered successfully.' });
    } catch (error) {
      console.error('Failed to trigger token receipt generation:', error); // Log the error for debugging
      res.status(500).send({ status: 'error', message: 'Failed to trigger token receipt generation.', details: error.message });
    }
  });
}
