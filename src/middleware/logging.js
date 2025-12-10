const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

module.exports = function (req, res, next) {
  logger.info(`Request: ${req.method} ${req.url}`);
  next();
};