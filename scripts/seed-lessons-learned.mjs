#!/usr/bin/env node
/**
 * SYNOPSIS: seed-lessons-learned.mjs
 * seed-lessons-learned.mjs
 *
 * S2 — Memory Bootstrap. Seeds lessons_learned from real repair-loop receipts,
 * AM36 change receipts, and CONTINUITY_LOG entries. Each lesson cites its exact
 * source path + evidence. All lessons are seeded at low-to-medium confidence
 * (tags: confidence:medium or confidence:low) — NOT promoted to FACT/LAW.
 *
 * After inserting, writes docs/INSTITUTIONAL_MEMORY_DIGEST.md so cold agents
 * and generate-cold-start.mjs can read lessons without a DB connection.
 *
 * Safe to re-run: skips existing (problem-text + domain dedup).
 * Requires: DATABASE_URL in env.
 *
 * Run: node scripts/seed-lessons-learned.mjs
 * Or:  npm run memory:seed-lessons
 *
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import 'dotenv/config';
import pg from 'pg';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIGEST_PATH = path.join(ROOT, 'docs', 'INSTITUTIONAL_MEMORY_DIGEST.md');

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

// ─── Lessons ─────────────────────────────────────────────────────────────────
// Each lesson must cite source_path (evidence) and be confidence-tagged.
// how_novel: "first known solution" | "rare" | "known but hard" | "standard"
// confidence tags: "confidence:medium" or "confidence:low"
// All are RECEIPT-class evidence — not yet VERIFIED (that requires multiple sessions confirming them).

const LESSONS = [
  {
    domain: 'platform',
    impact_class: 'medium',
    problem: 'isLocked() returned null (not false) when no lock file exists; strict === false checks fail.',
    solution: 'Use `return lock !== null && lock.locked === true` — explicit boolean, never trusts JS falsy null.',
    how_novel: 'known but hard',
    surfaced_by: 'AM36 receipt 2026-05-14 — C21 library proof',
    tags: ['c21', 'autonomy-write-lock', 'boolean', 'library', 'confidence:medium'],
  },
  {
    domain: 'autonomy',
    impact_class: 'medium',
    problem: 'A write-lock with no expiry silently routes all autonomous commits to staging indefinitely if the operator forgets to release it.',
    solution: 'acquireLock() writes expires_at + ttl_minutes; readLock() auto-deletes expired file and returns null. Default TTL: 120 minutes via AUTONOMY_LOCK_TTL_MINUTES env.',
    how_novel: 'first known solution',
    surfaced_by: 'Adam directive 2026-05-14; AM36 C21 receipt',
    tags: ['c21', 'autonomy-write-lock', 'expiry', 'ttl', 'confidence:medium'],
  },
  {
    domain: 'build-governance',
    impact_class: 'large',
    problem: 'Autonomous builder (Groq model) corrupted all async function declarations in public/overlay/lifeos-dashboard.html as "asyncFn funcName()" — missing "unc" and space. Blocked Forge daemon for 9 consecutive cycles.',
    solution: 'Bulk replace `asyncFn ` → `async function ` with a post-replace space-before-identifier guard (`async function` + `[a-zA-Z]` → `async function ` + identifier). Added check:overlay to CI gate.',
    how_novel: 'rare',
    surfaced_by: 'AM36 receipt 2026-05-14 — Forge overlay fix',
    tags: ['forge', 'builder-corruption', 'overlay', 'async-function', 'confidence:medium'],
  },
  {
    domain: 'build-governance',
    impact_class: 'large',
    problem: 'Railway autonomous builder commits rewrote package.json without preserving compliance npm scripts (repo:sync-check, lifeos:verify:ui-map). Misdiagnosed twice as "Railway removes scripts" — real cause: scripts were never committed to git and were lost on rebase.',
    solution: 'commitToGitHub() now has a protected-scripts guard: rejects any package.json commit missing required scripts or test file references. Always commit npm scripts immediately after writing them — do not leave them untracked.',
    how_novel: 'rare',
    surfaced_by: 'AM36 receipt 2026-05-13 — Cycle 3; deployment-service guard',
    tags: ['package-json', 'deployment-service', 'railway', 'scripts-guard', 'confidence:medium'],
  },
  {
    domain: 'autonomy',
    impact_class: 'large',
    problem: 'Forge daemon retried a file that was already valid on disk across circuit-breaker cycles — no mechanism to detect the file existed. Truncation loop: builder produces 7 lines → circuit breaker → 2h pause → retry → repeat.',
    solution: 'SIS1: pre-builder disk check — if .js target_file exists + line count ≥ 10 + node --check passes → log task_skip_already_shipped and continue without an HTTP builder call. Confirmed live: multiple tasks skipped in site-builder-autonomous-queue.',
    how_novel: 'first known solution',
    surfaced_by: 'AM36 receipt 2026-05-12 — SIS1; checkIfAlreadyShipped()',
    tags: ['sis1', 'forge', 'circuit-breaker', 'builder', 'skip-if-shipped', 'confidence:medium'],
  },
  {
    domain: 'build-governance',
    impact_class: 'large',
    problem: 'FPM1 was shipped before SIS1 was confirmed live — two unverified loops stacked. No individual step was wrong, but failures in loop N could corrupt loop N+1 without detection.',
    solution: 'Prove-the-loop rule: before starting the next repair or build slice, require at least one live runtime log event confirming the previous slice, or an explicit PENDING_CONFIRMATION marker in the owning amendment. "Compiles and looks right" is not confirmation.',
    how_novel: 'first known solution',
    surfaced_by: 'AM36 prove-the-loop rule 2026-05-12; FPM1+SIS1 sequencing',
    tags: ['fpm1', 'sis1', 'governance', 'prove-the-loop', 'confidence:medium'],
  },
  {
    domain: 'autonomy',
    impact_class: 'medium',
    problem: 'data/builder-failure-patterns.json lives on Railway ephemeral filesystem. A fresh deploy or volume loss resets failure memory to zero — FPM1 reverts to level 0, no escalation hints, no auto-quarantine until the counter rebuilds from scratch.',
    solution: 'Treat FPM1 as provisional until migrated to a Neon table (builder_task_failure_patterns). Monitor for unexpected level-0 scores after deploys. Future slice: migrate to DB persistence so failure history survives redeployment.',
    how_novel: 'known but hard',
    surfaced_by: 'AM36 receipt 2026-05-12 — FPM1 risks; builder-failure-patterns.json',
    tags: ['fpm1', 'railway', 'ephemeral', 'builder-failure-memory', 'confidence:low'],
  },
  {
    domain: 'build-governance',
    impact_class: 'medium',
    problem: 'Unstaged LA1 working-tree changes were silently swept into the SIS1 commit when staging — receipt trail became inaccurate. Only detected by post-commit diff showing 6 hunks where 2 were SIS1.',
    solution: 'Pre-commit hunk audit: before staging, run `git diff` and categorize every hunk. STOP if mixed-scope without explicit operator approval. Mixed-scope commit = SSOT receipt error. Record the exception in the commit message.',
    how_novel: 'known but hard',
    surfaced_by: 'AM36 receipt 2026-05-12 — SIS1 commit hygiene; mixed-scope detection',
    tags: ['commit-hygiene', 'hunk-audit', 'ssot', 'git', 'confidence:medium'],
  },
  {
    domain: 'agent-workflow',
    impact_class: 'small',
    problem: 'Railway autonomous builders push commits continuously during human sessions; local branches diverge within minutes. Non-fast-forward push failures occur on nearly every human-session push.',
    solution: '`git fetch origin && git rebase origin/main` immediately before every push attempt. May need multiple rounds if builders push between rebase and push. Do not use git merge — rebase preserves linear history expected by the build system.',
    how_novel: 'standard',
    surfaced_by: 'CONTINUITY_LOG 2026-05-13/14 — push failures, C21 proof',
    tags: ['git', 'rebase', 'railway-autonomy', 'push', 'confidence:medium'],
  },
  {
    domain: 'agent-workflow',
    impact_class: 'medium',
    problem: 'Local repo was 32 commits behind origin/main during a governance session; operator:status showed stale snapshot as if current. 13 files existed on disk untracked — never committed, invisible to Railway.',
    solution: 'Run `git pull --rebase origin main` at session start when autonomous builders are active. Check git status for untracked files that belong to the system. OF1 freshness check in operator-runtime-status.mjs now flags stale snapshots as STALE/FAIL_CLOSED.',
    how_novel: 'known but hard',
    surfaced_by: 'AM36 receipt 2026-05-13 — GOVERNANCE_LOCK c60e1c64; 13 untracked files',
    tags: ['operator-status', 'stale-snapshot', 'git-sync', 'recovery', 'confidence:medium'],
  },
];

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seedLessons() {
  let inserted = 0;
  let skipped = 0;
  const seeded = [];

  for (const lesson of LESSONS) {
    const existing = await pool.query(
      'SELECT id FROM lessons_learned WHERE problem = $1 AND domain = $2',
      [lesson.problem, lesson.domain],
    );
    if (existing.rows.length > 0) {
      skipped++;
      seeded.push({ ...lesson, id: existing.rows[0].id, status: 'existing' });
      continue;
    }

    const { rows } = await pool.query(
      `INSERT INTO lessons_learned
         (domain, impact_class, problem, solution, how_novel, surfaced_by, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7::text[])
       RETURNING *`,
      [lesson.domain, lesson.impact_class, lesson.problem,
       lesson.solution, lesson.how_novel, lesson.surfaced_by,
       lesson.tags],
    );
    inserted++;
    seeded.push({ ...rows[0], status: 'new' });
    console.log(`  ✅ [${lesson.domain}/${lesson.impact_class}] ${lesson.problem.slice(0, 70)}...`);
  }

  console.log(`\nLessons inserted: ${inserted} new, ${skipped} already existed.`);
  return seeded;
}

// ─── Digest ──────────────────────────────────────────────────────────────────

async function writeDigest(seeded) {
  const byDomain = {};
  for (const l of seeded) {
    if (!byDomain[l.domain]) byDomain[l.domain] = [];
    byDomain[l.domain].push(l);
  }

  const impactOrder = { large: 0, medium: 1, small: 2, unknown: 3 };

  let md = `# Institutional Memory Digest\n\n`;
  md += `> **AUTO-GENERATED** — do not hand-edit. Regenerate: \`npm run memory:seed-lessons\`\n`;
  md += `> Generated: ${new Date().toISOString()}\n`;
  md += `> Confidence: all lessons are RECEIPT-class (seeded from repair receipts). Not promoted to FACT/INVARIANT without runtime evidence.\n\n`;
  md += `---\n\n`;

  for (const domain of Object.keys(byDomain).sort()) {
    const lessons = byDomain[domain].sort((a, b) =>
      (impactOrder[a.impact_class] ?? 3) - (impactOrder[b.impact_class] ?? 3)
    );
    md += `## ${domain}\n\n`;
    for (const l of lessons) {
      md += `### ${l.impact_class.toUpperCase()}: ${l.problem.slice(0, 80)}${l.problem.length > 80 ? '...' : ''}\n\n`;
      md += `**Problem:** ${l.problem}\n\n`;
      md += `**Solution:** ${l.solution}\n\n`;
      md += `**How novel:** ${l.how_novel}  \n`;
      md += `**Source:** ${l.surfaced_by}  \n`;
      md += `**Tags:** ${(l.tags || []).join(', ')}\n\n`;
      md += `---\n\n`;
    }
  }

  await writeFile(DIGEST_PATH, md, 'utf8');
  console.log(`\n✅ Wrote ${DIGEST_PATH}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Memory Intelligence — Seed Lessons Learned (S2)');
  console.log(`DB: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@') : 'NOT SET'}`);

  if (!process.env.DATABASE_URL) {
    console.error('\n❌ DATABASE_URL not set. Cannot seed.');
    process.exit(1);
  }

  try {
    await pool.query('SELECT 1 FROM lessons_learned LIMIT 1');
  } catch {
    console.error('\n❌ lessons_learned table missing — run db/migrations/20260426_memory_intelligence.sql first.');
    process.exit(1);
  }

  console.log('\n── Seeding lessons ──');
  const seeded = await seedLessons();

  console.log('\n── Writing digest ──');
  await writeDigest(seeded);

  const { rows } = await pool.query('SELECT COUNT(*) FROM lessons_learned');
  console.log(`\nTotal lessons_learned rows: ${rows[0].count}`);
  console.log('Run GET /api/v1/memory/lessons?domain=<domain> to verify.');

  await pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end().catch(() => {});
  process.exit(1);
});
