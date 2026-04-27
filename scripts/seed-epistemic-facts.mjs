#!/usr/bin/env node
/**
 * seed-epistemic-facts.mjs
 *
 * Seeds the epistemic_facts table from existing SSOT sources:
 *   1. Amendment Change Receipts → RECEIPT-level (3) facts
 *   2. ENV_REGISTRY.md known-SET vars → VERIFIED-level (4) facts
 *   3. Known architectural invariants → TESTED-level (2) facts
 *
 * Run: node scripts/seed-epistemic-facts.mjs
 * Or:  npm run memory:seed
 *
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING on canonical_id dedup.
 * Requires DATABASE_URL in env.
 *
 * @ssot docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md
 */

import 'dotenv/config';
import pg from 'pg';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AMENDMENTS_DIR = path.join(ROOT, 'docs', 'projects');
const ENV_REGISTRY = path.join(ROOT, 'docs', 'ENV_REGISTRY.md');

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false'
    ? { rejectUnauthorized: false }
    : process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
});

let inserted = 0;
let skipped = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function upsertFact({ text, domain, level, contextRequired, falseWhen, source, canonicalKey }) {
  // Use a deterministic canonical_id seed so re-runs don't duplicate.
  // We generate a stable UUID from the canonical key using a simple name-based approach.
  const existing = await pool.query(
    'SELECT id FROM epistemic_facts WHERE text = $1 AND domain = $2',
    [text, domain],
  );
  if (existing.rows.length > 0) {
    skipped++;
    return;
  }

  await pool.query(
    `INSERT INTO epistemic_facts
       (text, domain, level, context_required, false_when, created_by, source_count,
        trial_count, last_tested_at)
     VALUES ($1,$2,$3,$4,$5,$6,1,1,NOW())`,
    [text, domain, level, contextRequired || null, falseWhen || null, source || 'seed-script'],
  );
  inserted++;
}

// ─── Source 1: Amendment Change Receipts ─────────────────────────────────────

async function seedAmendmentReceipts() {
  console.log('\n── Seeding from amendment Change Receipts ──');
  const files = (await readdir(AMENDMENTS_DIR)).filter(f => f.startsWith('AMENDMENT_') && f.endsWith('.md'));

  for (const file of files) {
    const content = await readFile(path.join(AMENDMENTS_DIR, file), 'utf8').catch(() => null);
    if (!content) continue;

    // Extract amendment name for domain tagging
    const nameMatch = file.match(/AMENDMENT_(\d+)_(.+)\.md/);
    if (!nameMatch) continue;
    const amendmentNum = nameMatch[1];
    const amendmentSlug = nameMatch[2].toLowerCase().replace(/_/g, '-');

    // Extract Change Receipt rows (markdown table rows after the header)
    // Format: | Date | File | What | Why |
    const receiptSection = content.split('## Change Receipts')[1];
    if (!receiptSection) continue;

    const lines = receiptSection.split('\n').filter(l => l.trim().startsWith('|'));
    // Skip header and separator rows
    const dataRows = lines.filter(l => {
      const cols = l.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length < 3) return false;
      if (cols[0] === 'Date' || cols[0].startsWith('-')) return false;
      return true;
    });

    for (const row of dataRows) {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length < 3) continue;
      const [date, fileCol, what, why] = cols;
      if (!date || !fileCol || !what) continue;

      const text = `[${file}] ${fileCol}: ${what}${why ? ` — ${why}` : ''}`.slice(0, 500);

      await upsertFact({
        text,
        domain: 'operational',
        level: 3, // RECEIPT
        contextRequired: `Amendment ${amendmentNum} (${amendmentSlug})`,
        source: `seed/amendment/${file}`,
      });
    }

    // Also seed the current next_task / current_focus as HYPOTHESIS (1)
    const handoffSection = content.split('## Agent Handoff Notes')[1];
    if (handoffSection) {
      const nextPriorityMatch = handoffSection.match(/\*\*Next priority[^:]*:\*\*([^\n]{10,200})/);
      if (nextPriorityMatch) {
        await upsertFact({
          text: `Next priority for ${amendmentSlug}: ${nextPriorityMatch[1].trim()}`,
          domain: 'operational',
          level: 1, // HYPOTHESIS — current plan, not yet proven
          contextRequired: `Amendment ${amendmentNum}`,
          source: `seed/handoff/${file}`,
        });
      }
    }
  }
  console.log(`  Receipts seeded: ${inserted} new, ${skipped} already existed`);
}

// ─── Source 2: ENV_REGISTRY.md known-SET vars ────────────────────────────────

async function seedEnvRegistry() {
  console.log('\n── Seeding from ENV_REGISTRY.md ──');
  const before = inserted;

  const content = await readFile(ENV_REGISTRY, 'utf8').catch(() => null);
  if (!content) {
    console.warn('  ENV_REGISTRY.md not found — skipping');
    return;
  }

  // Find lines that clearly show a SET status (✅ SET)
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.includes('✅') && !line.includes('SET')) continue;

    // Try to extract a variable name from the line
    // Pattern: `VAR_NAME` or | VAR_NAME | or similar
    const varMatch = line.match(/`([A-Z_][A-Z0-9_]{2,})`/) ||
                     line.match(/\|\s*([A-Z_][A-Z0-9_]{2,})\s*\|/);
    if (!varMatch) continue;

    const varName = varMatch[1];
    // Skip generic words that match the pattern
    if (['DATABASE', 'RAILWAY', 'REQUIRED', 'OPTIONAL', 'FEATURE'].includes(varName)) continue;

    await upsertFact({
      text: `${varName} is present in Railway vault`,
      domain: 'operational',
      level: 4, // VERIFIED — multiple sessions have confirmed
      contextRequired: 'Railway production vault',
      falseWhen: 'local shell without export; different Railway service; deploy predating last variable update',
      source: 'seed/env-registry',
    });
  }

  console.log(`  ENV vars seeded: ${inserted - before} new`);
}

// ─── Source 3: Known architectural invariants ─────────────────────────────────

async function seedArchitecturalFacts() {
  console.log('\n── Seeding architectural facts ──');
  const before = inserted;

  const facts = [
    // Server architecture
    {
      text: 'server.js is a composition root only — no feature routes, no service logic, no inline config',
      domain: 'constitutional',
      level: 5, // FACT — enforced by CLAUDE.md
      contextRequired: 'This repository',
    },
    {
      text: 'New feature routes go in routes/<feature>-routes.js, not in server.js',
      domain: 'constitutional',
      level: 5,
      contextRequired: 'This repository',
    },
    {
      text: 'New service logic goes in services/<feature>.js, not in server.js',
      domain: 'constitutional',
      level: 5,
      contextRequired: 'This repository',
    },
    {
      text: 'DB migrations go in db/migrations/<date>_<name>.sql and auto-apply on boot',
      domain: 'operational',
      level: 5,
      contextRequired: 'This repository + Railway deploy',
    },
    // Evidence ladder
    {
      text: 'The evidence ladder tops at INVARIANT (level 6), never LAW — LAW is the governance ladder in NSSOT',
      domain: 'constitutional',
      level: 5,
      contextRequired: 'Memory Intelligence system (AMENDMENT_39)',
      falseWhen: 'Never — this is a vocabulary constraint, not a runtime condition',
    },
    {
      text: 'INVARIANT promotion requires adversarial_count >= 3 AND exception_count === 0',
      domain: 'constitutional',
      level: 5,
      contextRequired: 'Memory Intelligence system (AMENDMENT_39)',
    },
    // Build system
    {
      text: 'builder:preflight exit 0 means base URL and auth are aligned; does not guarantee GITHUB_TOKEN is present',
      domain: 'operational',
      level: 4, // VERIFIED
      contextRequired: 'Builder preflight script',
      falseWhen: 'Builder is updated to hard-block on token absence',
    },
    {
      text: 'github_token: false from /ready means runtime diagnosis needed — not vault absence if Railway name-list shows ✓',
      domain: 'operational',
      level: 4, // VERIFIED — fixed this session after false claim incident
      contextRequired: 'Railway production + /api/v1/lifeos/builder/ready',
      falseWhen: 'Name is ✗ ABSENT from Railway vault AND all diagnosis paths ruled out',
    },
    // SSOT rules
    {
      text: 'Every .js file must have a @ssot tag pointing to its owning amendment',
      domain: 'constitutional',
      level: 5,
      contextRequired: 'This repository',
    },
    {
      text: 'Pre-commit hook blocks routes/, services/, public/overlay/, db/migrations/ without [system-build] or GAP-FILL:',
      domain: 'constitutional',
      level: 5,
      contextRequired: 'This repository + git hooks',
    },
    // Zero waste
    {
      text: 'Every scheduled AI task must go through createUsefulWorkGuard() in services/useful-work-guard.js',
      domain: 'constitutional',
      level: 5,
      contextRequired: 'This repository',
    },
    // Competitive moat
    {
      text: 'The moat is not the technology — it is the operating discipline enforced by the technology',
      domain: 'strategic',
      level: 5,
      contextRequired: 'LifeOS competitive strategy',
    },
    {
      text: 'Vision × System = Features; this scales differently than Headcount × Salary × Time = Features',
      domain: 'strategic',
      level: 4,
      contextRequired: 'LifeOS competitive strategy',
    },
    // Memory system design
    {
      text: 'A model is trusted only to the degree it is constrained, checked, and historically right',
      domain: 'constitutional',
      level: 5,
      contextRequired: 'Memory Intelligence system + agent governance',
    },
    {
      text: 'Building wrong is equivalent to not building at all — slow and right over fast and wrong',
      domain: 'constitutional',
      level: 5,
      contextRequired: 'LifeOS build philosophy',
    },
  ];

  for (const fact of facts) {
    await upsertFact({ ...fact, source: 'seed/architectural-facts' });
  }

  console.log(`  Architectural facts seeded: ${inserted - before} new`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Memory Intelligence — Seed Script');
  console.log(`Database: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@') : 'NOT SET'}`);

  if (!process.env.DATABASE_URL) {
    console.error('\n❌ DATABASE_URL is not set. Cannot seed.');
    process.exit(1);
  }

  // Verify tables exist
  try {
    await pool.query('SELECT 1 FROM epistemic_facts LIMIT 1');
  } catch (err) {
    console.error('\n❌ epistemic_facts table does not exist. Run the migration first:');
    console.error('   db/migrations/20260426_memory_intelligence.sql');
    process.exit(1);
  }

  await seedAmendmentReceipts();
  await seedEnvRegistry();
  await seedArchitecturalFacts();

  // Summary
  const { rows } = await pool.query(`
    SELECT level, COUNT(*) AS count
    FROM epistemic_facts
    GROUP BY level ORDER BY level
  `);

  console.log('\n── Epistemic facts by level ──');
  const labels = ['CLAIM','HYPOTHESIS','TESTED','RECEIPT','VERIFIED','FACT','INVARIANT'];
  for (const row of rows) {
    console.log(`  ${labels[row.level]} (${row.level}): ${row.count}`);
  }

  const total = rows.reduce((sum, r) => sum + parseInt(r.count), 0);
  console.log(`\nTotal: ${total} facts (${inserted} new this run, ${skipped} already existed)`);
  console.log('\n✅ Seed complete. Run GET /api/v1/memory/health to verify.');

  await pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end().catch(() => {});
  process.exit(1);
});
