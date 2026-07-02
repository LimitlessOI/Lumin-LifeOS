#!/usr/bin/env node
/**
 * SYNOPSIS: Tier-1 intent validator CLI — gates ARC entry on load-bearing INTENT_COVERAGE_MAP coverage.
 * Validates a mission's INTENT_COVERAGE_MAP.json structurally and applies the
 * tier-1 load-bearing coverage rule (identical to factory-core/arc/entry-gate.js
 * tier1CoveragePass). Exit 0 = pass, 1 = fail. Called by runArcEntryGate.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const COVERAGE_LEVELS = ['MISSING', 'MENTIONED', 'PARTIAL', 'SUFFICIENT', 'LOCKED', 'PARKED'];
// Blocking levels for load-bearing dimensions — must match entry-gate.js.
const BLOCKING_COVERAGE = new Set(['MISSING', 'MENTIONED']);
const ACCEPTABLE_LOAD_BEARING = new Set(['SUFFICIENT', 'LOCKED', 'PARTIAL']);

/** Resolve a mission folder or a direct coverage-map path to the coverage-map file. */
export function resolveCoverageMapPath(arg, repoRoot = REPO_ROOT) {
  const raw = String(arg || '').trim();
  if (!raw) return null;
  const abs = path.isAbsolute(raw)
    ? raw
    : raw.includes('/')
      ? path.join(repoRoot, raw)
      : path.join(repoRoot, 'builderos-reboot/MISSIONS', raw);
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  return path.join(abs, 'INTENT_COVERAGE_MAP.json');
}

/** Normalize legacy (v1: dimension/status/mission_id) and current (v2: name/coverage_level/intent_id) shapes. */
export function normalize(map) {
  if (!map || typeof map !== 'object') return map;
  const dims = Array.isArray(map.dimensions) ? map.dimensions : [];
  return {
    ...map,
    intent_id: map.intent_id || map.mission_id,
    dimensions: dims.map((dim) => {
      if (!dim || typeof dim !== 'object') return dim;
      return {
        ...dim,
        name: dim.name ?? dim.dimension,
        coverage_level: dim.coverage_level ?? dim.status,
      };
    }),
  };
}

/** Structural validation — lenient on schema version string (v1/v2 both accepted). */
export function validateStructure(map) {
  const errors = [];
  if (!map || typeof map !== 'object') return ['coverage map is not an object'];
  if (typeof map.schema !== 'string' || !map.schema) errors.push('missing "schema" string');
  if (typeof map.intent_id !== 'string' || !map.intent_id) errors.push('missing "intent_id" (or legacy "mission_id")');
  if (!Array.isArray(map.dimensions) || map.dimensions.length === 0) {
    errors.push('missing or empty "dimensions" array');
    return errors;
  }
  map.dimensions.forEach((dim, i) => {
    if (!dim || typeof dim !== 'object') {
      errors.push(`dimensions[${i}] is not an object`);
      return;
    }
    if (typeof dim.name !== 'string' || !dim.name) errors.push(`dimensions[${i}] missing "name" (or legacy "dimension")`);
    if (!COVERAGE_LEVELS.includes(dim.coverage_level)) {
      errors.push(`dimensions[${i}] (${dim.name || '?'}) invalid coverage_level "${dim.coverage_level}"`);
    }
  });
  return errors;
}

/** Tier-1 load-bearing coverage rule — identical semantics to entry-gate.js tier1CoveragePass. */
export function tier1CoveragePass(map) {
  const failures = [];
  for (const dim of map?.dimensions || []) {
    if (!dim.load_bearing) continue;
    const level = String(dim.coverage_level || 'MISSING');
    if (BLOCKING_COVERAGE.has(level)) failures.push(`${dim.name}:${level}`);
    else if (level === 'PARKED') continue;
    else if (!ACCEPTABLE_LOAD_BEARING.has(level)) failures.push(`${dim.name}:${level}`);
  }
  return { pass: failures.length === 0, failures };
}

/**
 * Validate a mission's tier-1 intent coverage. Returns a structured result
 * (never throws for expected failures). `arg` is a mission folder, mission id,
 * or a direct path to an INTENT_COVERAGE_MAP.json.
 */
export function validateIntentTier1(arg, repoRoot = REPO_ROOT) {
  const mapPath = resolveCoverageMapPath(arg, repoRoot);
  if (!mapPath || !fs.existsSync(mapPath)) {
    return { ok: false, error: 'INTENT_COVERAGE_MAP.json not found', looked_for: mapPath ? path.relative(repoRoot, mapPath) : null };
  }
  let rawMap;
  try {
    rawMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  } catch (e) {
    return { ok: false, error: `INTENT_COVERAGE_MAP.json is not valid JSON: ${e.message}`, path: path.relative(repoRoot, mapPath) };
  }
  const map = normalize(rawMap);
  const structureErrors = validateStructure(map);
  if (structureErrors.length) {
    return { ok: false, error: 'INTENT_COVERAGE_MAP.json failed structural validation', violations: structureErrors };
  }
  const coverage = tier1CoveragePass(map);
  const loadBearing = (map.dimensions || []).filter((d) => d.load_bearing);
  if (!coverage.pass) {
    return {
      ok: false,
      error: 'tier-1 load-bearing coverage incomplete',
      intent_id: map.intent_id,
      blocking: coverage.failures,
      load_bearing_count: loadBearing.length,
    };
  }
  return {
    ok: true,
    intent_id: map.intent_id,
    tier: map.tier ?? 1,
    load_bearing_count: loadBearing.length,
    dimensions_count: (map.dimensions || []).length,
    message: 'tier-1 intent coverage PASS',
  };
}

// CLI entrypoint — only when invoked directly, not on import.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (!arg) {
    console.error(JSON.stringify({ ok: false, error: 'usage: node scripts/validate-intent-tier1.mjs <mission_folder_rel | mission_id | coverage_map.json>' }, null, 2));
    process.exit(1);
  }
  const result = validateIntentTier1(arg);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
