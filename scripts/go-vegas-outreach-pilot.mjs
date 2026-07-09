#!/usr/bin/env node
/**
 * SYNOPSIS: Go Vegas outreach pilot — discover LV businesses, invite, follow up.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 *
 * Usage:
 *   node scripts/go-vegas-outreach-pilot.mjs discover --type=restaurant --count=15
 *   node scripts/go-vegas-outreach-pilot.mjs enrich --limit=20
 *   node scripts/go-vegas-outreach-pilot.mjs invite --limit=5 --dry-run
 *   node scripts/go-vegas-outreach-pilot.mjs follow-up --dry-run
 *   node scripts/go-vegas-outreach-pilot.mjs status
 */
import 'dotenv/config';
import pg from 'pg';
import { createGoVegasOutreach } from '../services/go-vegas-outreach.js';
import { sendProspectOutreach } from '../services/site-builder-postmark-helper.js';

const { Pool } = pg;

function parseArgs(argv) {
  const cmd = argv[2] || 'status';
  const opts = {};
  for (const arg of argv.slice(3)) {
    const m = arg.match(/^--([\w-]+)(?:=(.+))?$/);
    if (m) opts[m[1]] = m[2] ?? true;
  }
  return { cmd, opts };
}

function buildSendEmail() {
  return async ({ to, subject, html, text, from, metadata, campaignId }) => {
    const result = await sendProspectOutreach(
      { contact_email: to },
      {
        subject,
        textBody: text || html.replace(/<[^>]+>/g, ' '),
        from: from || undefined,
      }
    );
    return result.sent ? { success: true } : { success: false, error: result.error };
  };
}

async function main() {
  const { cmd, opts } = parseArgs(process.argv);
  const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    : null;

  if (!pool && cmd !== 'status') {
    console.error('DATABASE_URL required for pipeline commands');
    process.exit(1);
  }

  const outreach = createGoVegasOutreach({ pool, sendEmail: buildSendEmail() });

  let result;
  switch (cmd) {
    case 'discover':
      result = await outreach.discoverBusinesses({
        type: opts.type || 'restaurant',
        count: Number(opts.count) || 10,
        enrichEmail: opts['no-enrich'] !== true,
      });
      break;
    case 'enrich':
      result = await outreach.enrichProspects({ limit: Number(opts.limit) || 20 });
      break;
    case 'invite':
      result = await outreach.inviteBatch({
        limit: Number(opts.limit) || 5,
        dryRun: opts['dry-run'] === true || opts.dryRun === true,
      });
      break;
    case 'follow-up':
      result = await outreach.runFollowUpCron({
        dryRun: opts['dry-run'] === true || opts.dryRun === true,
      });
      break;
    case 'status':
    default:
      result = pool ? await outreach.getPipelineStats() : { ok: false, error: 'DATABASE_URL not set' };
      break;
  }

  console.log(JSON.stringify(result, null, 2));
  if (pool) await pool.end();
  process.exit(result.ok === false ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
