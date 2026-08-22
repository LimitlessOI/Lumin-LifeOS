// SYNOPSIS: Canonical naming drift bot — audits active repo surfaces for legacy terminology while preserving historical evidence.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, 'builderos-reboot/governance/CANONICAL_NAMING_REGISTRY.json');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const args = new Set(process.argv.slice(2));
const fix = args.has('--fix');
const strict = args.has('--strict');

function gitFiles() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0').filter(Boolean);
}
function under(file, roots) { return roots.some(r => file.startsWith(r)); }
function isText(file) { return /\.(md|txt|json|ya?ml|js|mjs|cjs|ts|tsx|jsx|html|css|sh)$/i.test(file); }
function isLikelyCode(file) { return /\.(js|mjs|cjs|ts|tsx|jsx|sh)$/i.test(file); }

const findings = [];
const changed = [];
for (const file of gitFiles()) {
  if (!isText(file) || !under(file, registry.active_roots) || under(file, registry.history_roots)) continue;
  const abs = path.join(ROOT, file);
  let text;
  try { text = fs.readFileSync(abs, 'utf8'); } catch { continue; }
  let next = text;
  for (const rule of registry.rules) {
    for (const alias of rule.legacy_aliases || []) {
      if (alias === rule.canonical) continue;
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, 'g');
      const matches = [...text.matchAll(re)];
      if (!matches.length) continue;
      for (const m of matches) {
        const before = text.slice(Math.max(0, m.index - 80), m.index);
        const after = text.slice(m.index + alias.length, m.index + alias.length + 80);
        findings.push({ rule: rule.id, file, alias, canonical: rule.canonical, context: `${before}[${alias}]${after}`.replace(/\s+/g, ' ').trim(), disposition: isLikelyCode(file) ? 'REVIEW_CODE_IDENTIFIER' : 'ACTIVE_NAMING_DRIFT' });
      }
      if (fix && rule.active_policy === 'replace_or_flag' && !isLikelyCode(file)) {
        // Transitional prose migration: make the canonical term primary while retaining one compatibility hint.
        // Do not rewrite archives or executable identifiers blindly.
        next = next.replace(re, rule.transition_display || rule.canonical);
      }
    }
  }
  if (fix && next !== text) {
    fs.writeFileSync(abs, next);
    changed.push(file);
  }
}

const report = {
  schema: 'naming_drift_report_v1',
  generated_at: new Date().toISOString(),
  mode: fix ? 'FIX_SAFE_PROSE' : 'AUDIT',
  registry: path.relative(ROOT, REGISTRY_PATH),
  finding_count: findings.length,
  changed_files: changed,
  findings
};
const out = path.join(ROOT, registry.generated_artifact);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ finding_count: findings.length, changed_files: changed.length, report: registry.generated_artifact }, null, 2));
if (strict && findings.some(f => f.disposition === 'ACTIVE_NAMING_DRIFT')) process.exitCode = 1;
