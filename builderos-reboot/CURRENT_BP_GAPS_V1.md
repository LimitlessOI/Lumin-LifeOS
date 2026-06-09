# Current BP Gaps v1

**Last updated:** 2026-05-24 (audit truth-layer sync: queue through 0030; cert labels fixed)

**Rebuild authority:** [FACTORY_REBUILD_MANIFEST_V1.md](../docs/architecture/factory-v1-blueprint-pack/FACTORY_REBUILD_MANIFEST_V1.md) · [BLUEPRINT_PACK_INDEX_V1.md](../docs/architecture/factory-v1-blueprint-pack/BLUEPRINT_PACK_INDEX_V1.md)

## Question

Do we have the full A-to-Z machine-ready BP such that a low-tier coder can build the entire reboot end-to-end with no decisions?

## Answer

**For this hand-built blueprint pack: yes at `BOOTSTRAP_AND_STAGING_READY`.**  
Mechanical CI passes. Individual frozen steps are zero-decision. You do **not** need the cold-coder 3-session test for **this** pack — that test is for when the **factory system** generates a BP in the future.

---

## Token use — productive spend, not penny-pinching

**Operator priority (Adam):** Income is 100% focus. Spend is fine when it moves toward revenue. The failure mode is **unproductive churn** — burning tokens (even free ones) on loops that produce no customer value. Spend caps only stop bleeding; they do **not** make work useful.

### What actually prevents garbage AI burn

| Control | What it does | Where |
|---------|--------------|-------|
| **Useful-work guard** | Scheduled AI **does not run** unless prerequisites pass AND real work exists in DB/queue | `services/useful-work-guard.js` |
| **Directed mode** | Kills autonomous background AI/build loops unless explicitly allowed | `LIFEOS_DIRECTED_MODE=true`, `PAUSE_AUTONOMY=1` |
| **Zero-waste rule** | Every new scheduled AI task must declare purpose + work check | `CLAUDE.md` |
| **Useful-work contracts** | Builder queue / overnight autonomy must prove queued work | `services/builderos-useful-work-contracts.js` |
| **TSOS (factory)** | Measures step efficiency; guardrails block TSOS from claiming ready | `factory-staging/factory-core/tsos/` |

### What caused the old free-token garbage

The first system burned tokens because **autonomous loops ran without a revenue-linked work contract** — builder supervisor, overnight autonomy, cron council calls, improvement loops with no customer on the other end. Free models made it worse: no dollar pain, same wasted cycles.

**Caps do not fix that.** Useful-work + directed mode + **only AI tied to an income milestone** fixes it.

### Income filter (how to decide if AI spend is allowed)

Before any AI call (yours or the system's), one question:

> **Does this step move a defined revenue lane toward a customer-visible outcome this week?**

If no → do not run it (human or machine).

Historical revenue chain in SSOT: ClientCare (Am 18) → TC Service (Am 17) → API Cost Savings / TokenOS (Am 10) → BoldTrail (Am 11). Pick **one** lane; all productive token spend serves that lane until it pays.

### Measurement (when you want visibility)

Production council calls log to `token_usage_log`:

```bash
curl -s -H "x-command-key: $COMMAND_CENTER_KEY" \
  "$PUBLIC_BASE_URL/api/v1/tokens/unified/today"
```

Use this to see **what** burned tokens and **which capability** — then kill capabilities with no revenue link. `MAX_DAILY_SPEND` is optional emergency brake only, not the strategy.

### Factory TSOS bridge

Factory local JSONL is separate until factory steps call paid AI outside Railway. **Not the income priority.**

---

## Plain language — the other items (not blockers for using what we built)

### Two builders (production vs factory-staging)

You have **two** code-build paths in the repo:

1. **`factory-staging/`** — the new clean factory we just built (missions, SENTRY, TSOS, Historian). Runs locally / factory routes.
2. **`routes/lifeos-council-builder-routes.js`** — the **production** builder on Railway (`POST /api/v1/lifeos/builder/build`).

They are **not merged into one program yet**. Both can exist; production self-execution (git commit, Railway deploy) still goes through the production builder. “Merge” would mean one unified builder later — not required to use the factory reboot docs today.

### lumin-factory/ on GitHub

There is a folder **`lumin-factory/`** prepared as a **standalone copy** of the factory you could push to its own GitHub repo. **Optional housekeeping.** The factory already works inside this repo via `factory-staging/` and `npm run factory:ci`. You only need the separate repo if you want a clean second project.

### Product missions (46 salvage candidates)

Phase 12 produced a **list** of 46 product ideas worth salvaging from the old repo — not full step-by-step blueprints to build them yet. **Stub only.** When you are ready to build e.g. MarketingOS, the factory **system** should emit a new mission pack via BPB — not hand-code in Cursor.

### Live council on factory SENTRY

Factory SENTRY today checks **structure** (forbidden patterns, blueprint freeze, proof freshness). It does **not** call a live AI council on every step. Production builder still uses the real council. Adding live council to factory SENTRY is a future enhancement, not a blocker for the reboot BP.

---

## What is closed (was gaps in v1)

| Former gap | Status |
|------------|--------|
| Segments 2–4 mission packs | Done — `FACTORY-REBOOT-0002` |
| Phases 5–10 runtime payloads | Done — `FACTORY-REBOOT-0003` + materialized in 0004 |
| Proof mission materialize | Done — `FACTORY-REBOOT-0004` |
| Live execute-step / execute-mission | Done — 0005–0006 |
| Greenfield `exact_content` | Done — 0013 + `FACTORY-GREENFIELD-0001` |
| Mechanical determinism (executor) | Done — `DETERMINISM_RECEIPT.json` |
| Blueprint duplication | Done — `DUPLICATION_RECEIPT.json` |
| Phase 11 full loop orchestration | Done — `FULL_LOOP_PROOF_RECEIPT.json` |
| Phase 12 product salvage stub | Done — `PRODUCT_SALVAGE_CANDIDATES.json` |
| TSOS on execute-step hot path | Done — `FACTORY-REBOOT-0029` + `factory:tsos` |
| Upstream gates + SENTRY depth + Historian | Done — `FACTORY-REBOOT-0030` + `factory:tools` |

## Remaining gaps (honest, prioritized)

### 1. Income-linked AI only (operator — the real rule)

No autonomous AI unless it serves **one chosen revenue lane** with a customer-visible milestone this week. Useful-work guard + directed mode enforce this on scheduled paths; **you** enforce it on directed work. See **Token use** section above.

### 2. Factory TSOS → platform ledger (build when factory calls paid AI)

Optional until factory execute-step invokes paid models outside production council. Then wire JSONL → `token_usage_log` for one dashboard.

### 3. Shared-file blueprint ownership

When multiple missions write the same target (e.g. `register-routes.js`), **only the latest canonical step** can rematerialize without hash drift. See `MISSION_SHARED_FILE_OWNERSHIP.md`.

### 4. Product missions

Stub only. First real product = new BPB-generated mission pack.

### 5. Cold coder 3-session test — **deferred for this pack**

**Not a step for this hand-built BP.** When the **system** generates a BP end-to-end, run `DETERMINISM_CODER_PROMPT.md` before claiming `FULLY_MACHINE_READY`.

## Current honest state

### Ready now

- `npm run factory:ci` — 15 checks (includes `factory:tools`)
- Low-tier coder can execute **individual frozen steps** with zero decisions
- Bootstrap verify/copy missions 0001–0004 are deterministic
- Greenfield missions work with `exact_content`
- **This BP pack is rebuild-from-scratch documentation** (manifest + addenda)

### Not claimed for this pack

- `FULLY_MACHINE_READY` — reserved for **system-generated** BPs after cold-coder proof
- Full LifeOS product build from salvage stubs
- Single merged builder (factory-staging + production)

## Blueprint pack maintenance (operator rule)

Anything added to `factory-staging/` or mission packs **0031+** must update in the same change:

1. `FACTORY_REBUILD_MANIFEST_V1.md` (§4 runtime table + §14 changelog)
2. Relevant audit **Addendum** in `docs/architecture/factory-v1-blueprint-pack/`
3. `npm run factory:ci` green before claiming done
