/**
 * SYNOPSIS: HTTP route module — Site Builder Discovery Routes.
 */
import { Router } from 'express';
import { exec } from 'child_process';
import logger from '../services/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function createDiscoveryRoutes(app, { pool, requireKey }) {
  const router = Router();

  router.post('/discover', requireKey, async (req, res) => {
    const { city, niche, count } = req.body;

    if (!city) {
      return res.status(400).json({ ok: false, error: 'city is required' });
    }

    const scriptPath = join(__dirname, '../scripts/site-builder-prospect-discovery.mjs');
    let command = `node ${scriptPath} --city="${city}"`;
    if (niche) {
      command += ` --type="${niche}"`;
    }
    if (count) {
      command += ` --count=${count}`;
    }

    logger.info('[DISCOVERY] Running discovery script', { command, city, niche, count });

    try {
      const { stdout, stderr } = await new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
          if (error) {
            error.stderr = stderr;
            reject(error);
          } else {
            resolve({ stdout, stderr });
          }
        });
      });

      let prospects = [];
      try {
        prospects = JSON.parse(stdout);
        if (!Array.isArray(prospects)) {
          logger.warn('[DISCOVERY] Script stdout was not a JSON array, treating as empty', { stdout });
          prospects = [];
        }
      } catch (parseError) {
        logger.error('[DISCOVERY] Failed to parse script stdout as JSON', { parseError: parseError.message, stdout });
      }

      let source = 'Unknown';
      if (stderr.includes('Searching Google Places')) {
        source = 'Google Places';
      } else if (stderr.includes('No GOOGLE_PLACES_KEY set')) {
        source = 'Manual Research Guidance';
      } else if (stderr.includes('Unsupported type')) {
        source = 'Error: Unsupported Niche';
      }

      const discoveredCount = prospects.length;

      if (stderr.includes('Unsupported type')) {
        return res.status(400).json({
          ok: false,
          error: stderr.trim(),
          receipt: { source, city: city || null, niche: niche || null }
        });
      }

      res.json({
        ok: true,
        discovered: discoveredCount,
        prospects,
        receipt: {
          source,
          city: city || null,
          niche: niche || null,
        },
      });

    } catch (err) {
      logger.error('[DISCOVERY] Script execution failed', { error: err.message, stderr: err.stderr });

      let errorMessage = 'An unexpected error occurred during discovery.';
      let source = 'Error';

      if (err.stderr) {
        const stderrLower = err.stderr.toLowerCase();
        if (stderrLower.includes('no google_places_key set')) {
          errorMessage = 'Google Places API key not configured. Manual research guidance is available.';
          source = 'Manual Research Guidance (Fallback)';
        } else if (stderrLower.includes('unsupported type')) {
          errorMessage = err.stderr.trim();
          source = 'Error: Unsupported Niche';
        } else {
          errorMessage = err.stderr.trim() || err.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      res.status(500).json({
        ok: false,
        error: errorMessage,
        receipt: {
          source,
          city: city || null,
          niche: niche || null,
        },
      });
    }
  });

  return router;
}