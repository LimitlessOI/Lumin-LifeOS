<!-- SYNOPSIS: Session slice — deploy truth, migrations, production monitoring -->

# Platform ops — deploy truth & monitoring (2026-07-31)

**Session:** `48f2917e` · **Master:** `docs/conversation_dumps/2026-07-31-builderos-rating-governance-review.md`

## Core failure mode named

System can claim shipped / live / verified while Railway still serves an older main tip, or while a branch never merges. Ten-day class incident was the motivating story in the harsh review.

## Mechanisms discussed / partially built

- ship:truth — PROVEN / DRIFT / UNSOLVED
- deploy stability samples — refuse parity while deployment in flight
- runtime fingerprint endpoint for allowlisted server bytes
- main-ancestor check before markShippedStepsDone
- Branch divergence preflight still listed as highest-leverage cheap gate

## Migration honesty gaps

- Apply success = SQL did not throw is insufficient
- Need checksum of migration bytes, declared end-state probe, single runner
- Silent degraded boot from failed migrations must page, not wait for Adam

## Founder posture on failed ship gates

Detect-and-route: reject the bad commit, UNSOLVED receipt, quarantine the file, keep unrelated factory work moving — unless irreversible system-wide risk.
