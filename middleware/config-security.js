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