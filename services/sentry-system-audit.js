/**
 * SYNOPSIS: SENTRY periodic system audit — the "SENTRY finds, proposes a
 * solution" half of the D7 repair pipeline (FACTORY_REBUILD_MANIFEST_V1.md
 * §16), built as real running code instead of doctrine. Every finding MUST
 * carry a concrete proposed_solution (SO-002, solution-mandatory) — a flag
 * without a fix is treated as an incomplete finding and dropped, not emitted.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Scope, stated honestly: this is a real, narrow slice of the full D7-D10
 * vision (multi-model debate, consensus protocol, automated blueprint
 * rewriting) — NOT that whole system. It runs a small number of genuinely
 * useful, deterministic checks (no AI calls, so no cost/Zero-Waste-AI-Call
 * concern) and produces structured findings a Chair-review step can act on.
 * Extending the check list over time is expected; each new check should stay
 * this same shape: cheap, deterministic, and never fabricate a finding.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLatestMainRun } from '../scripts/ci-health-watchdog.mjs';
import { extractCorpusBacklog } from './build-queue-planner.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS_DIR = path.join(REPO_ROOT, 'docs/products');

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * SENTRY check 1: is main's CI actually red right now? Reuses the exact same
 * GitHub Actions check the CI health watchdog uses — SENTRY and the watchdog
 * are two consumers of the same underlying signal, not two competing ways of
 * checking it.
 */
export async function checkCiHealth({ token, repo, workflowFile = 'smoke-test.yml' } = {}) {
  if (!token || !repo) return [];
  let run;
  try {
    run = await fetchLatestMainRun({ token, repo, workflowFile });
  } catch (err) {
    return [{
      id: `ci_health_check_error:${workflowFile}`,
      check: 'ci_health',
      severity: 'P2',
      summary: `Could not check ${workflowFile} status: ${err.message}`,
      proposed_solution: `Verify GITHUB_TOKEN/GITHUB_REPO are valid and the workflow file "${workflowFile}" still exists at .github/workflows/${workflowFile}.`,
      detected_at: new Date().toISOString(),
    }];
  }
  if (!run || run.status !== 'completed' || run.conclusion !== 'failure') return [];
  return [{
    id: `ci_health:${workflowFile}:${run.sha}`,
    check: 'ci_health',
    severity: 'P0',
    summary: `main's ${workflowFile} is FAILING at ${run.sha.slice(0, 7)}.`,
    proposed_solution: `Read the failing run log (gh run view --log-failed) at ${run.htmlUrl}, identify the exact failing assertion, and fix it directly on main — do not let further commits ship on top of red CI.`,
    detected_at: new Date().toISOString(),
  }];
}

/**
 * SENTRY check 2: does a product have NO more work — its BUILD_QUEUE.json is
 * fully terminal (done/no pending steps) AND its own PRODUCT_HOME has no
 * documented backlog either? A "never-stop" factory with a fully-drained
 * top-priority product is silently idle on the thing that matters most.
 * Direct regression guard for the exact LifeOS finding from 2026-07-18
 * (175/175 done, zero documented backlog) recurring silently again, on
 * LifeOS or any other product.
 */
export function checkProductBacklogs({ productsDir = PRODUCTS_DIR } = {}) {
  const findings = [];
  let productIds;
  try {
    productIds = fs.readdirSync(productsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }

  for (const productId of productIds) {
    const queuePath = path.join(productsDir, productId, 'BUILD_QUEUE.json');
    const queue = readJsonSafe(queuePath);
    if (!queue || !Array.isArray(queue.steps) || queue.steps.length === 0) continue;

    const terminalStatuses = new Set(['done', 'blocked', 'demoted', 'awaiting_founder']);
    const hasActionableStep = queue.steps.some((s) => !terminalStatuses.has(s.status));
    if (hasActionableStep) continue; // still has real work queued — not idle

    const allDone = queue.steps.every((s) => s.status === 'done');
    if (!allDone) continue; // idle because steps are blocked/demoted, not because it "finished" — different problem, not this check

    // Read PRODUCT_HOME.md directly from productsDir (which may be an
    // injected test fixture path, not the real repo root) and pass it as
    // homeText — extractCorpusBacklog's default corpus-loading path
    // hardcodes root/docs/products/<id>, which would silently resolve
    // against the REAL repo even when this check is given a different
    // productsDir, producing false positives in anything but the default,
    // non-injected case.
    const homePath = path.join(productsDir, productId, 'PRODUCT_HOME.md');
    let homeText = '';
    try {
      homeText = fs.readFileSync(homePath, 'utf8');
    } catch {
      // no PRODUCT_HOME.md at all — treat as no documented backlog, fall through
    }
    let backlog;
    try {
      backlog = extractCorpusBacklog(productId, { homeText });
    } catch {
      continue;
    }
    if (backlog.items && backlog.items.length > 0) continue; // real backlog exists, planner just hasn't run yet — not this finding

    findings.push({
      id: `empty_backlog:${productId}`,
      check: 'product_backlog',
      severity: 'P1',
      summary: `Product "${productId}" has 100% done BUILD_QUEUE.json (${queue.steps.length} steps) and zero documented backlog in its PRODUCT_HOME — the factory has nothing left to build here.`,
      proposed_solution: `Chair should interview the founder for this product's next real priorities (D8) and have Architect write them into docs/products/${productId}/PRODUCT_HOME.md under a Backlog/Remaining Work heading so the planner (services/build-queue-planner.js) can turn them into queue steps.`,
      detected_at: new Date().toISOString(),
    });
  }
  return findings;
}

/**
 * SENTRY check 3: a GitHub Actions workflow that completes in a few seconds
 * on every single run is very unlikely to be doing real work — it's almost
 * always a parse/config error (invalid YAML, wrong action version) rather
 * than the job's actual content failing. Direct regression guard for the
 * migrate.yml case (markdown code-fences pasted into the raw file, invalid
 * YAML, failed in 0s on every push for a long time, unnoticed).
 */
export async function checkWorkflowHealth({ token, repo, fetchFn = fetch, instantThresholdSeconds = 5 } = {}) {
  if (!token || !repo) return [];
  const [owner, name] = String(repo).split('/');
  let workflowsResp;
  try {
    workflowsResp = await fetchFn(`https://api.github.com/repos/${owner}/${name}/actions/workflows`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
  } catch (err) {
    return [];
  }
  if (!workflowsResp.ok) return [];
  const workflowsJson = await workflowsResp.json();
  const workflows = Array.isArray(workflowsJson?.workflows) ? workflowsJson.workflows : [];

  const findings = [];
  for (const wf of workflows) {
    if (wf.state !== 'active') continue;
    let runsResp;
    try {
      runsResp = await fetchFn(`https://api.github.com/repos/${owner}/${name}/actions/workflows/${wf.id}/runs?per_page=3`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      });
    } catch {
      continue;
    }
    if (!runsResp.ok) continue;
    const runsJson = await runsResp.json();
    const runs = Array.isArray(runsJson?.workflow_runs) ? runsJson.workflow_runs : [];
    if (runs.length < 2) continue; // not enough history to call this a pattern

    const allFailedInstantly = runs.every((r) => {
      if (r.conclusion !== 'failure') return false;
      const started = new Date(r.run_started_at).getTime();
      const updated = new Date(r.updated_at).getTime();
      const durationSec = (updated - started) / 1000;
      return Number.isFinite(durationSec) && durationSec >= 0 && durationSec < instantThresholdSeconds;
    });
    if (!allFailedInstantly) continue;

    findings.push({
      id: `broken_workflow:${wf.path}`,
      check: 'workflow_health',
      severity: 'P2',
      summary: `.github/workflows/${wf.path.split('/').pop()} has failed in under ${instantThresholdSeconds}s on its last ${runs.length} runs — almost certainly a config/syntax error, not a content failure.`,
      proposed_solution: `Read .github/workflows/${wf.path.split('/').pop()} directly for invalid YAML (stray markdown code-fences are a known real cause) or a broken action reference; fix or remove if superseded by a newer mechanism.`,
      detected_at: new Date().toISOString(),
    });
  }
  return findings;
}

/**
 * SENTRY check 4: receipt reproducibility. A row existing in
 * judgment_receipt_links is not the same as the row's CONTENT being true —
 * this independently re-derives the claim from the primary source (GitHub's
 * own commit record) instead of trusting whatever was stored at write-time.
 * "We cannot just take AI at its word. We have to inspect what we expect."
 * (founder, 2026-07-19) — this is that instruction as running code, applied
 * one layer past the forgery fix: even a REAL row could name a fabricated or
 * mistyped commit SHA, and nothing before this check would ever notice.
 *
 * V1 scope, stated honestly: only 'deploy' and 'ci' receipts are
 * independently reproducible with what's available here (does the claimed
 * commit SHA genuinely exist in the repo's real history on GitHub?).
 * 'sentry' / 'revert' / 'manual' receipt kinds are not yet reproducible —
 * silently skipped rather than falsely flagged OR falsely trusted.
 * Fails open on network/transient errors — a timeout is never treated as
 * proof of fabrication.
 */
export async function checkReceiptReproducibility({
  pool,
  token,
  repo,
  sampleSize = 25,
  fetchFn = fetch,
} = {}) {
  if (!pool || !token || !repo) return [];
  const [owner, name] = String(repo).split('/');
  let rows;
  try {
    ({ rows } = await pool.query(
      `SELECT link_id, decision_id, receipt_kind, receipt_ref
       FROM judgment_receipt_links
       WHERE receipt_kind IN ('deploy', 'ci')
       ORDER BY created_at DESC
       LIMIT $1`,
      [sampleSize],
    ));
  } catch {
    return [];
  }

  const findings = [];
  for (const link of rows) {
    if (!link.receipt_ref) {
      findings.push({
        id: `receipt_integrity:${link.link_id}`,
        check: 'receipt_integrity',
        severity: 'P1',
        summary: `judgment_receipt_links row ${link.link_id} (decision ${link.decision_id}, kind=${link.receipt_kind}) has no receipt_ref to independently verify against.`,
        proposed_solution: `Re-open decision ${link.decision_id} for manual review — a ${link.receipt_kind} receipt with no reference cannot be reproduced from the primary source, so it should not count as receipt_verified evidence until corrected.`,
        detected_at: new Date().toISOString(),
      });
      continue;
    }
    let resp;
    try {
      resp = await fetchFn(`https://api.github.com/repos/${owner}/${name}/commits/${link.receipt_ref}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      });
    } catch {
      continue; // transient network error — fail open, never accuse on a timeout
    }
    if (resp.status === 404) {
      findings.push({
        id: `receipt_integrity:${link.link_id}`,
        check: 'receipt_integrity',
        severity: 'P0',
        summary: `judgment_receipt_links row ${link.link_id} (decision ${link.decision_id}) claims a ${link.receipt_kind} receipt for commit "${link.receipt_ref}", but no such commit exists in ${repo} — the claim does not reproduce.`,
        proposed_solution: `Re-open decision ${link.decision_id} for manual review immediately — this outcome was counted as receipt-verified evidence in the calibration scoreboard but the underlying receipt is fabricated, mistyped, or the history was rewritten. Do not count it toward calibration until a real, verifiable commit is found or the row is corrected.`,
        detected_at: new Date().toISOString(),
      });
    }
    // any other status (200 = genuinely exists, or a non-404 API error) —
    // never flag on ambiguity, only on a confirmed 404 non-existence.
  }
  return findings;
}

/**
 * Runs all SENTRY checks and returns the combined finding list. Each check
 * fails open (returns [] on its own error) so one broken check never blocks
 * the others.
 */
export async function runSentrySystemAudit({
  token = process.env.GITHUB_TOKEN,
  repo = process.env.GITHUB_REPO,
  productsDir = PRODUCTS_DIR,
  pool = undefined,
} = {}) {
  const [ciFindings, backlogFindings, workflowFindings, receiptFindings] = await Promise.all([
    checkCiHealth({ token, repo }).catch(() => []),
    Promise.resolve().then(() => checkProductBacklogs({ productsDir })).catch(() => []),
    checkWorkflowHealth({ token, repo }).catch(() => []),
    checkReceiptReproducibility({ pool, token, repo }).catch(() => []),
  ]);
  return [...ciFindings, ...backlogFindings, ...workflowFindings, ...receiptFindings];
}
