#!/usr/bin/env node
/**
 * SYNOPSIS: Grep-based audit of direct AI provider fetch/call bypass paths.
 * Grep-based audit of direct AI provider fetch/call bypass paths.
 * @ssot docs/architecture/AI_CALL_BYPASS_REPORT.md
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const PROVIDER_PATTERNS = [
  { re: /api\.anthropic\.com/i, provider: 'anthropic' },
  { re: /api\.openai\.com/i, provider: 'openai' },
  { re: /generativelanguage\.googleapis\.com|api\.google\.com.*gemini/i, provider: 'gemini' },
  { re: /api\.groq\.com/i, provider: 'groq' },
  { re: /api\.perplexity\.ai/i, provider: 'perplexity' },
  { re: /api\.cerebras\.ai/i, provider: 'cerebras' },
  { re: /openrouter\.ai/i, provider: 'openrouter' },
  { re: /api\.mistral\.ai/i, provider: 'mistral' },
  { re: /\/v1\/chat\/completions/i, provider: 'openai-compatible' },
  { re: /ollama.*\/api\/generate|11434/i, provider: 'ollama' },
];

const SCAN_DIRS = ['services', 'routes', 'scripts', 'core', 'packages', 'modules'];
const SKIP = ['node_modules', '.git', 'dist', 'coverage', '.claude/worktrees'];

function isKernelWrapped(file, line) {
  if (file.includes('council-service.js')) return 'partial-internal';
  if (file.includes('tsos-platform-kernel.js')) return 'kernel';
  if (file.includes('metered-ai-call.js')) return 'metered-helper';
  return 'no';
}

function priorityFor(file) {
  if (file.includes('builder-council-review.js')) return 'P0';
  if (file.includes('builder-supervisor')) return 'P0';
  if (file.includes('tco-routes') || file.includes('premium-api')) return 'P1';
  if (file.startsWith('scripts/')) return 'P2';
  return 'P1';
}

function scanFile(relPath) {
  const full = path.join(root, relPath);
  const lines = fs.readFileSync(full, 'utf8').split('\n');
  const hits = [];
  lines.forEach((line, idx) => {
    if (!/fetch\s*\(|axios\.|https\.request|OpenAI\(|Anthropic\(/i.test(line)) return;
    for (const p of PROVIDER_PATTERNS) {
      if (p.re.test(line)) {
        hits.push({
          file: relPath,
          line: idx + 1,
          provider: p.provider,
          metered: isKernelWrapped(relPath, line) !== 'no' ? 'partial' : 'no',
          kernel: isKernelWrapped(relPath, line),
          action_needed: relPath.includes('builder-council-review') ? 'route through callCouncilMember/kernel or record unmetered exception' : 'audit',
          priority: priorityFor(relPath),
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  });
  return hits;
}

function walk(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (SKIP.some((s) => e.name.includes(s))) continue;
    const rel = path.join(base, e.name);
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full, rel));
    else if (/\.(js|mjs|cjs|ts)$/.test(e.name)) files.push(rel);
  }
  return files;
}

async function main() {
  const allHits = [];
  for (const d of SCAN_DIRS) {
    const abs = path.join(root, d);
    if (!fs.existsSync(abs)) continue;
    for (const f of walk(abs, d)) {
      allHits.push(...scanFile(f));
    }
  }

  const reportPath = path.join(root, 'docs/architecture/AI_CALL_BYPASS_REPORT.md');
  const md = [
    '# AI Call Bypass Report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Total hits:** ${allHits.length}`,
    '',
    '| File | Line | Provider | Metered | Kernel | Priority | Action |',
    '|------|------|----------|---------|--------|----------|--------|',
    ...allHits.map(
      (h) =>
        `| \`${h.file}\` | ${h.line} | ${h.provider} | ${h.metered} | ${h.kernel} | ${h.priority} | ${h.action_needed} |`
    ),
    '',
    'Regenerate: `npm run ai:bypasses`',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, md);

  const p0 = allHits.filter((h) => h.priority === 'P0');
  const status = p0.length === 0 ? 'PASS' : 'PARTIAL';
  console.log(JSON.stringify({ status, total: allHits.length, p0: p0.length, report: reportPath }, null, 2));
  process.exit(p0.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
