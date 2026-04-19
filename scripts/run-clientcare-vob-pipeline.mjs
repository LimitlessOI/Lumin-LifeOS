#!/usr/bin/env node
/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 *
 * Upload an insurance card image and run the full ClientCare pipeline on the LifeOS server:
 * card OCR → fill empty portal fields → VOB retries → sync parsed VOB text.
 *
 * Usage:
 *   API_BASE_URL=https://your-app.up.railway.app \
 *   COMMAND_CENTER_KEY=... \
 *   node scripts/run-clientcare-vob-pipeline.mjs \
 *     --client-href "https://clientcarewest.net/Pregnancy/ShowDefaultClientScreen/..."
 *
 * Optional:
 *   --card path/to/card.png   (default: first PNG/JPEG in tests/fixtures/insurance-cards/)
 *   --no-card                 run pipeline without uploading an image
 *   --dry-run                 (apply=false — no writes in ClientCare)
 *   --slot 0                  (insurance slot index)
 *   --base-url URL            (overrides API_BASE_URL)
 *
 * Optional headers (operator / tenant packaging):
 *   OPERATOR_EMAIL=you@... X_CLIENTCARE_TENANT_ID=...
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = {
    clientHref: '',
    card: '',
    dryRun: false,
    slot: 0,
    baseUrl: '',
    noCard: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-card') out.noCard = true;
    if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--client-href=')) out.clientHref = a.slice('--client-href='.length).trim();
    else if (a === '--client-href') out.clientHref = String(argv[++i] || '').trim();
    else if (a.startsWith('--card=')) out.card = a.slice('--card='.length).trim();
    else if (a === '--card') out.card = String(argv[++i] || '').trim();
    else if (a.startsWith('--slot=')) out.slot = Number(a.slice('--slot='.length)) || 0;
    else if (a === '--slot') out.slot = Number(argv[++i]) || 0;
    else if (a.startsWith('--base-url=')) out.baseUrl = a.slice('--base-url='.length).trim();
    else if (a === '--base-url') out.baseUrl = String(argv[++i] || '').trim();
  }
  return out;
}

function defaultCardPath() {
  const dir = path.join(ROOT, 'tests', 'fixtures', 'insurance-cards');
  if (!fs.existsSync(dir)) return '';
  const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  return files.length ? path.join(dir, files[0]) : '';
}

function resolveBaseUrl(explicit) {
  if (explicit) return explicit.replace(/\/$/, '');
  const u =
    process.env.API_BASE_URL ||
    process.env.LIFEOS_API_BASE ||
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    process.env.SITE_BASE_URL ||
    '';
  if (u) return String(u).replace(/\/$/, '');
  return 'http://127.0.0.1:64266';
}

function resolveApiKey() {
  return (
    process.env.COMMAND_CENTER_KEY ||
    process.env.API_KEY ||
    process.env.LIFEOS_KEY ||
    ''
  ).trim();
}

async function main() {
  const args = parseArgs(process.argv);
  const clientHref = args.clientHref || process.env.CLIENT_HREF || process.env.CLIENTCARE_CLIENT_HREF || '';
  if (!clientHref) {
    console.error(
      'Missing --client-href (or CLIENT_HREF). Paste the ClientCare billing page URL for the client file.',
    );
    process.exit(1);
  }

  let cardPath = args.noCard ? '' : args.card || defaultCardPath();
  if (!args.noCard && (!cardPath || !fs.existsSync(cardPath))) {
    console.error(
      'No card image: pass --card /path/to.png, add PNGs under tests/fixtures/insurance-cards/, or use --no-card to run VOB without an upload.',
    );
    process.exit(1);
  }

  const base = resolveBaseUrl(args.baseUrl);
  const apiKey = resolveApiKey();
  if (!apiKey && process.env.LIFEOS_OPEN_ACCESS !== 'true') {
    console.error(
      'Missing COMMAND_CENTER_KEY (or API_KEY / LIFEOS_KEY). The API must accept your key, or set LIFEOS_OPEN_ACCESS=true on the server (dev only).',
    );
    process.exit(1);
  }

  const url = `${base}/api/v1/clientcare-billing/insurance/clientcare-pipeline`;
  const form = new FormData();
  form.append('client_href', clientHref);
  form.append('apply', args.dryRun ? 'false' : 'true');
  form.append('requested_by', 'run-clientcare-vob-pipeline');
  form.append('insurance_slot', String(args.slot || 0));

  if (cardPath) {
    const buf = await fs.promises.readFile(cardPath);
    const ext = path.extname(cardPath) || '.png';
    const name = path.basename(cardPath) || `card${ext}`;
    form.append('card', new Blob([buf], { type: 'image/png' }), name);
  }

  /** @type {Record<string, string>} */
  const headers = {};
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  const op = (process.env.OPERATOR_EMAIL || '').trim();
  if (op) headers['x-operator-email'] = op;
  const tid = (process.env.X_CLIENTCARE_TENANT_ID || process.env.CLIENTCARE_TENANT_ID || '').trim();
  if (tid) headers['x-clientcare-tenant-id'] = tid;

  console.error(`POST ${url}`);
  console.error(`  card: ${cardPath || '(none)'}`);
  console.error(`  apply: ${args.dryRun ? 'false (dry run)' : 'true'}`);

  const res = await fetch(url, { method: 'POST', headers, body: form });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(text);
    process.exit(res.ok ? 0 : 1);
  }

  console.log(JSON.stringify(data, null, 2));
  if (!res.ok || data.ok === false) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
