/**
 * SYNOPSIS: HTTP route module — Audit Data Sources Routes.
 */
import express from 'express';

const auditDataSources = [
  { name: 'Plaid', type: 'live' },
  { name: 'Manual Intake', type: 'live' },
  { name: 'OAuth', type: 'live' },
];

function getLiveAuditDataSources(req, res) {
  res.json(auditDataSources);
}

function registerAuditDataSourcesRoutes(app) {
  const router = express.Router();
  router.get('/audit-data-sources', getLiveAuditDataSources);
  app.use('/api', router);
}

export { registerAuditDataSourcesRoutes };
