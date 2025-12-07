/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    GAME GENERATOR FOR OVERLAY                                     ║
 * ║                    Generates games to distribute overlay system                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class GameGenerator {
  constructor(pool, callCouncilMember, modelRouter) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.modelRouter = modelRouter;
    this.generatedGames = new Map();
  }

  /**
   * Generate a game
   */
  async generateGame({
    gameType = 'puzzle', // puzzle, arcade, strategy, quiz, social
    complexity = 'simple',
    useOverlay = true,
    monetization = 'ads', // ads, in_app, freemium
  }) {
    console.log(`🎮 [GAME GENERATOR] Generating ${gameType} game...`);

    const prompt = `Generate a complete ${gameType} game for the LifeOS overlay system.

Requirements:
- Game type: ${gameType}
- Complexity: ${complexity}
- Must work in overlay system: ${useOverlay}
- Monetization: ${monetization}
- Include LifeOS branding
- Include overlay download link
- Make it viral/shareable

Generate:
1. Game concept and mechanics
2. Complete HTML/CSS/JavaScript code
3. Game name and description
4. Marketing strategy
5. Viral sharing features
6. Leaderboard system
7. Monetization integration

Return as JSON with all code included.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 4000,
      });

      const gameData = this.parseGameResponse(response);
      const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Store game
      await this.storeGame(gameId, gameData, {
        gameType,
        complexity,
        useOverlay,
        monetization,
      });

      // Generate game files
      await this.generateGameFiles(gameId, gameData);

      console.log(`✅ [GAME GENERATOR] Generated game: ${gameId}`);
      return { gameId, gameData };
    } catch (error) {
      console.error('❌ [GAME GENERATOR] Error:', error.message);
      throw error;
    }
  }

  /**
   * Store game in database
   */
  async storeGame(gameId, gameData, metadata) {
    try {
      await this.pool.query(
        `INSERT INTO generated_games 
         (game_id, game_name, game_type, complexity, code_html, code_css, code_js,
          description, marketing_strategy, monetization, use_overlay, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          gameId,
          gameData.name || gameData.gameName,
          metadata.gameType,
          metadata.complexity,
          gameData.html || gameData.code?.html || '',
          gameData.css || gameData.code?.css || '',
          gameData.js || gameData.code?.js || '',
          gameData.description,
          JSON.stringify(gameData.marketingStrategy || gameData.marketing_strategy || {}),
          metadata.monetization,
          metadata.useOverlay,
          'generated',
        ]
      );
    } catch (error) {
      console.error('Error storing game:', error.message);
    }
  }

  /**
   * Generate game files
   */
  async generateGameFiles(gameId, gameData) {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const gamesDir = path.join(__dirname, '..', 'public', 'games', gameId);

    // Create directory
    await fs.promises.mkdir(gamesDir, { recursive: true });

    // Generate HTML file
    const htmlContent = this.buildGameHTML(gameData);
    await fs.promises.writeFile(
      path.join(gamesDir, 'index.html'),
      htmlContent,
      'utf8'
    );

    // Generate CSS file
    if (gameData.css || gameData.code?.css) {
      await fs.promises.writeFile(
        path.join(gamesDir, 'style.css'),
        gameData.css || gameData.code.css,
        'utf8'
      );
    }

    // Generate JS file
    if (gameData.js || gameData.code?.js) {
      await fs.promises.writeFile(
        path.join(gamesDir, 'game.js'),
        gameData.js || gameData.code.js,
        'utf8'
      );
    }

    console.log(`📁 [GAME GENERATOR] Created game files in ${gamesDir}`);
  }

  /**
   * Build complete game HTML with overlay integration
   */
  buildGameHTML(gameData) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${gameData.name || 'LifeOS Game'}</title>
    <link rel="stylesheet" href="style.css">
    <style>
        .lifeos-branding {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
        }
        .lifeos-branding a {
            color: #4CAF50;
            text-decoration: none;
            font-weight: bold;
        }
        .overlay-download {
            background: #4CAF50;
            color: white;
            padding: 8px 12px;
            border-radius: 3px;
            margin-top: 5px;
            display: inline-block;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div id="game-container">
        ${gameData.html || gameData.code?.html || '<div id="game">Game loading...</div>'}
    </div>
    
    <div class="lifeos-branding">
        <div>Powered by <a href="https://lifeos.ai" target="_blank">LifeOS</a></div>
        <div class="overlay-download" onclick="window.open('https://lifeos.ai/overlay', '_blank')">
            Get LifeOS Overlay
        </div>
    </div>
    
    <script src="game.js"></script>
    ${gameData.js ? `<script>${gameData.js}</script>` : ''}
</body>
</html>`;
  }

  /**
   * Parse game response from AI
   */
  parseGameResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      // Fallback: extract code blocks
      const htmlMatch = response.match(/```html\n([\s\S]*?)```/);
      const cssMatch = response.match(/```css\n([\s\S]*?)```/);
      const jsMatch = response.match(/```javascript\n([\s\S]*?)```/);
      
      return {
        name: this.extractGameName(response),
        description: this.extractDescription(response),
        html: htmlMatch ? htmlMatch[1] : '',
        css: cssMatch ? cssMatch[1] : '',
        js: jsMatch ? jsMatch[1] : '',
        marketingStrategy: this.extractMarketingStrategy(response),
      };
    } catch (error) {
      console.warn('Failed to parse game response:', error.message);
      return {
        name: 'LifeOS Game',
        description: 'A fun game powered by LifeOS',
        html: '<div id="game">Game code generation failed</div>',
        css: '',
        js: '',
      };
    }
  }

  extractGameName(response) {
    const nameMatch = response.match(/name["\']?\s*:\s*["\']([^"\']+)["\']/i);
    return nameMatch ? nameMatch[1] : 'LifeOS Game';
  }

  extractDescription(response) {
    const descMatch = response.match(/description["\']?\s*:\s*["\']([^"\']+)["\']/i);
    return descMatch ? descMatch[1] : 'A fun game powered by LifeOS';
  }

  extractMarketingStrategy(response) {
    // Extract marketing strategy from response
    return {
      viral: true,
      socialSharing: true,
      leaderboards: true,
    };
  }

  /**
   * Get all generated games
   */
  async getGames(limit = 50) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM generated_games ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting games:', error.message);
      return [];
    }
  }

  /**
   * Deploy game (make it live)
   */
  async deployGame(gameId) {
    try {
      await this.pool.query(
        `UPDATE generated_games SET status = 'deployed', deployed_at = NOW() WHERE game_id = $1`,
        [gameId]
      );
      console.log(`🚀 [GAME GENERATOR] Deployed game: ${gameId}`);
      return true;
    } catch (error) {
      console.error('Error deploying game:', error.message);
      return false;
    }
  }
}
