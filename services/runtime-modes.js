/**
 * SYNOPSIS: Central runtime safety defaults for autonomy-related env flags.
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 *
 * Central runtime safety defaults for autonomy-related env flags.
 * These defaults intentionally fail closed when vars are omitted.
 */

function normalize(value, fallback = '') {
  return String(value ?? fallback).trim().toLowerCase();
}

export function getRuntimeProfile(env = process.env) {
  const raw = normalize(env.LIFEOS_RUNTIME_PROFILE, 'founder_builder');
  const explicitFullRuntime = normalize(env.LIFEOS_ENABLE_FULL_RUNTIME, 'false') === 'true';
  if (raw === 'full' || raw === 'legacy_full') {
    return explicitFullRuntime ? 'full' : 'founder_builder';
  }
  if (raw === 'founder_builder' || raw === 'builder' || raw === 'founder') {
    return 'founder_builder';
  }
  return 'founder_builder';
}

export function isFullRuntimeProfile(env = process.env) {
  return getRuntimeProfile(env) === 'full';
}

export function isFounderBuilderRuntimeProfile(env = process.env) {
  return getRuntimeProfile(env) === 'founder_builder';
}

export function isDirectedMode(env = process.env) {
  return normalize(env.LIFEOS_DIRECTED_MODE, 'true') !== 'false';
}

export function isAutonomyPaused(env = process.env) {
  return normalize(env.PAUSE_AUTONOMY, '1') === '1';
}

export function isAutoBuilderSchedulerEnabled(env = process.env) {
  return normalize(env.LIFEOS_ENABLE_AUTO_BUILDER_SCHEDULER, 'false') === 'true';
}

export function getHabDailyLimit(env = process.env) {
  const parsed = Number.parseInt(String(env.HAB_DAILY_LIMIT ?? '100'), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
}

export function getRuntimeModeSnapshot(env = process.env) {
  const explicitFullRuntime = normalize(env.LIFEOS_ENABLE_FULL_RUNTIME, 'false') === 'true';
  return {
    runtimeProfile: getRuntimeProfile(env),
    fullRuntimeProfile: isFullRuntimeProfile(env),
    founderBuilderRuntimeProfile: isFounderBuilderRuntimeProfile(env),
    explicitFullRuntime,
    directedMode: isDirectedMode(env),
    autonomyPaused: isAutonomyPaused(env),
    autoBuilderSchedulerEnabled: isAutoBuilderSchedulerEnabled(env),
    habDailyLimit: getHabDailyLimit(env),
  };
}
