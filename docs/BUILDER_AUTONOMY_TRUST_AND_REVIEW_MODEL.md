# Builder autonomy — trust ramp and review model (operator vision vs today)

**Purpose:** Align Adam’s intent (“~7 h highest-priority backlog, council extends when drained, **no promotion until reviewed**, trust earns autonomy”) with **what the codebase does today** and **what still needs platform work**.

**Last updated:** 2026-05-03

---

## Idea filters — refine, don’t discard

Autonomy will surface **constraints** (cost, branch policy, deploy drift, verifier gaps). Those are **inputs to redesign the slice**, not reasons to pretend an ambition never existed. See **`docs/BUILDER_IDEA_FILTERS_REFINEMENT.md`** — future lookback, unintended consequences as compound-loop fuel, and “barriers as prompts” without **§2.6** theater.

---

## Operator vs system triage (who decides what)

This is the division Adam described: **Adam chooses direction and program ordering**; the **system triages implementation** within that charter — **without** asking him to sort every file or ticket.

### Adam decides (portfolio / sovereignty — **not** line‑by‑line build order)

- **Which programs / amendments / lanes are “on”** and **their relative order** (e.g. LifeOS core vs Site Builder vs revenue vertical).
- **Vision boundaries**: what success means, what is forbidden, who it serves — North Star truth channel applies.

Adam **does not** need to manually stack every **`tasks[]` row** unless he **wants** to; ordering inside an approved program backlog is **system + Conductor** responsibility under receipts (**§2.11 / §2.11c** posture).

### The system triages (within Adam’s chosen programs)

- **How** to build: patterns, verifier gates, **`/gaps`**‑first platform fixes, builder domains, supervise **probe vs full**.
- **Execution order** inside a program: **queue JSON order**, batch size (**`BUILDER_QUEUE_MAX`**), when to **wrap** the cursor, when to **open** a gate‑change or **re‑run** with a tighter spec.
- **“First N features”** or **first slab of work** when everything feels urgent: produce a **big‑picture outline** (brainstorm Phases 1–4 + **triage** in **`docs/BRAINSTORM_SESSIONS_PROTOCOL.md`**) so “I want it all” becomes a **capped, ordered** set with **receipts** — not infinite parallel thrash.

### When you drift or everything feels P0

- **Request** a **brainstorm session** or a **synthesis doc** that names the **smallest** **coherent** **first** package (e.g. “first 5 **must** — next 10 **next** — rest **icebox**”).
- AIs and Conductor help **reflect the big picture**; they do **not** override Adam’s **program** **order** without a **governed** debate (see below).

### Escalation when priorities **inside the system** conflict or the stack is **struggling**

**Stop** ad‑hoc “ask Adam to pick A vs B” for every row. **Escalate up** the **machine** path so **more models** can **debate** **recorded** **struggles** (gaps, repeated failures, architecture fork):

| Step | What | Why |
|------|------|-----|
| **1 — Evidence** | **`GET /api/v1/lifeos/builder/gaps`**, daemon JSONL, **`builder-continuous-queue-last-run.json`** | Same facts for every model |
| **2 — Deeper smoke** | Full **`lifeos:builder:supervise`** (not only probe) when depth is worth the token cost | Catches doc/JS regression class |
| **3 — Multi‑model debate (load‑bearing)** | **`POST /api/v1/lifeos/gate-change/run-preset`** or **`.../proposals/:id/run-council`** on the **running** app (Railway keys) — see **`docs/QUICK_LAUNCH.md`**, **`AMENDMENT_01`**, **`docs/CROSS_AGENT_CHANNEL.md`** | North Star **Article II §2.12** — not “we agreed in this chat” |
| **4 — Adam** | **Decide** when the council **splits**, or the fork is **values / law / revenue / irreversible** | Human scope for **§2.12** / **§2.15** — not micro‑queue ordering |

**Rule:** The more the system has **earned trust** (verifiers green, gaps down), the more the Conductor can **execute** system triage **without** **nagging**; the more **struggle** or **disagreement**, the more **escalation** **toward** **recorded** **multi‑model** **debate**, **not** toward Adam sorting tickets.

---

## Operator target (Adam’s wording, normalized)

1. Run the autonomous queue long enough for a **meaningful slab of work** (e.g. **~7 h wall clock** via bounded daemon preset — not the same as 7 h of model time).
2. Execute **highest priorities first**, then proceed **down** the list.
3. If the backlog **runs out**, something at **council / system** scope should consider **needs** and **propose continuation** — **human-gated** at first.
4. **Promotion rule:** autonomous output must be **reviewed** before it is treated as “shipped truth” (**merge to main**, **deploy to prod**); trust **ramps**: more autonomy **only after** receipts.
5. **Railway/production** should not move blindly on every autonomous commit unless policy says so (**deploy ≠ git commit**, but both need discipline).

---

## KNOW — behaviour today

| Aspect | Reality |
|--------|--------|
| **Priority order** | **`tasks[]` array order** in `LIFEOS_DASHBOARD_BUILDER_QUEUE.json` (index **0** runs before **1** …). Put **must-do rows first**. There is **no separate `priority`** field sorting yet — **ordering the array is the knob**. |
| **~7 h slab** | **`npm run lifeos:builder:daemon:7h`** — **`--run-for-min 420`**, **`--interval-min 15`**, **`--queue-max 12`** (adjust as needed). **Wall clock** exits cleanly; **`/build` count** still depends on **queue depth**, **`BUILDER_QUEUE_MAX`**, successes, and **idle tail** when the cursor passes the end (**append tasks**, **`--reset-cursor`**, or **`BUILDER_QUEUE_CURSOR_WRAP`** for recycle trading tokens). |
| **Commits** | **`POST /api/v1/lifeos/builder/build`** on success normally runs **`commitToGitHub`** to the branch you pass (**default repo branch**, often **`main`**, if **no branch** body field). That **does push commits to GitHub** on that branch — it does **not** wait for Adam’s subjective “looked over” unless you **change branch policy**. |
| **Promote main / Railway** | **Merge to main** and **deploy** are **separate** steps (PR review, **`npm run system:railway:redeploy`**, Railway auto-deploy hooks). Treat **“production truth”** as **what’s live**, not merely “committed somewhere.” |
| **Council auto-refills JSON queue when empty** | **Not wired as an unattended loop.** To extend backlog: **brainstorm sessions** (**`docs/BRAINSTORM_SESSIONS_PROTOCOL.md`**), **`/builder/task`**, **`/gate-change/run-preset`**, or **manual** `tasks[]` edits — intentionally **human/council‑governed** so Zero Waste AI is not looping “invent backlog” without work checks. |

---

## Trust tiers (recommended policy — escalate intentionally)

These are **governance checkpoints**, not code-enforced ladders yet except where noted.

| Tier | Git / builder posture | Typical use |
|------|----------------------|-------------|
| **0 — Observe** | **`--dry-run`** queue · probe-only daemon | Sanity + ordering |
| **1 — Review branch** | Set **`BUILDER_QUEUE_COMMIT_BRANCH`** (env) **or** per-task **`"branch"`** in JSON → commits land on **`e.g. lifeos/autonomy-review`** (**`committed:true`** still required). **Human merges** to **`main`** when satisfied. **`lifeos-builder-continuous-queue.mjs`** forwards **`branch`** to **`POST /build`**. Optional fail-closed: **`BUILDER_QUEUE_REQUIRE_COMMIT_BRANCH=1`** — **HALT** if any task would use implicit default branch (forces env or per-task branch). |
| **2 — Mainline auto-commit** | No branch override → **`main`** / default deploy branch (**current heavy-trust posture**). The queue **warns once per batch** (unless **`BUILDER_QUEUE_SILENCE_DEFAULT_BRANCH_WARNING=1`**) so **Tier 2** is **conscious**, not silent. Requires **verified** supervise + gap hygiene. |
| **3 — Autonomous backlog extension** | Council/session produces **new `tasks[]` rows**; still needs **explicit approval** unless a future gated job runs under **North Star §2.12 / UsefulWork** (**not silently implemented** yet). |

**Ramp:** move **Tier 1 → 2** only with **measurable** receipts: **`/builder/gaps`** syntax bucket down, supervise **full** green on regressions you care about, **§2.11b-style** graded report Adam accepts.

---

## “Highest priority first” checklist

1. Sort **`tasks[]`** so the **first** rows are non-negotiable (SSOT-aligned, verifier path known).
2. Use **`daemon:7h`** (or **`BUILDER_DAEMON_RUN_FOR_MIN=420`** + interval + **`BUILDER_QUEUE_MAX`**) so the slab is long enough **and** capped.
3. For **no-promote-until-reviewed** during a slab: **`export BUILDER_QUEUE_COMMIT_BRANCH=lifeos/autonomy-review`** on the daemon host (**and** delete or reset **cursor** once if you switched branch policy mid-queue so expectations stay clear).

---

## Related docs

- **Refine-not-discard filters + lookback:** `docs/BUILDER_IDEA_FILTERS_REFINEMENT.md`
- **Bounded 7 h preset + env:** `docs/BUILDER_OPERATOR_ENV.md`
- **Throughput / idle honesty:** `data/builder-continuous-queue-last-run.json` (includes **`commit_branch_receipt`** when present)
- **Brainstorm continuation (ideas, not silent daemon):** `docs/BRAINSTORM_SESSIONS_PROTOCOL.md`
- **Council is not IDE chat:** `docs/CROSS_AGENT_CHANNEL.md`

---

## Gaps to build later (truthful backlog)

- **Persisted trust tier / policy** per program (Neon flag or amendment table), not env-only prose.
- **Optional** `priority` numeric field **without** breaking cursor semantics (would need **cursor-by-task-id**, not raw index alone).
- **PR creation** helper after commits on review branch (**system**: GitHub PR API) — avoids manual merge friction at scale.
