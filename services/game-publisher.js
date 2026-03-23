/**
 * Game Publisher — AI-generated Phaser.js games → deployed web URL
 *
 * Flow:
 *   Spec (text) → Council generates Phaser.js code → Validate → Deploy to /public/games/ → Return URL
 *
 * Engine: Phaser.js 3 (best choice for AI-generated browser games)
 *   - Pure JavaScript, no build step required
 *   - AI can generate a complete working game in one file
 *   - Runs in any browser instantly
 *   - Rich feature set: physics, sprites, tilemaps, sound, input
 *
 * Game types supported:
 *   platformer, runner, puzzle, card, arcade, rpg, quiz, clicker
 *
 * Deployment:
 *   Local:  saved to /public/games/{gameId}/ — served via Express
 *   Future: Vercel/Netlify auto-deploy via API
 *
 * Usage:
 *   import GamePublisher from './services/game-publisher.js';
 *   const publisher = new GamePublisher({ callCouncil });
 *   const result = await publisher.buildAndPublish({
 *     idea: 'A platformer game set in a futuristic city with a robot hero',
 *     type: 'platformer',
 *     features: ['double-jump', 'enemies', 'coins', 'score'],
 *   });
 *   // result.gameUrl — e.g. https://yourdomain.com/games/game_abc123
 * @ssot docs/projects/AMENDMENT_06_GAME_PUBLISHER.md
 */

import { promises as fs } from 'fs';
import path from 'path';
import logger from './logger.js';

const PHASER_CDN = 'https://cdn.jsdelivr.net/npm/phaser@3.87.0/dist/phaser.min.js';

// Game type → Phaser-specific instructions for the AI
const GAME_TYPE_HINTS = {
  platformer: 'Use Phaser.Physics.Arcade. Include player sprite with left/right/jump controls (cursor keys). Add platforms, enemies, and collectibles. Use tilemaps or manual platform groups.',
  runner: 'Infinite side-scroller. Player auto-runs, tap/space to jump. Procedurally generate obstacles. Track distance score.',
  puzzle: 'Grid-based. Mouse/touch input. Win condition when puzzle solved. Include level progression.',
  card: 'Card game mechanics. Click to select, drag to play. Deck management. Score tracking.',
  arcade: 'Top-down or fixed shooter. Arrow keys or WASD to move. Space to shoot. Waves of enemies.',
  rpg: 'Top-down movement. Dialogue system. Inventory with simple items. Quest tracking.',
  quiz: 'Multiple choice questions. Timer per question. Score at end. Confetti/celebration on win.',
  clicker: 'Click target to score. Upgrades. Idle mechanics. Persistent score.',
};

const PHASER_TEMPLATE = (gameId, title, gameCode) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; }
    #game-container { max-width: 100vw; max-height: 100vh; }
    #game-info { color: #fff; padding: 8px; font-size: 12px; opacity: 0.6; }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <div id="game-info">Game ID: ${gameId} | Built by AI Counsel OS</div>
  <script src="${PHASER_CDN}"></script>
  <script>
${gameCode}
  </script>
</body>
</html>`;

export default class GamePublisher {
  constructor({ callCouncil, gamesDir = 'public/games' } = {}) {
    this.callCouncil = callCouncil;
    this.gamesDir = gamesDir;
    this.games = new Map(); // gameId → metadata
  }

  /**
   * Full pipeline: idea → Phaser.js code → validate → deploy → return URL
   */
  async buildAndPublish(options = {}) {
    const {
      idea,
      type = 'arcade',
      features = [],
      title,
      width = 800,
      height = 600,
    } = options;

    const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const gameTitle = title || `Game: ${idea.slice(0, 40)}`;

    logger.info('[GAME] Building game', { gameId, type, idea: idea.slice(0, 60) });

    try {
      // Step 1: Generate Phaser.js code via AI council
      const code = await this.generateGameCode({ idea, type, features, width, height, gameId });

      // Step 2: Determine if we got a full HTML file or just the JS script
      const isFullHtml = code.includes('<!DOCTYPE html') || code.includes('<html');

      // Step 3: Validate
      const validation = this.validateGameCode(code);
      if (!validation.valid) {
        logger.warn('[GAME] Code validation failed, attempting repair', { gameId, issues: validation.issues });
        const repairedCode = await this.repairGameCode(code, validation.issues, { idea, type });
        if (!repairedCode) throw new Error(`Game code invalid: ${validation.issues.join(', ')}`);
      }

      // Step 4: Build final HTML — use full HTML as-is, or wrap JS in template
      const finalCode = validation.valid ? code : (await this.repairGameCode(code, validation.issues, { idea, type }) || code);
      const html = isFullHtml ? finalCode : PHASER_TEMPLATE(gameId, gameTitle, finalCode);

      // Step 4: Deploy to public/games/
      const gameDir = path.join(this.gamesDir, gameId);
      await fs.mkdir(gameDir, { recursive: true });
      await fs.writeFile(path.join(gameDir, 'index.html'), html);

      // Step 5: Save metadata
      const metadata = {
        gameId,
        title: gameTitle,
        type,
        idea,
        features,
        createdAt: new Date().toISOString(),
        path: gameDir,
        url: `/games/${gameId}`,
      };
      await fs.writeFile(path.join(gameDir, 'meta.json'), JSON.stringify(metadata, null, 2));
      this.games.set(gameId, metadata);

      logger.info('[GAME] Game published', { gameId, url: metadata.url });

      return {
        success: true,
        gameId,
        gameUrl: metadata.url,
        title: gameTitle,
        type,
      };
    } catch (err) {
      logger.error('[GAME] Build failed', { gameId, error: err.message });
      return { success: false, gameId, error: err.message };
    }
  }

  /**
   * Generate Phaser.js game code via council.
   * Uses "Closed World" constraint pattern — highest LLM reliability.
   */
  async generateGameCode({ idea, type, features, width, height, gameId }) {
    const typeHint = GAME_TYPE_HINTS[type] || GAME_TYPE_HINTS.arcade;

    // "Closed World" constraint pattern (research-confirmed best for LLM code gen):
    // - Single file output only
    // - Zero build step
    // - Only one CDN library
    // - Must work by opening in browser
    // - End sentinel to prevent truncation
    const prompt = `You are generating a COMPLETE, RUNNABLE browser game as a single HTML file.

GAME IDEA: ${idea}
GAME TYPE: ${type}
FEATURES: ${features.join(', ') || 'score, win/lose, restart'}
CANVAS SIZE: ${width}x${height}

HARD CONSTRAINTS (do not violate any of these):
1. Output ONE complete HTML file — nothing else
2. Zero build step — must work by opening index.html in Chrome
3. Only ONE external library allowed: Phaser 3 via CDN https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js
4. No npm packages, no ES module imports, no require() calls
5. Do NOT use ES module syntax (no import/export in the game script)
6. Do not truncate — output the ENTIRE file from <!DOCTYPE html> to </html>
7. After closing </html>, write exactly: GENERATION_COMPLETE

GAME REQUIREMENTS:
- ${typeHint}
- Include score display using Phaser text objects
- Include win condition and lose condition
- Include restart on game over (click or press R)
- Use colored rectangles/circles if no image assets (graphics.fillRect, etc.)
- Keyboard: this.cursors = this.input.keyboard.createCursorKeys() for movement
- All game logic inside a Phaser Scene class with preload(), create(), update()
- new Phaser.Game({ type: Phaser.AUTO, width: ${width}, height: ${height}, parent: 'game-container', ... })

Output the ENTIRE HTML file now. Start with <!DOCTYPE html> and end with </html> then GENERATION_COMPLETE.`;

    if (!this.callCouncil) {
      throw new Error('callCouncil function required for game code generation');
    }

    const response = await this.callCouncil('chatgpt', prompt, {
      model: 'gpt-4o',
      maxTokens: 4096,
    });

    // Strip the GENERATION_COMPLETE sentinel
    const cleanResponse = response.replace(/GENERATION_COMPLETE[\s\S]*$/, '').trim();

    // If the response IS a full HTML file, return just the script content
    if (cleanResponse.includes('<!DOCTYPE html') || cleanResponse.includes('<html')) {
      // Extract <script> content from the HTML for embedding in our template
      const scriptMatch = cleanResponse.match(/<script[^>]*>([\s\S]+?)<\/script>/i);
      if (scriptMatch) return scriptMatch[1].trim();
      // Or return the whole HTML (buildAndPublish will use it directly if it's full)
      return cleanResponse;
    }

    // Legacy: code block extraction
    const codeMatch = cleanResponse.match(/```(?:html|javascript|js)?\n?([\s\S]+?)```/) ||
                      cleanResponse.match(/((?:const config|new Phaser\.Game|var config)[\s\S]+)/);

    if (codeMatch) return codeMatch[1].trim();

    if (cleanResponse.includes('Phaser.Game') || cleanResponse.includes('new Phaser')) {
      return cleanResponse;
    }

    throw new Error('Council did not return valid Phaser.js code');
  }

  /**
   * Basic validation: does the code look like valid Phaser.js?
   */
  validateGameCode(code) {
    const issues = [];

    if (!code) { issues.push('Empty code'); return { valid: false, issues }; }
    if (!code.includes('Phaser')) issues.push('Missing Phaser reference');
    if (!code.includes('new Phaser.Game') && !code.includes('Phaser.Game(')) issues.push('Missing Phaser.Game instantiation');
    if (!code.includes('preload') && !code.includes('create')) issues.push('Missing scene methods');
    if (code.length < 200) issues.push('Code too short to be a real game');

    // Check for obvious syntax errors (unbalanced braces)
    const opens = (code.match(/{/g) || []).length;
    const closes = (code.match(/}/g) || []).length;
    if (Math.abs(opens - closes) > 5) issues.push(`Unbalanced braces: ${opens} open vs ${closes} close`);

    return { valid: issues.length === 0, issues };
  }

  /**
   * Ask council to repair broken code.
   */
  async repairGameCode(code, issues, { idea, type }) {
    if (!this.callCouncil) return null;

    const prompt = `This Phaser.js 3 game code has issues: ${issues.join(', ')}.

ORIGINAL CODE:
${code.slice(0, 2000)}

Fix ALL issues. Return ONLY the corrected JavaScript code for a ${type} game about: "${idea}".
The fix must include a working new Phaser.Game({...}) instantiation.`;

    const response = await this.callCouncil('chatgpt', prompt, { model: 'gpt-4o', maxTokens: 4000 });

    const codeMatch = response.match(/```(?:javascript|js)?\n?([\s\S]+?)```/) ||
                      response.match(/((?:const config|new Phaser\.Game)[\s\S]+)/);

    return codeMatch ? codeMatch[1].trim() : null;
  }

  /**
   * List all published games.
   */
  async listGames() {
    const gamesList = [];
    try {
      const entries = await fs.readdir(this.gamesDir);
      for (const entry of entries) {
        const metaPath = path.join(this.gamesDir, entry, 'meta.json');
        const meta = await fs.readFile(metaPath, 'utf-8').then(JSON.parse).catch(() => null);
        if (meta) gamesList.push(meta);
      }
    } catch {
      // gamesDir doesn't exist yet
    }
    return gamesList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Register static file serving for games (call from server.js).
   * Usage: publisher.registerRoutes(app)
   */
  registerRoutes(app) {
    const { default: express } = { default: { static: () => {} } }; // avoid circular import
    app.use('/games', (req, res, next) => {
      // Serve from public/games/
      const filePath = path.join(process.cwd(), this.gamesDir, req.path);
      res.sendFile(filePath, (err) => {
        if (err) next();
      });
    });
    logger.info('[GAME] Routes registered at /games/*');
  }
}
