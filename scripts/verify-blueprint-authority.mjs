/**
 * SYNOPSIS: Blueprint authority and completeness validator.
 * Checks that protected source files are owned by a product home or decision
 * record, that active mission blueprints are structurally valid, and that
 * BUILD_QUEUE steps do not contain contradictions between target type and
 * assertions.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PROTECTED_DIRS = ['services', 'routes', 'factory-staging/factory-core', 'middleware', 'core', 'startup'];
const SOURCE_EXTS = ['.js', '.mjs', '.ts'];
const SSOT_RE = /\/\*\*[\s\S]*?\*\s*@ssot\s+([^\s\*\n]+)/m;

function readFile(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch {
    return null;
  }
}

function json(rel) {
  try {
    return JSON.parse(readFile(rel) || 'null');
  } catch (err) {
    return { error: err.message };
  }
}

function getChangedFiles() {
  try {
    const out = execSync('git diff --name-only', { cwd: ROOT, encoding: 'utf8' });
    const unstaged = out.split('\n').filter(Boolean);
    const out2 = execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf8' });
    const staged = out2.split('\n').filter(Boolean);
    return [...new Set([...staged, ...unstaged])];
  } catch {
    return [];
  }
}

function getUntrackedFiles() {
  try {
    const out = execSync('git ls-files --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function isProtectedSource(rel) {
  if (!SOURCE_EXTS.some((e) => rel.endsWith(e))) return false;
  return PROTECTED_DIRS.some((d) => rel.startsWith(d + '/'));
}

function extractSsot(content) {
  const m = content.match(SSOT_RE);
  return m ? m[1].trim() : null;
}

function ssotTargetExists(target) {
  if (!target) return false;
  if (target.startsWith('docs/projects/AMENDMENT_')) return true; // amendment files are valid authority
  if (target.startsWith('docs/')) {
    return fs.existsSync(path.join(ROOT, target));
  }
  // relative to repo root
  return fs.existsSync(path.join(ROOT, target));
}

function validateSourceOwnership(rel, content) {
  const ssot = extractSsot(content);
  if (!ssot) return { ok: false, reason: 'missing_ssot_tag' };
  if (!ssotTargetExists(ssot)) return { ok: false, reason: 'ssot_target_missing', ssot };
  return { ok: true, ssot };
}

function validateMissionBlueprint(missionId) {
  const base = `builderos-reboot/MISSIONS/${missionId}`;
  const blueprint = json(`${base}/BLUEPRINT.json`);
  const errors = [];
  if (!blueprint || typeof blueprint !== 'object') {
    errors.push('blueprint_not_json');
    return errors;
  }
  const steps = blueprint.steps || [];
  const ids = new Set();
  for (const step of steps) {
    if (!step.step_id) { errors.push(`step_missing_id`); continue; }
    if (ids.has(step.step_id)) errors.push(`duplicate_step_id:${step.step_id}`);
    ids.add(step.step_id);
    if (!step.target_files || step.target_files.length === 0) errors.push(`${step.step_id}:missing_target_files`);
    if (Array.isArray(step.dependencies)) {
      for (const d of step.dependencies) {
        if (!ids.has(d) && !steps.some((s) => s.step_id === d)) {
          errors.push(`${step.step_id}:unresolved_dependency:${d}`);
        }
      }
    }
    if (step.route && typeof step.route === 'object' && step.target_file && !step.target_file.endsWith('.js') && !step.target_file.endsWith('.mjs')) {
      errors.push(`${step.step_id}:route_assertion_on_non_js_target:${step.target_file}`);
    }
  }
  return errors;
}

function validateActiveMissions() {
  const bp = json('builderos-reboot/BP_PRIORITY.json');
  const errors = [];
  const missions = (bp?.items || []).filter((i) => i.blueprint_status !== 'complete' && i.verdict !== 'TECHNICAL_PASS');
  for (const m of missions) {
    const missionErrors = validateMissionBlueprint(m.mission_id);
    if (missionErrors.length) errors.push({ mission_id: m.mission_id, errors: missionErrors });
  }
  return errors;
}

export function validateBlueprintAuthority({ scope = 'changed' } = {}) {
  const changed = getChangedFiles();
  const untracked = getUntrackedFiles();
  const all = scope === 'all'
    ? [...new Set([...changed, ...untracked])]
    : [...new Set([...changed, ...untracked])];

  const sourceViolations = [];
  for (const rel of all) {
    if (!isProtectedSource(rel)) continue;
    const content = readFile(rel);
    if (content == null) continue;
    const owned = validateSourceOwnership(rel, content);
    if (!owned.ok) sourceViolations.push({ file: rel, ...owned });
  }

  const missionErrors = validateActiveMissions();
  const ok = sourceViolations.length === 0 && missionErrors.length === 0;
  return {
    ok,
    scope,
    source_violations: sourceViolations,
    mission_errors: missionErrors,
    checked_files: all.filter(isProtectedSource).length,
  };
}

function main() {
  const all = process.argv.includes('--all');
  const scope = all ? 'all' : 'changed';
  const result = validateBlueprintAuthority({ scope });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('verify-blueprint-authority.mjs')) {
  main();
}
