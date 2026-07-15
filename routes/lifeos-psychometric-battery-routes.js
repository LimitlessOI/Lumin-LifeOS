/**
 * SYNOPSIS: HTTP route module — Lifeos Psychometric Battery Routes.
 */
import express from 'express';

const router = express.Router();

function getPsychometricBattery(req, res) {
  res.send('Get Psychometric Battery');
}

function postPsychometricBattery(req, res) {
  res.send('Post Psychometric Battery');
}

function registerPsychometricRoutes(app) {
  app.use('/psychometric-battery', router);
}

router.get('/', getPsychometricBattery);
router.post('/', postPsychometricBattery);

export { registerPsychometricRoutes };
