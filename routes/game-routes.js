/**
 * Game Publisher Routes
 * Extracted from server.js
 */
import logger from '../services/logger.js';

export function createGameRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    callCouncilMember,
    GamePublisher,
    gameGenerator,
    logger,
  } = ctx;

// ==================== GAME PUBLISHER ENDPOINTS (Phaser.js → deployed URL) ====================
let gamePublisher = null;

function getGamePublisher() {
  if (!gamePublisher) {
    gamePublisher = new GamePublisher({ callCouncil: callCouncilMember });
    // Serve built games at /games/*
    app.use('/games', async (req, res, next) => {
      const { join } = await import('path');
      const filePath = join(process.cwd(), 'public/games', req.path === '/' ? '/index.html' : req.path);
      res.sendFile(filePath, (err) => { if (err) next(); });
    });
  }
  return gamePublisher;
}

// Build + publish a game from an idea description
app.post("/api/v1/games/build", requireKey, async (req, res) => {
  try {
    const { idea, type = 'arcade', features = [], title } = req.body;
    if (!idea) return res.status(400).json({ ok: false, error: 'idea is required' });

    logger.info('[ROUTE] Building game', { type, idea: idea.slice(0, 60) });
    const publisher = getGamePublisher();
    const result = await publisher.buildAndPublish({ idea, type, features, title });

    res.json({ ok: result.success, ...result });
  } catch (error) {
    logger.error('[ROUTE] Game build failed', { error: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
});

// List all built games
app.get("/api/v1/games", requireKey, async (req, res) => {
  try {
    const publisher = getGamePublisher();
    const games = await publisher.listGames();
    res.json({ ok: true, count: games.length, games });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Legacy compatibility — redirect old generate endpoint to new build
app.post("/api/v1/games/generate", requireKey, async (req, res) => {
  const { gameType, complexity } = req.body;
  req.body.idea = req.body.idea || `A ${complexity || 'simple'} ${gameType || 'arcade'} game`;
  req.body.type = gameType || 'arcade';

  if (!gameGenerator) {
    // Use new publisher if old generator not init
    try {
      const publisher = getGamePublisher();
      const result = await publisher.buildAndPublish(req.body);
      return res.json({ ok: result.success, ...result });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  }
  // Fall through to old generator if it's initialized
  try {
    const result = await gameGenerator.generateGame({ gameType, complexity });
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});


}
