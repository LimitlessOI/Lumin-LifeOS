import { Router } from 'express';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../services/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Discovery Routes — Endpoints for finding new prospects.
 * - Endpoints:
 *   POST /api/v1/sites/discover — Find wellness businesses via Google Places or manual research guidance.
 */
export default function createDiscoveryRoutes(app, { pool, requireKey }) {
  const router = Router();

  /**
   * POST /api/v1/sites/discover
   * Find wellness businesses in a city/niche.
   * Body: { city?: string, niche?: string, count?: number }
   * Response: { ok: true, discovered: number, prospects: object[], receipt: { source: string, city: string|null, niche: string|null } }
   */
  router.post('/discover', requireKey, async (req, res) => {
    const { city, niche, count } = req.body;

    if (!city) {
      return res.status(400).json({ ok: false, error: 'city is required' });
    }

    const scriptPath = path.join(__dirname, '..', 'scripts', 'site-builder-prospect-discovery.mjs');
    const args = [];
    args.push('--city', city);
    if (niche) {
      args.push('--type', niche);
    }
    // Default count to 10, max to 50 if not provided or out of range
    const effectiveCount = Math.min(Math.max(parseInt(count, 10) || 10, 1), 50);
    args.push('--count', effectiveCount.toString());

    logger.info('[DISCOVERY] Running prospect discovery script', { city, niche, count: effectiveCount });

    try {
      // Use process.execPath to ensure the correct Node.js executable is used
      // Set a generous timeout for external API calls
      const { stdout, stderr } = await new Promise((resolve, reject) => {
        execFile(process.execPath, [scriptPath, ...args], { timeout: 120000 }, (error, stdout, stderr) => {
          if (error) {
            // Even if there's an error, stdout/stderr might contain useful info
            reject({ error, stdout, stderr });
          } else {
            resolve({ stdout, stderr });
          }
        });
      });

      let prospects = [];
      try {
        // The script outputs JSON to stdout
        const trimmedStdout = stdout.trim();
        if (trimmedStdout) { // Only try to parse if there's actual output
          prospects = JSON.parse(trimmedStdout);
        }
      } catch (parseError) {
        logger.warn('[DISCOVERY] Failed to parse script stdout as JSON, assuming empty or non-JSON output', { parseError: parseError.message, stdout });
        // Continue with empty prospects array, source will be determined by stderr
      }

      let source = 'google_places';
      if (stderr.includes('No GOOGLE_PLACES_KEY set')) {
        source = 'manual_guidance';
      } else if (stderr.includes('Unsupported type')) {
        logger.warn('[DISCOVERY] Script stderr indicates unsupported type', { stderr });
        return res.status(400).json({ ok: false, error: stderr.trim().split('\n')[0] || 'Unsupported niche type' });
      } else if (stderr.includes('error') || stderr.includes('Error:')) {
        // If stderr contains error messages, and we didn't get prospects, it's a server error
        if (prospects.length === 0) {
          logger.error('[DISCOVERY] Script stderr indicates an error with no prospects found', { stderr });
          return res.status(500).json({ ok: false, error: stderr.trim().split('\n')[0] || 'Discovery script failed unexpectedly' });
        }
        logger.warn('[DISCOVERY] Script stderr contains warnings/errors but prospects were found', { stderr });
      }

      res.json({
        ok: true,
        discovered: prospects.length,
        prospects: prospects,
        receipt: {
          source: source,
          city: city,
          niche: niche || null,
        },
      });

    } catch (execError) {
      logger.error('[DISCOVERY] Script execution failed', {
        error: execError.error?.message || execError.message,
        stdout: execError.stdout,
        stderr: execError.stderr,
      });
      let errorMessage = 'Discovery script execution failed';
      if (execError.stderr) {
        errorMessage = execError.stderr.trim().split('\n')[0] || errorMessage;
      } else if (execError.error?.message) {
        errorMessage = execError.error.message;
      }
      res.status(500).json({ ok: false, error: errorMessage });
    }
  });

  return router;
}