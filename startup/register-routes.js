import { errorBoundary } from '../middleware/error-boundary.js';
import { registerWebsiteAuditRoutes } from '../routes/website-audit-routes.js';
import { registerEnhancedCouncilRoutes } from '../routes/enhanced-council-routes.js';
import { createApiCostSavingsRoutes } from '../routes/api-cost-savings-routes.js';
import { createIdeaQueueRoutes } from '../routes/idea-queue-routes.js';
import { createTwinRoutes } from '../routes/twin-routes.js';
import { createConversationHistoryRoutes } from '../routes/conversation-history-routes.js';
import { createWordKeeperRoutes } from '../routes/word-keeper-routes.js';
import { createAutonomyRoutes } from '../routes/autonomy-routes.js';
import { createRailwayManagedEnvRoutes } from '../routes/railway-managed-env-routes.js';
import { createAccountManagerRoutes } from '../routes/account-manager-routes.js';
import { createTCRoutes } from '../routes/tc-routes.js';
import { createMLSRoutes } from '../routes/mls-routes.js';
import { createTCCoordinator } from '../services/tc-coordinator.js';
import { registerServerRoutes } from './routes/server-routes.js';

export function registerRuntimeRoutes(app, deps) {
  const {
    express,
    memoryRoutes,
    stripeRoutes,
    requireKey,
    getAllFlags,
    OLLAMA_ENDPOINT,
    pool,
    autoBuilder,
    syncStripeRevenue,
    financialDashboard,
    roiTracker,
    logger,
    commitToGitHub,
    getAllQueueStats,
    rootDir,
    telemetry,
    podManager,
    callCouncilMember,
    callCouncilWithFailover,
    apiCostSavingsRevenue,
    getStripeClient,
    publicDomain,
    autonomyOrchestrator,
    railwayManagedEnvService,
    accountManager,
    notificationService,
    getRailwayEnvVars,
    setRailwayEnvVar,
    setRailwayEnvVars,
    triggerRailwayRedeploy,
  } = deps;

  registerServerRoutes(app, {
    express,
    memoryRoutes,
    stripeRoutes,
    requireKey,
    getAllFlags,
    OLLAMA_ENDPOINT,
    pool,
    autoBuilder,
    syncStripeRevenue,
    financialDashboard,
    roiTracker,
    logger,
    commitToGitHub,
    getAllQueueStats,
    rootDir,
    telemetry,
    podManager,
  });

  registerWebsiteAuditRoutes(app, {
    requireKey,
    callCouncilWithFailover,
  });

  registerEnhancedCouncilRoutes(app, pool, callCouncilMember, requireKey);

  createApiCostSavingsRoutes(app, {
    pool,
    requireKey,
    apiCostSavingsRevenue,
    getStripeClient,
    RAILWAY_PUBLIC_DOMAIN: publicDomain,
  });
  logger.info('OK [API-COST-SAVINGS] Routes mounted at /api/v1/cost-savings + /api/v1/revenue/api-cost-savings');

  app.use('/api/v1/ideas', createIdeaQueueRoutes({ pool, requireKey, callCouncilMember }));
  logger.info('OK [IDEA-QUEUE] Routes mounted at /api/v1/ideas');

  app.use('/api/v1/twin', createTwinRoutes({ pool, requireKey, callCouncilMember }));
  logger.info('OK [TWIN] Routes mounted at /api/v1/twin');

  app.use('/api/v1/history', createConversationHistoryRoutes({ pool, requireKey, callCouncilMember }));
  logger.info('OK [HISTORY] Routes mounted at /api/v1/history');

  const wordKeeperCouncil = {
    ask: (prompt, opts = {}) => callCouncilMember(opts.model || 'claude', prompt, opts.systemPrompt || '', opts),
  };
  app.use('/api/v1/word-keeper', createWordKeeperRoutes({ pool, councilService: wordKeeperCouncil, twilioService: null }));
  logger.info('OK [WORD-KEEPER] Routes mounted at /api/v1/word-keeper');

  autonomyOrchestrator.start();
  app.use('/api/v1/autonomy', createAutonomyRoutes({ pool, requireKey, orchestrator: autonomyOrchestrator }));
  logger.info('OK [AUTONOMY] Orchestrator started + routes mounted at /api/v1/autonomy');

  app.use('/api/v1/railway/managed-env', createRailwayManagedEnvRoutes({
    requireKey,
    managedEnvService: railwayManagedEnvService,
  }));
  logger.info('OK [RAILWAY-MANAGED-ENV] Routes mounted at /api/v1/railway/managed-env');

  app.use('/api/v1/accounts', createAccountManagerRoutes({ requireKey, accountManager, pool, logger }));
  logger.info('OK [ACCOUNT-MANAGER] Routes mounted at /api/v1/accounts');

  const tcCoordinator = createTCCoordinator({ pool, accountManager, notificationService, callCouncilMember, logger });
  createTCRoutes(app, { pool, requireKey, coordinator: tcCoordinator, logger });
  createMLSRoutes(app, { pool, requireKey, callCouncilMember, logger });

  app.get('/api/v1/railway/env', requireKey, async (req, res) => {
    try {
      const vars = await getRailwayEnvVars();
      const masked = Object.fromEntries(
        Object.entries(vars).map(([key, value]) => [key, `${String(value).slice(0, 4)}****`])
      );
      res.json({ ok: true, vars: masked, count: Object.keys(masked).length });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/v1/railway/env', requireKey, async (req, res) => {
    try {
      const { name, value } = req.body;
      if (!name || value === undefined) {
        return res.status(400).json({ ok: false, error: 'name and value are required' });
      }
      await setRailwayEnvVar(name, value);
      res.json({ ok: true, set: name });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/v1/railway/env/bulk', requireKey, async (req, res) => {
    try {
      const { vars } = req.body;
      if (!vars || typeof vars !== 'object') {
        return res.status(400).json({ ok: false, error: 'vars must be an object { KEY: value }' });
      }
      const results = await setRailwayEnvVars(vars);
      res.json({ ok: true, results });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/v1/railway/deploy', requireKey, async (req, res) => {
    try {
      await triggerRailwayRedeploy();
      res.json({ ok: true, message: 'Redeploy triggered on Railway' });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get('/healthz', async (req, res) => {
    const checks = {
      server: 'ok',
      db: 'unknown',
      ai: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing_key',
      email: process.env.POSTMARK_SERVER_TOKEN ? 'configured' : 'not_configured',
    };

    try {
      await pool.query('SELECT 1');
      checks.db = 'ok';
    } catch (error) {
      checks.db = `error: ${error.message}`;
    }

    const allOk = checks.db === 'ok' && checks.ai === 'configured';
    res.status(allOk ? 200 : 503).json({
      status: allOk ? 'healthy' : 'degraded',
      checks,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/v1/queue/stats', requireKey, async (req, res) => {
    try {
      const stats = await getAllQueueStats();
      res.json({ ok: true, queues: stats });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.use(errorBoundary(logger));

  return {
    tcCoordinator,
    wordKeeperCouncil,
  };
}
