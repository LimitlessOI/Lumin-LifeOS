/**
 * SYNOPSIS: HTTP route module — VapiRoutes.
 */
import express from 'express';

const router = express.Router();

export const registerVapiRoutes = (app) => {
  app.use('/vapi', router);

  router.post('/account', (req, res) => {
    // Logic for creating a Vapi account
    res.status(200).send('Vapi account creation endpoint');
  });

  router.post('/setup', (req, res) => {
    // Logic for setting up Vapi functionalities
    res.status(200).send('Vapi setup endpoint');
  });
};