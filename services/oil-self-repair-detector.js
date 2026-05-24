/**
 * OIL self-repair detectors — runtime proof parity, proof-store alignment,
 * and OIL missed-issue receipts. No secrets in output.
 *
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proofStoreFingerprint } from './builder-phase14-ledger.js';
import {
  SECURITY_RECEIPT_TYPES,
  writeSecurityReceipt,
  readReceiptsByType,
} from './oil-security-receipts.js';
import {
  OIL_AUDITOR_ROLE,
  writeOILAuditReceipt,
  createBuildSessionId,
  createAuditSessionId,
} from './builder-audit-before-done.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function normalizeSha(sha) {
  if (!sha || typeof sha !== 'string') return null;
  const t = sha.trim().toLowerCase();
  if (!/^[a-f0-9]{7,40}$/.test(t)) return null;
  return t.slice(0, 40);
}

export function shasEqual(a, b) {
  const na = normalizeSha(a);
  const nb = normalizeSha(b);
  if (!na || !nb) return null;
  return na === nb || na.startsWith(nb) || nb.startsWith(na);
}

function gitSha(root, cmd) {
  try {
    return normalizeSha(execSync(cmd, { cwd: root, encoding: 'utf8' }).trim());
  } catch {
    return null;
  }
}

/** Local HEAD + optional origin/main without printing credentials. */
export function readLocalGitShas(root = ROOT) {
  const localHead = gitSha(root, 'git rev-parse HEAD');
  const githubMain = gitSha(root, 'git rev-parse refs/remotes/origin/main');
  const branch = (() => {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { cwd: root, encoding: 'utf8' }).trim();
    } catch {
      return null;
    }
  })();
  return { localHead, githubMainSha: githubMain, branch };
}

/**
 * Phase 1 — compare local HEAD, GitHub main, Railway deploy, receipt commit_sha.
 * Returns NOT_VERIFIED with exact mismatches; P0 only when runtime proof is unknowable.
 */
export function detectRuntimeProofMismatch({
  localHead,
  githubMainSha,
  railwayDeploySha,
  receiptCommitSha,
}) {
  const sources = {
    local_head: normalizeSha(localHead),
    github_main_sha: normalizeSha(githubMainSha),
    railway_deploy_sha: normalizeSha(railwayDeploySha),
    receipt_commit_sha: normalizeSha(receiptCommitSha),
  };

  const mismatches = [];

  if (sources.local_head && sources.github_main_sha && !shasEqual(sources.local_head, sources.github_main_sha)) {
    mismatches.push({
      rule: 'LOCAL_VS_GITHUB_MAIN',
      severity: 'P2',
      detail: `local_head=${sources.local_head.slice(0, 12)} github_main=${sources.github_main_sha.slice(0, 12)}`,
    });
  }

  if (sources.github_main_sha && sources.railway_deploy_sha && !shasEqual(sources.github_main_sha, sources.railway_deploy_sha)) {
    mismatches.push({
      rule: 'RAILWAY_STALE_DEPLOY',
      severity: 'P1',
      detail: `github_main=${sources.github_main_sha.slice(0, 12)} railway_deploy=${sources.railway_deploy_sha.slice(0, 12)}`,
    });
  }

  if (sources.railway_deploy_sha && sources.receipt_commit_sha && !shasEqual(sources.railway_deploy_sha, sources.receipt_commit_sha)) {
    mismatches.push({
      rule: 'RECEIPT_STALE_RUNTIME_SHA',
      severity: 'P2',
      detail: `railway_deploy=${sources.railway_deploy_sha.slice(0, 12)} receipt=${sources.receipt_commit_sha.slice(0, 12)}`,
    });
  }

  if (sources.github_main_sha && !sources.railway_deploy_sha) {
    mismatches.push({
      rule: 'RAILWAY_DEPLOY_SHA_MISSING',
      severity: 'P0',
      detail: 'Railway deploy_commit_sha unavailable — runtime proof unknowable',
    });
  }

  const p0 = mismatches.filter((m) => m.severity === 'P0');
  const verified = mismatches.length === 0;

  return {
    status: verified ? 'VERIFIED' : 'NOT_VERIFIED',
    verified,
    sources,
    mismatches,
    p0_blockers: p0,
    blocks_build: p0.length > 0,
  };
}

/**
 * Phase 2 — compare proof stores without secrets (host/db/fingerprint only).
 */
export function detectProofStoreMismatch(localDatabaseUrl, railwayStore) {
  const local = proofStoreFingerprint(localDatabaseUrl);
  const railway = railwayStore || { proof_store_id: null, db_host: null, db_name: null };

  if (!local.proof_store_id && !railway.proof_store_id) {
    return {
      status: 'UNKNOWN',
      match: null,
      local_proof_only: false,
      local,
      railway,
      detail: 'Both proof stores unset — cannot compare',
    };
  }

  if (!local.proof_store_id) {
    return {
      status: 'RUNTIME_ONLY',
      match: null,
      local_proof_only: false,
      local,
      railway,
      detail: 'Local DATABASE_URL unset — operator shell has no proof store',
    };
  }

  if (!railway.proof_store_id) {
    return {
      status: 'UNKNOWN',
      match: false,
      local_proof_only: true,
      local,
      railway,
      detail: 'Railway proof store unavailable',
    };
  }

  const match = local.proof_store_id === railway.proof_store_id;
  return {
    status: match ? 'SHARED' : 'LOCAL_PROOF_ONLY',
    match,
    local_proof_only: !match,
    local: { proof_store_id: local.proof_store_id, db_host: local.db_host, db_name: local.db_name },
    railway: {
      proof_store_id: railway.proof_store_id,
      db_host: railway.db_host,
      db_name: railway.db_name,
    },
    detail: match
      ? 'Local and Railway share proof store'
      : `proof_store_id local=${local.proof_store_id} railway=${railway.proof_store_id}`,
  };
}

export async function fetchRailwayDeploySha(baseUrl, commandKey) {
  const base = (baseUrl || '').replace(/\/$/, '');
  if (!base) return { ok: false, deploySha: null, http: 0 };
  const headers = { Accept: 'application/json', ...(commandKey ? { 'x-command-key': commandKey } : {}) };
  try {
    const r = await fetch(`${base}/api/v1/lifeos/builder/ready`, { headers, signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    return {
      ok: r.ok,
      http: r.status,
      deploySha: normalizeSha(j?.codegen?.deploy_commit_sha || j?.deploy_commit_sha),
      raw_ok: j?.ok,
    };
  } catch (err) {
    return { ok: false, deploySha: null, http: 0, error: err.message };
  }
}

export async function fetchRailwayProofStore(baseUrl, commandKey) {
  const base = (baseUrl || '').replace(/\/$/, '');
  if (!base) return { ok: false, store: null, http: 0 };
  const headers = { Accept: 'application/json', ...(commandKey ? { 'x-command-key': commandKey } : {}) };
  try {
    const r = await fetch(`${base}/api/v1/lifeos/command-center/phase14/proof-store`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, store: null, http: r.status };
    return {
      ok: true,
      http: r.status,
      store: {
        proof_store_id: j.proof_store_id,
        db_host: j.db_host,
        db_name: j.db_name,
      },
    };
  } catch (err) {
    return { ok: false, store: null, http: 0, error: err.message };
  }
}

/** GitHub main SHA via server GITHUB_TOKEN — never exposes token. */
export async function fetchGitHubMainSha() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  if (!token || !repo || !repo.includes('/')) {
    return { ok: false, sha: null, reason: 'GITHUB_TOKEN or GITHUB_REPO unset' };
  }
  const [owner, name] = repo.split('/');
  try {
    const r = await fetch(`https://api.github.com/repos/${owner}/${name}/commits/main`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(12000),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, sha: normalizeSha(j?.sha), http: r.status };
  } catch (err) {
    return { ok: false, sha: null, error: err.message };
  }
}

export async function fetchLatestReceiptCommitSha(baseUrl, commandKey) {
  const base = (baseUrl || '').replace(/\/$/, '');
  if (!base) return { ok: false, commitSha: null };
  const headers = { Accept: 'application/json', ...(commandKey ? { 'x-command-key': commandKey } : {}) };
  try {
    const r = await fetch(`${base}/api/v1/gemini/proof/status`, { headers, signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, commitSha: null, http: r.status };
    const lp = j?.last_proof;
    const sha =
      normalizeSha(lp?.payload?.runtime?.commit_sha) ||
      normalizeSha(lp?.runtime?.commit_sha) ||
      normalizeSha(lp?.payload?.details?.runtime?.commit_sha);
    return { ok: true, commitSha: sha, receiptId: lp?.id || null, http: r.status };
  } catch (err) {
    return { ok: false, commitSha: null, error: err.message };
  }
}

export function buildOilMissedIssuePayload({
  findingId,
  severity,
  whatMissed,
  howFound,
  requiredRepair,
  verificationPath,
  detectedBy = 'C2',
}) {
  return {
    status: 'NOT_VERIFIED',
    subject: findingId || 'oil_missed_issue',
    summary: `OIL missed: ${whatMissed}`.slice(0, 240),
    type: 'oil_missed_issue',
    finding_id: findingId,
    severity,
    what_oil_missed: whatMissed,
    how_found: howFound,
    required_repair: requiredRepair,
    verification_path: verificationPath,
    detected_by: detectedBy,
    repair_channel: detectedBy === 'C2' ? 'GAP-FILL' : 'BUILDER_OIL',
    runtime: { proof_source: 'oil_self_repair_detector' },
  };
}

/** Write OIL missed-issue — security_receipts when schema allows, else builder_audit_receipts. */
export async function writeOilMissedIssueReceipt(pool, finding) {
  const payload = buildOilMissedIssuePayload(finding);
  try {
    return await writeSecurityReceipt(SECURITY_RECEIPT_TYPES.AUDIT_VERIFICATION, payload, pool);
  } catch (secErr) {
    const buildId = createBuildSessionId(99701);
    const auditId = createAuditSessionId(99701, buildId);
    const auditReceiptId = await writeOILAuditReceipt(pool, OIL_AUDITOR_ROLE, {
      projectSlug: 'oil-self-repair',
      verdict: 'CONDITIONAL_PASS',
      confidencePct: 90,
      findings: `OIL missed issue: ${finding.whatMissed}`.slice(0, 500),
      findingsJson: {
        type: 'oil_missed_issue',
        ...payload,
        security_receipt_fallback_reason: secErr.message?.slice(0, 200),
      },
      auditSessionId: auditId,
      buildSessionId: buildId,
    });
    return { receipt_id: auditReceiptId, channel: 'builder_audit_receipts' };
  }
}

/** Predefined repair queue — tasks come only from this registry (no invention). */
export const REPAIR_QUEUE_REGISTRY = [
  {
    issueId: 'OIL-SEC-FIND-20260524-001',
    severity: 'P1',
    sourceDetector: 'detectProofStoreMismatch',
    detectRule: 'LOCAL_PROOF_ONLY',
    recommendedBuilderTask:
      'Align operator DATABASE_URL to Railway Neon (lifeos-sandbox) via POST /api/v1/railway/env/bulk — or always use scripts/oil-phase14-railway-canonical.mjs',
    requiredOilProof:
      'GET /api/v1/lifeos/command-center/phase14/proof-store — proof_store status SHARED, local_proof_only=false',
    detect: (ctx) => ctx.proofStore?.local_proof_only === true,
    probeKey: 'proof_store_endpoint',
  },
  {
    issueId: 'OIL-SEC-FIND-20260523-003',
    severity: 'P1',
    sourceDetector: 'detectRuntimeProofMismatch',
    detectRule: 'RAILWAY_STALE_DEPLOY',
    recommendedBuilderTask:
      'POST /api/v1/railway/deploy after Builder /execute commits; verify github_main_sha === railway_deploy_sha',
    requiredOilProof: 'GET /api/v1/lifeos/command-center/self-repair/audit — no RAILWAY_STALE_DEPLOY mismatch',
    detect: (ctx) =>
      ctx.runtimeProof?.mismatches?.some((m) => m.rule === 'RAILWAY_STALE_DEPLOY') ?? false,
    probeKey: 'deploy',
  },
  {
    issueId: 'DR-003-RECEIPT-STALE',
    severity: 'P2',
    sourceDetector: 'detectRuntimeProofMismatch',
    detectRule: 'RECEIPT_STALE_RUNTIME_SHA',
    recommendedBuilderTask:
      'POST /api/v1/gemini/proof to refresh runtime proof receipt at current deploy SHA',
    requiredOilProof:
      'GET /api/v1/lifeos/command-center/self-repair/audit — receipt_commit_sha matches railway_deploy_sha',
    detect: (ctx) =>
      ctx.runtimeProof?.mismatches?.some((m) => m.rule === 'RECEIPT_STALE_RUNTIME_SHA') ?? false,
    probeKey: 'gemini_receipt',
  },
  {
    issueId: 'DR-001-LOCAL-GITHUB',
    severity: 'P2',
    sourceDetector: 'detectRuntimeProofMismatch',
    detectRule: 'LOCAL_VS_GITHUB_MAIN',
    recommendedBuilderTask: 'Operator: git fetch && git pull origin main on workbench',
    requiredOilProof:
      'node scripts/oil-self-repair-audit.mjs — no LOCAL_VS_GITHUB_MAIN mismatch',
    detect: (ctx) =>
      ctx.runtimeProof?.mismatches?.some((m) => m.rule === 'LOCAL_VS_GITHUB_MAIN') ?? false,
    probeKey: 'git',
  },
  {
    issueId: 'OIL-SEC-FIND-20260524-002',
    severity: 'P1',
    sourceDetector: 'evaluateKnownOilMisses',
    detectRule: 'UI_FAKE_GREEN',
    recommendedBuilderTask:
      'Builder /execute public/overlay/lifeos-command-center.html — remove fake fallbacks (completed)',
    requiredOilProof:
      'GET /lifeos-command-center — no DEFAULT_LANES, phase wheel reflects cert status',
    detect: () => false,
    probeKey: null,
  },
];

export function resolveRepairQueueStatus({ active, hasReceipt, probeOk, probeRequired }) {
  if (probeRequired && probeOk === false) return 'NOT_WIRED';
  if (!active) return 'VERIFIED';
  if (hasReceipt) return 'REPAIRING';
  return 'OPEN';
}

/** Build read-only repair queue from detectors + receipt cross-check — no auto-run. */
export async function buildRepairQueue(pool, context, probes = {}) {
  const history = pool?.query ? await readSelfRepairHistory(pool, 50) : [];

  const items = REPAIR_QUEUE_REGISTRY.map((entry) => {
    const { detect, probeKey, ...meta } = entry;
    let active = false;
    try {
      active = Boolean(detect(context));
    } catch {
      active = false;
    }
    const receipt = history.find((h) => h.finding_id === entry.issueId);
    const probeRequired = Boolean(probeKey);
    const probeOk = probeKey ? probes[probeKey]?.ok !== false : true;
    const status = resolveRepairQueueStatus({
      active,
      hasReceipt: Boolean(receipt),
      probeOk,
      probeRequired,
    });
    return {
      ...meta,
      status,
      active,
      receipt_id: receipt?.receipt_id ?? null,
      receipt_at: receipt?.timestamp ?? null,
      detail: active
        ? context.runtimeProof?.mismatches?.find((m) => m.rule === entry.detectRule)?.detail ||
          context.proofStore?.detail ||
          null
        : null,
    };
  });

  const open = items.filter((i) => i.status === 'OPEN').length;
  const repairing = items.filter((i) => i.status === 'REPAIRING').length;

  return {
    ok: true,
    proof_source: 'detector_registry_only',
    read_only: true,
    auto_repair: false,
    generated_at: new Date().toISOString(),
    total: items.length,
    open_count: open,
    repairing_count: repairing,
    items,
  };
}

/** Registry of known misses from recent repairs — for automated re-detection. */
export const KNOWN_OIL_MISSED_ISSUES = [
  {
    findingId: 'OIL-SEC-FIND-20260524-001',
    severity: 'P1',
    whatMissed: 'Dual Phase14 cert paths; local proof_store vs Railway neondb/lifeos-sandbox mismatch',
    howFound: 'C2 runtime audit: GET phase14 NOT_ALPHA_READY while local cert claimed ALPHA_READY',
    requiredRepair: 'Shared buildPhaseLedger + proof-store endpoint + railway-canonical script',
    verificationPath: 'GET /api/v1/lifeos/command-center/phase14/proof-store + oil-self-repair-audit',
    detect: ({ proofStore }) => proofStore?.local_proof_only === true,
  },
  {
    findingId: 'OIL-SEC-FIND-20260524-002',
    severity: 'P1',
    whatMissed: 'Command Center V2 fake green: phase wheel READY, DEFAULT_LANES, SSOT node ok',
    howFound: 'C2 Phase 0 HTML audit of lifeos-command-center.html',
    requiredRepair: 'Remove fake fallbacks; endpoint-only health labels',
    verificationPath: 'GET /lifeos-command-center grep openProofDrawer !DEFAULT_LANES',
    detect: () => false,
  },
  {
    findingId: 'OIL-SEC-FIND-20260523-003',
    severity: 'P1',
    whatMissed: 'Railway stale deploy served 404 on SEC-F01 routes after local-only GAP-FILL',
    howFound: 'C2 runtime probe: /command-center/security 404 until redeploy',
    requiredRepair: 'Builder execute + redeploy; compare railway_deploy vs github_main',
    verificationPath: 'oil-self-repair-audit RAILWAY_STALE_DEPLOY rule',
    detect: ({ runtimeProof }) =>
      runtimeProof?.mismatches?.some((m) => m.rule === 'RAILWAY_STALE_DEPLOY'),
  },
];

export function evaluateKnownOilMisses(context) {
  return KNOWN_OIL_MISSED_ISSUES.filter((issue) => {
    try {
      return issue.detect(context);
    } catch {
      return false;
    }
  }).map(({ detect, ...rest }) => rest);
}

export function inferRepairChannel(findingsJson = {}) {
  if (findingsJson.repair_channel) return findingsJson.repair_channel;
  if (findingsJson.detected_by === 'C2') return 'GAP-FILL';
  if (findingsJson.security_receipt_fallback_reason) return 'OIL';
  if (findingsJson.type === 'oil_missed_issue') return 'OIL';
  return 'UNKNOWN';
}

export function shapeSelfRepairHistoryRow(row, source) {
  const fj = row.findings_json || row.payload?.details || row.payload || {};
  const ts = row.audited_at || row.created_at;
  return {
    receipt_id: row.id,
    timestamp: ts,
    audit_status: fj.status || row.verdict || 'UNKNOWN',
    active_mismatches: fj.active_mismatches || [],
    repair_attempt: fj.what_oil_missed || fj.required_repair || row.findings || fj.summary || null,
    repair_channel: inferRepairChannel(fj),
    type: fj.type || row.receipt_type || 'self_repair',
    source,
    finding_id: fj.finding_id || null,
    severity: fj.severity || null,
  };
}

/** Read self-repair history from DB receipts only — no invented rows. */
export async function readSelfRepairHistory(pool, limit = 20) {
  const cap = Math.max(1, Math.min(Number(limit) || 20, 50));
  const { rows: oilRows } = await pool.query(
    `SELECT id, verdict, findings, findings_json, audited_at, project_slug, written_by
     FROM builder_audit_receipts
     WHERE written_by = 'OIL'
       AND (
         project_slug = 'oil-self-repair'
         OR findings_json->>'type' = 'oil_missed_issue'
         OR findings_json->>'type' = 'self_repair_audit'
         OR findings ILIKE 'OIL missed issue:%'
         OR findings ILIKE 'Self-repair audit:%'
       )
     ORDER BY audited_at DESC LIMIT $1`,
    [cap]
  );

  let secRows = [];
  try {
    secRows = await readReceiptsByType(SECURITY_RECEIPT_TYPES.AUDIT_VERIFICATION, cap, pool);
  } catch {
    secRows = [];
  }
  const secFiltered = secRows.filter(
    (r) =>
      r.payload?.type === 'oil_missed_issue' ||
      r.payload?.type === 'self_repair_audit' ||
      r.payload?.details?.type === 'oil_missed_issue'
  );

  const merged = [
    ...oilRows.map((r) => shapeSelfRepairHistoryRow({ ...r, findings_json: r.findings_json || {} }, 'builder_audit_receipts')),
    ...secFiltered.map((r) => shapeSelfRepairHistoryRow(r, 'security_receipts')),
  ].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  return merged.slice(0, cap);
}

export async function runSelfRepairAudit({
  pool = null,
  baseUrl = process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL,
  commandKey = process.env.COMMAND_CENTER_KEY,
  localDatabaseUrl = process.env.DATABASE_URL,
  root = ROOT,
  writeReceipts = false,
} = {}) {
  const git = readLocalGitShas(root);
  const githubRemote = await fetchGitHubMainSha();
  const [deploy, proofStoreRemote, receipt] = await Promise.all([
    fetchRailwayDeploySha(baseUrl, commandKey),
    fetchRailwayProofStore(baseUrl, commandKey),
    fetchLatestReceiptCommitSha(baseUrl, commandKey),
  ]);

  const runtimeProof = detectRuntimeProofMismatch({
    localHead: git.localHead,
    githubMainSha: git.githubMainSha || githubRemote.sha,
    railwayDeploySha: deploy.deploySha,
    receiptCommitSha: receipt.commitSha,
  });

  const proofStore = detectProofStoreMismatch(localDatabaseUrl, proofStoreRemote.store);

  const context = { runtimeProof, proofStore };
  const activeMisses = evaluateKnownOilMisses(context);

  const receiptWrites = [];
  if (writeReceipts && pool?.query && activeMisses.length) {
    for (const miss of activeMisses) {
      try {
        const w = await writeOilMissedIssueReceipt(pool, {
          findingId: miss.findingId,
          severity: miss.severity,
          whatMissed: miss.whatMissed,
          howFound: miss.howFound,
          requiredRepair: miss.requiredRepair,
          verificationPath: miss.verificationPath,
        });
        receiptWrites.push({ findingId: miss.findingId, receipt_id: w.receipt_id });
      } catch (err) {
        receiptWrites.push({ findingId: miss.findingId, error: err.message });
      }
    }
  }

  return {
    ok: true,
    audited_at: new Date().toISOString(),
    runtime_proof: runtimeProof,
    proof_store: proofStore,
    oil_missed_issues_active: activeMisses,
    receipt_writes: receiptWrites,
    probes: {
      deploy: { ok: deploy.ok, http: deploy.http, deploy_sha: deploy.deploySha },
      proof_store_endpoint: { ok: proofStoreRemote.ok, http: proofStoreRemote.http },
      gemini_receipt: { ok: receipt.ok, receipt_id: receipt.receiptId, commit_sha: receipt.commitSha },
      github_main: { ok: githubRemote.ok, sha: githubRemote.sha, http: githubRemote.http },
      git,
    },
  };
}