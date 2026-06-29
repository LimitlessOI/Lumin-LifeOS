/**
 * SYNOPSIS: @ssot docs/products/builderos/PRODUCT_HOME.md
 */
// @ssot docs/products/builderos/PRODUCT_HOME.md

import { fileURLToPath } from 'url';
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';

const CORRECTION_CLAUSES = {
  STUB: 'CRITICAL: This is a new file. Do NOT generate a stub or placeholder. Write complete working implementation, minimum 60 lines of real code. Do not write TODO, PLACEHOLDER, or not-implemented comments. Every function must have a real body.',
  SYNTAX: 'CRITICAL: Do not write regex literals (/pattern/flags syntax). Use string.includes() or string.startsWith() for all pattern matching. List every import at the top. Every import must actually be used in the function bodies.',
  SEMANTIC_SILENT: 'CRITICAL: The main exported function MUST be called unconditionally at module bottom as the CLI entry point. Pattern required as last lines: const result = myFunction(); console.log(JSON.stringify(result, null, 2));',
  ANTIPATTERN: 'CRITICAL: Name factory parameter requireKey not rk. Do not use pool.query with backtick template syntax. Create router variable inside the factory function body, not at module level. Do not import from startup/db.js or startup/auth.js paths.',
  MISSING_IMPORT: 'CRITICAL: List every import at the top of the file. Every function you call must be imported. writeFileSync must be imported from fs if used. Do not call any function that is not imported.',
};

function readPayload(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

async function buildRetrySpec(originalSpec, failureType) {
  const correctionClause = CORRECTION_CLAUSES[failureType];
  if (correctionClause) {
    return correctionClause + '\nORIGINAL SPEC: ' + originalSpec;
  } else {
    return originalSpec;
  }
}

async function callBuilder(payload) {
  const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
  const COMMAND_CENTER_KEY = process.env.COMMAND_CENTER_KEY;
  try {
    const response = await fetch(PUBLIC_BASE_URL + '/api/v1/lifeos/builder/build', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-command-key': COMMAND_CENTER_KEY,
      },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function runVerification(targetFile) {
  // Pull committed content before checking — builder commits to GitHub,
  // local filesystem is stale until pulled.
  spawnSync('git', ['pull', 'origin', 'main'], { stdio: 'pipe' });
  const result = spawnSync('node', ['--check', targetFile], { stdio: 'pipe' });
  return { syntaxOk: result.status === 0, stderr: result.stderr?.toString().trim() };
}

async function runRetry(payloadFile, failureType) {
  const payload = readPayload(payloadFile);
  if (!payload) {
    console.error('ERROR: cannot read payload file');
    return { ok: false, error: 'payload_read_failed' };
  }
  const retrySpec = await buildRetrySpec(payload.spec, failureType);
  const retryPayload = {
    domain: payload.domain,
    task: payload.task,
    spec: retrySpec,
    target_file: payload.target_file,
    commit_message: payload.commit_message + ' [retry:' + failureType + ']',
  };
  const result = await callBuilder(retryPayload);
  if (!result.ok) {
    return { ok: false, stage: 'builder_call', error: result.error };
  }
  if (!result.committed) {
    return { ok: false, stage: 'builder_commit', raw: result };
  }
  const verification = await runVerification(payload.target_file);
  const resultObj = {
    ok: verification.syntaxOk,
    retry_attempted: true,
    failure_type: failureType,
    commit_sha: result.commit_sha,
    committed: result.committed,
    model_used: result.model_used,
    syntax_ok: verification.syntaxOk,
    correction_applied: CORRECTION_CLAUSES[failureType] ? true : false,
  };
  writeFileSync(
    join(fileURLToPath(import.meta.url), '../../data/last-retry-result.json'),
    JSON.stringify(resultObj, null, 2),
  );
  return resultObj;
}

const payloadFile = process.argv[2];
const failureType = process.argv[3];
if (!payloadFile || !failureType) {
  console.error('Usage: node scripts/builderos-builder-retry-plan.mjs <payload-file> <STUB|SYNTAX|SEMANTIC_SILENT|ANTIPATTERN|MISSING_IMPORT>');
  process.exit(1);
}
runRetry(payloadFile, failureType).then(r => {
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});