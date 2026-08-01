<!-- SYNOPSIS: Founder packet for FACTORY-REPAIR-AND-AUTONOMY-0001 — make BuilderOS fix itself and learn from every failure. -->

# FACTORY-REPAIR-AND-AUTONOMY-0001 — Founder Packet

## Mission

Fix the repair system. Make BuilderOS able to detect its own drift, generate the minimal deterministic repair, retry, and record a lesson. Then make it never stop: a self-scheduling overnight autonomy layer. And install the constitutional protocols from the 2026-08-01 conversation as runtime services — not just documentation.

## Founder's words (raw intent)

- "Fix the issues with the repair and make sure that every failure and success we learn a lesson from."
- "Actually, make a blueprint of everything you've found in your audit to deal with."

## Required outcomes

1. **Deterministic repair mechanic** — a governed script/executor that the never-stop factory can call. It inspects `BUILD_QUEUE` artifact-proof failures and applies safe, minimal repairs (export aliases, `file_contains` comment anchors, route-path aliases, auto-register entries, and grounding-safe stubs) — without model spend.
2. **Lessons engine** — every repair attempt, success, and failure produces a persisted lesson with the failure family, the applied fix, the verification result, and the root cause. Lessons feed back into `services/builderos-improvement-loop.js` and the Wisdom layer.
3. **Overnight autonomy** — the system must not stop when the conductor sleeps. A scheduler (cron, `setInterval`, or Railway scheduled job) must wake the factory, run artifact proof, attempt deterministic repair, and re-run `bp-priority:once`.
4. **Runtime constitutional protocols** — the ten protocols from 2026-08-01 must be more than documented. CDE, reversibility, confidence propagation, unknowns, and reality measures are already runtime; the remaining (Knowledge/Judgment split, goal decomposition, cognitive-spine health metrics, asset-evolution governance, reality hierarchy, founder cognitive-load optimization) must become services/tests wired into the Chair/Builder/Sentry loop.
5. **Competitive gap closure** — empirical benchmark harness, IDE bridge, and model-routing ROI ledger so BuilderOS can demonstrate win vs Devin/Cursor/Codex.

## Non-goals

- Do not widen into new product features until the build machine is reliable.
- Do not create a second active queue.
- Do not hand-author large protected modules when the governed factory can do it once credits return.

## Point B (definition of done)

- `BUILDEROS_NEVER_STOP=1` runs for 24 hours without human intervention and clears at least one pending step per hour while no model credits are available.
- `audit-false-done-steps.mjs --ci` reports zero new `SOFT`/`HARD` findings after each autonomous run.
- Every autonomous repair produces a `data/build-queue-drift-lessons.jsonl` entry.
- Runtime constitutional protocol tests pass under `npm run builder:preflight`.
- Benchmark harness can run `npm run benchmark:builderos-vs-baseline` and emit a `receipt` JSON.
