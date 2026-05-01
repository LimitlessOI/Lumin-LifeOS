# Supervisor lens — unintended consequences and “two years back”

**Purpose:** Optional questions the **Conductor / supervisor** (human or agent) applies when a slice is **load-bearing**: architecture, new autonomy, money, data, trust, or anything hard to undo. **Not** a mandatory gate on every commit — **discretion** avoids token waste and ceremony fatigue.

**North Star fit:** Article II **§2.6** (honest limits), **§2.10** (observe / grade / verify), **§2.11b** (plain report with residue risk), **§2.12** (technical forks → council when appropriate).

---

## When to use this lens (THINK — supervisor judgment)

**Lean in** when several of these are true:

- Irreversible or expensive rollback (schema, auth, billing, public API contract).
- New **background** or **scheduled** behavior (cron, daemon, “always on”).
- Relaxing a **fail-closed** or **verification** step (§2.6 ¶8 path still applies).
- Cross-domain impact (LifeOS + TSOS + builder + customer data in one change).
- Adam asked for speed / scope in a way that could trade away **truth** or **safety**.

**Lean out** (skip or one-line): typos, copy, strict additive tests, docs-only with no policy change, or a slice **already** going through full **gate-change / run-council** with the same concerns covered there.

---

## Lens A — Unintended consequences

Answer briefly; label **KNOW / THINK / GUESS**.

1. **Who could be harmed** if this works *exactly as designed* but context changes (abuse, scale, bad input)?
2. **What second-order effect** might show up in logs, support, or reputation in 30–90 days?
3. **What did we outsource** (vendor, model, key) — what breaks if they change pricing, ToS, or latency?
4. **What incentive** does this create for **future-you** or **future agents** (corners easier to cut next time)?
5. **Residue risk** — strongest reason this might still be wrong? (Keep in **§2.11b** report.)

---

## Lens B — Two years forward, looking back (premortem)

Imagine **today’s decision already shipped** and it’s **two years later**. Ask:

1. **What do we wish we had done today** that we skipped (tests, council, rollback plan, clearer SSOT)?
2. **What did we learn too late** — and what **cheap receipt** now would have caught it?
3. **What institutional memory** should land in **Change Receipts** / **handoff** so a cold agent doesn’t repeat the mistake?
4. If the answer is “we’d wish we’d run council,” → **schedule `run-council` or gate-change** before treating the decision as settled.

---

## Outputs (keep lightweight)

- **§2.11b / session close:** Add a short **“Consequence lens (optional)”** paragraph when you used the lens — or one line **“Lens skipped: low-stakes slice.”**
- **Heavy forks:** Prefer **recorded** debate (`AMENDMENT_01`, `run-council`) over a single model answering the questions alone.

## Tooling

- CLI: `npm run lifeos:builder:supervise -- --probe-only --consequence-lens` prints a one-screen reminder of this file’s questions (no API cost).
- Related: `docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`, `docs/BUILDER_RELIABILITY_EPISTEMIC_BRIDGE.md`, `docs/QUICK_LAUNCH.md` (Execution Protocol).
