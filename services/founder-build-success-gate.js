/**
 * SYNOPSIS: Founder build success gate — PASS requires atomic commit + outcome + live content + client proof spec.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  APP_HTML_TARGET,
  ASSISTANT_BUBBLE_CSS_TARGET,
  DASHBOARD_HTML_TARGET,
  FOUNDER_CSS_BATCH_FILES,
  SW_TARGET,
  parseAssistantBubbleColors,
} from './founder-css-patch.js';
import { isCssOnlyUiFeedback } from './builder-instruction-target.js';
import { verifyFounderCssCommitOutcome } from './founder-build-outcome.js';

export const FOUNDER_CSS_COMMIT_FILES = FOUNDER_CSS_BATCH_FILES;

export const FOUNDER_BUILD_TOOL_INVENTORY = {
  entry: 'POST /api/v1/lifeos/builderos/command-control/founder-interface/message',
  routing: [
    'routes/lifeos-builderos-command-control-routes.js',
    'services/builder-instruction-target.js',
  ],
  execution: [
    'services/founder-build-self-repair.js',
    'services/founder-css-patch.js',
    'routes/lifeos-council-builder-routes.js — POST /builder/execute-batch',
    'services/deployment-service.js — commitManyToGitHub',
  ],
  truth: [
    'services/lifeos-execution-truth.js',
    'services/founder-build-success-gate.js',
    'services/founder-build-outcome.js',
    'services/founder-build-quorum-escalation.js — 3 solo → 2-AI → 3-AI → Chair',
  ],
  deploy: [
    'GET /api/v1/lifeos/builder/ready',
    'POST /api/v1/railway/deploy',
    'POST /api/v1/railway/managed-env/build-from-latest',
    'scripts/system-railway-redeploy.mjs',
  ],
  client: [
    'public/shared/lifeos-founder-bubble-proof.js',
    'public/shared/lifeos-system-reply.js',
  ],
};

const DEFAULT_CONTENT_WAIT_MS = Number(process.env.FOUNDER_CONTENT_WAIT_MS || '45000');
const DEFAULT_DEPLOY_WAIT_MS = Number(process.env.FOUNDER_DEPLOY_WAIT_MS || '120000');
const DEFAULT_POLL_MS = Number(process.env.FOUNDER_DEPLOY_POLL_MS || '3000');

function normalizeSha(sha) {
  return String(sha || '').trim().slice(0, 12);
}

function cssTokenPresent(content, token) {
  const text = String(content || '').toLowerCase();
  const needle = String(token || '').toLowerCase();
  return needle.length > 0 && text.includes(needle);
}

export function computeCssContentFingerprint(colors) {
  const payload = JSON.stringify({
    background: colors?.background,
    border: colors?.border,
    color: colors?.color,
  });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

export async function fetchDeployCommitSha(baseUrl, commandKey) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  if (!base || !commandKey) return null;
  try {
    const res = await fetch(`${base}/api/v1/lifeos/builder/ready`, {
      headers: { 'x-command-key': commandKey },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.codegen?.deploy_commit_sha || data?.builder?.deploy_commit_sha || null;
  } catch {
    return null;
  }
}

export async function waitForDeployMatchingCommit({
  baseUrl,
  commandKey,
  commitSha,
  maxWaitMs = DEFAULT_DEPLOY_WAIT_MS,
  pollMs = DEFAULT_POLL_MS,
} = {}) {
  const expected = normalizeSha(commitSha);
  if (!expected) {
    return { ok: false, code: 'COMMIT_NO_SHA', blocker: 'Cannot verify deploy without commit SHA.' };
  }
  const deadline = Date.now() + maxWaitMs;
  let lastDeploySha = null;
  while (Date.now() < deadline) {
    lastDeploySha = await fetchDeployCommitSha(baseUrl, commandKey);
    const live = normalizeSha(lastDeploySha);
    if (live && (live.startsWith(expected.slice(0, 7)) || expected.startsWith(live.slice(0, 7)))) {
      return { ok: true, deploy_sha: lastDeploySha, commit_sha: commitSha };
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return {
    ok: false,
    code: 'DEPLOY_NOT_SYNCED',
    blocker: `Deploy SHA (${normalizeSha(lastDeploySha) || 'unknown'}) does not match commit ${expected} after ${Math.round(maxWaitMs / 1000)}s.`,
    deploy_sha: lastDeploySha,
    commit_sha: commitSha,
  };
}

export async function triggerRailwayRedeploy({ baseUrl, commandKey, commitSha = null }) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  if (!base || !commandKey) {
    return { ok: false, error: 'missing_base_or_key' };
  }
  const body = commitSha ? JSON.stringify({ commit_sha: commitSha }) : '{}';
  for (const url of [
    `${base}/api/v1/railway/deploy`,
    `${base}/api/v1/railway/managed-env/build-from-latest`,
  ]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-command-key': commandKey },
        body,
        signal: AbortSignal.timeout(30000),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok !== false) {
        return { ok: true, path: url, json };
      }
      if (res.status === 410 && json?.error === 'LEGACY_RAILWAY_CONTROL_DISABLED') continue;
    } catch {
      /* try next */
    }
  }
  return { ok: false, error: 'redeploy_paths_exhausted' };
}

export function verifyInlineCssInHtml(html, colors) {
  const text = String(html || '');
  const hasAssistantRule = /\.msg\.assistant|\.lumin-msg\.assistant/.test(text);
  const hasBg = cssTokenPresent(text, colors.background);
  const hasColor = cssTokenPresent(text, colors.color);
  if (!hasAssistantRule) return { ok: false, reason: 'assistant_selector_missing' };
  if (!hasBg || !hasColor) return { ok: false, reason: 'color_tokens_missing', hasBg, hasColor };
  return { ok: true };
}

export function verifyCssPatchLocal({ patchResult }) {
  if (!patchResult?.ok || !Array.isArray(patchResult.files)) {
    return { ok: false, code: 'PATCH_INVALID', blocker: 'Mechanical CSS patch did not produce file outputs.' };
  }
  const colors = patchResult.colors || parseAssistantBubbleColors('yellow black text');
  const byTarget = Object.fromEntries(patchResult.files.map((f) => [f.target_file, f.output]));
  const missing = FOUNDER_CSS_BATCH_FILES.filter((f) => !byTarget[f]);
  if (missing.length) {
    return { ok: false, code: 'SCOPE_INCOMPLETE', blocker: `CSS patch missing files: ${missing.join(', ')}`, missing };
  }
  for (const surface of [DASHBOARD_HTML_TARGET, APP_HTML_TARGET]) {
    const check = verifyInlineCssInHtml(byTarget[surface], colors);
    if (!check.ok) {
      return { ok: false, code: 'LOCAL_CSS_MISSING', blocker: `${surface} failed local check: ${check.reason}`, surface };
    }
  }
  const themeText = byTarget[ASSISTANT_BUBBLE_CSS_TARGET];
  if (!cssTokenPresent(themeText, colors.background) || !/founder-assistant-bubble-style:start/.test(themeText)) {
    return { ok: false, code: 'LOCAL_CSS_MISSING', blocker: 'Theme overrides missing founder assistant bubble block.', surface: ASSISTANT_BUBBLE_CSS_TARGET };
  }
  const swText = byTarget[SW_TARGET];
  if (!/const\s+CACHE_NAME\s*=/.test(swText)) {
    return { ok: false, code: 'LOCAL_CSS_MISSING', blocker: 'Service worker CACHE_NAME missing.', surface: SW_TARGET };
  }
  return { ok: true, code: 'LOCAL_CSS_VERIFIED', colors, fingerprint: computeCssContentFingerprint(colors) };
}

export async function fetchLiveOverlayHtml(baseUrl, overlayFile) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  const rel = String(overlayFile || '').replace(/^public\/overlay\//, '');
  const url = `${base}/overlay/${rel}?founder_proof=${Date.now()}`;
  try {
    const res = await fetch(url, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { ok: false, status: res.status, url };
    return { ok: true, status: res.status, url, text: await res.text() };
  } catch (err) {
    return { ok: false, url, error: err.message };
  }
}

export async function waitForLiveCssContent({ baseUrl, patchResult, maxWaitMs = DEFAULT_CONTENT_WAIT_MS, pollMs = DEFAULT_POLL_MS }) {
  const colors = patchResult?.colors || parseAssistantBubbleColors('yellow black text');
  const deadline = Date.now() + maxWaitMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await verifyCssPatchLive({ baseUrl, patchResult });
    if (last.ok) return last;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return last || { ok: false, code: 'FOUNDER_VISUAL_NOT_VERIFIED', blocker: 'Live overlay never matched expected CSS.' };
}

export async function verifyCssPatchLive({ baseUrl, patchResult }) {
  const colors = patchResult?.colors || parseAssistantBubbleColors('yellow black text');
  const checks = [
    { file: DASHBOARD_HTML_TARGET, label: 'dashboard' },
    { file: APP_HTML_TARGET, label: 'app shell' },
    { file: ASSISTANT_BUBBLE_CSS_TARGET, label: 'theme overrides' },
    { file: SW_TARGET, label: 'service worker' },
  ];
  const surfaces = [];
  for (const item of checks) {
    const live = await fetchLiveOverlayHtml(baseUrl, item.file);
    if (!live.ok) {
      return {
        ok: false,
        code: 'LIVE_FETCH_FAILED',
        blocker: `Could not fetch live ${item.file}: HTTP ${live.status || live.error}`,
        url: live.url,
      };
    }
    if (item.file.endsWith('.css') || item.file.endsWith('.js')) {
      if (!cssTokenPresent(live.text, colors.background)) {
        return {
          ok: false,
          code: 'FOUNDER_VISUAL_NOT_VERIFIED',
          blocker: `Live ${item.label} missing ${colors.background}.`,
          surface: item.file,
        };
      }
    } else {
      const check = verifyInlineCssInHtml(live.text, colors);
      if (!check.ok) {
        return {
          ok: false,
          code: 'FOUNDER_VISUAL_NOT_VERIFIED',
          blocker: `Live ${item.label} missing expected CSS — ${check.reason}.`,
          surface: item.file,
          url: live.url,
        };
      }
    }
    surfaces.push(item.file);
  }
  return {
    ok: true,
    code: 'FOUNDER_VISUAL_VERIFIED',
    surfaces,
    colors,
    fingerprint: computeCssContentFingerprint(colors),
    client_check: {
      expected_colors: colors,
      script: '/shared/lifeos-founder-bubble-proof.js',
      selectors: ['.msg.assistant', '.lumin-msg.assistant'],
    },
  };
}

export function founderVerificationRequired(task, executionPath) {
  if (executionPath === 'founder_css_patch' || executionPath === 'founder_visual_ui_patch') return true;
  return isCssOnlyUiFeedback(task);
}

export function resolveFounderBuildBaseUrl() {
  const explicit = String(process.env.FOUNDER_BUILD_BASE_URL || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const localLoopback = `http://127.0.0.1:${process.env.PORT || 3000}`;
  // Railway API credentials (PROJECT_ID/SERVICE_ID/TOKEN) are often present
  // locally for programmatic deploys, but they do NOT mean this process is
  // running on Railway with a live public domain. Only trust an actual runtime
  // Railway domain or environment name; otherwise founder builds must talk to
  // the local loopback so commits land in this running runtime.
  const isActuallyDeployedOnRailway = Boolean(
    process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_ENVIRONMENT_NAME
  );

  const base = isActuallyDeployedOnRailway
    ? (
      process.env.PUBLIC_BASE_URL
      || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '')
      || localLoopback
    )
    : localLoopback;
  return String(base).replace(/\/$/, '');
}

export function assertFounderBuildBaseUrl(baseUrl) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  if (!base) {
    return { ok: false, code: 'BASE_URL_MISSING', blocker: 'PUBLIC_BASE_URL is required for founder build verification.' };
  }
  if (/localhost|127\.0\.0\.1/.test(base) && process.env.NODE_ENV === 'production' && !process.env.FOUNDER_ALLOW_LOOPBACK_BASE) {
    return { ok: false, code: 'BASE_URL_LOOPBACK', blocker: 'Production founder builds require PUBLIC_BASE_URL — loopback cannot verify live deploy.' };
  }
  return { ok: true, baseUrl: base };
}

export async function runFounderSuccessGate({
  task,
  executionPath,
  patchResult,
  commitSha,
  baseUrl,
  commandKey,
  skipLive = false,
}) {
  if (!founderVerificationRequired(task, executionPath)) {
    return { ok: true, code: 'NOT_REQUIRED', skipped: true };
  }

  const baseCheck = assertFounderBuildBaseUrl(baseUrl);
  if (!baseCheck.ok) return { ...baseCheck, stage: 'base_url' };

  const local = verifyCssPatchLocal({ patchResult });
  if (!local.ok) return { ...local, stage: 'local' };

  if (skipLive || process.env.FOUNDER_SKIP_LIVE_VERIFY === '1') {
    return {
      ok: false,
      code: 'FOUNDER_VISUAL_NOT_VERIFIED',
      blocker: 'Live founder verification is required for UI CSS PASS but was skipped.',
      stage: 'live_skipped',
    };
  }

  const outcome = await verifyFounderCssCommitOutcome({ task, commitSha, colors: patchResult.colors });
  if (!outcome.ok) {
    return { ...outcome, blocker: outcome.reason || outcome.code, stage: 'outcome' };
  }

  const live = await waitForLiveCssContent({ baseUrl: baseCheck.baseUrl, patchResult });
  if (!live.ok) {
    return { ...live, stage: 'live' };
  }

  const deploy = await waitForDeployMatchingCommit({
    baseUrl: baseCheck.baseUrl,
    commandKey,
    commitSha,
    maxWaitMs: Math.min(DEFAULT_DEPLOY_WAIT_MS, 60000),
  });

  return {
    ...live,
    outcome_verified: true,
    outcome,
    deploy_synced: deploy.ok,
    deploy_sha: deploy.deploy_sha || null,
    deploy_warning: deploy.ok ? null : deploy.blocker,
    stage: 'complete',
  };
}

export function readRepoFileForPatch(root, relPath) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) return '';
  return fs.readFileSync(abs, 'utf8');
}
