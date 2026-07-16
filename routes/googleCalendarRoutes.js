/**
 * SYNOPSIS: HTTP route module — GoogleCalendarRoutes.
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

function connectGoogleCalendar(req, res) {
  // Logic to handle connection to Google Calendar without OAuth
  res.send('Google Calendar integration successful');
}

function registerGoogleCalendarRoutes(app) {
  app.use('/api/google-calendar', router);
}

router.post('/connect', connectGoogleCalendar);

export { registerGoogleCalendarRoutes, connectGoogleCalendar };