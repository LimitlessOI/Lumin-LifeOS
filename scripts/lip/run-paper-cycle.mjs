/**
 * SYNOPSIS: One paper cycle: ensure 100 accounts + scan candidates + log assignment plan
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * One paper cycle: ensure 100 accounts + scan candidates + log assignment plan
 */
import { loadAccounts, seedAccounts, appendJsonl } from './lib/accounts.mjs';
import { EVENTS_PATH } from './lib/paths.mjs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runNode(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, script)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      err += d;
    });
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(err || out || `exit ${code}`));
      else resolve(out);
    });
  });
}

async function main() {
  const fleet = loadAccounts() || seedAccounts({ count: 100 });
  const scanOut = await runNode('scan-pumps.mjs');
  const scan = JSON.parse(scanOut);
  const top = (scan.top || []).slice(0, 5);

  const plan = top.map((c, i) => {
    const accounts = fleet.accounts.slice(i * 8, i * 8 + 8).map((a) => a.id);
    return {
      symbol: c.symbol,
      label: c.label,
      score: c.score,
      paper_accounts: accounts,
      action: 'paper_watch_only',
    };
  });

  appendJsonl(EVENTS_PATH, {
    at: new Date().toISOString(),
    event: 'paper_cycle',
    candidates: top.length,
    plan,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        accounts: fleet.count,
        candidates: top.length,
        plan,
        note: 'No live orders. Paper identify + assign only.',
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err.message || err) }));
  process.exit(1);
});
