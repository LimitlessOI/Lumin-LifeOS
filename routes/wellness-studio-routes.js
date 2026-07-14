/**
 * SYNOPSIS: Registers WellnessStudioRoutes routes/handlers (routes/wellness-studio-routes.js).
 */
import { getSessionsForUser, getSessionInsights } from './wellness-studio-data.js';
import { runWellnessSession } from './wellness-studio-orchestrator.js';

export function registerWellnessStudioRoutes(app, deps) {
  const { db, callCouncilMember, wellnessTherapist } = deps;

  app.get('/api/wellness-studio/sessions', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const sessions = await getSessionsForUser(db, req.user.id);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  });

  app.post('/api/wellness-studio/sessions', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const result = await runWellnessSession(callCouncilMember, wellnessTherapist, req.user);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to run wellness session' });
    }
  });

  app.get('/api/wellness-studio/sessions/:sessionId/insights', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const insights = await getSessionInsights(db, req.params.sessionId);
      res.json(insights);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get session insights' });
    }
  });
}