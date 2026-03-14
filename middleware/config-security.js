/**
 * Config Security Middleware — logs a warning via Winston whenever a request
 * path contains the substring '/sensitive', flagging potential sensitive-data access.
 *
 * Dependencies: winston (npm), process.env.LOG_LEVEL
 * Exports: configSecurity (Express middleware function) via module.exports
 */
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    new winston.transports.Console(),
  ],
});

function configSecurity(req, res, next) {
  res.on('finish', () => {
    if (req.path.includes('/sensitive')) {
      logger.warn('Sensitive data access attempted', {
        path: req.path,
        method: req.method,
      });
    }
  });
  next();
}

module.exports = configSecurity;