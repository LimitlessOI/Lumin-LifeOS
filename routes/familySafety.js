/**
 * SYNOPSIS: Existing middleware and handlers
 */
import express from 'express';

const router = express.Router();

// Existing middleware and handlers
function defaultSafetySettings(req, res, next) {
  req.safetySettings = {
    familySafe: true,
    churchSafe: true,
    classroomSafe: true,
  };
  next();
}

// Enforce stricter default safety settings
function enforceStricterSafetySettings(req, res, next) {
  req.safetySettings = {
    familySafe: true,
    churchSafe: true,
    classroomSafe: true,
    adultContentBlocked: true, // New stricter setting
    violenceContentBlocked: true, // New stricter setting
  };
  next();
}

router.use(enforceStricterSafetySettings);

router.get('/status', (req, res) => {
  res.json({
    message: 'Safety settings applied',
    settings: req.safetySettings,
  });
});

function registerFamilySafetyRoutes(app) {
  app.use('/family-safety', router);
}

export { registerFamilySafetyRoutes };