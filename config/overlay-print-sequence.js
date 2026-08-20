/**
 * SYNOPSIS: Sealed manufacturing sequences for the ONE queue — factory may not
 * invent the next slice. Overlay §64 still inline; Collectibles loads Architect-sealed
 * docs/products/collectibles/PRINT_SEQUENCE.json (Cursor must not author print).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRINT_INVENTION_FORBIDDEN } from './live-build-queue.js';
import { loadSealedPrintSequence } from '../services/architect-print-seal.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const OVERLAY_PRINT_SLICE_ID = /^(TALOA-S64-|TALOA-P1-|TALOA-G0-|TALOA-BADGE-|TALOA-NATIVE-|TALOA-SENTRY-)/;
export const OVERLAY_PRINT_SOURCE = 'TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md';
// Founder correction 2026-08-14: the original overlay blueprint's own steps
// (ids "1".."9", authored 2026-07-15, founder_gated:false, un-gated by the
// never-idle order) predate the TALOA-* id convention below and were being
// wrongly caught by the invention filter as if they were unauthorized -- a
// naming-convention migration gap, not real invention. blueprint_id is
// already stamped on every real print-sequence step (see printStep() below);
// recognizing it here closes the gap without weakening the actual guard
// (a step still needs a real, known blueprint_id to pass -- nothing new
// self-authorizes).
export const OVERLAY_ORIGINAL_BLUEPRINT_ID = 'PRODUCT-UNIVERSAL-OVERLAY-BUILD-QUEUE-TWIN-V1';
export const COLLECTIBLES_PRINT_SLICE_ID = /^COLLECTIBLES-V\d+-/;
export const COLLECTIBLES_PRINT_SOURCE = /docs\/products\/collectibles\/MASTER_BLUEPRINT/i;

const PRINT_SOURCE = `${OVERLAY_PRINT_SOURCE} §64`;
const COLLECTIBLES_SOURCE = 'docs/products/collectibles/MASTER_BLUEPRINT.md — V1 Trusted Personal Vault';

function printStep(partial) {
  return {
    status: 'pending',
    founder_gated: false,
    attempts: 0,
    action_type: 'author_then_write',
    blueprint_id: 'PRODUCT-UNIVERSAL-OVERLAY-BUILD-QUEUE-TWIN-V1',
    mission_id: 'PRODUCT-universal-overlay',
    source: PRINT_SOURCE,
    depends_on: [],
    ...partial,
    blueprint_step_id: partial.id,
  };
}

export const OVERLAY_PRINT_SEQUENCE = Object.freeze([
  printStep({
    id: 'TALOA-S64-ANDROID-BODY-001',
    target_file: 'services/taloa/android-body-adapter.js',
    sandbox_boundary: 'services/taloa/**',
    task: 'The file MUST begin with a JSDoc block comment containing a line exactly "@ssot docs/products/universal-overlay/PRODUCT_HOME.md". Overlay print §64 item 3: Android Universal Body adapter. Export exactly: export function createAndroidBodyAdapter(deps). Return { observe(scope), act(action), verify(goal, expected) }. observe MUST call deps.dumpVisibleText (injected) then CALL redactObservation from "../drive-sensitive-content-filter.js" on that text before returning. act MUST call deps.enqueueCommand. verify MUST use independent evidence from a fresh observe(). Do NOT rebuild runBrowserGoal. Do NOT invent a table. ES module. Do not edit server.js.',
    spec: 'Reuse dumpVisibleText, enqueueCommand, redactObservation as injected deps. This file is only the Android Body observe/act/verify adapter.',
    expected_exports: ['createAndroidBodyAdapter'],
    file_contains: ['createAndroidBodyAdapter', 'redactObservation', 'dumpVisibleText', 'enqueueCommand'],
    behavior_assertions: [
      { type: 'exports_smoke', path: 'services/taloa/android-body-adapter.js', exports: ['createAndroidBodyAdapter'], assertion_id: 'expected_exports:services/taloa/android-body-adapter.js' },
      { type: 'file_contains', path: 'services/taloa/android-body-adapter.js', must_include: ['redactObservation', 'observe', 'act', 'verify'], assertion_id: 'reachability:android-body-observe-act-verify' },
    ],
    route: null,
  }),
  printStep({
    id: 'TALOA-S64-ANDROID-BODY-WIRE-001',
    target_file: 'services/general-browser-agent-runtime.js',
    sandbox_boundary: 'services/**',
    depends_on: ['TALOA-S64-ANDROID-BODY-001'],
    task: 'Keep existing @ssot. Import createAndroidBodyAdapter from "./taloa/android-body-adapter.js" and CALL it. Export makeAndroidBody(deps). Do NOT rewrite runBrowserGoal. Additive only.',
    spec: 'Add makeAndroidBody so a caller can pass the Android Body without forking the Mind.',
    expected_exports: ['observePage', 'makeAndroidBody'],
    file_contains: ['createAndroidBodyAdapter', 'makeAndroidBody'],
    behavior_assertions: [
      { type: 'file_contains', path: 'services/general-browser-agent-runtime.js', must_include: ['createAndroidBodyAdapter', 'makeAndroidBody'], assertion_id: 'reachability:android-body-wired' },
    ],
  }),
  printStep({
    id: 'TALOA-S64-MACOS-PERCEPTION-001',
    target_file: 'native/macos-overlay/SemanticPerception.swift',
    sandbox_boundary: 'native/macos-overlay/**',
    task: 'Overlay print §64 item 4: macOS semantic perception. Native Swift AXUIElement tree-walk plus vision-model fallback. factory-2 compiles. Do not edit services/ or routes/.',
    spec: 'AX tree as primary observe(); vision fallback when AX is empty. No independent reasoning loop.',
    file_contains: ['SemanticPerception', 'AXUIElement'],
    behavior_assertions: [
      { type: 'file_contains', path: 'native/macos-overlay/ScreenControlCommands.swift', must_include: ['SemanticPerception'], assertion_id: 'reachability:macos-perception-wired' },
    ],
  }),
  printStep({
    id: 'TALOA-S64-MACOS-BODY-001',
    target_file: 'native/macos-overlay/MacOsBodyAdapter.swift',
    sandbox_boundary: 'native/macos-overlay/**',
    depends_on: ['TALOA-S64-MACOS-PERCEPTION-001'],
    task: 'Overlay print §64 item 5: macOS Universal Body adapter observe/act/verify over ScreenControl + SemanticPerception. factory-2 compiles. Do not rebuild a second Mind.',
    spec: 'Same contract as Android Body. verify from independent observe.',
    file_contains: ['MacOsBodyAdapter', 'observe', 'act', 'verify'],
    behavior_assertions: [
      { type: 'file_contains', path: 'native/macos-overlay/ScreenControlCommands.swift', must_include: ['MacOsBodyAdapter'], assertion_id: 'reachability:macos-body-wired' },
    ],
  }),
  printStep({
    id: 'TALOA-S64-MACOS-BODY-WIRE-001',
    target_file: 'native/macos-overlay/ScreenControlCommands.swift',
    sandbox_boundary: 'native/macos-overlay/**',
    depends_on: ['TALOA-S64-MACOS-BODY-001', 'TALOA-S64-MACOS-PERCEPTION-001'],
    task: 'Overlay print §64 item 5 (wire, companion to TALOA-S64-MACOS-BODY-001 -- mirrors TALOA-S64-ANDROID-BODY-WIRE-001\'s existing pattern for the Android Body). Real command dispatch file for the /tmp/taloa-cmd channel. Instantiate MacOsBodyAdapter (which itself uses SemanticPerception) and route the existing observe/capture/click/type/point commands through its observe/act/verify contract instead of leaving the adapter unreachable. Additive only -- do not rewrite the existing command dispatch switch, add a real call site alongside it. factory-2 compiles.',
    spec: 'Closes the same reachability gap the Android Body had before its own -WIRE- step: MacOsBodyAdapter and SemanticPerception compiled but had zero call sites anywhere in the native app (confirmed by direct grep, 2026-08-20).',
    file_contains: ['MacOsBodyAdapter', 'SemanticPerception'],
    behavior_assertions: [
      { type: 'file_contains', path: 'native/macos-overlay/ScreenControlCommands.swift', must_include: ['MacOsBodyAdapter', 'SemanticPerception'], assertion_id: 'reachability:macos-body-wire-real-call-site' },
    ],
  }),
  printStep({
    id: 'TALOA-S64-AUTH-ENVELOPE-001',
    target_file: 'services/taloa/task-authorization-envelope.js',
    sandbox_boundary: 'services/taloa/**',
    task: 'JSDoc @ssot docs/products/universal-overlay/PRODUCT_HOME.md. Overlay print §64 item 6: Task Authorization Envelope. Export createTaskAuthorizationEnvelope({ pool, logger }). Persist on existing agent_task_authority — do not invent a table. Do not import types/logger.',
    spec: 'Blueprint §23. Reuse authority_ledger (TALOA-P1-002).',
    expected_exports: ['createTaskAuthorizationEnvelope'],
    file_contains: ['createTaskAuthorizationEnvelope', 'authority_ledger'],
    behavior_assertions: [
      { type: 'file_contains', path: 'services/taloa/strategy-router-service.js', must_include: ['createTaskAuthorizationEnvelope'], assertion_id: 'reachability:auth-envelope-wired' },
    ],
  }),
  printStep({
    id: 'TALOA-S64-TEMPLATE-REPLAY-001',
    target_file: 'services/taloa/template-replay-service.js',
    sandbox_boundary: 'services/taloa/**',
    task: 'JSDoc @ssot docs/products/universal-overlay/PRODUCT_HOME.md. Overlay print §64 item 7: template persistence + replay. Export createTemplateReplayService({ pool, logger }). Replay when environment_signature still matches. Do not invent a table. WIRING (required, not optional): import createTemplateReplayService into services/taloa/task-orchestrator-service.js and call it at the start of dispatchTask() -- if a matching template replay exists, use it instead of falling through to strategyRouter/bodyAdapter. Additive only, do not rewrite dispatchTask\'s existing flow for the no-replay case.',
    spec: 'Blueprint §30–32. Reuse capsule_store. Real caller required in task-orchestrator-service.js, not just an export (confirmed 2026-08-20: this step was marked done twice with zero real callers and a no-op-shaped diff before this assertion was added).',
    expected_exports: ['createTemplateReplayService'],
    file_contains: ['createTemplateReplayService', 'environment_signature'],
    behavior_assertions: [
      { type: 'file_contains', path: 'services/taloa/task-orchestrator-service.js', must_include: ['createTemplateReplayService'], assertion_id: 'reachability:template-replay-wired' },
    ],
  }),
  printStep({
    id: 'TALOA-S64-PROMPT-INJECT-001',
    target_file: 'services/taloa/prompt-injection-authority-gate.js',
    sandbox_boundary: 'services/taloa/**',
    task: 'JSDoc @ssot docs/products/universal-overlay/PRODUCT_HOME.md. Overlay print §64 item 8: observed page text cannot become instructions. Export assertObservationIsNotAuthority(observation, envelope) with REAL detection logic, not a no-op stub -- a no-op that always passes is a false gate, worse than no gate (it claims coverage it does not have). WIRING (required, not optional): import and call it from services/taloa/body-adapter-service.js\'s observe() method, after the observation is produced and before it is returned, passing the current task\'s authorization envelope. Additive only.',
    spec: 'Blueprint §46. Real caller required in body-adapter-service.js, not just an export (confirmed 2026-08-20: this step was marked done twice with zero real callers and a literal "No-op for now" stub body before this assertion was added).',
    expected_exports: ['assertObservationIsNotAuthority'],
    file_contains: ['assertObservationIsNotAuthority'],
    behavior_assertions: [
      { type: 'file_contains', path: 'services/taloa/body-adapter-service.js', must_include: ['assertObservationIsNotAuthority'], assertion_id: 'reachability:prompt-inject-gate-wired' },
    ],
  }),
  printStep({
    id: 'TALOA-S64-SENTRY-LAYER-B-001',
    target_file: 'scripts/sentry-overlay-layer-b.mjs',
    sandbox_boundary: 'scripts/**',
    task: 'Overlay print §64 item 9 / §52: real Layer B browser walkthrough for universal-overlay. Every finding carries proposed_solution. Register in SENTRY_PRODUCT_REGISTRY.json.',
    spec: 'SO-002 Layer B. Layer A already exists (TALOA-SENTRY-LAYER-A-001).',
    file_contains: ['universal-overlay', 'proposed_solution', 'layer-b'],
  }),
]);

/**
 * Collectibles print is Architect-sealed — NOT authored in this config file.
 * Custody: docs/products/collectibles/PRINT_SEQUENCE.json via architect-print-seal.
 * Cursor editing slice bodies here is SO-001 drift (founder 2026-08-13).
 */
const _collectiblesSealed = loadSealedPrintSequence('collectibles');
export const COLLECTIBLES_PRINT_SEQUENCE = Object.freeze(_collectiblesSealed.steps);
export const COLLECTIBLES_PRINT_SEAL_META = Object.freeze(_collectiblesSealed.meta);

export function isOverlayPrintSliceId(id) {
  return OVERLAY_PRINT_SLICE_ID.test(String(id || ''));
}

export function isCollectiblesPrintSlice(step) {
  if (!COLLECTIBLES_PRINT_SLICE_ID.test(String(step?.id || ''))) return false;
  if (String(step?.product_id || '') === 'collectibles') return true;
  return COLLECTIBLES_PRINT_SOURCE.test(String(step?.source || ''));
}

export function isOriginalOverlayBlueprintStep(step) {
  return String(step?.blueprint_id || '') === OVERLAY_ORIGINAL_BLUEPRINT_ID;
}

export function isAuthorizedQueueSlice(step) {
  return isOverlayPrintSliceId(step?.id) || isCollectiblesPrintSlice(step) || isOriginalOverlayBlueprintStep(step);
}

function isOpen(step) {
  const status = String(step?.status || '');
  if (status === 'done' || status === 'skipped') return false;
  if (String(step?.skip_reason || '').startsWith('off_print')) return false;
  return true;
}

export function overlayPrintStillOpen(queue) {
  const steps = Array.isArray(queue?.steps) ? queue.steps : [];
  if (steps.some((s) => isOverlayPrintSliceId(s.id) && isOpen(s))) return true;
  return nextSealedOverlaySlice(queue) != null;
}

/**
 * Idle is illegal while any Collectibles sealed slice remains, unless the
 * lane was explicitly reassigned (FACTORY_3_REASSIGNED=1 or factory-3 owns:[]).
 */
export function collectiblesLaneReassigned() {
  if (process.env.FACTORY_3_REASSIGNED === '1') return true;
  if (process.env.COLLECTIBLES_LANE_REASSIGNED === '1') return true;
  return false;
}

/** Collectibles print still has open work or an unenrolled sealed slice (V1–V10). */
export function collectiblesPrintStillOpen(queue) {
  if (collectiblesLaneReassigned()) return false;
  const steps = Array.isArray(queue?.steps) ? queue.steps : [];
  if (steps.some((s) => isCollectiblesPrintSlice(s) && isOpen(s))) return true;
  return nextSealedCollectiblesSlice(queue) != null;
}

function nextSealedFromSequence(queue, sequence) {
  const steps = Array.isArray(queue?.steps) ? queue.steps : [];
  const byId = new Map(steps.map((s) => [s.id, s]));
  const doneIds = new Set(
    steps
      .filter((s) => String(s.status || '').toLowerCase() === 'done')
      .map((s) => s.id),
  );
  for (const slice of sequence) {
    if (byId.has(slice.id)) continue;
    const deps = Array.isArray(slice.depends_on) ? slice.depends_on : [];
    if (!deps.every((d) => doneIds.has(d))) continue;
    return slice;
  }
  return null;
}

/**
 * Next sealed slice that is not yet on the queue and whose depends_on are done.
 * Open slices owned by another factory do NOT block enrollment — factory-1 and
 * factory-2 must manufacture overlay in parallel (founder mandatory 2026-08-13).
 */
export function nextSealedOverlaySlice(queue) {
  return nextSealedFromSequence(queue, OVERLAY_PRINT_SEQUENCE);
}

export function nextSealedCollectiblesSlice(queue) {
  return nextSealedFromSequence(queue, COLLECTIBLES_PRINT_SEQUENCE);
}

/** Enroll the next ready sealed slice (one per call; open peers do not block). */
export function enrollNextOverlayPrintSlice(queue) {
  if (!queue || !Array.isArray(queue.steps)) return null;
  const next = nextSealedOverlaySlice(queue);
  if (!next || queue.steps.some((s) => s.id === next.id)) return null;
  queue.steps.push({ ...next });
  return next.id;
}

export function enrollNextCollectiblesPrintSlice(queue) {
  if (!queue || !Array.isArray(queue.steps)) return null;
  const next = nextSealedCollectiblesSlice(queue);
  if (!next || queue.steps.some((s) => s.id === next.id)) return null;
  queue.steps.push({ ...next });
  return next.id;
}

/**
 * Heal Collectibles steps blocked on missing PRODUCT-COLLECTIBLES twin or a
 * sealed exact path that was claimed without the file on disk.
 * If the .exact file is absent, fall back to author_then_write — do not keep
 * pointing at a missing exact (that re-creates hidden_dependency forever).
 */
export function healCollectiblesBlueprintAuthority(queue) {
  const healed = [];
  for (const step of queue?.steps || []) {
    if (!COLLECTIBLES_PRINT_SLICE_ID.test(String(step?.id || ''))) continue;
    const err = String(step.last_error || '');
    const badTwin = /PRODUCT-COLLECTIBLES/i.test(String(step.blueprint_id || ''))
      || /NOT_ON_BLUEPRINT|blueprint_id_not_found|blueprint_step_id_not_on_twin/i.test(err);
    const missingExact = /hidden_dependency|Missing source file/i.test(err);
    if (!badTwin && !missingExact) continue;
    step.blueprint_id = 'PRODUCT-UNIVERSAL-OVERLAY-BUILD-QUEUE-TWIN-V1';
    step.mission_id = 'PRODUCT-universal-overlay';
    step.blueprint_step_id = step.id;
    step.product_id = step.product_id || 'collectibles';
    if (!step.source) step.source = COLLECTIBLES_SOURCE;
    const exactRel = `docs/products/universal-overlay/twins/steps/${step.id}.exact`;
    if (fs.existsSync(path.join(REPO_ROOT, exactRel))) {
      step.action_type = 'write_file_exact';
      step.exact_inputs = { content_source_path: exactRel };
      step.heal_reason = 'collectibles_restore_sealed_exact';
    } else {
      step.action_type = 'author_then_write';
      delete step.exact_inputs;
      if (step.exactness) step.exactness = { ...(step.exactness || {}), sealed: false };
      step.heal_reason = missingExact
        ? 'collectibles_clear_missing_exact_to_author'
        : 'collectibles_cite_one_queue_twin';
    }
    step.status = 'pending';
    step.last_error = null;
    step.demoted = false;
    step.heal_unblocked = true;
    healed.push(step.id);
  }
  return healed;
}

/**
 * Ensure at least one Collectibles print slice is open while V1–V10 remains.
 * Founder: never idle if anything is needed — through V10 unless reassigned.
 */
export function ensureCollectiblesPrintEnrolled(queue) {
  if (!queue || !Array.isArray(queue.steps)) return null;
  if (collectiblesLaneReassigned()) return null;
  healCollectiblesBlueprintAuthority(queue);
  const open = queue.steps.some((s) => isCollectiblesPrintSlice(s) && isOpen(s));
  if (open) return null;
  return enrollNextCollectiblesPrintSlice(queue);
}

/** Last sealed Collectibles slice id (V10 acceptance) — sequence complete only after this is DONE. */
export function collectiblesPrintTerminalId() {
  const last = COLLECTIBLES_PRINT_SEQUENCE[COLLECTIBLES_PRINT_SEQUENCE.length - 1];
  return last?.id || null;
}

export function assertOverlayQueuePrintLaw(queue) {
  if (!queue || queue.product_id !== 'universal-overlay' || !Array.isArray(queue.steps)) return;
  const illegal = queue.steps.filter((s) => isOpen(s) && !isAuthorizedQueueSlice(s));
  if (illegal.length) {
    throw new Error(
      `${PRINT_INVENTION_FORBIDDEN}: open steps are not sealed print slices: ${illegal.map((s) => s.id).join(', ')}. This is supposed to break.`,
    );
  }
}
