/**
 * SYNOPSIS: BuilderOS harness toolkit — manifest, wiring audit, platform gap rollup.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HARNESS_TOOLS_PATH = path.join(ROOT, 'builderos-reboot/governance/BUILDEROS_HARNESS_TOOLS.json');
const TOOL_REGISTRY_PATH = path.join(ROOT, 'builderos-reboot/governance/BUILDEROS_TOOL_REGISTRY.json');

function readJson(relOrAbs) {
  const abs = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(ROOT, relOrAbs);
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function fileExists(relPath) {
  if (!relPath) return false;
  return fs.existsSync(path.join(ROOT, relPath));
}

function deployVerifyOk() {
  if (!process.env.PUBLIC_BASE_URL && !process.env.BUILDER_BASE_URL) return null;
  if (!process.env.COMMAND_CENTER_KEY && !process.env.LIFEOS_KEY) return null;
  const r = spawnSync('npm', ['run', 'builderos:deploy:verify'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    timeout: 30_000,
  });
  return r.status === 0;
}

function filterLivePlatformGaps(staticGaps = []) {
  const deployFresh = deployVerifyOk();
  return (staticGaps || []).filter((g) => {
    if (deployFresh && (g.id === 'deploy_stale_local' || g.id === 'mechanical_deliberation')) {
      return false;
    }
    return true;
  });
}

function filterIndustryGaps(staticGaps = []) {
  const dispatchGateOk = fileExists('services/builderos-dispatch-gate.js');
  const missionRunOk = fileExists('scripts/builderos-run-mission.mjs');
  return (staticGaps || []).filter((g) => {
    if (g.pattern === 'claude_code_hooks_fail_closed' && dispatchGateOk) return false;
    if (g.pattern === 'evidence_backed_completion' && missionRunOk) return false;
    if (g.pattern === 'codex_isolated_task_dispatch' && missionRunOk) return false;
    return true;
  });
}

export function resolveIndustryAdopted(manifest) {
  const doc = manifest || loadHarnessToolsManifest();
  const adopted = [];
  if (fileExists('services/builderos-dispatch-gate.js')) {
    adopted.push({
      pattern: 'claude_code_hooks_fail_closed',
      source: 'Claude Code PreToolUse / Stop hooks',
      via: 'services/builderos-dispatch-gate.js',
    });
  }
  if (fileExists('scripts/system-railway-redeploy.mjs')) {
    adopted.push({
      pattern: 'deploy_sha_parity_stop_gate',
      source: 'Agent-operated CI/CD deploy verification',
      via: 'scripts/system-railway-redeploy.mjs + builderos:deploy:verify',
    });
  }
  if (deployVerifyOk()) {
    adopted.push({
      pattern: 'self_healing_deploy_attribution',
      source: 'LangChain / Semaphore self-healing CI',
      via: 'live deploy SHA matches origin/main',
    });
  }
  if (fileExists('factory-staging/factory-core/builder/sandbox.js')) {
    adopted.push({
      pattern: 'openhands_workspace_isolation',
      source: 'OpenHands DockerWorkspace',
      via: 'executeCanonicalWorktreeStep + sandbox boundary manifest',
      status: 'partial',
    });
  }
  return adopted;
}

function npmScriptExists(scriptName) {
  if (!scriptName) return null;
  try {
    const pkg = readJson('package.json');
    return Boolean(pkg.scripts?.[scriptName]);
  } catch {
    return false;
  }
}

function collectTools(manifest) {
  const rows = [];
  for (const [pillar, bucket] of Object.entries(manifest.pillars || {})) {
    for (const tool of bucket.tools || []) {
      rows.push({ pillar, ...tool });
    }
  }
  for (const tool of manifest.cross_cutting?.tools || []) {
    rows.push({ pillar: 'cross_cutting', ...tool });
  }
  return rows;
}

export function loadHarnessToolsManifest() {
  return readJson(HARNESS_TOOLS_PATH);
}

export function loadToolRegistry() {
  try {
    return readJson(TOOL_REGISTRY_PATH);
  } catch {
    return null;
  }
}

export function auditHarnessToolWiring({ manifest = null } = {}) {
  const doc = manifest || loadHarnessToolsManifest();
  const tools = collectTools(doc);
  const results = tools.map((tool) => {
    const pathOk = fileExists(tool.path);
    const npmOk = tool.npm == null ? null : npmScriptExists(tool.npm);
    const declared = tool.status || 'unknown';
    let actual = 'wired';
    const issues = [];

    if (!pathOk) {
      actual = 'missing';
      issues.push(`missing file ${tool.path}`);
    } else if (declared === 'partial') {
      actual = 'partial';
    }
    if (tool.npm && npmOk === false) {
      actual = actual === 'wired' ? 'partial' : actual;
      issues.push(`npm script missing: ${tool.npm}`);
    }
    if (declared === 'missing') {
      actual = 'missing';
    }

    return {
      id: tool.id,
      pillar: tool.pillar,
      path: tool.path,
      npm: tool.npm,
      tier: tool.tier,
      declared_status: declared,
      actual_status: actual,
      path_exists: pathOk,
      npm_script_exists: npmOk,
      issues,
      note: tool.note || null,
    };
  });

  const required = results.filter((r) => r.tier === 'required');
  const requiredMissing = required.filter((r) => r.actual_status === 'missing');
  const requiredPartial = required.filter((r) => r.actual_status === 'partial');

  const platformGaps = filterLivePlatformGaps(doc.platform_integration_gaps || []);
  const industryGaps = filterIndustryGaps(doc.industry_patterns_missing_on_spine || []);

  return {
    schema: 'builderos_harness_tool_audit_v1',
    generated_at: new Date().toISOString(),
    summary: {
      total: results.length,
      wired: results.filter((r) => r.actual_status === 'wired').length,
      partial: results.filter((r) => r.actual_status === 'partial').length,
      missing: results.filter((r) => r.actual_status === 'missing').length,
      required_total: required.length,
      required_missing: requiredMissing.length,
      required_partial: requiredPartial.length,
    },
    tools: results,
    platform_gaps: platformGaps,
    platform_gaps_resolved: (doc.platform_integration_gaps || []).length - platformGaps.length,
    industry_gaps: industryGaps,
    industry_adopted: resolveIndustryAdopted(doc),
    ok: requiredMissing.length === 0 && requiredPartial.length === 0,
  };
}

export function getHarnessToolkitManifest() {
  const manifest = loadHarnessToolsManifest();
  const audit = auditHarnessToolWiring({ manifest });
  const registry = loadToolRegistry();
  return {
    schema: 'builderos_harness_toolkit_manifest_v1',
    generated_at: new Date().toISOString(),
    harness_tools_path: 'builderos-reboot/governance/BUILDEROS_HARNESS_TOOLS.json',
    audit_command: manifest.audit_command,
    pillar_counts: Object.fromEntries(
      Object.entries(manifest.pillars || {}).map(([k, v]) => [k, (v.tools || []).length]),
    ),
    wiring: audit.summary,
    top_registry_priorities: (registry?.top_10_integration_priorities || []).slice(0, 5),
    canonical_path: manifest.authority,
  };
}

export function writeHarnessAuditReport(audit, outRel = 'data/builderos-harness-gap-audit.json') {
  const outPath = path.join(ROOT, outRel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(audit, null, 2)}\n`);
  return outPath;
}
