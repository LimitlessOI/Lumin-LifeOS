import express from 'express';
import { registerFactoryRoutes } from './startup/register-routes.js';

const app = express();
app.use(express.json());

registerFactoryRoutes(app);

const PORT = Number(process.env.FACTORY_PORT || 3099);
const server = app.listen(PORT, () => {
  console.log(`factory-staging listening on http://127.0.0.1:${PORT}`);
});

export { app, server };
