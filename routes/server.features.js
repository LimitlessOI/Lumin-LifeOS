/**
 * SYNOPSIS: HTTP route module — Server.Features.
 */
import express from 'express';

export const registerFeatureRoutes = (app) => {
  const router = express.Router();

  // Example sub-feature route:
  router.get('/features/example', (req, res) => {
    res.send('This is an example feature route.');
  });

  // Add more feature-specific routes here
  // For instance, you could import and use routers from other feature modules:
  // import { userRouter } from './userFeature/user.routes.js';
  // router.use('/features/users', userRouter);

  app.use(router);
};