<!-- SYNOPSIS: Operator Usage — Keeping the Build Going -->

# Operator Usage — Keeping the Build Going

## What you get for continued usage

Each agent session on this project is buying **incremental, receipted progress** — not a one-shot answer:

| You pay for | You get |
|-------------|---------|
| Cursor agent turns | Code on disk, mission packs, acceptance tests that prove it |
| Same thread / handoff | No re-explaining architecture; `HANDOFF.md` + `CURRENT_STATE.json` carry state |
| `npm run factory:*` | Mechanical verification without re-reading chat |

**What is already automated (free at runtime):**

- `npm run factory:acceptance` — 132 tests, no LLM
- `npm run factory:materialize` / `materialize-0005` — blueprint executor, no LLM
- `npm run factory:integration` — execute-step proof, no LLM

**What still burns Cursor credits:**

- Emitting new mission packs (0006+)
- Wiring council adapter, DB, Railway deploy
- SENTRY review passes, gap-fill when executor blocks

**Rule from your SSOT:** product code on Railway should go through the **council builder** when possible (`npm run builder:preflight` + `/build`) — that uses Railway keys, not Cursor. This factory reboot track is **platform/factory** work, so IDE agent sessions are appropriate until the factory can build itself.

---

## How to add more usage (Cursor)

1. **Cursor Settings → Subscription / Usage** — upgrade plan or enable usage-based pricing if available on your account.
2. **Start a new chat with handoff** — paste: “Read `builderos-reboot/HANDOFF.md` and continue from `CURRENT_STATE.json`.”
3. **Same repo, no lost work** — everything material is in git + JSON receipts; the next agent does not need this thread.
4. **Smaller sessions** — `AUTO_PILOT_PROTOCOL.md`: one mission task per session reduces waste.

There is no in-repo “add credits” button — billing is through [cursor.com](https://cursor.com) account settings.

---

## How to extend the factory (add more missions)

1. **Queue it** — add a row to `builderos-reboot/MISSION_QUEUE.json` (mission 0006+).
2. **Emit blueprint** — copy `generate-factory-reboot-0005.mjs` pattern or add steps to a new `MISSIONS/FACTORY-REBOOT-000X/`.
3. **Pin bytes** — put exact file content in `CONTENT/`, run generator, `sync-acceptance-from-blueprint.mjs`.
4. **Materialize** — `npm run factory:materialize-000X` (add script in `package.json`).
5. **Prove** — acceptance + integration tests; append receipt to `CURRENT_STATE.json`.

---

## Current build status (after 0005)

| Done | Next (0006+) |
|------|----------------|
| Live `POST /factory/execute-step` | Multi-step mission runner (queue one blueprint) |
| Historian receipts (`data/step-receipts.jsonl`) | Council adapter (SM-004 live wiring) |
| 132 acceptance tests | Clean `Lumin-Factory` repo cutover |
| Integration proof | Same-tier greenfield determinism runbook execution |

**Verify anytime:**

```bash
npm run factory:acceptance
npm run factory:integration
cd factory-staging && npm run check && npm start
```
