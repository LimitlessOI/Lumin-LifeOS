#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.resolve(__dirname, '..', 'audit', 'reports');

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function ensureReportsDir() {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

async function readStdin() {
  return await new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data.trim()));
  });
}

function defaultPayload() {
  return {
    current_models: [
      { name: 'ollama_llama', role: 'general', cost_class: 'free' },
      { name: 'ollama_deepseek_coder_v2', role: 'code', cost_class: 'free' },
      { name: 'openai_gpt4o', role: 'oversight', cost_class: 'paid' },
    ],
    cost_hotspots: [
      { area: 'oversight', model: 'openai_gpt4o', est_monthly: 120 },
    ],
    latency_hotspots: [
      { area: 'long_context', model: 'openai_gpt4o', p95_ms: 9000 },
    ],
    open_source_alternatives: [
      { replace: 'openai_gpt4o', alternative: 'ollama_llama_3_3_70b', notes: 'Use locally when oversight is non-critical.' },
    ],
    justifications: [
      { model: 'openai_gpt4o', reason: 'Needed for edge cases; keeping until local eval matches parity.' },
    ],
  };
}

function normalize(payload) {
  const base = defaultPayload();
  return {
    current_models: payload.current_models || base.current_models,
    cost_hotspots: payload.cost_hotspots || base.cost_hotspots,
    latency_hotspots: payload.latency_hotspots || base.latency_hotspots,
    open_source_alternatives: payload.open_source_alternatives || base.open_source_alternatives,
    justifications: payload.justifications || base.justifications,
  };
}

function formatMarkdown(report) {
  const lines = [];
  lines.push('# Quarterly Rip-and-Replace Audit');
  lines.push(`- id: ${report.id}`);
  lines.push(`- timestamp: ${report.timestamp}`);
  lines.push('');

  lines.push('## Current Models');
  report.current_models.forEach((m) => {
    lines.push(`- ${m.name} (role: ${m.role || 'n/a'}, cost: ${m.cost_class || 'n/a'})`);
  });
  lines.push('');

  lines.push('## Cost Hotspots');
  if (report.cost_hotspots.length === 0) lines.push('- none');
  else report.cost_hotspots.forEach((c) => lines.push(`- ${c.area || 'area'}: ${c.model || 'model'} (est: ${c.est_monthly ?? 'n/a'})`));
  lines.push('');

  lines.push('## Latency Hotspots');
  if (report.latency_hotspots.length === 0) lines.push('- none');
  else report.latency_hotspots.forEach((l) => lines.push(`- ${l.area || 'area'}: ${l.model || 'model'} (p95: ${l.p95_ms ?? 'n/a'} ms)`));
  lines.push('');

  lines.push('## Open-Source Alternatives');
  if (report.open_source_alternatives.length === 0) lines.push('- none');
  else report.open_source_alternatives.forEach((o) => lines.push(`- replace ${o.replace || 'n/a'} -> ${o.alternative || 'n/a'} (${o.notes || 'no notes'})`));
  lines.push('');

  lines.push('## Mandatory Justifications for NOT Switching');
  if (report.justifications.length === 0) lines.push('- none (must be provided)');
  else report.justifications.forEach((j) => lines.push(`- ${j.model || 'model'}: ${j.reason || 'reason required'}`));

  return lines.join('\n');
}

async function main() {
  try {
    await ensureReportsDir();
    const arg = process.argv[2];
    const payloadStr = arg && arg.trim().length > 0 ? arg : await readStdin();
    const payload = payloadStr ? JSON.parse(payloadStr) : {};
    const normalized = normalize(payload);

    const report = {
      id: `quarterly_rip_replace_${ts()}`,
      timestamp: dayjs().toISOString(),
      ...normalized,
    };

    const base = report.id;
    const jsonPath = path.join(REPORTS_DIR, `${base}.json`);
    const mdPath = path.join(REPORTS_DIR, `${base}.md`);

    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');
    await fs.writeFile(mdPath, formatMarkdown(report), 'utf8');

    console.log('Quarterly rip-and-replace report written:');
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  MD:   ${mdPath}`);
  } catch (err) {
    console.error('Quarterly rip-and-replace audit failed:', err.message);
    process.exit(1);
  }
}

main();
