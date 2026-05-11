/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Standalone site discovery action route — triggers prospect discovery runs.
 */
import { Router } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import logger from '../services/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execFileAsync = promisify(execFile);

const MAX_CITY_LENGTH = 200;
const MAX_NICHE_LENGTH = 80;

function normalizeBoundedString(value, fieldName, maxLength, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return required
      ? { error: `${fieldName} is required` }
      : { value: null };
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string` };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return required
      ? { error: `${fieldName} is required` }
      : { value: null };
  }

  if (trimmed.length > maxLength) {
    return { error: `${fieldName} must be ${maxLength} characters or fewer` };
  }

  return { value: trimmed };
}

function normalizeCount(value) {
  if (value === undefined || value === null || value === '') return { value: null };
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return { error: 'count must be a positive integer' };
  }
  return { value: Math.min(20, parsed) };
}

export default function createDiscoveryRoutes(app, { pool, requireKey }) {
  const router = Router();

  router.post('/discover', requireKey, async (req, res) => {
    const { city, niche, count } = req.body;

    const cityInput = normalizeBoundedString(city, 'city', MAX_CITY_LENGTH, { required: true });
    if (cityInput.error) return res.status(400).json({ ok: false, error: cityInput.error });

    const nicheInput = normalizeBoundedString(niche, 'niche', MAX_NICHE_LENGTH);
    if (nicheInput.error) return res.status(400).json({ ok: false, error: nicheInput.error });

    const countInput = normalizeCount(count);
    if (countInput.error) return res.status(400).json({ ok: false, error: countInput.error });

    const normalizedCity = cityInput.value;
    const normalizedNiche = nicheInput.value;
    const normalizedCount = countInput.value;

    const scriptPath = join(__dirname, '../scripts/site-builder-prospect-discovery.mjs');
    const args = [scriptPath, `--city=${normalizedCity}`];
    if (normalizedNiche) {
      args.push(`--type=${normalizedNiche}`);
    }
    if (normalizedCount) {
      args.push(`--count=${normalizedCount}`);
    }

    logger.info('[DISCOVERY] Running discovery script', {
      scriptPath,
      city: normalizedCity,
      niche: normalizedNiche,
      count: normalizedCount,
    });

    try {
      const { stdout, stderr } = await execFileAsync(process.execPath, args, {
        maxBuffer: 1024 * 1024 * 5,
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
          receipt: { source, city: normalizedCity || null, niche: normalizedNiche || null }
        });
      }

      res.json({
        ok: true,
        discovered: discoveredCount,
        prospects,
        receipt: {
          source,
          city: normalizedCity || null,
          niche: normalizedNiche || null,
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
          city: normalizedCity || null,
          niche: normalizedNiche || null,
        },
      });
    }
  });

  return router;
}