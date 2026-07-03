/**
 * SYNOPSIS: js — src/middleware/configMiddleware.js.
 */
const config = require('../config');

function configMiddleware(req, res, next) {
  req.config = config;
  next();
}

module.exports = configMiddleware;