<!-- SYNOPSIS: Task list for FACTORY-REPAIR-AND-AUTONOMY-0001. -->

# FACTORY-REPAIR-AND-AUTONOMY-0001 — Task List

**State:** Blueprint created; Phase 0 in progress.
**Mission:** Make BuilderOS detect its own BUILD_QUEUE drift, generate deterministic repairs, record lessons, run overnight, install runtime constitutional protocols, and close competitive gaps.
**Production SHA at blueprint time:** `2215f4823c63`

---

## Phase P0 — Blueprint and audit lock

- [x] Write `FOUNDER_PACKET.md`
- [x] Write `CURRENT_STATE_AUDIT.md`
- [x] Write `BLUEPRINT.json`
- [x] Write `ACCEPTANCE_TESTS.json`
- [x] Write `TASK_LIST.md`
- [ ] Commit and deploy blueprint

## Phase P1 — Deterministic artifact-repair mechanic

- [ ] Create `scripts/build-queue-drift-repair.mjs` with `--dry-run` and `--apply` modes
- [ ] Implement safe repair classes: `file_contains` anchor, export alias/stub, route alias, auto-register entry, grounded SQL migration, grounded minimal service/route stub
- [ ] Add `tests/build-queue-drift-repair.test.mjs`
- [ ] Wire repair executor into `services/never-stop-product-factory.js` and `scripts/bp-priority-never-stop.mjs`

## Phase P2 — Lessons capture

- [ ] Create `data/build-queue-drift-lessons.jsonl` and rotate writer
- [ ] Create `scripts/build-queue-lessons-report.mjs`
- [ ] Wire lessons into `services/builderos-improvement-loop.js`
- [ ] Ensure every repair attempt, success, and failure produces a lesson

## Phase P3 — Overnight daemon

- [ ] Create `scripts/builderos-overnight-daemon.mjs`
- [ ] Integrate `createUsefulWorkGuard` and daily budget checks
- [ ] Add halt-on-signature-repeat logic
- [ ] Schedule on Railway or document how to run in a persistent process

## Phase P4 — Runtime constitutional protocols

- [ ] `services/knowledge-judgment-split.js`
- [ ] `services/goal-decomposition.js`
- [ ] `services/cognitive-spine-health.js`
- [ ] `services/asset-evolution-governance.js`
- [ ] `services/reality-hierarchy-reconciler.js`
- [ ] `services/founder-cognitive-load-optimizer.js`
- [ ] `tests/constitutional-protocols-runtime.test.mjs`
- [ ] Wire into `chair-lumin-unified.js` and `reasoning-plan.mjs`

## Phase P5 — Clear remaining BUILD_QUEUE backlog

- [ ] Run drift repair on 11 pending steps across `story-studio`, `creator-media-os`, `faith-studio`, `video-pipeline`, `token-accounting-os`, `word-keeper`, `productized-sprint`
- [ ] Park model-codegen steps with clear `blocker_class` and `park_until`
- [ ] Do not fake revenue integrations; record missing env var blockers
- [ ] Update product homes with Change Receipts

## Phase P6 — Competitive benchmark + IDE bridge

- [ ] `scripts/benchmark-vs-baseline.mjs`
- [ ] `scripts/ide-bridge.mjs` and VS Code extension manifest
- [ ] `docs/reports/BUILDEROS_COMPETITIVE_BENCHMARK.md`
