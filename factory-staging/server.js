/**
 * Factory staging HTTP server.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import express from 'express';
import { registerFactoryRoutes } from './startup/register-routes.js';

const app = express();
app.use(express.json());

registerFactoryRoutes(app);

const PORT = Number(process.env.FACTORY_PORT || 3099);
const HOST = process.env.FACTORY_HOST || '127.0.0.1';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

if (!LOOPBACK_HOSTS.has(HOST) && !process.env.FACTORY_COMMAND_KEY && !process.env.COMMAND_CENTER_KEY) {
  throw new Error('Refusing to bind factory-staging externally without FACTORY_COMMAND_KEY or COMMAND_CENTER_KEY');
}

const server = app.listen(PORT, HOST, () => {
  console.log(`factory-staging listening on http://${HOST}:${PORT}`);
});

export { app, server };
