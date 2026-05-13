/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Site Builder prospect discovery action route.
 */
import { Router } from 'express';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import logger from '../services/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execFile = promisify(execFileCb);

function buildDiscoveryArgs({ city, niche, count }) {
  const scriptPath = join(__dirname, '../scripts/site-builder-prospect-discovery.mjs');
  const args = [scriptPath, `--city=${String(city)}`];
  if (niche) {
    args.push(`--type=${String(niche)}`);
  }
  if (count) {
    args.push(`--count=${String(count)}`);
  }
  return args;
}

export default function createDiscoveryRoutes(app, { pool, requireKey }) {
  const router = Router();

  router.post('/discover', requireKey, async (req, res) => {
    const { city, niche, count } = req.body;

    if (!city) {
      return res.status(400).json({ ok: false, error: 'city is required' });
    }

    const args = buildDiscoveryArgs({ city, niche, count });
    logger.info('[DISCOVERY] Running discovery script', { script: args[0], city, niche, count });

    try {
      const { stdout, stderr } = await execFile(process.execPath, args, {
        maxBuffer: 1024 * 1024 * 5,
        timeout: 30000,
      });

      let prospects = [];
      try {
        prospects = JSON.parse(stdout);
        if (!Array.isArray(prospects)) {
          throw new Error('script stdout was not a JSON array');
        }
      } catch (parseError) {
        logger.error('[DISCOVERY] Failed to parse script stdout as JSON', { parseError: parseError.message, stdout });
        return res.status(502).json({
          ok: false,
          error: 'Discovery script returned malformed output.',
          receipt: { source: 'Error: Malformed Discovery Output', city: city || null, niche: niche || null }
        });
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