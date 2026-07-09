#!/usr/bin/env node
/**
 * SYNOPSIS: Post-failure classifier proof — Wave 0 families including crash-loop / missing-module.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { classifyBuilderGap, classifyRuntimeFailure } from '../../services/builderos-gap-classifier.js';
import { classifyCodegenFailure } from '../../services/builderos-codegen-self-repair.js';

const cases = [
  {
    name: 'module_not_found_runtime',
    fn: () => classifyRuntimeFailure({ error: "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/usr/src/app/routes/go-vegas-outreach-routes.js'" }),
    expect: 'BOOT_IMPORT_MISSING',
  },
  {
    name: 'syntax_codegen',
    fn: () => classifyCodegenFailure({ error: 'SyntaxError: Unexpected token' }),
    expectPlaybook: 'SYNTAX_FAIL',
  },
  {
    name: 'deploy_stale',
    fn: () => classifyBuilderGap({ failure_reason: 'RAILWAY_STALE_DEPLOY proof stale' }),
    expect: 'DEPLOY_STALE',
  },
  {
    name: 'content_pin_drift',
    fn: () => classifyRuntimeFailure({ error: 'CONTENT pin sha256 mismatch for CONTENT/run-step.js' }),
    expect: 'VERIFIER_DRIFT',
  },
  {
    name: 'api_misuse_useful_work_guard',
    fn: () => classifyRuntimeFailure({ error: 'TypeError: createUsefulWorkGuard(...).shouldRun is not a function' }),
    expect: 'RUNTIME_API_MISUSE',
  },
  {
    name: 'artifact_proof_failed',
    fn: () => classifyRuntimeFailure({ error: 'artifact_proof_failed: export_declaration_missing:startGoVegasOutreachScheduler' }),
    expect: 'RUNTIME_API_MISUSE',
  },
];

let failed = 0;
for (const c of cases) {
  const r = c.fn();
  const got = r.failure_family || r.playbook || r.class;
  const ok = c.expect ? got === c.expect : got === c.expectPlaybook;
  console.log(ok ? 'PASS' : 'FAIL', c.name, got);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`POST-FAILURE CLASSIFIER: ${failed} FAILED`);
  process.exit(1);
}
console.log('POST-FAILURE CLASSIFIER: PASS');
process.exit(0);
