<!-- SYNOPSIS: BUILDEROS REMEDIATION ALPHA SCOPE -->

# BUILDEROS REMEDIATION ALPHA SCOPE

**Project key:** `builderos-remediation`

---

## Alpha Goal

Make BuilderOS honest and safe enough to continue toward autonomous project building without false readiness, authority drift, or first-pass bad commits.

---

## In Alpha

### BR-A01
Ratify one canonical BuilderOS / TSOS / LifeOS separation.

### BR-A02
Make `system-alpha-readiness` fail closed on:

- stale proof
- readiness false
- active stale-proof repair queue item

### BR-A03
Repair build-pipeline root/script resolution.

### BR-A04
Create canonical pre-commit governance wrapper.

### BR-A05
Patch `/builder/build` to use wrapper before final commit claim.

### BR-A06
Define canonical BuilderOS memory proof source and demote non-canonical scoring paths.

### BR-A07
Define honest TSOS internal hook maturity boundary.

### BR-A08
Add first structural proof freshness output for duplicate authority paths.

### BR-A09
Re-run live readiness/proof/alpha audit and document residual blockers.

---

## Not In Alpha

- full automated component rewind execution
- large route refactors
- archive/move/delete legacy code
- LifeOS feature work
- TSOS product work
- full UI redesign
- new schedulers/daemons
- new memory subsystems

---

## Alpha Pass Criteria

Alpha passes only if all are true:

1. no top-level doc still misidentifies TSOS as the autonomous machine
2. live stale proof cannot yield `ALPHA_READY`
3. live readiness false cannot yield `ALPHA_READY`
4. bad Builder output cannot commit before verifier/OIL decision
5. BuilderOS memory is not marked proven from `self_repair_memory_events` alone
6. TSOS internal hooks are not marked mature from generic token telemetry alone
7. duplicate authority paths appear in structural proof output
8. useful-work-guard gate remains intact

---

## Alpha Fail Conditions

Alpha fails if any are true:

1. status remains fake-green under stale proof
2. first-pass bad build can still commit
3. memory maturity remains sourced from the wrong proof path
4. TSOS maturity remains inferred from generic telemetry
5. structural duplicate authority remains invisible in runtime truth
6. fixes require broad rewrite instead of bounded repair

---

## Required Verification

- live `GET /api/v1/lifeos/builder/ready`
- live `GET /api/v1/lifeos/command-center/proof-freshness`
- live `GET /api/v1/lifeos/command-center/supervised-autonomy/readiness`
- live `GET /api/v1/lifeos/command-center/system-alpha-readiness`
- live `GET /api/v1/lifeos/command-center/self-repair/repair-queue`
- live Builder bad-output test proving no first-pass fake commit
- live memory proof-source check
- live TSOS boundary proof check

