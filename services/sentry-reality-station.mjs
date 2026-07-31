/**
 * SYNOPSIS: SENTRY Reality Station — independent Layer A structural assertions
 * and Layer B real-browser walkthroughs that gate a step's DONE status.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBehaviorAssertions } from '../factory-staging/factory-core/sentry/behavior-assertions.js';
import { createSession } from './browser-agent.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_RECEIPT_DIR = path.join(ROOT, 'products', 'receipts');

function getNow() {
  return new Date().toISOString();
}

function safeId(step) {
  return step?.id || step?.step_id || 'unknown';
}

/**
 * Layer A — structural / behavioral assertions (http_status, file_contains,
 * exports_smoke, function_behavior_test, db_row_exists, module_mounts).
 * No browser; no hidden design calls.
 */
export async function runLayerA({ assertions = [], runner = {}, logger = console } = {}) {
  if (!Array.isArray(assertions) || assertions.length === 0) {
    return {
      ok: false,
      layer: 'A',
      reason: 'no_layer_a_assertions',
      findings: ['Layer A required but no assertions provided'],
      results: [],
    };
  }
  const results = await runBehaviorAssertions(assertions, runner);
  const failed = results.filter((r) => !r.ok);
  return {
    ok: failed.length === 0,
    layer: 'A',
    reason: failed.length ? 'layer_a_assertion_failed' : undefined,
    findings: failed.map((r) => `${r.assertion?.type || 'assertion'}: ${r.reason || 'failed'}`),
    results,
  };
}

/**
 * Layer B — real-browser human-sim walkthrough using the existing browser-agent.
 * Scenario is an ordered list of actions: navigate, click, fill, waitFor,
 * assertText, assertUrl, screenshot. Screenshots are captured on the fly.
 */
export async function runLayerB({ scenario = [], baseUrl, session, logger = console, takeScreenshots = true } = {}) {
  if (!Array.isArray(scenario) || scenario.length === 0) {
    return {
      ok: false,
      layer: 'B',
      reason: 'no_layer_b_scenario',
      findings: ['Layer B required but no scenario provided'],
      screenshots: [],
    };
  }

  let browserSession = session;
  let ownSession = false;
  if (!browserSession) {
    try {
      browserSession = await createSession({ headless: true, logger });
      ownSession = true;
    } catch (err) {
      return {
        ok: false,
        layer: 'B',
        reason: 'browser_launch_failed',
        findings: [String(err?.message || err)],
        screenshots: [],
      };
    }
  }

  const findings = [];
  const screenshots = [];
  const maybeScreenshot = async (label = 'layer-b') => {
    if (!takeScreenshots) return null;
    try {
      const p = await browserSession.screenshot(label);
      screenshots.push(p);
      return p;
    } catch {
      return null;
    }
  };

  try {
    for (const action of scenario) {
      const { type } = action;
      if (type === 'navigate') {
        const target = String(action.url || '');
        const url = /^https?:\/\//i.test(target) ? target : `${baseUrl.replace(/\/$/, '')}${target}`;
        await browserSession.navigate(url);
      } else if (type === 'click') {
        await browserSession.click(action.selectorOrText || action.selector);
      } else if (type === 'fill') {
        await browserSession.fill(action.selector, action.value);
      } else if (type === 'waitFor') {
        await browserSession.waitFor(action.selector, action.timeout || 10_000);
      } else if (type === 'assertText') {
        const text = await browserSession.pageText();
        const want = String(action.text || '').toLowerCase();
        if (!text.toLowerCase().includes(want)) {
          findings.push(`assertText missing: "${action.text}"`);
        }
      } else if (type === 'assertUrl') {
        const url = browserSession.currentUrl();
        if (!url.includes(action.contains)) {
          findings.push(`assertUrl mismatch: current=${url}, expected contains ${action.contains}`);
        }
      } else if (type === 'screenshot') {
        await maybeScreenshot(action.label || 'layer-b');
      } else {
        findings.push(`unknown scenario action: ${type}`);
      }
    }

    await maybeScreenshot('layer-b-final');
    return {
      ok: findings.length === 0,
      layer: 'B',
      findings,
      screenshots,
    };
  } catch (err) {
    findings.push(`scenario error: ${String(err?.message || err)}`);
    return { ok: false, layer: 'B', findings, screenshots };
  } finally {
    if (ownSession && browserSession) {
      try { await browserSession.close(); } catch {}
    }
  }
}

/**
 * Fail-closed gate: throws if a step lacks a valid SENTRY PASS receipt from the
 * independent SENTRY actor. The builder must not mark DONE without it.
 */
export function assertSentryPassForStep(step, receipt) {
  if (!receipt) {
    throw new Error(`SENTRY_FAIL: step ${safeId(step)} cannot be marked done without a SENTRY receipt`);
  }
  if (receipt.passed !== true) {
    throw new Error(`SENTRY_FAIL: step ${safeId(step)} receipt is not PASS (${receipt.kind})`);
  }
  if (receipt.verified_by !== 'sentry-reality-station') {
    throw new Error(`SENTRY_FAIL: step ${safeId(step)} receipt was not produced by SENTRY`);
  }
  return true;
}

/**
 * Run the full SENTRY reality station for a step. Layer A always runs. Layer B
 * runs when requireLayerB is true or a scenario is supplied. Emits a receipt.
 */
export async function runSentryRealityStation({
  step = {},
  baseUrl,
  layerA = { assertions: [], runner: {} },
  layerB = { scenario: [] },
  requireLayerB = false,
  receiptDir = DEFAULT_RECEIPT_DIR,
  runId = `sentry-${Date.now()}`,
  logger = console,
} = {}) {
  const ts = getNow();

  const layerAResult = await runLayerA({ ...layerA, logger });
  let layerBResult = { ok: true, skipped: true, layer: 'B', findings: [], screenshots: [] };

  if (requireLayerB || (layerB?.scenario && layerB.scenario.length > 0)) {
    layerBResult = await runLayerB({ ...layerB, baseUrl, logger });
  }

  const pass = layerAResult.ok && layerBResult.ok;
  const findings = [
    ...(layerAResult.findings || []),
    ...(layerBResult.findings || []),
  ];

  const receipt = {
    schema: 'sentry_reality_station_receipt_v1',
    kind: pass ? 'sentry_reality_station_pass' : 'sentry_reality_station_fail',
    run_id: runId,
    run_at: ts,
    base_url: baseUrl,
    step_id: safeId(step),
    verified_by: 'sentry-reality-station',
    builder_actor: null,
    passed: pass,
    layer_a: {
      ok: layerAResult.ok,
      reason: layerAResult.reason,
      findings: layerAResult.findings,
      results: layerAResult.results,
    },
    layer_b: {
      ok: layerBResult.ok,
      skipped: !!layerBResult.skipped,
      reason: layerBResult.reason,
      findings: layerBResult.findings,
      screenshots: layerBResult.screenshots || [],
    },
    findings,
  };

  fs.mkdirSync(receiptDir, { recursive: true });
  const safeRunId = String(runId).replace(/[^a-zA-Z0-9_-]/g, '-');
  const receiptPath = path.join(receiptDir, `SENTRY_${pass ? 'PASS' : 'FAIL'}_${safeId(step)}_${safeRunId}.json`);
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

  return { pass, receipt, receiptPath, layerA: layerAResult, layerB: layerBResult };
}
