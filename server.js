/**
 * SYNOPSIS: js — server.js.
 */
import app from './src/app.js';
import config from './src/config.js';
import logger from './src/utils/logger.js';

const PORT = config.port;
let server;

const startServer = () => {
  server = app.listen(PORT, () => {
    logger.info(`LifeOS server running in ${config.env} mode on port ${PORT}`);
  });
};

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});

startServer();