/**
 * SYNOPSIS: Registers TestingResponse routes/handlers (routes/testing-response.js).
 */
import express from 'express';

const router = express.Router();

function verifyApiReadiness(req, res) {
  res.status(200).json({ message: 'API is ready and functioning.' });
}

export function registerTestingResponse(app) {
  app.use('/testing-response', router);
}

router.get('/', verifyApiReadiness);

export { verifyApiReadiness };
