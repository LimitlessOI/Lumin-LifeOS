/**
 * SYNOPSIS: HTTP route module — Lifeos Member Feedback Routes.
 */
import express from 'express';
import { processFeedback } from '../services/lifeos-member-feedback.js';

const router = express.Router();

router.post('/member-feedback', (req, res) => {
  const feedback = req.body.feedback;
  processFeedback(feedback);
  res.status(200).send('Feedback processed');
});

export const registerMemberFeedbackRoutes = (app) => app.use('/api', router);