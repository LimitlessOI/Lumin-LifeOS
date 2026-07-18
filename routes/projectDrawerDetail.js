/**
 * SYNOPSIS: HTTP route module — ProjectDrawerDetail.
 */
import express from 'express';

function registerProjectDrawerRoutes(app) {
  const router = express.Router();

  router.get('/projectDrawerDetail', (req, res) => {
    const project = {
      id: 1,
      name: 'Sample Project',
      details: {
        description: 'A detailed description of the sample project.',
        owner: 'Owner Name',
      },
    };

    res.json({ project });
  });

  app.use('/api', router);
}

export { registerProjectDrawerRoutes };