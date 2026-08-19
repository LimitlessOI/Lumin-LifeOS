/**
 * SYNOPSIS: Detects genuinely stalled autonomous work (SENTRY unplannable
 * stamps caused by real failures, never a deliberate founder spin-break),
 * prioritizes a repair attempt above all normal build work, and alerts the
 * founder — escalating to a call only if the boosted repair attempt
 * genuinely fails again, not on the first sign of trouble.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAMP_PATH = path.join(ROOT, 'data/sentry-unplannable-stamps.json');
const BOOST_PATH = path.join(ROOT, 'data/sentry-stall-recovery-boosts.json');

// A stamp whose reason names a deliberate human decision must never be
// auto-touched — only genuine system failures get auto-recovered.
const DELIBERATE_MARKERS = ['manual', 'founder_priority', 'founder_hold'];

// Give a boosted retry real time to actually run before concluding the
// stall "cleared" just because it isn't currently re-stamped — a fresh
// attempt in flight looks identical to "recovered" for a few minutes.
const RECOVERY_CONFIRM_MS = 3 * 60 * 1000;
const MAX_BOOSTED_RETRIES = 3;

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`);
}

export function isDeliberateStamp(reason) {
  const r = String(reason || '').toLowerCase();
  return DELIBERATE_MARKERS.some((m) => r.includes(m));
}

/** Genuinely-failed (not deliberate) stalls right now. */
export function detectGenuineStalls() {
  const stamps = readJson(STAMP_PATH, {});
  return Object.entries(stamps)
    .filter(([, row]) => !isDeliberateStamp(row?.reason))
    .map(([productId, row]) => ({ productId, ...row }));
}

export function getBoostState(productId) {
  const boosts = readJson(BOOST_PATH, {});
  return boosts[productId] || null;
}

function setBoostState(productId, state) {
  const boosts = readJson(BOOST_PATH, {});
  if (state === null) delete boosts[productId];
  else boosts[productId] = state;
  writeJson(BOOST_PATH, boosts);
}

function removeUnplannableStamp(productId) {
  const stamps = readJson(STAMP_PATH, {});
  delete stamps[productId];
  writeJson(STAMP_PATH, stamps);
}

/**
 * Priority override for discoverSentryFixWork: 1 (above concrete product
 * builds) while a product is under active boosted repair, otherwise the
 * normal low priority the caller already computed. Additive only — never
 * changes behavior for a product that was never stalled.
 */
export function stallBoostPriority(productId, normalPriority) {
  const boost = getBoostState(productId);
  return boost && boost.active ? 1 : normalPriority;
}

/**
 * Call every recovery tick. For each genuine (non-deliberate) stall:
 *  - first time seen: unblock it (clear the stamp so the planner retries),
 *    boost its priority to 1, alert the founder once by SMS.
 *  - re-stamped with the SAME signature while boosted: the prioritized
 *    retry did not fix it — keep retrying up to MAX_BOOSTED_RETRIES, then
 *    escalate to a phone call naming exactly what's still broken.
 *  - re-stamped with a DIFFERENT signature while boosted: real progress
 *    was made past the original failure into a new one — keep boosting,
 *    don't call yet.
 *  - stamp clears and stays clear for RECOVERY_CONFIRM_MS: shipped again,
 *    boost cleared, logged.
 */
export async function reconcileStalls({ logger = console, sendSms, sendCall } = {}) {
  const stalls = detectGenuineStalls();
  const stalledIds = new Set(stalls.map((s) => s.productId));
  const actions = [];

  for (const stall of stalls) {
    const existing = getBoostState(stall.productId);

    if (!existing) {
      removeUnplannableStamp(stall.productId);
      setBoostState(stall.productId, {
        active: true,
        signature: stall.signature,
        first_seen_reason: stall.reason,
        boosted_at: new Date().toISOString(),
        retry_count: 0,
      });
      const msg = `SENTRY STALL: "${stall.productId}" has been stuck since ${stall.stamped_at} (${stall.reason || 'unknown reason'}). Prioritizing a repair attempt now above all other work.`;
      if (sendSms) {
        try { await sendSms(msg); } catch (e) { logger?.warn?.({ error: e.message }, '[STALL-RECOVERY] SMS failed'); }
      }
      logger?.error?.({ productId: stall.productId, reason: stall.reason }, '[STALL-RECOVERY] genuine stall detected — unblocked, boosted, alerted');
      actions.push({ productId: stall.productId, action: 'unblocked_and_boosted' });
      continue;
    }

    if (!existing.active) continue;

    if (existing.signature !== stall.signature) {
      removeUnplannableStamp(stall.productId);
      setBoostState(stall.productId, { ...existing, signature: stall.signature, retry_count: (existing.retry_count || 0) + 1, last_touched_at: new Date().toISOString() });
      actions.push({ productId: stall.productId, action: 'reboosted_new_failure' });
      continue;
    }

    // Same exact failure came back while boosted — the prioritized retry
    // did not fix it.
    const retryCount = (existing.retry_count || 0) + 1;
    if (retryCount >= MAX_BOOSTED_RETRIES) {
      setBoostState(stall.productId, { ...existing, retry_count: retryCount, active: false, escalated_at: new Date().toISOString() });
      const msg = `SENTRY STALL UNRESOLVED: "${stall.productId}" failed the same way (${stall.reason || stall.signature}) again after ${retryCount} prioritized repair attempts. Manufacturing remains stopped on this product until you weigh in.`;
      if (sendCall) {
        try { await sendCall(msg); } catch (e) { logger?.warn?.({ error: e.message }, '[STALL-RECOVERY] call failed'); }
      }
      logger?.error?.({ productId: stall.productId, retryCount }, '[STALL-RECOVERY] escalated to founder call — boosted retries exhausted');
      actions.push({ productId: stall.productId, action: 'escalated_to_call' });
    } else {
      removeUnplannableStamp(stall.productId);
      setBoostState(stall.productId, { ...existing, retry_count: retryCount, last_touched_at: new Date().toISOString() });
      actions.push({ productId: stall.productId, action: 'reboosted_retry', retryCount });
    }
  }

  // A product no longer stamped and not touched for a while has likely
  // shipped again — clear its boost. Time-gated so an in-flight retry
  // isn't mistaken for recovery before it's had a chance to run.
  const allBoosted = readJson(BOOST_PATH, {});
  for (const productId of Object.keys(allBoosted)) {
    const b = allBoosted[productId];
    if (!b?.active || stalledIds.has(productId)) continue;
    const lastTouchedMs = Date.parse(b.last_touched_at || b.boosted_at || 0) || 0;
    if (Date.now() - lastTouchedMs < RECOVERY_CONFIRM_MS) continue;
    logger?.info?.({ productId }, '[STALL-RECOVERY] stall cleared — product shipping again');
    setBoostState(productId, null);
    actions.push({ productId, action: 'recovered' });
  }

  return { stalls: stalls.map((s) => s.productId), actions };
}

export default reconcileStalls;
