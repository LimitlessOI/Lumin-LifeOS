/**
 * SYNOPSIS: Private mode extension router.
 */
import { Router } from 'express';

/**
 * Private mode extension router.
 *
 * Enhances private witness mode to influence the public publishing guard
 * completely via safe defaults. Any route registered here will run before
 * the public publishing guard, allowing private mode to veto or allow
 * publishing based on safe defaults.
 */

const router = Router();

/**
 * Safe default guard state.
 *
 * When private mode is active, publishing is only allowed if the request
 * explicitly opts into a safe default (e.g. `?allowPublish=true`).
 * Otherwise, publishing is blocked by default.
 */
const safeDefaults = {
  allowPublishByDefault: false,
};

/**
 * Middleware that applies private mode safe defaults to the request.
 *
 * If private mode is enabled (via `req.privateMode` or a header), it sets
 * `req.publishAllowed` based on the safe default unless overridden.
 */
router.use((req, res, next) => {
  const privateModeActive =
    req.privateMode === true ||
    req.headers['x-private-mode'] === 'true';

  if (privateModeActive) {
    const explicitAllow =
      req.query.allowPublish === 'true' ||
      req.headers['x-allow-publish'] === 'true';

    req.publishAllowed = explicitAllow || safeDefaults.allowPublishByDefault;
  } else {
    req.publishAllowed = true;
  }

  next();
});

/**
 * Explicitly block publishing when private mode is active and safe defaults
 * do not allow it.
 */
router.post('/guard/publish', (req, res) => {
  if (req.publishAllowed === false) {
    return res.status(403).json({
      error: 'PUBLISH_BLOCKED_BY_PRIVATE_MODE',
      message: 'Publishing is blocked by private mode safe defaults.',
    });
  }

  return res.status(200).json({
    allowed: true,
    privateMode: req.privateMode === true || req.headers['x-private-mode'] === 'true',
  });
});

/**
 * Register all private mode extension routes onto the given Express app.
 *
 * @param {import('express').Express} app - The Express application.
 */
export function registerPrivateModeExtensions(app) {
  app.use('/private-mode', router);
}
