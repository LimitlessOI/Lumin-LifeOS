#!/usr/bin/env node
/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 *
 * One-shot: resolve a TC transaction → scan mailbox for R4R-style PDFs → upload to TransactionDesk.
 *
 * Your shell **TC_API_KEY** must match Railway **COMMAND_CENTER_KEY** exactly (local `.env` often drifts).
 *
 *   TC_BASE_URL=https://robust-magic-production.up.railway.app \
 *   TC_API_KEY='(paste from Railway Variables)' \
 *   node scripts/tc-r4r-do-upload.mjs --address=Mahogany
 *
 * Or fix `.env` COMMAND_CENTER_KEY to match Railway, then:
 *
 *   node scripts/tc-r4r-do-upload.mjs --tx-id=42
 */

import https from 'node:https';
import process from 'node:process';

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

function parseArgs() {
  const out = { address: null, txId: null, dryRunUpload: false, days: 120 };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--address') out.address = process.argv[++i];
    else if (a.startsWith('--address=')) [, out.address] = a.split('=');
    else if (a === '--tx-id') out.txId = process.argv[++i];
    else if (a.startsWith('--tx-id=')) [, out.txId] = a.split('=');
    else if (a === '--dry-run-upload') out.dryRunUpload = true;
    else if (a.startsWith('--days=')) out.days = Number(a.split('=')[1]) || 120;
  }
  return out;
}

async function httpJson(base, pathname, { method = 'GET', apiKey, body = null } = {}) {
  const url = new URL(pathname.startsWith('/') ? pathname : `/${pathname}`, base.replace(/\/$/, '') + '/');
  const payload = body == null ? null : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      agent: insecureAgent,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = { ok: false, raw: text };
        }
        resolve({ status: res.statusCode || 0, data });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const args = parseArgs();
  const base =
    process.env.TC_BASE_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    'https://robust-magic-production.up.railway.app';
  const apiKey =
    process.env.TC_API_KEY ||
    process.env.COMMAND_CENTER_KEY ||
    process.env.API_KEY ||
    process.env.LIFEOS_KEY;

  if (!apiKey) {
    console.error(
      'Missing TC_API_KEY (or COMMAND_CENTER_KEY). Paste the same value as Railway COMMAND_CENTER_KEY.'
    );
    process.exit(1);
  }

  let txId = args.txId ? parseInt(String(args.txId), 10) : NaN;
  if (!Number.isFinite(txId)) {
    const { status, data } = await httpJson(base, '/api/v1/tc/transactions?limit=200', { apiKey });
    if (status === 401) {
      console.error(
        '401 Unauthorized: TC_API_KEY does not match production COMMAND_CENTER_KEY. Open Railway → Variables → copy COMMAND_CENTER_KEY into your shell.'
      );
      process.exit(1);
    }
    if (status !== 200 || !data.ok) {
      console.error('List transactions failed:', status, JSON.stringify(data));
      process.exit(1);
    }
    const rows = data.transactions || [];
    const needle = String(args.address || 'Mahogany').toLowerCase();
    const hit = rows.find((r) => String(r.address || '').toLowerCase().includes(needle));
    if (!hit) {
      console.error('No transaction with address containing:', needle);
      console.error(
        'Sample:',
        rows.slice(0, 8).map((r) => ({ id: r.id, address: r.address }))
      );
      process.exit(2);
    }
    txId = hit.id;
    console.error('Using transaction', txId, hit.address);
  }

  const scanBody = {
    upload_to_td: true,
    dry_run_upload: args.dryRunUpload,
    days: args.days,
    doc_type_prefix: 'R4R package',
    only_pdf: true,
  };

  const { status, data } = await httpJson(base, `/api/v1/tc/transactions/${txId}/r4r/scan`, {
    method: 'POST',
    apiKey,
    body: scanBody,
  });

  if (status === 401) {
    console.error(
      '401 Unauthorized: fix TC_API_KEY to match Railway COMMAND_CENTER_KEY, then retry.'
    );
    process.exit(1);
  }

  console.log(JSON.stringify({ http_status: status, ...data }, null, 2));

  if (!data.ok) process.exit(1);
  if (data.td_upload?.skipped) {
    console.error(
      'TD upload skipped: set transaction_desk_id on this TC file (TransactionDesk link) or fix td_upload.error in the JSON above.'
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
