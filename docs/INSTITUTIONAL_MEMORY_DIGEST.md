<!-- SYNOPSIS: Institutional Memory Digest -->
Institutional Memory Digest
> AUTO-GENERATED — do not hand-edit. Regenerate: `npm run memory:seed-lessons`
> Generated: 2026-05-14T01:37:21.573Z
> Confidence: all lessons are RECEIPT-class (seeded from repair receipts). Not promoted to FACT/INVARIANT without runtime evidence.
---
agent-workflow
MEDIUM: Local repo was 32 commits behind origin/main during a governance session; operat...
Problem: Local repo was 32 commits behind origin/main during a governance session; operator:status showed stale snapshot as if current. 13 files existed on disk untracked — never committed, invisible to Railway.
Solution: Run `git pull --rebase origin main` at session start when autonomous builders are active. Check git status for untracked files that belong to the system. OF1 freshness check in operator-runtime-status.mjs now flags stale snapshots as STALE/FAIL_CLOSED.
How novel: known but hard
Source: AM36 receipt 2026-05-13 — GOVERNANCE_LOCK c60e1c64; 13 untracked files
Tags: operator-status, stale-snapshot, git-sync, recovery, confidence:medium
---
SMALL: Railway autonomous builders push commits continuously during human sessions; loc...
Problem: Railway autonomous builders push commits continuously during human sessions; local branches diverge within minutes. Non-fast-forward push failures occur on nearly every human-session push.
Solution: `git fetch origin && git rebase origin/main` immediately before every push attempt. May need multiple rounds if builders push between rebase and push. Do not use git merge — rebase preserves linear history expected by the build system.
How novel: standard
Source: CONTINUITY_LOG 2026-05-13/14 — push failures, C21 proof
Tags: git, rebase, railway-autonomy, push, confidence:medium
---
autonomy
LARGE: Forge daemon retried a file that was already valid on disk across circuit-breake...
Problem: Forge daemon retried a file that was already valid on disk across circuit-breaker cycles — no mechanism to detect the file existed. Truncation loop: builder produces 7 lines → circuit breaker → 2h pause → retry → repeat.
Solution: SIS1: pre-builder disk check — if .js target_file exists + line count ≥ 10 + node --check passes → log task_skip_already_shipped and continue without an HTTP builder call. Confirmed live: multiple tasks skipped in site-builder-autonomous-queue.
How novel: first known solution
Source: AM36 receipt 2026-05-12 — SIS1; checkIfAlreadyShipped()
Tags: sis1, forge, circuit-breaker, builder, skip-if-shipped, confidence:medium
---
MEDIUM: A write-lock with no expiry silently routes all autonomous commits to staging in...
Problem: A write-lock with no expiry silently routes all autonomous commits to staging indefinitely if the operator forgets to release it.
Solution: acquireLock() writes expires_at + ttl_minutes; readLock() auto-deletes expired file and returns null. Default TTL: 120 minutes via AUTONOMY_LOCK_TTL_MINUTES env.
How novel: first known solution
Source: Adam directive 2026-05-14; AM36 C21 receipt
Tags: c21, autonomy-write-lock, expiry, ttl, confidence:medium
---
MEDIUM: data/builder-failure-patterns.json lives on Railway ephemeral filesystem. A fres...
Problem: data/builder-failure-patterns.json lives on Railway ephemeral filesystem. A fresh deploy or volume loss resets failure memory to zero — FPM1 reverts to level 0, no escalation hints, no auto-quarantine until the counter rebuilds from scratch.
Solution: Treat FPM1 as provisional until migrated to a Neon table (builder_task_failure_patterns). Monitor for unexpected level-0 scores after deploys. Future slice: migrate to DB persistence so failure history survives redeployment.
How novel: known but hard
Source: AM36 receipt 2026-05-12 — FPM1 risks; builder-failure-patterns.json
Tags: fpm1, railway, ephemeral, builder-failure-memory, confidence:low
---
build-governance
LARGE: Autonomous builder (Groq model) corrupted all async function declarations in pub...
Problem: Autonomous builder (Groq model) corrupted all async function declarations in public/overlay/lifeos-dashboard.html as "asyncFn funcName()" — missing "unc" and space. Blocked Forge daemon for 9 consecutive cycles.
Solution: Bulk replace `asyncFn ` → `async function ` with a post-replace space-before-identifier guard (`async function` + `[a-zA-Z]` → `async function ` + identifier). Added check:overlay to CI gate.
How novel: rare
Source: AM36 receipt 2026-05-14 — Forge overlay fix
Tags: forge, builder-corruption, overlay, async-function, confidence:medium
---
LARGE: Railway autonomous builder commits rewrote package.json without preserving compl...
Problem: Railway autonomous builder commits rewrote package.json without preserving compliance npm scripts (repo:sync-check, lifeos:verify:ui-map). Misdiagnosed twice as "Railway removes scripts" — real cause: scripts were never committed to git and were lost on rebase.
Solution: commitToGitHub() now has a protected-scripts guard: rejects any package.json commit missing required scripts or test file references. Always commit npm scripts immediately after writing them — do not leave them untracked.
How novel: rare
Source: AM36 receipt 2026-05-13 — Cycle 3; deployment-service guard
Tags: package-json, deployment-service, railway, scripts-guard, confidence:medium
---
LARGE: FPM1 was shipped before SIS1 was confirmed live — two unverified loops stacked. ...
Problem: FPM1 was shipped before SIS1 was confirmed live — two unverified loops stacked. No individual step was wrong, but failures in loop N could corrupt loop N+1 without detection.
Solution: Prove-the-loop rule: before starting the next repair or build slice, require at least one live runtime log event confirming the previous slice, or an explicit PENDING_CONFIRMATION marker in the owning amendment. "Compiles and looks right" is not confirmation.
How novel: first known solution
Source: AM36 prove-the-loop rule 2026-05-12; FPM1+SIS1 sequencing
Tags: fpm1, sis1, governance, prove-the-loop, confidence:medium
---
MEDIUM: Unstaged LA1 working-tree changes were silently swept into the SIS1 commit when ...
Problem: Unstaged LA1 working-tree changes were silently swept into the SIS1 commit when staging — receipt trail became inaccurate. Only detected by post-commit diff showing 6 hunks where 2 were SIS1.
Solution: Pre-commit hunk audit: before staging, run `git diff` and categorize every hunk. STOP if mixed-scope without explicit operator approval. Mixed-scope commit = SSOT receipt error. Record the exception in the commit message.
How novel: known but hard
Source: AM36 receipt 2026-05-12 — SIS1 commit hygiene; mixed-scope detection
Tags: commit-hygiene, hunk-audit, ssot, git, confidence:medium
---
platform
MEDIUM: isLocked() returned null (not false) when no lock file exists; strict === false ...
Problem: isLocked() returned null (not false) when no lock file exists; strict === false checks fail.
Solution: Use `return lock !== null && lock.locked === true` — explicit boolean, never trusts JS falsy null.
How novel: known but hard
Source: AM36 receipt 2026-05-14 — C21 library proof
Tags: c21, autonomy-write-lock, boolean, library, confidence:medium
---