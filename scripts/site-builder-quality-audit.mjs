#!/usr/bin/env node
/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Quality audit for generated preview sites.
 *
 * Usage:
 *   node scripts/site-builder-quality-audit.mjs                  # all local previews
 *   node scripts/site-builder-quality-audit.mjs --id=prev_xxx    # single local preview
 *   node scripts/site-builder-quality-audit.mjs --live           # re-score via Railway
 *   node scripts/site-builder-quality-audit.mjs --json           # JSON output to stdout
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { scoreGeneratedSite, scoreSummary } from '../services/site-builder-quality-scorer.js';

const PREVIEWS_DIR = path.join(process.cwd(), 'public/previews');
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';
const KEY = process.env.COMMAND_CENTER_KEY || '';
const HEADERS = { 'x-command-key': KEY, 'Content-Type': 'application/json' };

const args = process.argv.slice(2);
const wantJson = args.includes('--json');
const wantLive = args.includes('--live');
const idArg = args.find(a => a.startsWith('--id='));
const targetId = idArg ? idArg.split('=')[1] : null;

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
};

function gradeColor(grade) {
  if (grade === 'A') return C.green + C.bold;
  if (grade === 'B') return C.green;
  if (grade === 'C') return C.yellow;
  if (grade === 'D') return C.magenta;
  return C.red;
}

async function auditLocalPreview(clientId) {
  const dir = path.join(PREVIEWS_DIR, clientId);
  const htmlPath = path.join(dir, 'index.html');
  const metaPath = path.join(dir, 'meta.json');

  let html, meta;
  try {
    html = await fs.readFile(htmlPath, 'utf-8');
  } catch {
    return { clientId, error: 'index.html not found' };
  }
  try {
    meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
  } catch {
    meta = {};
  }

  const report = scoreGeneratedSite(html, meta.businessInfo || {});
  return {
    clientId,
    businessName: meta.businessInfo?.businessName || meta.businessName || clientId,
    previewUrl: meta.previewUrl || '',
    createdAt: meta.createdAt || '',
    report,
    storedReport: meta.qualityReport || null,
  };
}

async function auditAllLocal() {
  let entries;
  try {
    entries = await fs.readdir(PREVIEWS_DIR);
  } catch {
    process.stderr.write('No previews directory found — no builds yet.\n');
    return [];
  }

  const previews = entries.filter(e => e.startsWith('prev_'));
  if (targetId) {
    return previews.includes(targetId) ? [await auditLocalPreview(targetId)] : [];
  }
  const results = await Promise.all(previews.map(auditLocalPreview));
  return results.filter(r => !r.error);
}

async function auditLive() {
  if (!PUBLIC_BASE_URL || !KEY) {
    process.stderr.write('PUBLIC_BASE_URL + COMMAND_CENTER_KEY required for --live\n');
    process.exit(1);
  }
  const res = await fetch(`${PUBLIC_BASE_URL}/api/v1/sites/prospects?limit=100`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Prospects API: ${res.status}`);
  const data = await res.json();
  const prospects = Array.isArray(data?.prospects) ? data.prospects : [];

  const results = [];
  for (const p of prospects) {
    if (!p.preview_url) continue;
    try {
      const htmlRes = await fetch(p.preview_url);
      if (!htmlRes.ok) { results.push({ clientId: p.client_id, error: `HTTP ${htmlRes.status}` }); continue; }
      const html = await htmlRes.text();
      const report = scoreGeneratedSite(html);
      results.push({ clientId: p.client_id, businessName: p.business_name, previewUrl: p.preview_url, report });
    } catch (e) {
      results.push({ clientId: p.client_id, businessName: p.business_name, error: e.message });
    }
    await new Promise(r => setTimeout(r, 300)); // polite delay
  }
  return results;
}

function printResults(results) {
  if (results.length === 0) {
    process.stderr.write('No previews found to audit.\n');
    return;
  }

  // Sort by score descending (errors last)
  results.sort((a, b) => (b.report?.scorePct || 0) - (a.report?.scorePct || 0));

  const col = (s, w) => String(s).slice(0, w).padEnd(w);
  process.stderr.write(`\n${C.bold}Site Builder — Quality Audit${C.reset}\n`);
  process.stderr.write(`${'─'.repeat(100)}\n`);
  process.stderr.write(
    `${C.gray}${col('ID', 20)} ${col('Business', 28)} ${col('Score', 8)} ${col('Gr', 4)} ${col('Ready', 6)} Issues${C.reset}\n`
  );
  process.stderr.write(`${'─'.repeat(100)}\n`);

  let readyCount = 0;
  let totalScore = 0;
  let countScored = 0;

  for (const r of results) {
    if (r.error) {
      process.stderr.write(`${col(r.clientId, 20)} ${col(r.businessName || '?', 28)} ${C.gray}ERROR: ${r.error}${C.reset}\n`);
      continue;
    }
    const { scorePct, grade, readyToSend, summaryIssues } = r.report;
    const gc = gradeColor(grade);
    const readyStr = readyToSend ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
    const issues = (summaryIssues || []).slice(0, 2).join('; ');
    process.stderr.write(
      `${col(r.clientId, 20)} ${col(r.businessName || '?', 28)} ${gc}${col(scorePct + '%', 8)}${C.reset} ${gc}${col(grade, 4)}${C.reset} ${readyStr}     ${C.gray}${issues}${C.reset}\n`
    );
    if (readyToSend) readyCount++;
    totalScore += scorePct;
    countScored++;
  }

  process.stderr.write(`${'─'.repeat(100)}\n`);
  const avg = countScored > 0 ? (totalScore / countScored).toFixed(1) : 'N/A';
  process.stderr.write(
    `${C.bold}${countScored} sites scored  •  ${readyCount} ready to send  •  Avg quality: ${avg}%${C.reset}\n\n`
  );

  // Per-site detail for anything below threshold
  const weak = results.filter(r => r.report && !r.report.readyToSend);
  if (weak.length > 0) {
    process.stderr.write(`${C.bold}${C.yellow}Weak previews (not ready to send):${C.reset}\n`);
    for (const r of weak) {
      process.stderr.write(`\n  ${C.cyan}${r.businessName || r.clientId}${C.reset} — ${r.report.scorePct}% ${r.report.grade}\n`);
      for (const issue of (r.report.issues || [])) {
        process.stderr.write(`    ${C.red}✗${C.reset} ${issue}\n`);
      }
      if (r.storedReport?.scorePct && r.storedReport.scorePct !== r.report.scorePct) {
        process.stderr.write(`    ${C.gray}Note: stored score was ${r.storedReport.scorePct}% — rescored to ${r.report.scorePct}%${C.reset}\n`);
      }
    }
    process.stderr.write('\n');
  }
}

(async () => {
  try {
    const results = wantLive ? await auditLive() : await auditAllLocal();

    if (wantJson) {
      process.stdout.write(JSON.stringify(results, null, 2) + '\n');
    } else {
      printResults(results);
    }
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }
})();
