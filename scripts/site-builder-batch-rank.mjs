#!/usr/bin/env node
/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Batch-score a list of business URLs by opportunity and rank them for cold outreach.
 *
 * Usage:
 *   node scripts/site-builder-batch-rank.mjs --input=prospects.json [--top=10] [--min-score=40] [--output=ranked.json]
 *
 * Input: JSON array from site-builder-prospect-discovery.mjs or manual list:
 *   [{ name, website, address?, city?, type?, source? }, ...]
 *
 * Output:
 *   - JSON array (sorted by opportunityScore DESC) on stdout
 *   - Human-readable ranked table on stderr
 *   - Summary on stderr: X scored, Y skipped, top candidate
 *
 * Pipe examples:
 *   node scripts/site-builder-prospect-discovery.mjs --city='Austin, TX' --type=yoga | \
 *     node scripts/site-builder-batch-rank.mjs --input=/dev/stdin --top=5
 */

import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { scoreProspectUrl } from '../services/site-builder-opportunity-scorer.js';

const DELAY_MS = 500;

function parseArgs(argv) {
  const args = { input: null, top: null, minScore: 0, output: null };
  for (const arg of argv.slice(2)) {
    const m = arg.match(/^--(\w[\w-]*)=(.+)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (key === 'input') args.input = val;
    if (key === 'top') args.top = Math.max(1, parseInt(val, 10) || 10);
    if (key === 'min-score') args.minScore = Math.max(0, parseInt(val, 10) || 0);
    if (key === 'output') args.output = val;
  }
  return args;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function gradeColor(grade) {
  const map = { A: '\x1b[32m', B: '\x1b[36m', C: '\x1b[33m', D: '\x1b[31m', F: '\x1b[35m' };
  return map[grade] || '';
}
const RESET = '\x1b[0m';

async function main() {
  const args = parseArgs(process.argv);

  if (!args.input) {
    console.error('Usage: node scripts/site-builder-batch-rank.mjs --input=prospects.json [--top=10] [--min-score=40] [--output=ranked.json]');
    process.exit(1);
  }

  let rawInput;
  try {
    const src = args.input === '/dev/stdin' ? readFileSync('/dev/stdin', 'utf8') : readFileSync(args.input, 'utf8');
    rawInput = JSON.parse(src);
  } catch (err) {
    console.error('Failed to read or parse input JSON:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(rawInput)) {
    console.error('Input must be a JSON array');
    process.exit(1);
  }

  const total = rawInput.length;
  let skipped = 0;
  const results = [];

  console.error(`\nScoring ${total} prospect(s)...\n`);

  for (let i = 0; i < rawInput.length; i++) {
    const prospect = rawInput[i];
    const name = prospect.name || prospect.businessName || `Prospect ${i + 1}`;
    const website = prospect.website || prospect.businessUrl || prospect.url;

    if (!website) {
      console.error(`  [${i + 1}/${total}] SKIP  ${name} — no website URL`);
      skipped++;
      continue;
    }

    process.stderr.write(`  [${i + 1}/${total}] Scoring ${name} (${website})...`);

    try {
      const score = await scoreProspectUrl(website, { timeout: 8000 });
      results.push({
        name,
        website,
        opportunityScore: score.opportunityScore,
        grade: score.grade,
        painPoints: score.painPoints || [],
        strengths: score.strengths || [],
        recommendation: score.recommendation || '',
        responseTimeMs: score.responseTimeMs,
        analyzed: score.analyzed,
        error: score.error || null,
        // carry through any extra fields from input
        city: prospect.city || null,
        type: prospect.type || null,
        source: prospect.source || null,
        address: prospect.address || null,
      });
      const g = score.grade;
      console.error(` ${gradeColor(g)}${g}${RESET} (${score.opportunityScore}/100)`);
    } catch (err) {
      console.error(` ERROR — ${err.message}`);
      results.push({
        name, website, opportunityScore: 0, grade: '?',
        painPoints: [], strengths: [], recommendation: '',
        responseTimeMs: null, analyzed: false, error: err.message,
      });
    }

    if (i < rawInput.length - 1) await sleep(DELAY_MS);
  }

  // Sort by opportunityScore DESC (highest = worst existing site = pitch first)
  results.sort((a, b) => b.opportunityScore - a.opportunityScore);

  // Apply filters
  let filtered = results.filter(r => r.opportunityScore >= args.minScore);
  if (args.top) filtered = filtered.slice(0, args.top);

  // Print ranked table to stderr
  console.error('\n─────────────────────────────────────────────────────────────────');
  console.error('Rank  Score  Grade  Business                        Top Pain Point');
  console.error('─────────────────────────────────────────────────────────────────');
  filtered.forEach((r, idx) => {
    const rank = String(idx + 1).padEnd(5);
    const score = String(r.opportunityScore).padEnd(6);
    const grade = (gradeColor(r.grade) + r.grade + RESET).padEnd(5);
    const name = r.name.substring(0, 30).padEnd(30);
    const pain = r.painPoints[0] ? r.painPoints[0].substring(0, 55) : (r.error ? `Error: ${r.error}` : 'No issues detected');
    console.error(`${rank} ${score} ${grade}  ${name}  ${pain}`);
  });
  console.error('─────────────────────────────────────────────────────────────────');

  // Summary
  const topCandidate = filtered[0];
  console.error(`\nScored: ${results.length} | Skipped: ${skipped} | Shown: ${filtered.length}`);
  if (topCandidate) {
    console.error(`Top candidate: ${topCandidate.name} — score ${topCandidate.opportunityScore}/100 (${topCandidate.grade})`);
  }

  // Write output
  if (args.output) {
    try {
      writeFileSync(args.output, JSON.stringify(filtered, null, 2));
      console.error(`Output written to ${args.output}`);
    } catch (err) {
      console.error(`Failed to write output: ${err.message}`);
    }
  }

  // JSON output on stdout
  console.log(JSON.stringify(filtered, null, 2));
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
