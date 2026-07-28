/**
 * SYNOPSIS: Exports detectSecretOrDeployChange — services/self-repair-secret-deploy-gate.js.
 */
import { basename } from 'node:path';

export function detectSecretOrDeployChange({ target_file, diff_text = '' }) {
  const sensitivePatterns = [];
  const targetBasename = basename(target_file);

  const filePatterns = [
    '.env',
    'railway.json',
    'Dockerfile',
    'package.json'
  ];

  const secretFilePattern = /^config\/.*(secret|key)/i;
  const diffPattern = /process\.env\.[A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD)[A-Z0-9_]*/i;

  if (filePatterns.includes(targetBasename)) {
    sensitivePatterns.push(`target_file:${targetBasename}`);
  } else if (secretFilePattern.test(target_file)) {
    sensitivePatterns.push(`target_file:${target_file}`);
  }

  const diffMatches = diff_text.match(diffPattern);
  if (diffMatches) {
    sensitivePatterns.push(`diff:${diffMatches[0]}`);
  }

  return {
    sensitive: sensitivePatterns.length > 0,
    matched_patterns: sensitivePatterns,
  };
}

export async function recordSecretDeployEvent(pool, { target_file, matched_patterns, actor = null, authorized = false, override_reason = null }) {
  await pool.query('CREATE TABLE IF NOT EXISTS self_repair_secret_deploy_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), target_file TEXT NOT NULL, matched_patterns JSONB NOT NULL, actor TEXT, authorized BOOLEAN NOT NULL DEFAULT false, override_reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const queryText = 'INSERT INTO self_repair_secret_deploy_log (target_file, matched_patterns, actor, authorized, override_reason) VALUES ($1, $2, $3, $4, $5)';
  const values = [target_file, JSON.stringify(matched_patterns), actor, authorized, override_reason];
  await pool.query(queryText, values);
}

export async function getRecentSecretDeployEvents(pool, { limit = 50 } = {}) {
  await pool.query('CREATE TABLE IF NOT EXISTS self_repair_secret_deploy_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), target_file TEXT NOT NULL, matched_patterns JSONB NOT NULL, actor TEXT, authorized BOOLEAN NOT NULL DEFAULT false, override_reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const queryText = 'SELECT * FROM self_repair_secret_deploy_log ORDER BY created_at DESC LIMIT $1';
  const values = [limit];
  const res = await pool.query(queryText, values);
  return res.rows;
}