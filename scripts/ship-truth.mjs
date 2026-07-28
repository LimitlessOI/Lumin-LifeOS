/**
 * SYNOPSIS: Ship files and prove production runs them — or report UNSOLVED.
 *
 * The one ship command. Replaces the two-step
 * `system:commit-files` + `system:railway:redeploy` dance, which could report
 * success at three points where production had proven nothing:
 *
 *   1. It read WORKING-TREE bytes and committed them to `main` with no check
 *      that local was aligned, so a stale file could silently revert `main`.
 *   2. It trusted the builder's own `changed_files` list as commit proof, never
 *      re-reading what actually landed.
 *   3. It declared SHA parity from ONE observation, so parity announced while a
 *      newer deployment sat QUEUED behind it counted as "deployed" (observed
 *      live 2026-07-28: parity claimed for 6d63035c63f8 while Railway had
 *      d275740392b0 queued).
 *
 * Every phase here is fail-closed and every claim is backed by a source outside
 * the thing being checked: git for commits, Railway for builds, HTTP for
 * runtime. When a dimension cannot be proven the verdict is UNSOLVED (exit 3),
 * never success.
 *
 * Usage:
 *   node scripts/ship-truth.mjs --message "msg" -- path/one.js docs/products/x/PRODUCT_HOME.md
 *   node scripts/ship-truth.mjs --message "msg" --probe probes.json -- routes/foo.js
 *
 * Flags:
 *   --message, -m     commit message (required)
 *   --branch, -b      deploy branch (default main)
 *   --probe <file>    JSON runtime assertions; required to prove server-code ships
 *   --allow-partial   accept that local commits touch files this ship omits
 *   --allow-inflight  do not refuse to ship while a deployment is in flight
 *   --dry-run         run every pre-commit gate and stop before committing
 *   --no-deploy       commit + verify the commit only (verdict stays UNSOLVED)
 *   --wait-ms         max wait for build + parity (default 900000)
 *   --settle-ms       gap between stability samples (default 15000)
 *   --samples         stability samples required after parity (default 3)
 *   --json            print only the receipt
 *
 * Exit: 0 PROVEN · 1 DRIFT · 2 usage/env · 3 UNSOLVED
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

import {
  CHECK_STATUS,
  EXIT,
  VERDICT,
  assessBranchDivergence,
  assessParityStability,
  buildReceipt,
  classifyRuntimeProof,
  dockerImageMembership,
  exitCodeForVerdict,
  isDeploymentInFlight,
  missingSolutions,
  parseDockerignore,
  RUNTIME_PROOF,
} from './lib/deploy-truth-guard.mjs';
import {
  aheadBehind,
  blobSha256AtCommit,
  commitChangedFiles,
  commitExistsLocally,
  currentBranch,
  deploymentLogTail,
  diffNamesThreeDot,
  diffNumstatVsRef,
  dirtyPaths,
  executeBatch,
  fetchAssetSha256,
  gitFetch,
  isAncestor,
  latestDeployment,
  probeReady,
  revParse,
  runProbe,
  runtimeIdentity,
  sha256,
  sleep,
  triggerBuildFromLatest,
} from './lib/deploy-truth-io.mjs';
import { assessShip } from './system-commit-files.mjs';

const REPO_ROOT = process.cwd();
const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|pdf|mp4|mov|zip|wasm)$/i;

const base = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  ''
).replace(/\/$/, '');

const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  '';

function usage(code = EXIT.USAGE) {
  console.error(
    'Usage: node scripts/ship-truth.mjs --message "msg" [--probe probes.json] -- <repo-relative-paths…>',
  );
  process.exit(code);
}

function parseArgs(argv) {
  const out = {
    message: '',
    branch: 'main',
    probeFile: '',
    allowPartial: false,
    allowInflight: false,
    dryRun: false,
    deploy: true,
    waitMs: Number(process.env.SHIP_TRUTH_WAIT_MS || 900_000),
    settleMs: Number(process.env.SHIP_TRUTH_SETTLE_MS || 15_000),
    samples: Number(process.env.SHIP_TRUTH_SAMPLES || 3),
    json: false,
    paths: [],
  };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--message' || a === '-m') out.message = String(argv[++i] || '').trim();
    else if (a === '--branch' || a === '-b') out.branch = String(argv[++i] || 'main').trim();
    else if (a === '--probe') out.probeFile = String(argv[++i] || '').trim();
    else if (a === '--allow-partial') out.allowPartial = true;
    else if (a === '--allow-inflight') out.allowInflight = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--no-deploy') out.deploy = false;
    else if (a === '--wait-ms') out.waitMs = Number(argv[++i]);
    else if (a === '--settle-ms') out.settleMs = Number(argv[++i]);
    else if (a === '--samples') out.samples = Number(argv[++i]);
    else if (a === '--json') out.json = true;
    else if (a === '--help' || a === '-h') usage(0);
    else if (a === '--') {
      out.paths.push(...argv.slice(i + 1).filter(Boolean));
      break;
    } else if (a.startsWith('-')) {
      console.error(`Unknown flag: ${a}`);
      usage();
    } else out.paths.push(a);
    i += 1;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const log = (...m) => {
  if (!args.json) console.log(...m);
};

const checks = [];
function record(id, status, detail, extra = {}) {
  checks.push({ id, status, detail, ...extra });
  const glyph = { pass: '  ok  ', fail: ' FAIL ', unproven: 'UNPROVN', skip: ' skip ' }[status] || status;
  log(`[${glyph}] ${id} — ${detail}`);
  return checks[checks.length - 1];
}

function writeReceipt(receipt) {
  const dir = path.join(REPO_ROOT, 'products/receipts');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'DEPLOY_TRUTH_VERIFY.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  fs.appendFileSync(path.join(dir, 'DEPLOY_TRUTH_LEDGER.jsonl'), `${JSON.stringify(receipt)}\n`);
  return path.join('products/receipts', 'DEPLOY_TRUTH_VERIFY.json');
}

function finish(receipt) {
  const receiptPath = writeReceipt(receipt);
  const gaps = missingSolutions(receipt.checks);
  if (gaps.length > 0) {
    receipt.solution_discipline_violation = gaps;
    writeReceipt(receipt);
  }
  if (args.json) {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    log(`\n${receipt.human_summary}`);
    log(`receipt: ${receiptPath}`);
    for (const c of receipt.checks.filter((x) => x.status !== CHECK_STATUS.PASS && x.proposed_solution)) {
      log(`  → ${c.id}: ${c.proposed_solution}`);
    }
  }
  process.exit(exitCodeForVerdict(receipt.verdict));
}

function bail({ commitSha = null, servedSha = null, files = [], deployment = null, identity = null, extra = {} } = {}) {
  finish(
    buildReceipt({
      command: 'ship-truth',
      base,
      branch: args.branch,
      commitSha,
      servedSha,
      checks,
      files,
      deployment,
      identity,
      extra: { commit_message: args.message, ...extra },
    }),
  );
}

async function main() {
  if (!args.message || args.paths.length === 0) usage();
  if (!base || !key) {
    console.error('Set PUBLIC_BASE_URL and COMMAND_CENTER_KEY before shipping.');
    process.exit(EXIT.USAGE);
  }

  // ── Phase 0: paths + image membership (D5) ─────────────────────────────────
  log(`\n── ship-truth → ${base} (branch ${args.branch}) ──\n`);

  const dockerRules = parseDockerignore(
    fs.existsSync(path.join(REPO_ROOT, '.dockerignore'))
      ? fs.readFileSync(path.join(REPO_ROOT, '.dockerignore'), 'utf8')
      : '',
  );

  const files = [];
  for (const raw of args.paths) {
    const rel = String(raw).replace(/^\.\//, '').replace(/\\/g, '/');
    if (rel.includes('..') || path.isAbsolute(rel)) {
      record('paths.safe', CHECK_STATUS.FAIL, `Refusing unsafe path: ${raw}`, {
        proposed_solution: 'Pass repo-relative paths without ".." segments.',
      });
      bail();
    }
    const abs = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      record('paths.exist', CHECK_STATUS.FAIL, `Not a regular file: ${rel}`, {
        proposed_solution: `Create ${rel} or remove it from the ship list.`,
      });
      bail();
    }
    const bytes = fs.readFileSync(abs);
    const membership = dockerImageMembership(rel, dockerRules);
    const proof = classifyRuntimeProof(rel, { inImage: membership.in_image });
    files.push({
      target_file: rel,
      local_sha256: sha256(bytes),
      bytes: bytes.length,
      in_image: membership.in_image,
      dockerignore_rule: membership.matched_rule,
      runtime_proof_kind: proof.kind,
      runtime_proof_url: proof.url_path || null,
      runtime_proof_note: proof.proposed_solution || null,
      payload: BINARY_EXT.test(rel)
        ? { target_file: rel, output: bytes.toString('base64'), encoding: 'base64' }
        : { target_file: rel, output: bytes.toString('utf8'), encoding: 'utf-8' },
    });
  }

  const notInImage = files.filter((f) => !f.in_image);
  record(
    'image.membership',
    CHECK_STATUS.PASS,
    notInImage.length === 0
      ? `all ${files.length} path(s) land in the production image`
      : `${notInImage.length}/${files.length} path(s) are excluded from the image by .dockerignore (${notInImage
          .map((f) => `${f.target_file} via ${f.dockerignore_rule}`)
          .join('; ')}) — repo-only, no runtime effect`,
    { paths_excluded_from_image: notInImage.map((f) => f.target_file) },
  );

  // ── Phase 0b: branch divergence (D1/D2) ────────────────────────────────────
  const fetched = gitFetch('origin', args.branch);
  if (!fetched.ok) {
    record('git.fetch', CHECK_STATUS.FAIL, `git fetch origin ${args.branch} failed: ${fetched.detail}`, {
      proposed_solution: 'Restore git remote access (credentials/network), then re-run. Commit truth cannot be verified without it.',
    });
    bail({ files });
  }
  record('git.fetch', CHECK_STATUS.PASS, `fetched origin/${args.branch}`);

  const localHead = revParse('HEAD');
  const remoteHead = revParse(`origin/${args.branch}`);
  const local = currentBranch();
  const { ahead, behind } = aheadBehind(`origin/${args.branch}`);
  const shipPaths = files.map((f) => f.target_file);
  const divergence = assessBranchDivergence({
    branch: args.branch,
    localBranch: local,
    ahead,
    behind,
    behindFiles: diffNamesThreeDot('HEAD', `origin/${args.branch}`),
    aheadFiles: diffNamesThreeDot(`origin/${args.branch}`, 'HEAD'),
    shipPaths,
    allowPartial: args.allowPartial,
  });
  record('branch.divergence', divergence.status, divergence.detail, {
    reason: divergence.reason,
    local_branch: local,
    local_head: localHead,
    remote_head: remoteHead,
    ahead,
    behind,
    clobbered_files: divergence.clobbered_files,
    stranded_files: divergence.stranded_files,
    ...(divergence.proposed_solution ? { proposed_solution: divergence.proposed_solution } : {}),
  });
  if (divergence.status === CHECK_STATUS.FAIL) bail({ files });

  const dirtyOutside = dirtyPaths().filter((p) => !shipPaths.includes(p));
  record(
    'worktree.state',
    CHECK_STATUS.PASS,
    dirtyOutside.length === 0
      ? 'working tree carries no changes outside the ship list'
      : `${dirtyOutside.length} uncommitted file(s) outside this ship stay local and unproven: ${dirtyOutside.slice(0, 10).join(', ')}${dirtyOutside.length > 10 ? ` (+${dirtyOutside.length - 10})` : ''}`,
    { uncommitted_outside_ship: dirtyOutside },
  );

  // A shipped path can hold edits made outside this session, so state the size
  // of what each one carries rather than letting it ride along unnamed.
  let carriedAdded = 0;
  let carriedRemoved = 0;
  for (const f of files) {
    const delta = diffNumstatVsRef(`origin/${args.branch}`, f.target_file);
    f.diff_vs_branch = delta;
    carriedAdded += delta.added;
    carriedRemoved += delta.removed;
  }
  record(
    'worktree.ship_payload',
    CHECK_STATUS.PASS,
    `this ship carries +${carriedAdded}/-${carriedRemoved} line(s) vs origin/${args.branch}: ${files
      .map((f) => `${f.target_file} (+${f.diff_vs_branch.added}/-${f.diff_vs_branch.removed}${f.diff_vs_branch.new_file ? ' new' : ''})`)
      .join(', ')}`,
    { lines_added: carriedAdded, lines_removed: carriedRemoved },
  );

  // ── Phase 0c: runtime identity + pre-state (D8/D7) ─────────────────────────
  const identity = await runtimeIdentity(base, key);
  const host = new URL(base).host;
  if (identity.ok && identity.hosts.length > 0) {
    const attached = identity.hosts.includes(host);
    record(
      'runtime.identity',
      attached ? CHECK_STATUS.PASS : CHECK_STATUS.FAIL,
      attached
        ? `${host} is attached to Railway service ${identity.service_id?.slice(0, 8)} env ${identity.environment_id?.slice(0, 8)} — the URL verified is the service deployed`
        : `${host} is NOT among the domains of the service this script deploys (${identity.hosts.join(', ')}) — verification would describe a different app`,
      {
        project_id: identity.project_id,
        service_id: identity.service_id,
        environment_id: identity.environment_id,
        hosts: identity.hosts,
        ...(attached ? {} : { proposed_solution: `Point PUBLIC_BASE_URL at one of: ${identity.hosts.join(', ')}` }),
      },
    );
    if (!attached) bail({ files, identity });
  } else {
    record('runtime.identity', CHECK_STATUS.UNPROVEN, `could not read service identity (HTTP ${identity.status}${identity.error ? `: ${identity.error}` : ''})`, {
      proposed_solution:
        'Ensure RAILWAY_PROJECT_ID / RAILWAY_SERVICE_ID / RAILWAY_ENVIRONMENT_ID are set in the Railway vault so GET /api/v1/railway/managed-env/custom-domains can prove which service answers this URL.',
    });
  }

  const preReady = await probeReady(base, key);
  const preDeployment = await latestDeployment(base, key);
  if (preReady.status !== 200) {
    record('pre.ready', CHECK_STATUS.FAIL, `GET /builder/ready returned ${preReady.status}${preReady.error ? ` (${preReady.error})` : ''}`, {
      proposed_solution: 'Production is not answering the readiness surface — fix that before shipping, or the deploy cannot be verified at all.',
    });
    bail({ files, identity });
  }
  record('pre.ready', CHECK_STATUS.PASS, `production alive, serving ${preReady.served_sha?.slice(0, 12) || 'unknown'} (profile ${preReady.runtime_profile})`, {
    pre_served_sha: preReady.served_sha,
    runtime_profile: preReady.runtime_profile,
  });

  const preFlight = isDeploymentInFlight(preDeployment.deployment?.status);
  if (preFlight && !args.allowInflight) {
    record('pre.no_race', CHECK_STATUS.FAIL, `a deployment is already in flight (${preDeployment.deployment.status}, commit ${preDeployment.deployment.commit_sha?.slice(0, 12)}) — shipping now races it`, {
      deployment: preDeployment.deployment,
      proposed_solution: 'Wait for the in-flight deployment to reach SUCCESS and re-run, or pass --allow-inflight to accept a racy verification window on purpose.',
    });
    bail({ files, identity, deployment: preDeployment.deployment });
  }
  record('pre.no_race', preFlight ? CHECK_STATUS.SKIP : CHECK_STATUS.PASS, preFlight ? 'in-flight deployment accepted via --allow-inflight' : `no deployment in flight (latest ${preDeployment.deployment?.status || 'unknown'})`, {
    deployment: preDeployment.deployment,
  });

  if (args.dryRun) {
    record('commit.landed', CHECK_STATUS.UNPROVEN, '--dry-run: every pre-commit gate passed, but nothing was committed and production is unchanged', {
      would_commit: shipPaths,
      proposed_solution: 'Re-run without --dry-run to actually ship and prove it.',
    });
    bail({ files, identity, deployment: preDeployment.deployment });
  }

  // ── Phase 1: commit ────────────────────────────────────────────────────────
  log('\n── commit ──');
  const res = await executeBatch(base, key, {
    files: files.map((f) => f.payload),
    commitMessage: args.message,
    branch: args.branch,
  });
  const body = res.json || {};

  if (!res.ok || body.ok !== true || body.committed !== true) {
    record('commit.landed', CHECK_STATUS.FAIL, `execute-batch did not commit (HTTP ${res.status}; ${body.reason || body.error || res.raw || 'no reason given'})`, {
      response: body,
      proposed_solution:
        body.reason === 'NO_OP_NOTHING_TO_COMMIT'
          ? 'Every shipped file already matches the branch — nothing to ship. Change the files or drop the ship.'
          : 'Read the reason above; if it is a GitHub rate limit, wait for the window to reset and re-run — do not report a ship that did not land.',
    });
    bail({ files, identity, deployment: preDeployment.deployment, extra: { execute_batch: body } });
  }

  const commitSha = body.commit_sha || body.sha || null;
  const shipAssessment = assessShip(shipPaths, body);
  if (!shipAssessment.ok) {
    record('commit.all_files_changed', CHECK_STATUS.FAIL, `commit ${String(commitSha).slice(0, 12)} landed but these paths did not actually change: ${shipAssessment.unchanged.join(', ')}`, {
      unchanged_files: shipAssessment.unchanged,
      proposed_solution: 'Those files already matched the branch. Remove them from the ship list or make the intended edit — they must not be reported as shipped.',
    });
    bail({ commitSha, files, identity, deployment: preDeployment.deployment });
  }
  record('commit.landed', CHECK_STATUS.PASS, `execute-batch committed ${String(commitSha).slice(0, 12)} (mode ${body.commit_mode})`, {
    commit_mode: body.commit_mode,
    builder_changed_files: body.changed_files || null,
  });

  // ── Phase 2: independent commit verification (D3/D4) ───────────────────────
  log('\n── verify commit against git ──');
  const refetch = gitFetch('origin', args.branch);
  if (!refetch.ok || !commitExistsLocally(commitSha)) {
    // The ref may not carry the commit yet; fetch it directly.
    gitFetch('origin', commitSha);
  }
  if (!commitExistsLocally(commitSha)) {
    record('commit.exists_on_remote', CHECK_STATUS.FAIL, `commit ${String(commitSha).slice(0, 12)} is not fetchable from origin — the builder reported a commit git cannot find`, {
      proposed_solution: 'Treat the ship as failed and re-run. A commit SHA that origin cannot serve is the exact false-claim shape this gate exists to catch.',
    });
    bail({ commitSha, files, identity });
  }
  record('commit.exists_on_remote', CHECK_STATUS.PASS, `git fetched ${String(commitSha).slice(0, 12)} from origin`);

  const onBranch = isAncestor(commitSha, `origin/${args.branch}`);
  record('commit.on_deploy_branch', onBranch ? CHECK_STATUS.PASS : CHECK_STATUS.FAIL, onBranch ? `${String(commitSha).slice(0, 12)} is reachable from origin/${args.branch}` : `${String(commitSha).slice(0, 12)} is NOT reachable from origin/${args.branch} — it landed somewhere else and will never deploy`, {
    ...(onBranch ? {} : { proposed_solution: `The builder committed to a different branch (check GITHUB_DEPLOY_BRANCH in the Railway vault; it must be ${args.branch}). Re-ship once it targets ${args.branch}.` }),
  });
  if (!onBranch) bail({ commitSha, files, identity });

  const contentMismatches = [];
  for (const f of files) {
    const blob = blobSha256AtCommit(commitSha, f.target_file);
    f.committed_sha256 = blob.sha256;
    f.commit_content_verified = blob.ok && blob.sha256 === f.local_sha256;
    if (!f.commit_content_verified) {
      contentMismatches.push(`${f.target_file} (sent ${f.local_sha256.slice(0, 12)}, commit has ${blob.sha256?.slice(0, 12) || 'nothing'})`);
    }
  }
  record('commit.content_matches', contentMismatches.length === 0 ? CHECK_STATUS.PASS : CHECK_STATUS.FAIL, contentMismatches.length === 0 ? `all ${files.length} blob(s) in ${String(commitSha).slice(0, 12)} hash-match the bytes sent` : `commit does not contain the bytes sent: ${contentMismatches.join('; ')}`, {
    ...(contentMismatches.length === 0
      ? {}
      : { proposed_solution: 'The commit content differs from what was sent (encoding or a concurrent write). Re-ship and, if it repeats, inspect commitManyToGitHub blob construction in services/deployment-service.js.' }),
  });
  if (contentMismatches.length > 0) bail({ commitSha, files, identity });

  const extraFiles = commitChangedFiles(commitSha).filter((p) => !shipPaths.includes(p));
  record('commit.no_extra_files', CHECK_STATUS.PASS, extraFiles.length === 0 ? 'commit touched only the requested paths' : `commit also touched ${extraFiles.length} path(s) not in the ship list: ${extraFiles.slice(0, 10).join(', ')}`, {
    unrequested_files: extraFiles,
  });

  if (!args.deploy) {
    record('deploy.triggered', CHECK_STATUS.UNPROVEN, '--no-deploy: the commit is verified but production still runs older code', {
      proposed_solution: 'Re-run without --no-deploy (or run npm run system:railway:redeploy) and then npm run deploy:truth:audit to prove production serves it.',
    });
    bail({ commitSha, files, identity, deployment: preDeployment.deployment });
  }

  // ── Phase 3: deploy ────────────────────────────────────────────────────────
  log('\n── deploy ──');
  const trigger = await triggerBuildFromLatest(base, key, commitSha);
  if (!trigger.ok || trigger.json?.ok !== true) {
    record('deploy.triggered', CHECK_STATUS.FAIL, `build-from-latest failed (HTTP ${trigger.status}: ${trigger.json?.error || trigger.raw})`, {
      proposed_solution: 'Confirm RAILWAY_TOKEN / RAILWAY_SERVICE_ID in the Railway vault, then re-trigger. The commit is on the branch, so only the deploy needs re-running.',
    });
    bail({ commitSha, files, identity, deployment: preDeployment.deployment });
  }
  record('deploy.triggered', CHECK_STATUS.PASS, `Railway build requested for ${String(commitSha).slice(0, 12)}`);

  // ── Phase 4: build verification (D6) ───────────────────────────────────────
  const deadline = Date.now() + args.waitMs;
  let built = null;
  let buildFailure = null;
  while (Date.now() < deadline) {
    const latest = await latestDeployment(base, key);
    const dep = latest.deployment;
    if (dep) {
      const carriesOurs = dep.commit_sha ? isAncestor(commitSha, dep.commit_sha) || dep.commit_sha === commitSha : false;
      log(`  deployment=${dep.status} commit=${dep.commit_sha?.slice(0, 12) || '?'} carries_ours=${carriesOurs}`);
      if (dep.status === 'FAILED' && carriesOurs) {
        buildFailure = { deployment: dep, logs: await deploymentLogTail(base, key, dep.id, 40) };
        break;
      }
      if (dep.status === 'SUCCESS' && carriesOurs) {
        built = dep;
        break;
      }
    }
    await sleep(10_000);
  }

  if (buildFailure) {
    record('build.success', CHECK_STATUS.FAIL, `Railway build for ${buildFailure.deployment.commit_sha?.slice(0, 12)} FAILED`, {
      deployment: buildFailure.deployment,
      log_tail: buildFailure.logs.slice(-15),
      proposed_solution: 'Read log_tail, fix the build error, and re-ship. The commit is on the branch but production still runs the previous image.',
    });
    bail({ commitSha, files, identity, deployment: buildFailure.deployment });
  }
  if (!built) {
    record('build.success', CHECK_STATUS.UNPROVEN, `no SUCCESS deployment carrying ${String(commitSha).slice(0, 12)} within ${Math.round(args.waitMs / 1000)}s`, {
      proposed_solution: 'Raise --wait-ms, or inspect GET /api/v1/railway/managed-env/deployments/latest. The commit is on the branch; nothing may claim it is live yet.',
    });
    bail({ commitSha, files, identity, deployment: preDeployment.deployment });
  }
  record('build.success', CHECK_STATUS.PASS, `Railway deployment ${built.id?.slice(0, 8)} SUCCESS carrying ${built.commit_sha?.slice(0, 12)}`, {
    deployment: built,
  });

  // ── Phase 5: runtime parity + stability (D7/D9) ────────────────────────────
  log('\n── prove production serves it ──');
  let servedSha = null;
  let parityReached = false;
  while (Date.now() < deadline) {
    const ready = await probeReady(base, key);
    servedSha = ready.served_sha;
    const serves = servedSha ? servedSha === commitSha || isAncestor(commitSha, servedSha) : false;
    log(`  ready=${ready.status} served=${servedSha?.slice(0, 12) || '?'} serves_ours=${serves}`);
    if (serves) {
      parityReached = true;
      break;
    }
    await sleep(10_000);
  }

  if (!parityReached) {
    record('runtime.parity', CHECK_STATUS.UNPROVEN, `production still serves ${servedSha?.slice(0, 12) || 'unknown'}, which does not contain ${String(commitSha).slice(0, 12)}`, {
      served_sha: servedSha,
      proposed_solution: 'The build succeeded but the running container has not advanced. Re-check with npm run deploy:truth:audit; if it stays behind, redeploy the service and inspect the container start logs.',
    });
    bail({ commitSha, servedSha, files, identity, deployment: built });
  }
  record('runtime.parity', CHECK_STATUS.PASS, `production serves ${servedSha?.slice(0, 12)}, which contains ${String(commitSha).slice(0, 12)}`, { served_sha: servedSha });

  const samples = [];
  for (let i = 0; i < Math.max(1, args.samples); i += 1) {
    if (i > 0) await sleep(args.settleMs);
    const ready = await probeReady(base, key);
    const latest = await latestDeployment(base, key);
    const s = {
      at: new Date().toISOString(),
      served_sha: ready.served_sha,
      serves_commit: ready.served_sha ? ready.served_sha === commitSha || isAncestor(commitSha, ready.served_sha) : false,
      deployment_status: latest.deployment?.status || null,
      in_flight: isDeploymentInFlight(latest.deployment?.status),
    };
    samples.push(s);
    log(`  sample ${i + 1}/${args.samples}: served=${s.served_sha?.slice(0, 12) || '?'} serves_ours=${s.serves_commit} deployment=${s.deployment_status}`);
  }
  const stability = assessParityStability(samples, { requiredSamples: Math.max(1, args.samples) });
  record('runtime.stability', stability.status, stability.detail, {
    samples,
    ...(stability.proposed_solution ? { proposed_solution: stability.proposed_solution } : {}),
  });

  // ── Phase 6: runtime content proof per path ────────────────────────────────
  const staticTargets = files.filter((f) => f.runtime_proof_kind === RUNTIME_PROOF.HTTP_STATIC);
  for (const f of staticTargets) {
    const live = await fetchAssetSha256(`${base}${f.runtime_proof_url}`);
    f.live_sha256 = live.sha256;
    const matched = live.ok && live.sha256 === f.local_sha256;
    record(`runtime.content:${f.target_file}`, matched ? CHECK_STATUS.PASS : CHECK_STATUS.UNPROVEN, matched ? `${base}${f.runtime_proof_url} serves the exact bytes shipped (sha256 ${live.sha256.slice(0, 12)})` : `${f.runtime_proof_url} returned HTTP ${live.status} with sha256 ${live.sha256?.slice(0, 12) || 'none'}, not the shipped ${f.local_sha256.slice(0, 12)}`, {
      url: `${base}${f.runtime_proof_url}`,
      shipped_sha256: f.local_sha256,
      live_sha256: live.sha256,
      ...(matched
        ? {}
        : {
            proposed_solution: `Fetch ${base}${f.runtime_proof_url} and diff against the local file. A CDN/edge cache is the usual cause — purge it, or verify the static mount actually serves ${f.target_file}.`,
          }),
    });
  }

  const probeRequired = files.filter((f) => f.runtime_proof_kind === RUNTIME_PROOF.BEHAVIOR_PROBE_REQUIRED);
  let probes = [];
  if (args.probeFile) {
    const parsed = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, args.probeFile), 'utf8'));
    probes = Array.isArray(parsed) ? parsed : parsed.probes || [];
  }

  if (probeRequired.length > 0 && probes.length === 0) {
    record('runtime.behavior', CHECK_STATUS.UNPROVEN, `${probeRequired.length} server-code path(s) shipped with no runtime assertion: ${probeRequired.map((f) => f.target_file).join(', ')}. A matching deploy SHA is a build-time label, so the loaded bytes stay unproven.`, {
      paths: probeRequired.map((f) => f.target_file),
      proposed_solution:
        'Re-run with --probe probes.json declaring an assertion only the new code can satisfy, e.g. [{"name":"tc send","path":"/api/v1/tc/email/send-as-founder","method":"POST","body":{"dry_run":true},"expect_body":"<new marker>"}].',
    });
  } else if (probes.length > 0) {
    const results = [];
    for (const p of probes) results.push(await runProbe(base, key, p));
    const failedProbes = results.filter((r) => !r.ok);
    record('runtime.behavior', failedProbes.length === 0 ? CHECK_STATUS.PASS : CHECK_STATUS.FAIL, failedProbes.length === 0 ? `${results.length} runtime assertion(s) satisfied by the running code` : `${failedProbes.length}/${results.length} runtime assertion(s) failed: ${failedProbes.map((r) => `${r.name} (HTTP ${r.status})`).join(', ')}`, {
      probes: results,
      ...(failedProbes.length === 0
        ? {}
        : { proposed_solution: 'Production serves the commit but does not behave as the new code should. Inspect the failing assertion — this is real runtime drift, not a verification artifact.' }),
    });
  } else {
    record('runtime.behavior', CHECK_STATUS.SKIP, 'no server-code paths shipped and no probes declared');
  }

  const unprovable = files.filter(
    (f) => f.runtime_proof_kind === RUNTIME_PROOF.NO_RUNTIME_SURFACE || f.runtime_proof_kind === RUNTIME_PROOF.NOT_IN_IMAGE,
  );
  if (unprovable.length > 0) {
    record('runtime.content_unverifiable', CHECK_STATUS.PASS, `${unprovable.length} path(s) have no HTTP-verifiable surface, so the commit is proven live but their bytes are not individually verified: ${unprovable.map((f) => f.target_file).join(', ')}`, {
      paths: unprovable.map((f) => f.target_file),
    });
  }

  // ── Phase 7: route-surface regression ──────────────────────────────────────
  const surfaceProbes = ['/healthz', '/api/v1/lifeos/builder/ready'];
  const regressions = [];
  for (const p of surfaceProbes) {
    const r = await fetch(`${base}${p}`, { headers: { 'x-command-key': key, 'Cache-Control': 'no-store' } }).catch(() => null);
    if (!r || r.status >= 500 || r.status === 404) regressions.push(`${p} → ${r ? r.status : 'unreachable'}`);
  }
  record('runtime.surface', regressions.length === 0 ? CHECK_STATUS.PASS : CHECK_STATUS.FAIL, regressions.length === 0 ? `core surface healthy after deploy (${surfaceProbes.join(', ')})` : `core surface regressed after deploy: ${regressions.join(', ')}`, {
    ...(regressions.length === 0
      ? {}
      : { proposed_solution: 'The new image boots but lost route surface. Check the container start logs via GET /api/v1/railway/managed-env/deployments/:id/logs and roll forward with a fix.' }),
  });

  finish(
    buildReceipt({
      command: 'ship-truth',
      base,
      branch: args.branch,
      commitSha,
      servedSha,
      checks,
      files: files.map(({ payload, ...rest }) => rest),
      deployment: built,
      identity,
      extra: {
        commit_message: args.message,
        local_head: localHead,
        local_branch: local,
        remote_head_before: remoteHead,
        pre_served_sha: preReady.served_sha,
      },
    }),
  );
}

main().catch((err) => {
  record('ship.uncaught', CHECK_STATUS.FAIL, `unhandled error: ${err?.message || err}`, {
    stack: String(err?.stack || '').split('\n').slice(0, 5),
    proposed_solution: 'Fix the error above and re-run. Nothing may be reported as shipped from a crashed run.',
  });
  bail();
});