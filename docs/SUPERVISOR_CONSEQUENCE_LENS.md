# Supervisor lens — consequences, future-back, prior art, industry learning, **and Adam (governing lens)**

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

Two tracks — **human / trust** and **system / ops** — both scaled by load, abuse, and time.

Answer briefly; label **KNOW / THINK / GUESS**.

### A1 — Who gets hurt at scale?

1. **Users or third parties** — if this behaves *as designed*, who could still be harmed under abuse, coercion, misunderstanding, biased data, or edge populations?
2. **Trust / reputation** — what second-order effects hit support, churn, legal exposure, or “the product lied” narratives in **30–90 days**?
3. **Incentives** — what does this make **easier tomorrow** for **future-you** or **future agents** (skip consent, bury errors, soften §2.6 labels)?

### A2 — What breaks down?

4. **Dependencies** — DB, queue, Railway, Neon, APIs, keys, models — what **single point** fails first under **traffic, retries, deploys, or regional lag**?
5. **Operational limits** — quotas, timeouts, cron overlap, daemon races, migrations, rollback — **where does the architecture stop scaling** before anyone notices?
6. **Observable failure** — if it breaks tonight, **do we detect it honestly** (alerts, health checks, receipts) — or silent degradation / false greens?
7. **Residue risk** — strongest remaining reason something is wrong? (Keep in **§2.11b** report.)

---

## Lens B — Two years forward, looking back (premortem)

Imagine **today’s decision already shipped** and it’s **two years later**. Ask:

1. **What do we wish we had done today** that we skipped (tests, council, rollback plan, clearer SSOT)?
2. **What did we learn too late** — and what **cheap receipt** now would have caught it?
3. **What institutional memory** should land in **Change Receipts** / **handoff** so a cold agent doesn’t repeat the mistake?
4. If the answer is “we’d wish we’d run council,” → **schedule `run-council` or gate-change** before treating the decision as settled.

---

## Lens C — How was this solved before? (internal + external)

Use this **with** Lenses A and B: same class of problem may already have a **pattern** somewhere — don’t reinvent without knowing the tradeoffs.

### C1 — Inside this system (highest signal)

Label each **KNOW** only with a **cited path, receipt, or API row**.

1. **Repo / SSOT:** Search **Change Receipts** in the owning **`AMENDMENT_*`**, **`docs/CONTINUITY_LOG*.md`**, and **`prompts/lifeos-*`** for the same failure mode or feature class.
2. **Builder history:** **`GET /api/v1/lifeos/builder/gaps`** — have we **already** failed here (syntax classes, truncation, wrong model)? What **platform fix** landed?
3. **Patterns in code:** Ripgrep for the same integration (e.g. webhooks, encryption, council calls) before adding a second divergent implementation.
4. **What we explicitly decided not to do** — check **gate-change / council** summaries for **minority / residue** arguments; they often predict the regret Lens B surfaces.

### C2 — Outside: other teams and “AI companies” (THINK / GUESS until cited)

Industry moves fast; **web search and single-model memory are not KNOW**. Treat as **THINK** with sources, or **GUESS** if uncited.

1. **Published postmortems & safety reports** — outage writeups, alignment / incident blogs, transparency reports (what broke, what they changed).
2. **Regulators and standards bodies** — GDPR, AI Act–class guidance, NIST AI RMF, OWASP LLM Top 10-style checklists: what **must** we not ignore for **our** jurisdiction and data classes?
3. **Product patterns** — human-in-the-loop, rate limits, retrieval grounding, eval harnesses, red-teaming cadence: **what problem does each pattern solve**, and do we have that problem?
4. **What *not* to copy** — undocumented “it works in their closed garden” behavior, dark patterns, or **synthetic consensus** in chat pretending to be governance.

### C3 — Improve, don’t photocopy

After C1 + C2:

1. **Steal the mechanism, adapt the contract** — e.g. their **eval idea** + our **§2.6 receipts + run-council** for load-bearing forks.
2. **Name the delta** — one line: *“We adopt X because [problem]; we intentionally differ on Y because [our sovereignty / builder / Neon / Adam’s constraints].”*
3. **Record it** — so Lens B’s “cold agent repeats the mistake” doesn’t apply: **Change Receipts** or a short **research note** under **`docs/research/`** (no secret values; cite URLs when public).

---

## Lens D — Adam as governing lens (vision-holder, permanent in the loop)

**Adam is part of the system by design**, not as decoration. Agents and automation must earn **his** alignment on choices that bear on **his direction**, **constraints**, or **meaning** — not outsource “what Adam would want” to vibes.

**THINK:** No one gets **literal KNOW** about centuries or millennia ahead; we **can** architect for **durability**: receipts, SSOT amendments, council records, honest handoffs, and escalation paths so **future operators inheriting this lineage** retain **sovereignty and truth** (North Star §2.6 / user sovereignty framing).

Answer briefly.

### D1 — When must we **obtain correct input from Adam** (not infer)?

1. **Strategic ambiguity** — the ask could mean more than one build; naming is incomplete; direction conflicts with backlog or NSSOT priorities → **STOP** and ask in plain language (**§2.15** clarity / **HALT** with blocker).
2. **Value / boundary crossings** — consent, intimacy, coercion risk, minors, finances over threshold, autonomy that sends or spends on Adam’s behalf, anything that trades **truth** or **agency** → **explicit Adam lane** unless SSOT already **pre-ratified** the policy.
3. **Irreversibility or law** — one-way migrations, deletes, contractual exposure, constitutional SSOT edits → **Adam-shaped decision** documented (receipt).

### D2 — **Correct answers**: how to engage Adam fairly

4. **No trick questions** — give **two or three labeled options**, **tradeoffs**, and **your KNOW / THINK / GUESS** so he can delegate without misunderstanding.
5. **Default is not concealment** — if the cheap path skips his attention and **might** contradict his stated direction, surface it in **§2.11b** or a **focused ask** instead of burying under implementation detail (**§2.6** forbids omission that misleads).

### D3 — What the stack does **instead** so Adam is spared **lower-level noise**

6. **Tactical offload** — let **builder, verifiers, council on technical forks, and deterministic checks** absorb detail **when SSOT clearly covers** policy and risk is bounded; **tell Adam** “we automated X under rule Y.”
7. **Guardrails** — if an agent proposes to **narrow** escalation to Adam (e.g. “don’t bother him”), treat that as **stop-the-line** unless **Council + receipts** justified it (**§2.6 ¶8**).

---

## Outputs (keep lightweight)

- **§2.11b / session close:** Add a short **“Consequence lens (optional)”** paragraph when you used the lens — include **prior art / industry** as **THINK** with links if you used Lens C2; if Lens D applies, note **whether Adam was asked** or **correctly spared** under which SSOT/rule — or one line **“Lens skipped: low-stakes slice.”**
- **Heavy forks:** Prefer **recorded** debate (`AMENDMENT_01`, `run-council`) over a single model answering the questions alone.

## Tooling

- CLI: `npm run lifeos:builder:supervise -- --probe-only --consequence-lens` prints a one-screen reminder of this file’s questions (no API cost).
- Related: `docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`, `docs/BUILDER_RELIABILITY_EPISTEMIC_BRIDGE.md`, `docs/QUICK_LAUNCH.md` (Execution Protocol).
