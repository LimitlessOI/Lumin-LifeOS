#!/usr/bin/env node
/**
 * scripts/seed-projects.mjs
 * Seeds the projects + project_segments tables from the SSOT amendment build plans.
 * Safe to run multiple times — uses INSERT ... ON CONFLICT DO UPDATE.
 *
 * Usage: node scripts/seed-projects.mjs [--dry-run]
 *
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const DRY_RUN = process.argv.includes('--dry-run');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ── Project definitions (from amendment build plans) ──────────────────────

const PROJECTS = [
  {
    slug: 'ai_council',
    name: 'AI Council System',
    lifecycle: 'production',
    status: 'active',
    priority: 'critical',
    phase: 'optimization',
    stability_class: 'needs-review',
    amendment_path: 'docs/projects/AMENDMENT_01_AI_COUNCIL.md',
    manifest_path: 'docs/projects/AMENDMENT_01_AI_COUNCIL.manifest.json',
    current_focus: 'Token savings optimization — general/codegen task types at 4% savings vs target 20%+',
    segments: [
      { title: 'Council routing + failover',            status: 'done',        estimated_hours: 8,  actual_hours: 10, stability_class: 'high-risk',    sort_order: 1 },
      { title: 'Token compression stack',               status: 'done',        estimated_hours: 6,  actual_hours: 8,  stability_class: 'needs-review',  sort_order: 2 },
      { title: 'Free tier governor',                    status: 'done',        estimated_hours: 4,  actual_hours: 4,  stability_class: 'safe',          sort_order: 3 },
      { title: 'Savings ledger DB recording',           status: 'done',        estimated_hours: 3,  actual_hours: 4,  stability_class: 'safe',          sort_order: 4 },
      { title: 'savings_pct fix — was always writing 0',status: 'done',        estimated_hours: 1,  actual_hours: 1,  stability_class: 'safe',          sort_order: 5 },
      { title: 'TOON enabled for codegen task type',    status: 'done',        estimated_hours: 0.5,actual_hours: 0.5,stability_class: 'safe',          sort_order: 6 },
      { title: 'Free tier buffer reduced 10% → 3%',    status: 'done',        estimated_hours: 0.5,actual_hours: 0.5,stability_class: 'safe',          sort_order: 7 },
      { title: 'HAB limit 10 → 100',                   status: 'done',        estimated_hours: 0.5,actual_hours: 0.5,stability_class: 'safe',          sort_order: 8 },
      { title: 'Ollama spam 30-min cooldown',           status: 'done',        estimated_hours: 0.5,actual_hours: 0.5,stability_class: 'safe',          sort_order: 9 },
      { title: 'AI guard lazy hash (REALITY_MISMATCH fix)', status: 'done',   estimated_hours: 1,  actual_hours: 0.5,stability_class: 'needs-review',  sort_order: 10 },
      { title: 'Move COUNCIL_MEMBERS to config/',       status: 'done',        estimated_hours: 1,  actual_hours: 1,  stability_class: 'safe',          sort_order: 11 },
      { title: 'Extract runtime route composition',     status: 'done',        estimated_hours: 1.5,actual_hours: 1.5,stability_class: 'safe',          sort_order: 12 },
      { title: 'Improve general task type savings 4% → 15%+', status: 'pending', estimated_hours: 3,  stability_class: 'needs-review', is_next_task: true, sort_order: 13 },
      { title: 'Investigate Ollama 7,327 avg tokens/call', status: 'pending',    estimated_hours: 2,  stability_class: 'safe',          sort_order: 14 },
      { title: 'Persist provider cooldowns to DB',      status: 'pending',        estimated_hours: 2,  stability_class: 'safe',          sort_order: 15 },
    ],
  },
  {
    slug: 'command_center',
    name: 'Command & Control Center',
    lifecycle: 'experimental',
    status: 'active',
    priority: 'critical',
    phase: 'expansion',
    stability_class: 'needs-review',
    amendment_path: 'docs/projects/AMENDMENT_12_COMMAND_CENTER.md',
    manifest_path: 'docs/projects/AMENDMENT_12_COMMAND_CENTER.manifest.json',
    current_focus: 'Projects Dashboard panel and Pending Adam panel — just built',
    segments: [
      { title: 'Extract routes to command-center-routes.js', status: 'done',  estimated_hours: 2,  actual_hours: 2,  stability_class: 'safe',         sort_order: 1 },
      { title: 'Fix REALITY_MISMATCH 409 on chat',       status: 'done',      estimated_hours: 1,  actual_hours: 0.5,stability_class: 'needs-review', sort_order: 2 },
      { title: 'Fix System Health red X',                status: 'done',       estimated_hours: 0.5,actual_hours: 0.5,stability_class: 'safe',         sort_order: 3 },
      { title: 'Fix Ideas Queue showing 0 (COALESCE)',   status: 'done',       estimated_hours: 0.5,actual_hours: 0.5,stability_class: 'safe',         sort_order: 4 },
      { title: 'Add AI Safety Controls endpoints',       status: 'done',       estimated_hours: 1,  actual_hours: 1,  stability_class: 'safe',         sort_order: 5 },
      { title: 'Add Reality snapshot endpoint',          status: 'done',       estimated_hours: 0.5,actual_hours: 0.5,stability_class: 'safe',         sort_order: 6 },
      { title: 'Fix key mismatch',                       status: 'done',       estimated_hours: 0.5,actual_hours: 1,  stability_class: 'safe',         sort_order: 7 },
      { title: 'Projects Dashboard panel',               status: 'done',       estimated_hours: 4,  actual_hours: 3,  stability_class: 'needs-review', sort_order: 8 },
      { title: 'Pending Adam panel',                     status: 'done',       estimated_hours: 2,  actual_hours: 2,  stability_class: 'safe',         sort_order: 9 },
      { title: 'Mobile-responsive layout',               status: 'pending',       estimated_hours: 3,  stability_class: 'safe',          is_next_task: true, sort_order: 10 },
      { title: 'Role-based access (admin vs client vs agent)', status: 'pending', estimated_hours: 6,  stability_class: 'high-risk',     sort_order: 11 },
      { title: 'Site Builder UI panel',                  status: 'pending',       estimated_hours: 4,  stability_class: 'needs-review',  sort_order: 12 },
    ],
  },
  {
    slug: 'tc_service',
    name: 'Transaction Coordinator Service',
    lifecycle: 'experimental',
    status: 'active',
    priority: 'high',
    phase: 'core-infrastructure',
    stability_class: 'needs-review',
    amendment_path: 'docs/projects/AMENDMENT_17_TC_SERVICE.md',
    manifest_path: 'docs/projects/AMENDMENT_17_TC_SERVICE.manifest.json',
    current_focus: 'First real transaction intake end-to-end (6453 Mahogany Peak)',
    segments: [
      { title: 'TC coordinator — core transaction/deadline/party model', status: 'done', estimated_hours: 8,  actual_hours: 10, stability_class: 'high-risk',   sort_order: 1 },
      { title: 'Email triage — IMAP scan + TC contract detection',       status: 'done', estimated_hours: 6,  actual_hours: 8,  stability_class: 'needs-review', sort_order: 2 },
      { title: 'SkySlope browser agent — Okta SSO + doc upload',         status: 'done', estimated_hours: 8,  actual_hours: 12, stability_class: 'high-risk',   sort_order: 3 },
      { title: 'Three-tier pricing + agent registry',                     status: 'done', estimated_hours: 4,  actual_hours: 4,  stability_class: 'safe',         sort_order: 4 },
      { title: 'GLVAR monitor — dues + violation crons',                  status: 'done', estimated_hours: 3,  actual_hours: 3,  stability_class: 'safe',         sort_order: 5 },
      { title: 'MLS deal scanner — AI scoring + investor matching',       status: 'done', estimated_hours: 6,  actual_hours: 8,  stability_class: 'needs-review', sort_order: 6 },
      { title: 'DB migrations — all TC tables',                           status: 'done', estimated_hours: 4,  actual_hours: 5,  stability_class: 'safe',         sort_order: 7 },
      { title: 'Railway managed-env bootstrap + bulk push',               status: 'done', estimated_hours: 2,  actual_hours: 2,  stability_class: 'safe',         sort_order: 8 },
      { title: 'TC runtime wiring hardened',                              status: 'done', estimated_hours: 3,  actual_hours: 4,  stability_class: 'needs-review', sort_order: 9 },
      { title: 'Offer prep command engine',                               status: 'done', estimated_hours: 5,  actual_hours: 6,  stability_class: 'needs-review', sort_order: 10 },
      { title: 'First real transaction intake (6453 Mahogany Peak)',      status: 'pending', estimated_hours: 4,  stability_class: 'high-risk',   is_next_task: true, sort_order: 11 },
      { title: 'IMAP vars set in Railway + dry-run email scan',           status: 'pending', estimated_hours: 1,  stability_class: 'safe',         sort_order: 12 },
      { title: 'SkySlope login test on Railway',                          status: 'pending', estimated_hours: 1,  stability_class: 'needs-review', sort_order: 13 },
      { title: 'Document QA — missing-signature / missing-field detection', status: 'pending', estimated_hours: 6, stability_class: 'high-risk',  sort_order: 14 },
      { title: 'Agent portal UI polish',                                  status: 'pending', estimated_hours: 4,  stability_class: 'safe',         sort_order: 15 },
      { title: 'Postmark/Twilio webhook validation',                      status: 'pending', estimated_hours: 2,  stability_class: 'needs-review', sort_order: 16 },
      { title: 'First paying agent client enrolled',                      status: 'pending', estimated_hours: 2,  stability_class: 'safe',         sort_order: 17 },
      { title: 'Stripe billing wired to TC plan tiers',                   status: 'pending', estimated_hours: 4,  stability_class: 'needs-review', sort_order: 18 },
    ],
  },
  {
    slug: 'project_governance',
    name: 'SSOT Project Governance System',
    lifecycle: 'experimental',
    status: 'active',
    priority: 'high',
    phase: 'core-infrastructure',
    stability_class: 'needs-review',
    amendment_path: 'docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md',
    manifest_path: 'docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.manifest.json',
    current_focus: 'Governance infrastructure live — seed data, C&C panels, CI pipeline',
    segments: [
      { title: 'DB schema (projects, segments, estimation_log, pending_adam)', status: 'done', estimated_hours: 3, actual_hours: 3, stability_class: 'safe', sort_order: 1 },
      { title: 'verify-project.mjs — runs all manifest assertions',      status: 'done', estimated_hours: 4,  actual_hours: 4,  stability_class: 'needs-review', sort_order: 2 },
      { title: 'ssot-staleness-check.mjs — code newer than amendment',   status: 'done', estimated_hours: 2,  actual_hours: 2,  stability_class: 'safe',         sort_order: 3 },
      { title: 'check-coupling.mjs — code change → amendment must change', status: 'done', estimated_hours: 2, actual_hours: 2, stability_class: 'safe',         sort_order: 4 },
      { title: 'pre-commit hook',                                         status: 'done', estimated_hours: 1,  actual_hours: 1,  stability_class: 'safe',         sort_order: 5 },
      { title: 'GitHub Actions ssot-compliance.yml',                      status: 'done', estimated_hours: 2,  actual_hours: 2,  stability_class: 'safe',         sort_order: 6 },
      { title: 'project-governance-routes.js API',                        status: 'done', estimated_hours: 6,  actual_hours: 7,  stability_class: 'needs-review', sort_order: 7 },
      { title: 'AMENDMENT template — gold standard',                      status: 'done', estimated_hours: 1,  actual_hours: 1,  stability_class: 'safe',         sort_order: 8 },
      { title: 'manifest.schema.json — JSON Schema draft-07',             status: 'done', estimated_hours: 1,  actual_hours: 1,  stability_class: 'safe',         sort_order: 9 },
      { title: 'AMENDMENT_01, 12, 17 upgraded to full template',         status: 'done', estimated_hours: 3,  actual_hours: 4,  stability_class: 'safe',         sort_order: 10 },
      { title: 'C&C Projects Dashboard + Pending Adam panels',            status: 'done', estimated_hours: 6,  actual_hours: 5,  stability_class: 'needs-review', sort_order: 11 },
      { title: 'Seed projects + segments into DB',                        status: 'done', estimated_hours: 1,  actual_hours: 1, stability_class: 'safe', sort_order: 12 },
      { title: 'AMENDMENT_19 created for governance system itself',       status: 'done', estimated_hours: 1, actual_hours: 1, stability_class: 'safe', sort_order: 13 },
      { title: 'Upgrade remaining amendments to full template',           status: 'pending', estimated_hours: 4,  stability_class: 'safe',         sort_order: 14 },
      { title: 'Wire estimation accuracy to C&C accuracy panel',          status: 'pending', estimated_hours: 2,  stability_class: 'safe',         is_next_task: true, sort_order: 15 },
    ],
  },
];

// ── Seed function ─────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();
  try {
    let projectsUpserted = 0;
    let segmentsUpserted = 0;

    for (const p of PROJECTS) {
      const totalSegs = p.segments.length;
      const doneSegs = p.segments.filter(s => s.status === 'done').length;

      if (DRY_RUN) {
        console.log(`[DRY RUN] Would upsert project: ${p.slug} (${doneSegs}/${totalSegs} done)`);
        for (const s of p.segments) {
          console.log(`  ${s.status === 'done' ? '✓' : s.is_next_task ? '→' : ' '} ${s.title}`);
        }
        continue;
      }

      // Upsert project
      const { rows: [project] } = await client.query(`
        INSERT INTO projects (
          slug, name, lifecycle, status, priority, phase, stability_class,
          amendment_path, manifest_path, current_focus, total_segments, completed_segments, last_worked_on
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          lifecycle = EXCLUDED.lifecycle,
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          phase = EXCLUDED.phase,
          stability_class = EXCLUDED.stability_class,
          amendment_path = EXCLUDED.amendment_path,
          manifest_path = EXCLUDED.manifest_path,
          current_focus = EXCLUDED.current_focus,
          total_segments = EXCLUDED.total_segments,
          completed_segments = EXCLUDED.completed_segments
        RETURNING id, slug
      `, [p.slug, p.name, p.lifecycle, p.status, p.priority, p.phase, p.stability_class,
          p.amendment_path, p.manifest_path, p.current_focus, totalSegs, doneSegs]);

      projectsUpserted++;

      // Clear existing segments + estimation_log for this project (idempotent re-seed)
      await client.query(`DELETE FROM estimation_log WHERE project_id = $1`, [project.id]);
      await client.query(`DELETE FROM project_segments WHERE project_id = $1`, [project.id]);

      // Insert segments fresh
      for (const s of p.segments) {
        const { rows: [seg] } = await client.query(`
          INSERT INTO project_segments (
            project_id, title, status, estimated_hours, actual_hours,
            stability_class, is_next_task, sort_order, completed_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING id
        `, [
          project.id, s.title, s.status,
          s.estimated_hours || null, s.actual_hours || null,
          s.stability_class || 'safe',
          s.is_next_task || false,
          s.sort_order,
          s.status === 'done' ? new Date() : null,
        ]);
        segmentsUpserted++;

        // Backfill estimation_log for done segments
        if (s.status === 'done' && s.estimated_hours && s.actual_hours) {
          const est = s.estimated_hours;
          const act = s.actual_hours;
          const delta = act - est;
          const accuracyPct = Math.max(0, Math.min(100, (1 - Math.abs(delta) / est) * 100));
          const overUnder = Math.abs(delta) < 0.05 ? 'exact' : delta > 0 ? 'over' : 'under';
          await client.query(`
            INSERT INTO estimation_log (project_id, segment_id, estimated_hours, actual_hours, accuracy_pct, over_under, delta_hours)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [project.id, seg.id, est, act, accuracyPct.toFixed(2), overUnder, delta.toFixed(2)]);
        }
      }

      // Update running accuracy on project
      await client.query(`
        UPDATE projects SET
          estimation_accuracy = (
            SELECT ROUND(AVG(accuracy_pct), 2) FROM estimation_log WHERE project_id = $1
          )
        WHERE id = $1
      `, [project.id]);

      console.log(`✓ ${p.slug} — ${doneSegs}/${totalSegs} done, segments upserted`);
    }

    if (!DRY_RUN) {
      console.log(`\n✅ Seed complete — ${projectsUpserted} projects, ${segmentsUpserted} segments`);
    }
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
