/**
 * SYNOPSIS: Deploy-truth guard primitives — prove a ship reached production or say UNSOLVED.
 *
 * Pure, dependency-free functions behind `scripts/ship-truth.mjs` and
 * `scripts/drift-audit.mjs`. Everything here is synchronous and side-effect free
 * so it is unit-testable without git, GitHub, Railway, or a live server.
 *
 * The drift classes this module exists to make impossible to hide:
 *   D1 source drift      — shipping working-tree bytes onto a branch that moved
 *   D2 partial apply     — local commits touch files the ship does not carry
 *   D3 commit drift      — the commit does not actually contain the bytes we sent
 *   D4 branch drift      — the commit is not reachable from the deploy branch
 *   D5 image drift       — .dockerignore excludes the path, so runtime cannot change
 *   D6 build drift       — Railway built a commit that does not contain ours
 *   D7 race drift        — parity declared while a newer deployment is in flight
 *   D8 identity drift    — the URL we verified is not the service we deployed
 *   D9 runtime drift     — the deploy SHA is a build-time label, not proof of bytes
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const RECEIPT_SCHEMA = 'deploy_truth_verify_v1';

/** Verdicts. UNSOLVED is a first-class outcome: never downgrade it to success. */
export const VERDICT = {
  PROVEN: 'PROVEN',
  DRIFT: 'DRIFT',
  UNSOLVED: 'UNSOLVED',
};

export const CHECK_STATUS = {
  PASS: 'pass',
  FAIL: 'fail',
  UNPROVEN: 'unproven',
  SKIP: 'skip',
};

/** Exit codes — distinct so CI can tell "provably broken" from "not proven". */
export const EXIT = {
  PROVEN: 0,
  DRIFT: 1,
  USAGE: 2,
  UNSOLVED: 3,
};

// ── SHA helpers ──────────────────────────────────────────────────────────────

const SHA_RE = /^[a-fA-F0-9]{7,40}$/;

export function normalizeSha(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return SHA_RE.test(v) ? v.toLowerCase().slice(0, 40) : null;
}

/** Two SHAs are the same commit when one is a prefix of the other. */
export function shasMatch(a, b) {
  const x = normalizeSha(a);
  const y = normalizeSha(b);
  if (!x || !y) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return long.startsWith(short);
}

// ── D5: .dockerignore evaluation ─────────────────────────────────────────────
//
// The production image is built with `COPY . .` under a .dockerignore that
// excludes large parts of the repo (docs/*, data/, tests/, products/, ...). A
// file can therefore be committed, built, and served under a matching deploy SHA
// while never existing in the container. That is a real "deployed but not live"
// hole, so image membership is computed before anything claims runtime effect.

/**
 * Parse .dockerignore text into ordered rules. Comments and blanks dropped.
 * `!` prefix marks a re-include (negation); later rules win, per Docker.
 */
export function parseDockerignore(text = '') {
  const rules = [];
  for (const rawLine of String(text).split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const negated = line.startsWith('!');
    const pattern = (negated ? line.slice(1) : line).trim();
    if (!pattern) continue;
    rules.push({ pattern, negated, raw: line });
  }
  return rules;
}

/**
 * Docker uses Go filepath.Match semantics plus `**`:
 *   `*`  matches any run of characters except `/`
 *   `?`  matches one character except `/`
 *   `**` matches any number of path segments
 */
export function globToRegExp(glob) {
  const g = String(glob).replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  let out = '^';
  let i = 0;
  while (i < g.length) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        i += 2;
        if (g[i] === '/') {
          out += '(?:.*/)?';
          i += 1;
        } else {
          out += '.*';
        }
      } else {
        out += '[^/]*';
        i += 1;
      }
    } else if (c === '?') {
      out += '[^/]';
      i += 1;
    } else if ('.+^${}()|[]\\'.includes(c)) {
      out += `\\${c}`;
      i += 1;
    } else {
      out += c;
      i += 1;
    }
  }
  return new RegExp(`${out}$`);
}

/** Every ancestor directory of a path, shallowest last: a/b/c.js -> ['a/b','a']. */
function ancestors(relPath) {
  const parts = String(relPath).split('/');
  const out = [];
  for (let i = parts.length - 1; i > 0; i -= 1) out.push(parts.slice(0, i).join('/'));
  return out;
}

/**
 * A pattern excludes a path if it matches the path itself OR any ancestor
 * directory (matching a directory excludes everything beneath it).
 */
function ruleMatches(rule, relPath) {
  const re = globToRegExp(rule.pattern);
  if (re.test(relPath)) return true;
  return ancestors(relPath).some((dir) => re.test(dir));
}

/**
 * Decide whether a repo-relative path lands in the Docker build context.
 * Last matching rule wins; no match means included.
 *
 *   -> { in_image, matched_rule, matched_index }
 */
export function dockerImageMembership(relPath, rules = []) {
  const norm = String(relPath).replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
  let decision = { in_image: true, matched_rule: null, matched_index: -1 };
  rules.forEach((rule, index) => {
    if (!ruleMatches(rule, norm)) return;
    decision = { in_image: rule.negated, matched_rule: rule.raw, matched_index: index };
  });
  return { path: norm, ...decision };
}

// ── D3b: naming the mutation when committed bytes differ from sent bytes ─────
//
// `execute-batch` runs `.js`/`.mjs` payloads through `extractJavaScriptFromOutput`
// and `fixAsteriskShorthandParams` before committing, so what lands is not always
// what was sent. Reporting only "hashes differ" leaves the operator guessing;
// these detectors name the transformation so the next action is obvious.

/**
 * Compare sent vs committed text and describe how the pipeline changed it.
 *   -> [{ kind, detail }]
 */
export function diagnoseContentMutation(sent = '', committed = '') {
  const a = String(sent);
  const b = String(committed);
  const findings = [];
  if (a === b) return findings;

  const shebang = a.match(/^#![^\n]*\n/);
  let aWork = a;
  if (shebang && !b.startsWith('#!')) {
    findings.push({
      kind: 'shebang_stripped',
      detail: `the leading ${JSON.stringify(shebang[0].trim())} line was removed, so the file is no longer directly executable`,
    });
    aWork = a.slice(shebang[0].length);
  }

  if (aWork.replace(/\s+$/, '') === b.replace(/\s+$/, '') && aWork !== b) {
    findings.push({
      kind: 'trailing_whitespace_stripped',
      detail: 'trailing newline/whitespace was trimmed (semantically inert, but the bytes differ)',
    });
    return findings;
  }

  // Asterisks removed from in-code text (regex literals, strings, comments).
  const asteriskVictims = [];
  for (const m of aWork.matchAll(/\*([A-Za-z_$][\w$]*)/g)) {
    const idx = m.index ?? 0;
    if (/function\s$/.test(aWork.slice(Math.max(0, idx - 9), idx))) continue;
    if (!b.includes(m[0])) asteriskVictims.push(m[0]);
  }
  if (asteriskVictims.length > 0) {
    findings.push({
      kind: 'asterisk_stripped',
      detail:
        `${asteriskVictims.length} occurrence(s) of "*<identifier>" lost the asterisk ` +
        `(${[...new Set(asteriskVictims)].slice(0, 6).join(', ')}) — this changes regex and string meaning, not just formatting`,
    });
  }

  if (findings.length === 0) {
    findings.push({
      kind: 'unexplained_difference',
      detail: `sent ${a.length} bytes, commit holds ${b.length} bytes, and no known pipeline transformation explains the difference`,
    });
  }
  return findings;
}

// ── D9: how (and whether) runtime bytes can be proven for a path ─────────────

const RUNTIME_PROOF = {
  HTTP_STATIC: 'http_static',
  BEHAVIOR_PROBE_REQUIRED: 'behavior_probe_required',
  RUNTIME_FINGERPRINT: 'runtime_fingerprint',
  NO_RUNTIME_SURFACE: 'no_runtime_surface',
  NOT_IN_IMAGE: 'not_in_image',
};

export { RUNTIME_PROOF };

const SERVER_CODE_RE = /^(routes|services|middleware|startup|config|db|factory-staging)\//;
const SERVER_ENTRY_RE = /^server[\w-]*\.js$/;
const FINGERPRINT_PREFIX_RE = /^(routes|services|middleware|startup|config|scripts\/lib)\//;

/**
 * Classify how production could independently prove a path's bytes are live.
 *
 * `public/**` is directly fetchable, so its bytes are provable over HTTP.
 * Allowlisted server modules are provable via runtime-fingerprint (Q-001).
 * Other server code still needs a behaviour probe. Anything else has no runtime
 * surface and must never be described as "live in production".
 */
export function classifyRuntimeProof(relPath, { inImage = true } = {}) {
  const p = String(relPath).replace(/^\/+/, '');
  if (!inImage) {
    return {
      kind: RUNTIME_PROOF.NOT_IN_IMAGE,
      proposed_solution:
        `.dockerignore excludes ${p} from the build context, so this commit cannot change runtime behaviour. ` +
        'Either add a negation rule to .dockerignore if it must ship, or report this ship as repo-only (not "deployed to production").',
    };
  }
  if (p.startsWith('public/')) {
    return { kind: RUNTIME_PROOF.HTTP_STATIC, url_path: `/${p.slice('public/'.length)}` };
  }
  if (FINGERPRINT_PREFIX_RE.test(p)) {
    return {
      kind: RUNTIME_PROOF.RUNTIME_FINGERPRINT,
      url_path: `/api/v1/builderos/control-plane/runtime-fingerprint?paths=${encodeURIComponent(p)}`,
      proposed_solution: null,
    };
  }
  if (SERVER_CODE_RE.test(p) || SERVER_ENTRY_RE.test(p)) {
    return {
      kind: RUNTIME_PROOF.BEHAVIOR_PROBE_REQUIRED,
      proposed_solution:
        `${p} is server code outside the runtime-fingerprint allowlist, so a matching deploy SHA is a build-time label, not proof the bytes are loaded. ` +
        'Pass --probe with an assertion that only the new code can satisfy (e.g. {"path":"/api/...","expect_body":"<new marker>"}).',
    };
  }
  return {
    kind: RUNTIME_PROOF.NO_RUNTIME_SURFACE,
    proposed_solution:
      `${p} has no HTTP-verifiable surface, so production cannot prove its bytes are the ones shipped. ` +
      'Report the commit as landed and deployed, but do not claim its content was verified live.',
  };
}

// ── D1/D2: branch divergence ─────────────────────────────────────────────────

/**
 * Decide whether it is safe to ship working-tree bytes for `shipPaths` onto the
 * deploy branch, given how local HEAD diverges from it.
 *
 *   behindFiles — files the deploy branch changed since the merge-base. Any
 *                 overlap with shipPaths means our bytes are stale and the ship
 *                 would silently REVERT someone else's work. Hard fail, no
 *                 override: this is the drift class that must become impossible.
 *   aheadFiles  — files local commits changed since the merge-base. Anything
 *                 outside shipPaths would stay behind, so the deploy branch gets
 *                 a partial application of a tree that was never tested whole.
 */
export function assessBranchDivergence({
  branch = 'main',
  localBranch = null,
  behind = 0,
  ahead = 0,
  behindFiles = [],
  aheadFiles = [],
  shipPaths = [],
  allowPartial = false,
} = {}) {
  const ship = new Set(shipPaths);
  const clobbered = behindFiles.filter((f) => ship.has(f));
  const strandedFiles = aheadFiles.filter((f) => !ship.has(f));

  if (clobbered.length > 0) {
    return {
      status: CHECK_STATUS.FAIL,
      reason: 'STALE_BASE_WOULD_REVERT_REMOTE_CHANGES',
      detail:
        `origin/${branch} has newer commits touching ${clobbered.length} file(s) this ship would overwrite with stale local bytes: ` +
        `${clobbered.join(', ')}. Local is ${behind} commit(s) behind.`,
      clobbered_files: clobbered,
      stranded_files: strandedFiles,
      behind,
      ahead,
      local_branch: localBranch,
      proposed_solution: `Run: git fetch origin ${branch} && git rebase origin/${branch} (or merge), re-resolve these files, then re-ship.`,
    };
  }

  if (strandedFiles.length > 0 && !allowPartial) {
    return {
      status: CHECK_STATUS.FAIL,
      reason: 'PARTIAL_APPLICATION_LOCAL_COMMITS_NOT_SHIPPED',
      detail:
        `Local branch ${localBranch || '(detached)'} is ${ahead} commit(s) ahead of origin/${branch} and changes ` +
        `${strandedFiles.length} file(s) this ship does not carry: ${strandedFiles.slice(0, 12).join(', ')}` +
        `${strandedFiles.length > 12 ? ` (+${strandedFiles.length - 12} more)` : ''}. ` +
        `origin/${branch} would get a partial tree that was never tested as a whole.`,
      clobbered_files: [],
      stranded_files: strandedFiles,
      behind,
      ahead,
      local_branch: localBranch,
      proposed_solution:
        `Either include those paths in this ship, or pass --allow-partial to record the partial application in the receipt on purpose.`,
    };
  }

  return {
    status: CHECK_STATUS.PASS,
    reason:
      behind === 0 && ahead === 0
        ? 'LOCAL_TREE_ALIGNED_WITH_DEPLOY_BRANCH'
        : 'DIVERGED_BUT_SHIP_PATHS_UNAFFECTED',
    detail:
      `local=${localBranch || '(detached)'} ahead=${ahead} behind=${behind}; ` +
      `no shipped path was changed on origin/${branch} since the merge-base` +
      (strandedFiles.length ? `; ${strandedFiles.length} local change(s) intentionally left behind (--allow-partial)` : ''),
    clobbered_files: [],
    stranded_files: strandedFiles,
    behind,
    ahead,
    local_branch: localBranch,
  };
}

/**
 * Did the commit actually apply every shipped path, and only those?
 *
 * Judged from git's own diff-tree rather than the builder's `changed_files`,
 * which deliberately filters its synopsis-index file and so reports a real change
 * as unchanged. The rule of this whole module applies to the builder too: never
 * let the thing being checked supply the proof.
 */
export function assessCommitAppliedPaths(shipPaths = [], gitChangedFiles = []) {
  const changed = new Set(gitChangedFiles);
  const ship = new Set(shipPaths);
  const missing = shipPaths.filter((p) => !changed.has(p));
  const extra = gitChangedFiles.filter((p) => !ship.has(p));

  if (missing.length > 0) {
    return {
      status: CHECK_STATUS.FAIL,
      missing,
      extra,
      detail: `git reports the commit did not change ${missing.length} requested path(s): ${missing.join(', ')}`,
      proposed_solution:
        'Those files already matched the branch, so nothing shipped for them. Remove them from the ship list or make the intended edit — they must not be reported as shipped.',
    };
  }
  return {
    status: CHECK_STATUS.PASS,
    missing: [],
    extra,
    detail:
      `git confirms the commit applied all ${shipPaths.length} requested path(s)` +
      (extra.length > 0 ? `, plus ${extra.length} it added on its own: ${extra.slice(0, 6).join(', ')}` : ' and nothing else'),
  };
}

// ── D7: deploy race / stability ──────────────────────────────────────────────

const IN_FLIGHT_STATUSES = new Set(['BUILDING', 'DEPLOYING', 'QUEUED', 'INITIALIZING', 'WAITING', 'REMOVING']);

export function isDeploymentInFlight(status) {
  return IN_FLIGHT_STATUSES.has(String(status || '').toUpperCase());
}

/**
 * A single parity observation is not proof — a newer deployment can already be
 * queued behind it (observed live: parity announced for one SHA while Railway
 * had a different commit QUEUED, so "deployed" was true for seconds).
 *
 * Stability requires every sample to serve a SHA containing our commit AND no
 * sample to see an in-flight deployment.
 */
export function assessParityStability(samples = [], { requiredSamples = 2 } = {}) {
  if (samples.length < requiredSamples) {
    return {
      status: CHECK_STATUS.UNPROVEN,
      reason: 'INSUFFICIENT_STABILITY_SAMPLES',
      detail: `Only ${samples.length} of ${requiredSamples} required samples collected.`,
      proposed_solution: 'Increase --wait-ms so the settle window can complete, then re-verify.',
    };
  }

  const regressed = samples.filter((s) => !s.serves_commit);
  if (regressed.length > 0) {
    return {
      status: CHECK_STATUS.FAIL,
      reason: 'PARITY_NOT_STABLE',
      detail:
        `${regressed.length}/${samples.length} samples stopped serving the built commit ` +
        `(saw ${[...new Set(regressed.map((s) => (s.served_sha || 'none').slice(0, 12)))].join(', ')}). ` +
        'Another deployment replaced ours.',
      samples,
      proposed_solution:
        'A concurrent commit/deploy raced this ship. Re-run the ship on top of the newest origin/main and keep --allow-inflight off so the race is refused up front.',
    };
  }

  const racing = samples.filter((s) => s.in_flight);
  if (racing.length > 0) {
    return {
      status: CHECK_STATUS.UNPROVEN,
      reason: 'DEPLOYMENT_IN_FLIGHT_DURING_VERIFY',
      detail:
        `Production served our commit, but ${racing.length}/${samples.length} samples saw an in-flight deployment ` +
        `(${[...new Set(racing.map((s) => s.deployment_status))].join(', ')}) that can replace it moments later.`,
      samples,
      proposed_solution: 'Re-run the verification once the in-flight deployment settles: npm run deploy:truth:audit',
    };
  }

  return {
    status: CHECK_STATUS.PASS,
    reason: 'PARITY_STABLE',
    detail: `${samples.length} consecutive samples served the built commit with no deployment in flight.`,
    samples,
  };
}

// ── Verdict + receipt ────────────────────────────────────────────────────────

/**
 * Fold checks into one verdict. A single failure is DRIFT; anything merely
 * unproven is UNSOLVED. PROVEN requires every non-skipped check to pass, so
 * "we could not tell" can never round up to success.
 */
export function computeVerdict(checks = []) {
  const failed = checks.filter((c) => c.status === CHECK_STATUS.FAIL);
  const unproven = checks.filter((c) => c.status === CHECK_STATUS.UNPROVEN);
  const passed = checks.filter((c) => c.status === CHECK_STATUS.PASS);
  const skipped = checks.filter((c) => c.status === CHECK_STATUS.SKIP);

  let verdict = VERDICT.PROVEN;
  if (failed.length > 0) verdict = VERDICT.DRIFT;
  else if (unproven.length > 0) verdict = VERDICT.UNSOLVED;

  return {
    verdict,
    ok: verdict === VERDICT.PROVEN,
    failed: failed.map((c) => c.id),
    unproven: unproven.map((c) => c.id),
    passed: passed.map((c) => c.id),
    skipped: skipped.map((c) => c.id),
  };
}

/** Every unproven/failed check must carry a concrete next action (SO-002). */
export function missingSolutions(checks = []) {
  return checks
    .filter((c) => c.status === CHECK_STATUS.FAIL || c.status === CHECK_STATUS.UNPROVEN)
    .filter((c) => !c.proposed_solution || !String(c.proposed_solution).trim())
    .map((c) => c.id);
}

export function exitCodeForVerdict(verdict) {
  if (verdict === VERDICT.PROVEN) return EXIT.PROVEN;
  if (verdict === VERDICT.DRIFT) return EXIT.DRIFT;
  return EXIT.UNSOLVED;
}

/**
 * One-line human truth statement. Deliberately refuses the word "deployed"
 * unless production proved it, and never overstates a repo-only change as a
 * runtime one.
 */
export function summarizeVerdict(receipt = {}) {
  const v = receipt.verdict;
  const sha = (receipt.commit_sha || receipt.served_sha || '').slice(0, 12) || 'unknown';

  if (v === VERDICT.DRIFT) {
    return `DRIFT — ${(receipt.failed || []).join(', ') || 'a check'} failed for ${sha}. Nothing may be reported as deployed.`;
  }
  if (v === VERDICT.UNSOLVED) {
    return `UNSOLVED — ${sha} could not be independently proven live (${(receipt.unproven || []).join(', ') || 'unproven checks'}). Do not report this as deployed.`;
  }

  if (receipt.command === 'drift-audit') {
    return `PROVEN — production serves ${sha}, which contains origin/${receipt.deploy_branch || 'main'}; no runtime drift found.`;
  }

  const files = Array.isArray(receipt.files) ? receipt.files : [];
  const runtimeProven = files.filter(
    (f) =>
      f.runtime_proof_kind === RUNTIME_PROOF.HTTP_STATIC
      || f.runtime_proof_kind === RUNTIME_PROOF.BEHAVIOR_PROBE_REQUIRED
      || f.runtime_proof_kind === RUNTIME_PROOF.RUNTIME_FINGERPRINT,
  ).length;
  const repoOnly = files.length - runtimeProven;
  const parts = [`PROVEN — production serves ${sha}`];
  if (runtimeProven > 0) parts.push(`${runtimeProven} path(s) verified live in the running app`);
  if (repoOnly > 0) parts.push(`${repoOnly} path(s) have no HTTP-verifiable surface and are not claimed as content-verified`);
  return `${parts.join('; ')}.`;
}

export function buildReceipt({
  command,
  base,
  branch,
  commitSha,
  servedSha,
  checks = [],
  files = [],
  deployment = null,
  identity = null,
  extra = {},
}) {
  const folded = computeVerdict(checks);
  const receipt = {
    schema: RECEIPT_SCHEMA,
    at: new Date().toISOString(),
    command,
    production_base: base || null,
    deploy_branch: branch || null,
    commit_sha: commitSha || null,
    served_sha: servedSha || null,
    verdict: folded.verdict,
    ok: folded.ok,
    passed: folded.passed,
    failed: folded.failed,
    unproven: folded.unproven,
    skipped: folded.skipped,
    files,
    deployment,
    runtime_identity: identity,
    checks,
    // Separation of duties (PRODUCT_HOME "Separation Of Duties"): the agent that
    // authored the change is not what attests it. Every verdict here comes from
    // git ancestry/blob hashes, the Railway API, and live HTTP probes — sources
    // outside this process that cannot be talked into agreeing.
    produced_by: 'cursor-agent',
    verified_by: 'git+railway-api+production-http-probe',
    verification_kind: 'deterministic+external',
    ...extra,
  };
  receipt.human_summary = summarizeVerdict(receipt);
  return receipt;
}