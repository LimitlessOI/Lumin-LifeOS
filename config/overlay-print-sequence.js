/**
 * SYNOPSIS: Sealed overlay manufacturing sequence — the factory may not invent
 * the next slice. §64 of the uploaded Taloa print, in order.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { PRINT_INVENTION_FORBIDDEN } from './live-build-queue.js';

export const OVERLAY_PRINT_SLICE_ID = /^(TALOA-S64-|TALOA-P1-|TALOA-G0-|TALOA-BADGE-|TALOA-NATIVE-|TALOA-SENTRY-)/;
export const OVERLAY_PRINT_SOURCE = 'TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md';
export const COLLECTIBLES_PRINT_SLICE_ID = /^COLLECTIBLES-V\d+-/;
export const COLLECTIBLES_PRINT_SOURCE = /docs\/products\/collectibles\/MASTER_BLUEPRINT/i;

const PRINT_SOURCE = `${OVERLAY_PRINT_SOURCE} §64`;

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
  }),
  printStep({
    id: 'TALOA-S64-MACOS-BODY-001',
    target_file: 'native/macos-overlay/MacOsBodyAdapter.swift',
    sandbox_boundary: 'native/macos-overlay/**',
    depends_on: ['TALOA-S64-MACOS-PERCEPTION-001'],
    task: 'Overlay print §64 item 5: macOS Universal Body adapter observe/act/verify over ScreenControl + SemanticPerception. factory-2 compiles. Do not rebuild a second Mind.',
    spec: 'Same contract as Android Body. verify from independent observe.',
    file_contains: ['MacOsBodyAdapter', 'observe', 'act', 'verify'],
  }),
  printStep({
    id: 'TALOA-S64-AUTH-ENVELOPE-001',
    target_file: 'services/taloa/task-authorization-envelope.js',
    sandbox_boundary: 'services/taloa/**',
    task: 'JSDoc @ssot docs/products/universal-overlay/PRODUCT_HOME.md. Overlay print §64 item 6: Task Authorization Envelope. Export createTaskAuthorizationEnvelope({ pool, logger }). Persist on existing agent_task_authority — do not invent a table. Do not import types/logger.',
    spec: 'Blueprint §23. Reuse authority_ledger (TALOA-P1-002).',
    expected_exports: ['createTaskAuthorizationEnvelope'],
    file_contains: ['createTaskAuthorizationEnvelope', 'authority_ledger'],
  }),
  printStep({
    id: 'TALOA-S64-TEMPLATE-REPLAY-001',
    target_file: 'services/taloa/template-replay-service.js',
    sandbox_boundary: 'services/taloa/**',
    task: 'JSDoc @ssot docs/products/universal-overlay/PRODUCT_HOME.md. Overlay print §64 item 7: template persistence + replay. Export createTemplateReplayService({ pool, logger }). Replay when environment_signature still matches. Do not invent a table.',
    spec: 'Blueprint §30–32. Reuse capsule_store.',
    expected_exports: ['createTemplateReplayService'],
    file_contains: ['createTemplateReplayService', 'environment_signature'],
  }),
  printStep({
    id: 'TALOA-S64-PROMPT-INJECT-001',
    target_file: 'services/taloa/prompt-injection-authority-gate.js',
    sandbox_boundary: 'services/taloa/**',
    task: 'JSDoc @ssot docs/products/universal-overlay/PRODUCT_HOME.md. Overlay print §64 item 8: observed page text cannot become instructions. Export assertObservationIsNotAuthority(observation, envelope).',
    spec: 'Blueprint §46.',
    expected_exports: ['assertObservationIsNotAuthority'],
    file_contains: ['assertObservationIsNotAuthority'],
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

export function isOverlayPrintSliceId(id) {
  return OVERLAY_PRINT_SLICE_ID.test(String(id || ''));
}

export function isCollectiblesPrintSlice(step) {
  return COLLECTIBLES_PRINT_SLICE_ID.test(String(step?.id || ''))
    && COLLECTIBLES_PRINT_SOURCE.test(String(step?.source || ''));
}

export function isAuthorizedQueueSlice(step) {
  return isOverlayPrintSliceId(step?.id) || isCollectiblesPrintSlice(step);
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
 * Next sealed slice that is not yet on the queue and whose depends_on are done.
 * Open slices owned by another factory do NOT block enrollment — factory-1 and
 * factory-2 must manufacture overlay in parallel (founder mandatory 2026-08-13).
 */
export function nextSealedOverlaySlice(queue) {
  const steps = Array.isArray(queue?.steps) ? queue.steps : [];
  const byId = new Map(steps.map((s) => [s.id, s]));
  const doneIds = new Set(
    steps
      .filter((s) => String(s.status || '').toLowerCase() === 'done')
      .map((s) => s.id),
  );
  for (const slice of OVERLAY_PRINT_SEQUENCE) {
    if (byId.has(slice.id)) continue;
    const deps = Array.isArray(slice.depends_on) ? slice.depends_on : [];
    if (!deps.every((d) => doneIds.has(d))) continue;
    return slice;
  }
  return null;
}

/** Enroll the next ready sealed slice (one per call; open peers do not block). */
export function enrollNextOverlayPrintSlice(queue) {
  if (!queue || !Array.isArray(queue.steps)) return null;
  const next = nextSealedOverlaySlice(queue);
  if (!next || queue.steps.some((s) => s.id === next.id)) return null;
  queue.steps.push({ ...next });
  return next.id;
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
