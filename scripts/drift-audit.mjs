/**
 * SYNOPSIS: Read-only production drift audit — prove prod runs the deploy branch, or UNSOLVED.
 *
 * Answers one question with evidence: is production, right now, provably running
 * `origin/<branch>`? It commits nothing and deploys nothing, so it is safe to run
 * in preflight, in CI, or on a schedule.
 *
 * What makes this different from an "endpoint 200" check: when production is
 * behind, it also computes WHICH files differ and whether those files are even
 * in the Docker build context. A commit that only touches `docs/*`, `tests/`, or
 * `data/` cannot change runtime behaviour, so calling that "drift" is noise —
 * while a single stale file under `routes/` is a real, reportable regression.
 *
 * Usage: node scripts/drift-audit.mjs [--branch main] [--json]
 * Exit:  0 PROVEN · 1 DRIFT · 2 usage/env · 3 UNSOLVED
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import * as dotenv from 'dotenv';
dotenv.config({ override: true });
import fs from 'node:fs';
import path from 'node:path';

import {
  CHECK_STATUS,
  EXIT,
  buildReceipt,
  dockerImageMembership,
  exitCodeForVerdict,
  isDeploymentInFlight,
  missingSolutions,
  parseDockerignore,
} from './lib/deploy-truth-guard.mjs';
import {
  aheadBehind,
  currentBranch,
  dirtyPaths,
  git,
  gitFetch,
  isAncestor,
  latestDeployment,
  probeReady,
  revParse,
  runtimeIdentity,
} from './lib/deploy-truth-io.mjs';

const REPO_ROOT = process.cwd();

const base = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  ''
)
  .trim()
  .replace(/\/$/, '');

const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  '';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const branch = (() => {
  const i = argv.indexOf('--branch');
  return i >= 0 ? String(argv[i + 1] || 'main') : 'main';
})();

const checks = [];
const log = (...m) => {
  if (!asJson) console.log(...m);
};

function record(id, status, detail, extra = {}) {
  checks.push({ id, status, detail, ...extra });
  const glyph = { pass: '  ok  ', fail: ' FAIL ', unproven: 'UNPROVN', skip: ' skip ' }[status] || status;
  log(`[${glyph}] ${id} — ${detail}`);
}

function finish({ commitSha = null, servedSha = null, deployment = null, identity = null, extra = {} } = {}) {
  const receipt = buildReceipt({
    command: 'drift-audit',
    base,
    branch,
    commitSha,
    servedSha,
    checks,
    files: [],
    deployment,
    identity,
    extra,
  });
  const gaps = missingSolutions(checks);
  if (gaps.length > 0) receipt.solution_discipline_violation = gaps;

  const dir = path.join(REPO_ROOT, 'products/receipts');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'DEPLOY_DRIFT_AUDIT.json'), `${JSON.stringify(receipt, null, 2)}\n`);

  if (asJson) {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    log(`\n${receipt.human_summary}`);
    log('receipt: products/receipts/DEPLOY_DRIFT_AUDIT.json');
    for (const c of checks.filter((x) => x.status !== CHECK_STATUS.PASS && x.proposed_solution)) {
      log(`  → ${c.id}: ${c.proposed_solution}`);
    }
  }
  process.exit(exitCodeForVerdict(receipt.verdict));
}

async function main() {
  if (!base || !key) {
    console.error('Set PUBLIC_BASE_URL and COMMAND_CENTER_KEY to audit production.');
    process.exit(EXIT.USAGE);
  }
  log(`\n── drift-audit → ${base} (branch ${branch}) ──\n`);

  const fetched = gitFetch('origin', branch);
  if (!fetched.ok) {
    record('git.fetch', CHECK_STATUS.UNPROVEN, `git fetch origin ${branch} failed: ${fetched.detail}`, {
      proposed_solution: 'Restore git remote access, then re-run. Without the remote ref there is no truth to compare production against.',
    });
    finish();
  }
  const remoteHead = revParse(`origin/${branch}`);
  const localHead = revParse('HEAD');
  const local = currentBranch();
  const { ahead, behind } = aheadBehind(`origin/${branch}`);
  record('git.fetch', CHECK_STATUS.PASS, `origin/${branch} is ${remoteHead?.slice(0, 12)}`);

  record(
    'local.divergence',
    CHECK_STATUS.PASS,
    ahead === 0 && behind === 0
      ? `local ${local} is aligned with origin/${branch}`
      : `local ${local} is ${ahead} ahead / ${behind} behind origin/${branch} — local state is not what production deploys from`,
    { local_branch: local, local_head: localHead, remote_head: remoteHead, ahead, behind, uncommitted: dirtyPaths().length },
  );

  const identity = await runtimeIdentity(base, key);
  const host = new URL(base).host;
  if (identity.ok && identity.hosts.length > 0) {
    const attached = identity.hosts.includes(host);
    record('runtime.identity', attached ? CHECK_STATUS.PASS : CHECK_STATUS.FAIL, attached ? `${host} belongs to Railway service ${identity.service_id?.slice(0, 8)} / env ${identity.environment_id?.slice(0, 8)}` : `${host} is not a domain of the audited service (${identity.hosts.join(', ')})`, {
      project_id: identity.project_id,
      service_id: identity.service_id,
      environment_id: identity.environment_id,
      hosts: identity.hosts,
      ...(attached ? {} : { proposed_solution: `Point PUBLIC_BASE_URL at one of: ${identity.hosts.join(', ')}` }),
    });
  } else {
    record('runtime.identity', CHECK_STATUS.UNPROVEN, `service identity unreadable (HTTP ${identity.status}${identity.error ? `: ${identity.error}` : ''})`, {
      proposed_solution: 'Set RAILWAY_PROJECT_ID / RAILWAY_SERVICE_ID / RAILWAY_ENVIRONMENT_ID in the Railway vault so the running app can name the service it belongs to.',
    });
  }

  const ready = await probeReady(base, key);
  if (ready.status !== 200) {
    record('runtime.ready', CHECK_STATUS.FAIL, `GET /builder/ready returned ${ready.status}${ready.error ? ` (${ready.error})` : ''}`, {
      proposed_solution: 'Production is not answering its readiness surface. Check the latest deployment logs; nothing about the running version can be proven until it responds.',
    });
    finish({ identity });
  }
  const servedSha = ready.served_sha;
  if (!servedSha) {
    record('runtime.version', CHECK_STATUS.UNPROVEN, 'production does not expose a deploy commit SHA, so the running version cannot be identified', {
      proposed_solution: 'RAILWAY_GIT_COMMIT_SHA is missing from the running environment — set it (Railway injects it for GitHub-linked services) so /builder/ready can name the running commit.',
    });
    finish({ commitSha: remoteHead, identity });
  }
  record('runtime.ready', CHECK_STATUS.PASS, `production alive, profile ${ready.runtime_profile}, policy ${ready.policy_revision}`);

  const upToDate = servedSha === remoteHead || isAncestor(remoteHead, servedSha);
  if (upToDate) {
    record('runtime.version', CHECK_STATUS.PASS, `production serves ${servedSha.slice(0, 12)}, which contains origin/${branch} (${remoteHead.slice(0, 12)})`, {
      served_sha: servedSha,
      remote_head: remoteHead,
    });
  } else {
    // Production is behind. Quantify it, and separate real runtime drift from
    // repo-only churn the image never receives.
    const commitsBehind = (() => {
      const r = git(['rev-list', '--count', `${servedSha}..${remoteHead}`]);
      return r.ok ? Number(r.stdout) || 0 : null;
    })();
    const diff = git(['diff', '--name-only', `${servedSha}..${remoteHead}`]);
    const changed = diff.ok ? diff.stdout.split('\n').filter(Boolean) : [];
    const rules = parseDockerignore(
      fs.existsSync(path.join(REPO_ROOT, '.dockerignore')) ? fs.readFileSync(path.join(REPO_ROOT, '.dockerignore'), 'utf8') : '',
    );
    const runtimeRelevant = changed.filter((p) => dockerImageMembership(p, rules).in_image);

    record(
      'runtime.version',
      runtimeRelevant.length > 0 ? CHECK_STATUS.FAIL : CHECK_STATUS.PASS,
      runtimeRelevant.length > 0
        ? `production serves ${servedSha.slice(0, 12)} but origin/${branch} is ${remoteHead.slice(0, 12)} — ${commitsBehind} commit(s) behind, with ${runtimeRelevant.length} file(s) in the image still stale: ${runtimeRelevant.slice(0, 12).join(', ')}${runtimeRelevant.length > 12 ? ` (+${runtimeRelevant.length - 12} more)` : ''}`
        : `production serves ${servedSha.slice(0, 12)} vs origin/${branch} ${remoteHead.slice(0, 12)} (${commitsBehind} commit(s) behind), but all ${changed.length} changed file(s) are excluded from the Docker image — no runtime effect is missing`,
      {
        served_sha: servedSha,
        remote_head: remoteHead,
        commits_behind: commitsBehind,
        changed_files: changed,
        runtime_relevant_files: runtimeRelevant,
        ...(runtimeRelevant.length > 0
          ? {
              proposed_solution: `Redeploy production onto ${remoteHead.slice(0, 12)}: npm run system:railway:redeploy (or POST /api/v1/railway/managed-env/build-from-latest with commit_sha), then re-run this audit.`,
            }
          : {}),
      },
    );
  }

  const latest = await latestDeployment(base, key);
  const dep = latest.deployment;
  if (!dep) {
    record('deployment.state', CHECK_STATUS.UNPROVEN, `latest deployment unreadable (HTTP ${latest.status}${latest.error ? `: ${latest.error}` : ''})`, {
      proposed_solution: 'Check RAILWAY_TOKEN in the Railway vault so GET /api/v1/railway/managed-env/deployments/latest can report build state.',
    });
  } else if (isDeploymentInFlight(dep.status)) {
    record('deployment.state', CHECK_STATUS.UNPROVEN, `a deployment is in flight (${dep.status}, commit ${dep.commit_sha?.slice(0, 12)}) — the running version may change within minutes`, {
      deployment: dep,
      proposed_solution: 'Re-run this audit once the deployment settles; any "current version" claim made now has a short shelf life.',
    });
  } else if (dep.status === 'FAILED') {
    record('deployment.state', CHECK_STATUS.FAIL, `the most recent deployment FAILED (commit ${dep.commit_sha?.slice(0, 12)}) — production is running older code than the branch head`, {
      deployment: dep,
      proposed_solution: `Read GET /api/v1/railway/managed-env/deployments/${dep.id}/logs, fix the build, and re-ship.`,
    });
  } else {
    record('deployment.state', CHECK_STATUS.PASS, `latest deployment ${dep.status} on ${dep.commit_sha?.slice(0, 12)}, nothing in flight`, { deployment: dep });
  }

  finish({
    commitSha: remoteHead,
    servedSha,
    deployment: dep,
    identity,
    extra: { local_head: localHead, local_branch: local, ahead, behind },
  });
}

main().catch((err) => {
  record('audit.uncaught', CHECK_STATUS.FAIL, `unhandled error: ${err?.message || err}`, {
    proposed_solution: 'Fix the error above and re-run. A crashed audit proves nothing.',
  });
  finish();
});