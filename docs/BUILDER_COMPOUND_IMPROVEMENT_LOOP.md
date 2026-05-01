# Compound improvement loop — between every slice

**North Star alignment:** honesty on evidence (§2.6); Conductor supervises the system (§2.11c); session report to Adam when load-bearing (§2.11b).

## Rule

Treat **no slice as complete at “committed”**. Complete means: **evaluate → fix or queue → improve something durable** so the **next slice starts from a strictly better platform**.

This applies to builder runs, autonomy cycles, and any conductor-led slice routed through HTTP `/build`, the daemon queue, or GAP-FILL — same muscle.

## Before you start the next slice (minimum)

| Step | Action |
|------|--------|
| **1. Evaluate** | Name **what shipped** vs **stub** (`⚠️ INCOMPLETE:` where needed). Grade **risk / quality** with **evidence** (tests, curls, receipts, `/ready`), not vibe. Label **KNOW / THINK / GUESS** on anything load-bearing. |
| **2. Fix surfaced defects** | If this slice exposed **flakes** (502 patterns, smoke race, verifier gap, misleading “green”), land the **smallest** fix **now** when safe, or one tracked **GAP-FILL** receipt with **exact blocker** — never silently carry the same landmine twice. |
| **3. Improve one lever** | Pick **at least one**: tighten **`spec`** / queue JSON entry; adjust **retry** env (`OVERNIGHT_*`, `SUPERVISOR_*`); run **`npm run tsos:doctor`** and downgrade a red gap; add or harden **verifier / inner-review** (`npm run lifeos:builder:inner-review`) on **`routes/`**, **`services/`**, large **`public/overlay/`**; extend **instrumentation** (logs, `/builder-health`, preflight append). |

## Receipts (SSOT)

Same session:

- **`## Change Receipts`** — include **slice outcome** + **what improved for the next slice** (one line minimum).
- **`## Agent Handoff Notes`** — **Next priority** names the **compound** follow-up when not done.

Cold agents rely on these; omitting Step 3 is **drift**.

## Fits with existing tooling

| Tool | Role |
|------|------|
| **`npm run builder:preflight`** | Evidence before `/build`; fail-closed discipline. |
| **`npm run lifeos:builder:probe`** | Cheap prod pulse between heavy slices. |
| **`npm run tsos:doctor`** | Cross-cutting gap list — pick one red cell when choosing Step 3. |
| **`npm run lifeos:builder:inner-review`** | Second pass on risky diffs — trains reviewer behavior in-pipeline. |
| **Daemon `/ daemon_log`** | 24/7 path: every cycle is a chance to read **`cycle_failed`** + **`lastError`** and tighten queue or infra. |

## Anti-patterns

- Closing a slice **without** naming what would fail next time under stress.
- “We’ll fix process later” **with no receipt row**.
- Repeated **GAP-FILL** for the **same** root cause — that is stop-the-line: fix the platform or AI Council-path, not Adam’s throughput.

Related: **`docs/AUTONOMY_SUPERVISION_RUNBOOK.md`**, **`docs/BUILDER_24_7_ALPHA_CHECKLIST.md`**, **`docs/BUILDER_RELIABILITY_EPISTEMIC_BRIDGE.md`** (§2.6 + Am.39 evidence ladder + KNOW/THINK boundaries for daemon/probe), **`prompts/lifeos-council-builder.md`** (compound section).

## Optional — consequence lens (supervisor discretion)

For **load-bearing** slices only, the supervisor **may** apply **`docs/SUPERVISOR_CONSEQUENCE_LENS.md`**: unintended consequences (A), **two-year-back** premortem (B), plus **prior art & industry learning** (C): internal receipts/gaps/code, external published practice (**THINK** until cited), and **improve-don’t-photocopy** deltas. **Optional** — avoids ceremony on trivia; **use judgment** when tradeoffs touch safety, money, irreversibility, or autonomy. **`npm run lifeos:builder:supervise -- --probe-only --consequence-lens`** prints a no-API-cost reminder.

## Truth / reliability (not optional)

Every slice must **classify** what is **KNOW** vs **THINK** vs **not proven** for load-bearing statements (North Star **§2.6**). Autonomous logs now carry **`reliability_cues`** in `data/builder-daemon-log.jsonl` — narrative in the bridge doc above. **Platform “memory” of whether the system is trustworthy** belongs in **AmendMENT 39** (`epistemic_facts` + evidence), not vibes.
