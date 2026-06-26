/**
 * SYNOPSIS: Fail-closed blueprint gate for POST /build on product spine paths (§2.18).
 * Fail-closed blueprint gate for POST /build on product spine paths (§2.18).
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSIONS_ROOT = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS');

const PRODUCT_PREFIXES = ['routes/', 'services/', 'public/overlay/'];

function normalizeRel(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function isProductSpineTarget(targetFile) {
  const rel = normalizeRel(targetFile);
  return PRODUCT_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

function loadBlueprintJson(absPath) {
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

function resolveBlueprintPath({ blueprint_path, blueprint_id, mission_id }) {
  if (blueprint_path) {
    const abs = path.isAbsolute(blueprint_path)
      ? blueprint_path
      : path.join(REPO_ROOT, normalizeRel(blueprint_path));
    return fs.existsSync(abs) ? abs : null;
  }
  if (mission_id) {
    const candidate = path.join(MISSIONS_ROOT, mission_id, 'BLUEPRINT.json');
    return fs.existsSync(candidate) ? candidate : null;
  }
  if (blueprint_id && fs.existsSync(MISSIONS_ROOT)) {
    for (const name of fs.readdirSync(MISSIONS_ROOT)) {
      const candidate = path.join(MISSIONS_ROOT, name, 'BLUEPRINT.json');
      const data = loadBlueprintJson(candidate);
      if (data?.blueprint_id === blueprint_id) return candidate;
    }
  }
  return null;
}

function blueprintCoversTarget(blueprint, targetFile) {
  const rel = normalizeRel(targetFile);
  const steps = blueprint?.steps || [];
  return steps.some((step) => {
    const candidate = normalizeRel(step.target_file || step.file);
    return candidate === rel;
  });
}

/**
 * @returns {{ ok: true, blueprint_path: string } | { ok: false, error: string, hint?: string }}
 */
export function checkBuildBlueprintGate({ target_file, blueprint_path, blueprint_id, mission_id, platform_gap_fill, platform_gap_fill_reason, blueprint_json, intake_session_id }) {
  const targetFile = normalizeRel(target_file);
  if (!targetFile || !isProductSpineTarget(targetFile)) {
    return { ok: true, blueprint_path: null, skipped: true };
  }

  if (platform_gap_fill === true) {
    const reason = String(platform_gap_fill_reason || '').trim();
    if (reason.length >= 40) {
      return { ok: true, blueprint_path: null, platform_gap_fill: true };
    }
    return {
      ok: false,
      error: 'blueprint_gate_platform_gap_fill_reason',
      hint: 'platform_gap_fill requires platform_gap_fill_reason (min 40 chars) for product spine targets',
    };
  }

  if (blueprint_json?.steps?.length) {
    if (!blueprintCoversTarget(blueprint_json, targetFile)) {
      return {
        ok: false,
        error: 'blueprint_gate_target_not_in_scope',
        hint: `${targetFile} is not listed in intake blueprint steps`,
        intake_session_id: intake_session_id || null,
      };
    }
    return { ok: true, blueprint_path: null, intake_session_id: intake_session_id || null };
  }

  const resolved = resolveBlueprintPath({ blueprint_path, blueprint_id, mission_id });
  if (!resolved) {
    return {
      ok: false,
      error: 'blueprint_gate_required',
      hint: 'Product spine /build requires blueprint_path, blueprint_id, or mission_id with a valid BLUEPRINT.json',
    };
  }

  const blueprint = loadBlueprintJson(resolved);
  if (!blueprint) {
    return { ok: false, error: 'blueprint_gate_invalid', hint: `Could not parse ${path.relative(REPO_ROOT, resolved)}` };
  }

  if (!blueprintCoversTarget(blueprint, targetFile)) {
    return {
      ok: false,
      error: 'blueprint_gate_target_not_in_scope',
      hint: `${targetFile} is not listed in blueprint steps for ${path.relative(REPO_ROOT, resolved)}`,
      blueprint_path: path.relative(REPO_ROOT, resolved),
    };
  }

  return { ok: true, blueprint_path: path.relative(REPO_ROOT, resolved) };
}
