/**
 * SYNOPSIS: Founder Voice Content Pack delivery helper — drives the LIVE MarketingOS loop
 *   (consent → session → coach → extract → generate → approve → export) to deliver a paid pack.
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 *
 * This is an orchestration/CLI script (SO-001 allows hand-written scripts). It does NOT define any
 * server module and does NOT claim anything is "shipped" — it calls already-live, SENTRY-verified
 * production endpoints. No secrets are printed.
 *
 * Usage:
 *   node scripts/deliver-content-pack.mjs --owner client-slug --brief brief.json --out ./deliveries/client-slug
 *
 * Flags:
 *   --brief <path>      JSON brief built from intake answers (see launch-kit/INTAKE.md). Optional if
 *                       --message provided.
 *   --owner <slug>      Label for the delivery folder / owner tag. Default: a random uuid.
 *   --out <dir>         Output directory. Default: ./deliveries/<owner>-<timestamp>.
 *   --message <text>    Extra coach turn (repeatable). Added after brief-derived turns.
 *   --pick <1,3,5>      Approve only these draft numbers (1-based). Default: approve all drafts.
 *   --no-approve        Stop after generate; write drafts.json for manual review; do not approve/export.
 *   --base <url>        Override base URL. Default: PUBLIC_BASE_URL if valid, else live lumin-web URL.
 *   --dry               Print the plan and exit without calling the API.
 */
import fs from 'node:fs';
import path from 'node:path';

const LIVE_BASE = 'https://lumin-web-production-e3a9.up.railway.app';

function parseArgs(argv) {
  const args = { message: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[(i += 1)];
    if (a === '--brief') args.brief = next();
    else if (a === '--owner') args.owner = next();
    else if (a === '--out') args.out = next();
    else if (a === '--message') args.message.push(next());
    else if (a === '--pick') args.pick = next();
    else if (a === '--no-approve') args.noApprove = true;
    else if (a === '--base') args.base = next();
    else if (a === '--dry') args.dry = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function resolveBase(override) {
  if (override) return override.replace(/\/$/, '');
  const env = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  // The shell PUBLIC_BASE_URL is known-stale in some environments; only trust lumin-web.
  if (env && /lumin-web-production/.test(env)) return env;
  return LIVE_BASE;
}

function briefToTurns(brief) {
  if (!brief) return [];
  const turns = [];
  const bits = [];
  if (brief.one_liner) bits.push(`What I do: ${brief.one_liner}`);
  if (brief.ideal_customer) bits.push(`My ideal customer: ${brief.ideal_customer}`);
  if (brief.tone) bits.push(`Tone I want: ${brief.tone}`);
  if (bits.length) turns.push(bits.join(' '));
  if (brief.questions_objections) {
    turns.push(`The questions/objections I hear most: ${brief.questions_objections}`);
  }
  if (brief.story) turns.push(`A real story from my work: ${brief.story}`);
  return turns;
}

async function jfetch(url, opts, step) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { res, body, step };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(fs.readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 33).join('\n'));
    process.exit(0);
  }

  const base = resolveBase(args.base);
  const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';
  const owner = args.owner || `client-${Date.now()}`;
  const outDir = args.out || path.join('deliveries', `${owner}-${Date.now()}`);

  let brief = null;
  if (args.brief) {
    brief = JSON.parse(fs.readFileSync(args.brief, 'utf8'));
  }
  const turns = [...briefToTurns(brief), ...args.message];
  if (turns.length === 0) {
    console.error('ERROR: provide --brief and/or --message so the coach has something to work with.');
    process.exit(1);
  }

  const plan = { base, owner, outDir, coach_turns: turns.length, brief: args.brief || null };
  console.log('Plan:', JSON.stringify(plan, null, 2));
  if (args.dry) {
    console.log('--dry: not calling the API. Exiting.');
    return;
  }
  if (!key) {
    console.error('ERROR: COMMAND_CENTER_KEY (or LIFEOS_KEY) not set in env. Cannot call the API.');
    process.exit(1);
  }

  const headers = {
    'content-type': 'application/json',
    'x-command-key': key,
    'x-command-center-key': key,
  };
  const ownerId = crypto.randomUUID();
  fs.mkdirSync(outDir, { recursive: true });

  // 1) consent
  const consent = await jfetch(`${base}/api/v1/marketing/consent`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      consent_type: 'session_recording',
      consent_text: `Founder Voice Content Pack delivery for ${owner}`,
      owner_id: ownerId,
    }),
  }, 'consent');
  if (![200, 201].includes(consent.res.status) || !consent.body.ok) {
    console.error('FAILED at consent:', consent.res.status, consent.body.error || consent.body.raw);
    process.exit(1);
  }
  console.log('✓ consent', consent.body.id);

  // 2) session
  const session = await jfetch(`${base}/api/v1/marketing/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ consent_record_id: consent.body.id, owner_id: ownerId }),
  }, 'session');
  if (![200, 201].includes(session.res.status) || !session.body.ok) {
    console.error('FAILED at session:', session.res.status, session.body.error || session.body.raw);
    process.exit(1);
  }
  const sessionId = session.body.id;
  console.log('✓ session', sessionId);

  // 3) coach turns
  for (const [i, message] of turns.entries()) {
    const coach = await jfetch(`${base}/api/v1/marketing/sessions/${sessionId}/coach`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, owner_id: ownerId }),
    }, 'coach');
    if (coach.res.status !== 200 || !coach.body.ok) {
      console.error(`FAILED at coach turn ${i + 1}:`, coach.res.status, coach.body.error || coach.body.raw);
      process.exit(1);
    }
    console.log(`✓ coach turn ${i + 1}/${turns.length}`);
  }

  // 4) extract
  const extract = await jfetch(`${base}/api/v1/marketing/sessions/${sessionId}/extract`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ owner_id: ownerId }),
  }, 'extract');
  if (extract.res.status !== 200 || !extract.body.ok) {
    console.error('FAILED at extract:', extract.res.status, extract.body.error || extract.body.raw);
    process.exit(1);
  }
  console.log('✓ extract');

  // 5) generate
  const gen = await jfetch(`${base}/api/v1/marketing/sessions/${sessionId}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ owner_id: ownerId }),
  }, 'generate');
  if (gen.res.status !== 200 || !gen.body.ok) {
    console.error('FAILED at generate:', gen.res.status, gen.body.error || gen.body.raw);
    process.exit(1);
  }
  const allPieces = gen.body.pieces || [];
  // KNOW (verified 2026-07-10): the generate route emits one piece per extraction with no
  // dedupe, so near-identical extractions collapse to duplicate posts. Dedupe by normalized
  // content so we never approve/export the same post twice. See launch-kit/FINDINGS.md.
  const seen = new Set();
  const pieces = allPieces.filter((p) => {
    const norm = (p.content_text || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!norm || seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
  console.log(`✓ generate — ${allPieces.length} drafts (${pieces.length} unique after dedupe)`);

  const draftsPath = path.join(outDir, 'drafts.json');
  fs.writeFileSync(
    draftsPath,
    `${JSON.stringify({ session_id: sessionId, owner_id: ownerId, unique: pieces, all: allPieces }, null, 2)}\n`,
  );
  pieces.forEach((p, idx) => {
    console.log(`\n[${idx + 1}] (${p.platform}/${p.format})\n${(p.content_text || '').slice(0, 400)}`);
  });
  console.log(`\nDrafts saved → ${draftsPath}`);
  if (pieces.length < 10) {
    console.log(
      `\nNOTE: only ${pieces.length} unique pieces from this session. To build a fuller pack, run`,
      '\nadditional sessions with DIFFERENT stories/themes (--message) and combine the exports.',
    );
  }

  if (args.noApprove) {
    console.log('--no-approve: stopping before approval. Review drafts.json, then re-run with --pick.');
    return;
  }

  // 6) approve
  let toApprove = pieces;
  if (args.pick) {
    const idx = new Set(args.pick.split(',').map((n) => parseInt(n.trim(), 10) - 1));
    toApprove = pieces.filter((_, i) => idx.has(i));
  }
  let approved = 0;
  for (const piece of toApprove) {
    const ap = await jfetch(`${base}/api/v1/marketing/content/${piece.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ action: 'approve', owner_id: ownerId }),
    }, 'approve');
    if (ap.res.status === 200 && ap.body.ok) approved += 1;
    else console.warn(`  ! could not approve piece ${piece.id}:`, ap.res.status, ap.body.error || '');
  }
  console.log(`✓ approved ${approved}/${toApprove.length} pieces`);

  // 7) export
  const exportRes = await fetch(
    `${base}/api/v1/marketing/sessions/${sessionId}/export?owner_id=${encodeURIComponent(ownerId)}`,
    { headers },
  );
  if (exportRes.status !== 200) {
    console.error('FAILED at export:', exportRes.status);
    process.exit(1);
  }
  const packText = await exportRes.text();
  const packPath = path.join(outDir, `content-pack-${owner}.txt`);
  fs.writeFileSync(packPath, packText);
  console.log(`✓ export — pack saved → ${packPath}`);
  console.log('\nDONE. Curate the pack, drop into a Doc/Notion, and send with the delivery email.');
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});