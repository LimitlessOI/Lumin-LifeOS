import crypto from 'crypto';
// Assuming 'twilio' package is installed and available for import
import { validateRequest as twilioValidateRequest } from 'twilio/lib/webhooks/webhooks';

/**
 * Middleware to capture the raw request body.
 * This is necessary for HMAC signature validation where the raw body is hashed.
 * Should be placed before express.json() or express.urlencoded() middleware.
 */
function rawBodyMiddleware(req, res, next) {
  // Only capture raw body for POST requests with relevant content types
  if (req.method === 'POST' && (req.headers['content-type']?.startsWith('application/json') || req.headers['content-type']?.startsWith('application/x-www-form-urlencoded'))) {
    let data = '';
    req