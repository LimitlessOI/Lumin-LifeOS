/**
 * SYNOPSIS: js — server.js.
 */
import app from './src/app.js';
import config from './src/config.js';
import logger from './src/utils/logger.js';

const PORT = config.port;

const startServer = () => {
  app.listen(PORT, () => {
    logger.info(`LifeOS server running in ${config.env} mode on port ${PORT}`);
  });
};

startServer();