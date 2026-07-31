/**
 * SYNOPSIS: Exports createBuilderRuntimeFingerprintRoutes — routes/builderos-runtime-fingerprint-routes.js.
 */
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';

const ALLOWED_PREFIXES = [
  'routes/',
  'services/',
  'middleware/',
  'startup/',
  'config/',
  'scripts/lib/',
];
const MAX_PATHS = 32;

export function createBuilderRuntimeFingerprintRoutes(app, { auth, logger }) {
  app.get('/api/v1/lifeos/builder/runtime-fingerprint', auth.requireKey, async (req, res) => {
    const pathsQuery = req.query.paths;
    if (!pathsQuery) {
      logger.warn('Runtime fingerprint request missing paths query parameter');
      return res.status(400).json({ ok: false, reason: 'missing_paths_query' });
    }

    const requestedPaths = pathsQuery.split(',').filter(p => p.trim() !== '');
    if (requestedPaths.length === 0) {
      logger.warn('Runtime fingerprint request paths query parameter is empty');
      return res.status(400).json({ ok: false, reason: 'empty_paths_query' });
    }
    if (requestedPaths.length > MAX_PATHS) {
      logger.warn(`Runtime fingerprint request exceeded max paths (${MAX_PATHS})`);
      return res.status(400).json({ ok: false, reason: 'too_many_paths' });
    }

    const REPO_ROOT = process.env.REPO_ROOT || process.cwd();
    const results = [];

    for (const p of requestedPaths) {
      const trimmedPath = p.trim();
      if (trimmedPath.includes('..') || path.isAbsolute(trimmedPath)) {
        logger.warn(`Runtime fingerprint request rejected path: ${trimmedPath} (invalid characters)`);
        results.push({ path: p, ok: false, reason: 'invalid_path' });
        continue;
      }

      const isAllowed = ALLOWED_PREFIXES.some(prefix => trimmedPath.startsWith(prefix));
      if (!isAllowed) {
        logger.warn(`Runtime fingerprint request rejected path: ${trimmedPath} (not in allowlist)`);
        results.push({ path: p, ok: false, reason: 'path_not_allowlisted' });
        continue;
      }

      const fullPath = path.join(REPO_ROOT, trimmedPath);

      try {
        const buffer = await readFile(fullPath);
        const hashSum = createHash('sha256');
        hashSum.update(buffer);
        const sha256 = hashSum.digest('hex');
        const stats = await import('fs').then(fs => fs.promises.stat(fullPath)); // Dynamically import for testing
        const mtime_ms = stats.mtimeMs;

        results.push({
          path: p,
          ok: true,
          sha256,
          bytes: buffer.byteLength,
          mtime_ms,
        });
      } catch (error) {
        if (error.code === 'ENOENT') {
          logger.warn(`Runtime fingerprint request file not found: ${trimmedPath}`);
          results.push({ path: p, ok: false, reason: 'not_found' });
        } else {
          logger.error(`Runtime fingerprint request error reading file ${trimmedPath}: ${error.message}`);
          results.push({ path: p, ok: false, reason: 'read_error', error: error.message });
        }
      }
    }

    res.json({
      ok: true,
      deploy_commit_sha: process.env.RAILWAY_GIT_COMMIT_SHA || null,
      files: results,
    });
  });
}