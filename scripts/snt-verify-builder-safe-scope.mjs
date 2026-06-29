#!/usr/bin/env node
/**
 * SYNOPSIS: SNT verify — builder safe-scope fail-fast + mission pack path.
 * SNT verify — builder safe-scope fail-fast + mission pack path.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { isSafeTarget, SAFE_WRITE_PATHS } from '../config/builder-safe-scope.js';

let failed = 0;
function ok(label, cond) {
  if (cond) console.log(`OK: ${label}`);
  else {
    console.error(`FAIL: ${label}`);
    failed += 1;
  }
}

console.log('=== SNT Builder Safe-Scope Verify ===\n');

ok('builderos-reboot/MISSIONS/ in SAFE_WRITE_PATHS', SAFE_WRITE_PATHS.includes('builderos-reboot/MISSIONS/'));
ok(
  'mission BLUEPRINT path is safe',
  isSafeTarget('builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/BLUEPRINT.json'),
);
ok('server.js still blocked', !isSafeTarget('server.js'));
ok('scripts/ still safe', isSafeTarget('scripts/foo.mjs'));

console.log(failed ? `\nSNT_SAFE_SCOPE_FAIL (${failed})` : '\nSNT_SAFE_SCOPE_PASS');
process.exit(failed ? 1 : 0);
