/**
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 *
 * Central runtime safety defaults for autonomy-related env flags.
 * These defaults intentionally fail closed when vars are omitted.
 */

function normalize(value, fallback = '') {
  return String(value ?? fallback).trim().toLowerCase();
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
  return {
    directedMode: isDirectedMode(env),
    autonomyPaused: isAutonomyPaused(env),
    autoBuilderSchedulerEnabled: isAutoBuilderSchedulerEnabled(env),
    habDailyLimit: getHabDailyLimit(env),
  };
}

