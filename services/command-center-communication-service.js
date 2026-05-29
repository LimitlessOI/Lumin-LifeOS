/**
 * Command Center communication history + response proof guard.
 * NOT canonical BuilderOS memory — separate from epistemic_facts.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PLACEHOLDER_PATTERNS = [
  { re: /currentRepo\//i, reason: 'placeholder prefix currentRepo/' },
  { re: /\bchatInterface\.js\b(?![\s\S]{0,40}(?:public\/|overlay\/))/i, reason: 'bare chatInterface.js without verified overlay path' },
  { re: /path\/to\//i, reason: 'template path path/to/' },
  { re: /your-repo\//i, reason: 'template path your-repo/' },
  { re: /example\.(com|org)\//i, reason: 'example domain path' },
  { re: /\/tmp\/builder-/i, reason: 'temp builder path (not committed repo file)' },
];

const FILE_PATH_RE = /\b(?:scripts|routes|services|public|docs|config|startup|db|middleware|core|prompts)\/[A-Za-z0-9._\-/]+\.(?:js|mjs|cjs|ts|tsx|sql|md|html|json)\b/g;

const ROUTE_RE = /\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/api\/v1\/[^\s'"`,]+/gi;

function unique(arr) {
  return [...new Set(arr)];
}

export function extractCandidateFilePaths(text) {
  const raw = String(text || '');
  const matches = raw.match(FILE_PATH_RE) || [];
  return unique(matches.map((p) => p.replace(/^[`'"]+|[`'"]+$/g, '')));
}

export function extractCandidateRoutes(text) {
  const raw = String(text || '');
  const matches = raw.match(ROUTE_RE) || [];
  return unique(matches.map((r) => r.trim()));
}

export function detectPlaceholderClaims(text) {
  const raw = String(text || '');
  const hits = [];
  for (const { re, reason } of PLACEHOLDER_PATTERNS) {
    if (re.test(raw)) hits.push(reason);
  }
  return hits;
}

export function verifyRepoFilePaths(paths) {
  return paths.map((filePath) => {
    const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
    const abs = path.join(ROOT, normalized);
    let exists = false;
    try {
      exists = fs.existsSync(abs) && fs.statSync(abs).isFile();
    } catch {
      exists = false;
    }
    return { path: normalized, exists };
  });
}

/**
 * Build evidence envelope for a council/builder response.
 * VERIFIED only when no placeholder claims, every cited repo file exists,
 * and at least one endpoint was used in this request chain.
 */
export function buildCommunicationEvidence({
  responseText = '',
  endpointsUsed = [],
  builderMeta = {},
  deploySha = null,
} = {}) {
  const placeholderWarnings = detectPlaceholderClaims(responseText);
  const extractedPaths = extractCandidateFilePaths(responseText);
  const filesChecked = verifyRepoFilePaths(extractedPaths);
  const routesChecked = unique([
    ...endpointsUsed,
    ...extractCandidateRoutes(responseText),
  ]);

  const missingFiles = filesChecked.filter((f) => !f.exists);
  const hasRepoFileClaims = filesChecked.length > 0;
  const advisoryOnly = builderMeta.advisory_only === true
    || builderMeta.execution_only === false && !builderMeta.committed
    || (hasRepoFileClaims && missingFiles.length > 0)
    || placeholderWarnings.length > 0;

  let evidence_status = 'UNVERIFIED';
  if (
    placeholderWarnings.length === 0
    && (!hasRepoFileClaims || missingFiles.length === 0)
    && endpointsUsed.length > 0
    && !advisoryOnly
  ) {
    evidence_status = 'VERIFIED';
  }

  const warnings = [];
  if (placeholderWarnings.length) {
    warnings.push('Response cites placeholder or template paths — treat as advisory only.');
  }
  if (missingFiles.length) {
    warnings.push(`Cited file(s) not found in repo: ${missingFiles.map((f) => f.path).join(', ')}`);
  }
  if (!endpointsUsed.length) {
    warnings.push('No live API endpoints recorded for this exchange.');
  }
  if (builderMeta.committed !== true && hasRepoFileClaims) {
    warnings.push('No committed build linked — file claims are unverified.');
  }
  if (advisoryOnly && evidence_status !== 'VERIFIED') {
    warnings.push('Advisory-only response — council did not prove repo access.');
  }

  return {
    evidence_status,
    files_checked: filesChecked,
    routes_checked: routesChecked,
    commands_or_endpoints_used: endpointsUsed,
    commit_sha: builderMeta.commit_sha || builderMeta.commitSha || null,
    railway_sha: deploySha || builderMeta.railway_sha || null,
    model_used: builderMeta.model_used || builderMeta.modelUsed || null,
    committed: builderMeta.committed === true,
    placeholder_warnings: placeholderWarnings,
    advisory_only: advisoryOnly,
    warnings: unique(warnings),
    proof_source: 'command_center_communication_guard',
    do_not_use_for_builderos_memory_proof: true,
  };
}

export async function insertCommunication(pool, row) {
  const result = await pool.query(
    `INSERT INTO command_center_communications
       (speaker, council_member, mode, domain, transcript, response_text,
        evidence_json, builder_job_id, commit_sha, railway_sha)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      row.speaker || 'adam',
      row.council_member || null,
      row.mode || 'quick_ask',
      row.domain || null,
      row.transcript,
      row.response_text || null,
      row.evidence_json || {},
      row.builder_job_id || null,
      row.commit_sha || null,
      row.railway_sha || null,
    ],
  );
  return result.rows[0];
}

export async function listCommunications(pool, { limit = 50 } = {}) {
  const capped = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const result = await pool.query(
    `SELECT id, speaker, council_member, mode, domain, transcript, response_text,
            evidence_json, builder_job_id, commit_sha, railway_sha, created_at
       FROM command_center_communications
      ORDER BY created_at DESC
      LIMIT $1`,
    [capped],
  );
  return result.rows;
}
