/**
 * SYNOPSIS: CLI to replay a receipt against reality with the Receipt Auditor.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { auditReceipt, replaySample } from '../services/receipt-auditor.mjs';

function usage() {
  console.error('Usage: node scripts/replay-receipt.mjs --sample');
  console.error('       node scripts/replay-receipt.mjs <path-to-receipt.json>');
  process.exit(2);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) usage();

  let result;
  if (args[0] === '--sample') {
    result = await replaySample({ repoRoot: process.cwd() });
  } else if (args[0].startsWith('-')) {
    usage();
  } else {
    result = await auditReceipt(args[0], { repoRoot: process.cwd(), skip_git_checkout: true });
  }

  console.log(JSON.stringify(result, null, 2));

  if (!result.audit_completed || result.replay_verdict === 'FAIL') {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(JSON.stringify({ replay_verdict: 'UNREPRODUCIBLE', audit_completed: false, stderr: err.message }));
  process.exit(1);
});
