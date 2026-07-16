/**
 * SYNOPSIS: Registers VapiRoutes routes/handlers (routes/vapiRoutes.js).
 * @ssot docs/products/ai-receptionist/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

function createVapiAccount(req, res) {
  // Logic to create Vapi account
  res.send('Vapi account created');
}

function setupVapiAccount(req, res) {
  // Logic to setup Vapi account
  res.send('Vapi account setup');
}

router.post('/vapi/create', createVapiAccount);
router.post('/vapi/setup', setupVapiAccount);

export function registerVapiRoutes(app) {
  app.use('/api', router);
}
