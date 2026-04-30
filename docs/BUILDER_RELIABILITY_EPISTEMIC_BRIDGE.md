# Builder reliability ↔ truth evaluation (SSOT bridge)

This document ties together:

- **`docs/SSOT_NORTH_STAR.md` → Article II §2.6** — operational honesty; misleading status = lying.
- **`docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md` — Evidence Ladder** — what machine output is allowed to weigh (CLAIM → … → INVARIANT), separate from the **governance** ladder.
- **`docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`** — between slices: evaluate → fix → improve.
- **`docs/MEMORY_FRAMEWORK_DESIGN_BRIEF.md`** — subconscious built from receipts and verifiers, not vibes.

Nothing here relaxes §2.6. If anything below conflicts with NSSOT → **NSSOT wins**.

---

## What “reliable” means in the builder lane

| Signal | KNOW (evidence-backed) | THINK | Do **not** claim (GUESS / DON’T KNOW without probe) |
|--------|-------------------------|-------|-----------------------------------------------------|
| **`npm run builder:preflight`** exit **0** | Command script reached prod **`/ready`** + **`/domains`** with your key · **scoped** to that URL + moment | Repeated success suggests stability | Vault names “SET” or “prod healthy forever” → follow **`ENV_DIAGNOSIS_PROTOCOL.md`** |
| **Daemon JSONL · `cycle_ok`** | That **cycle**: supervise script exit **0** + queue runner exit **0** (`data/builder-daemon-log.jsonl`) | Repeated `cycle_ok` suggests loop stability | Feature quality, correctness of council output, “alpha ready for users” without other checks |
| **`BUILDER_DAEMON_SUPERVISE_MODE=probe`** | Cheap **reachability/preflight-class** signals (aligned with **`lifeos:builder:probe`**) | N/A replaces **full** doc+JS smoke | Full regression strength — use **`probe` vs `full`** tradeoffs in **`AUTONOMY_SUPERVISION_RUNBOOK`** |
| **`committed: true`** on `/build` | Git commit landed with recorded audit (**`builder/history`**) | Quality per spec | Automated “good enough for production” absent review |

Operators and agents **must not** summarize the above layers into a single undocumented “everything is green.” **§2.6 forbids implying stronger proof than ran.**

---

## Evidence ladder hooks (Amendment 39)

Facts about **infra** migrate through **`epistemic_facts`** + **`fact_evidence`** — never by copying JSONL prose into NSSOT unmigrated.

Rough mapping (**not** automatic promotion — ingestion jobs / operators must stay honest):

| Automation output | Typical ceiling without more trials | Typical `fact_evidence` event kinds |
|-------------------|---------------------------------------|--------------------------------------|
| First successful **probe** cycle | RECEIPT-ish “we have a dated receipt file” tier | Operator may add evidence linking to **`builder-daemon-log.jsonl`** line |
| Repeated **`cycle_ok`** under varied conditions | Toward TESTED — only with **explicit** verifier strategy + scope | replay, confirmation |
| **`node --check` / CI** (see `record-ci-evidence`) | Promotion path documented in **`AMENDMENT_39`** | `ci_pass` / `ci_fail` |

Builder/CI-ish output defaults per **`AMENDMENT_39`** anti-drift notes: treated as **CLAIM or RECEIPT** until proven elsewhere — daemon success **does not** equal **FACT**.

---

## `reliability_cues` field in **`data/builder-daemon-log.jsonl`**

The daemon attaches a **`reliability_cues`** object to key events so downstream tools (and Memory Intelligence ingestion, when wired) classify **truth** consistently.

Interpretation helpers:

| Field intent | Meaning |
|--------------|---------|
| `bridge` | This file (**stable path**) |
| `supervise_mode` | `probe` \| `full` \| `none` — depth of that cycle’s supervise step |
| `cycle_outcome` | `complete` \| `failed` — supervise + queue both succeeded for `complete` |
| **§2.6 reminder** | **Do not upgrade** KNOW → hype in UI/logs without matching evidence tier |

Phase 2+ (AmendMENT 39): optional tail ingestion → **`POST /api/v1/memory/facts/.../evidence`** remains **explicit** — no silent FACT creation from logs alone (`Zero-Waste` + §2.6).

---

## Memory posture “from now forward”

- **Institutional / platform facts** (what the system relies on about itself): **Evidence engine** — **`AMENDMENT_39`** + migrations + **`memory-intelligence` routes**. Seed with **`npm run memory:seed`** against target DB where appropriate · CI with **`npm run memory:ci-evidence`** per existing scripts.

- **Conversational session memory**: **`AMENDMENT_02`** surface (`conversation_memory`, legacy **`/api/v1/memory/*`** patterns) remains for chat continuity — **not** a substitute for epistemic level on infra facts.

- **Write discipline:** **`docs/MEMORY_FRAMEWORK_DESIGN_BRIEF.md`** — subconscious is only reliable if writes are receipt-disciplined; daemon JSONL **`reliability_cues`** exists to prevent “feels stable” substitutes.
