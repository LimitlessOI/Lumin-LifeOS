# Memory Framework Design Brief
**Status:** Draft + build underway — Phase 1 shipped in repo (`AMENDMENT_39`); Phases 2–4 in backlog.  
**Authored:** 2026-04-26 (Claude Code session)  
**Context:** LimitlessOS / LifeOS — multi-agent, multi-IDE AI platform (Railway/Node.js/PostgreSQL)  
**Purpose:** Capture the full design thinking from a brainstorm session. Share with other models for input. Then build into SSOT DNA.  
**Principle that governs this doc:** We do not need to go faster. We need to grow right.

**Indexed in SSOT:** [`projects/INDEX.md`](projects/INDEX.md) — **registry row 39** · [`projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md`](projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md) (spec + API + tables) · [`projects/AMENDMENT_38_IDEA_VAULT.md`](projects/AMENDMENT_38_IDEA_VAULT.md) **§ Seed catalog → §D** (operator-facing squeeze) · [`REPO_MASTER_INDEX.md`](REPO_MASTER_INDEX.md) §B · [`AGENT_RULES.compact.md`](AGENT_RULES.compact.md) (compact MEMORY INTELLIGENCE block).

---

## 1. The Strategic Why

This project competes against large, well-funded technology companies. The only viable asymmetric advantage is a software system that builds at scale, guided by human vision, with minimal human hands on technical implementation.

The two output equations:

| Competitor | Equation |
|---|---|
| Large company | Headcount × Salary × Time = Features |
| This system | Vision × System = Features |

Headcount has diminishing returns — coordination cost grows faster than capacity. A system that builds correctly **compounds** — every session it knows more, makes fewer mistakes, needs fewer human corrections. Institutional knowledge that took years to build cannot be bought or copied. The moat is not the technology. The moat is the operating discipline enforced by the technology.

The constraint shifts: if the system handles code, the bottleneck becomes **vision and spec quality**. The human operator becomes an architect, not a typist.

**One hard principle from this:** Building wrong is equivalent to not building at all. Slow and right. Computing power can always be added later. A wrong foundation cannot be patched — it must be torn out.

---

## 2. The Conscious / Subconscious Memory Model

### The Split

| Layer | What it is | Size | Access pattern |
|---|---|---|---|
| Conscious | Working set + map | Small, fixed token budget | Always loaded |
| Subconscious | Full store — docs, DB, Git, history | Vast | Retrieved on demand, with citations |

The conscious layer is not a summary of the subconscious. It is a **map** — it tells the agent where truth lives, what the current task is, and what the contested zones are. The agent then pulls from the subconscious only what it needs.

### Why this matters

The current failure mode: agents load everything they can find and treat it all equally. This is expensive (tokens), slow (reads), and dangerous (stale facts have the same weight as verified laws).

The new model: agents load a small, stable conscious pack first. Retrieval is explicit, cited, and confidence-tagged. The subconscious is vast but governed — not a "model that already knows things," but a store that returns provenance alongside content.

### The crucial distinction

The subconscious is only as reliable as its write discipline. A brain's subconscious consolidates from experience. This system's subconscious is built from **receipts, verifiers, and commits** — or it is unreliable. "All the answers are there" is only true if the write path was disciplined. This is why constitutional governance is not decoration — it is what makes retrieval trustworthy.

---

## 3. The Hierarchy of Truth (Epistemic Ladder)

Every stored fact must declare its level. Confidence is earned through trials, not assertion. A fact cannot claim a higher level than its evidence supports.

| Level | Label | What earns it |
|---|---|---|
| 0 | CLAIM | Someone stated it — no evidence |
| 1 | HYPOTHESIS | Has a rationale, not yet tested |
| 2 | TESTED | Ran a real verifier and survived |
| 3 | RECEIPT | Evidence committed, path cited |
| 4 | VERIFIED | Multiple independent agents/sessions confirmed |
| 5 | FACT | High hit rate across varied conditions |
| 6 | INVARIANT | Proven to hold 100% across all adversarial challenges and conditions; zero exceptions ever recorded |

**Critical naming distinction — two ladders, never one:**

This is the **Evidence Ladder** — for empirical facts earned through trials. It is separate from the **Governance Ladder** (Constitutional Article → Ratified Amendment → Operational Rule → Working Guideline) which already exists in NSSOT and is ratified by process, not earned by evidence.

A fact cannot auto-promote to constitutional authority no matter how many times it proves true. INVARIANT means "this holds in all tested conditions." LAW in this repo means "ratified by process under Article VII." These are different kinds of authority and must never share a name or a table.

### How a fact earns its level

- **Trial count** — how many times has it been tested?
- **Adversarial trial count** — how many times has someone specifically tried to disprove it?
- **Source diversity** — did one agent confirm it 50 times, or 50 independent agents?
- **Exception count** — has it ever failed? Under what conditions?
- **Decay rate** — how fast does the relevant code area change? (fast churn = fast decay)

A fact at 100/100 across adversarial challenges, across multiple independent sources, with zero exceptions = INVARIANT. Any exception demotes it immediately — back to FACT or lower depending on how fundamental the exception was.

**The governing design question for every retrieval:** Not "what do we know?" but "what has earned the right to influence action, at what weight, in this context?"

**Scope is mandatory on every fact.** Most facts are conditionally true, not universally true. Every fact requires:
- `context_required` — "Railway production", "local shell with exports", "Neon prod DB" etc.
- `false_when` — conditions under which this fact does not hold

Without scope, a fact can be technically correct and operationally misleading simultaneously.

### The human parallel

Humans run on unverified facts their whole lives — not by choice, but because confidence is shaped by repetition, social proof, and emotional investment rather than evidence. Familiarity feels like truth. This is the failure mode we are designing out of the machine. It is also what LifeOS teaches users to examine in themselves: not what to think, but how to build justified confidence in a belief — and how to notice when you're running on a falsehood.

---

## 4. The Devil's Advocate Gate

Before any fact is promoted from TESTED → VERIFIED, it must survive a designated adversarial challenge. One council member's role is explicitly to disprove the candidate fact. If it survives, it is promoted **and the attack is logged as evidence of robustness**.

This is not optional debate — it is a formal promotion gate. The adversarial trial count is what separates "hasn't been disproven" from "was specifically attacked and held."

The log of attacks and survivals becomes **institutional knowledge about how robust a fact is** — future agents can see not just that something is VERIFIED, but what was thrown at it and what held.

---

## 5. The Contested Fact — Full Debate Record

When two agents reach different conclusions from the same data, that disagreement is not noise. It is a structured memory event containing the highest-quality information about where the truth is ambiguous or the evidence is insufficient.

A full debate record captures:

1. Starting positions of each party (with their evidence and confidence levels)
2. Specific arguments made (not just "they disagreed")
3. What evidence or reasoning caused any party to move
4. The final consensus and how it was reached
5. What the process revealed about the question itself
6. What to do differently next time a similar fork appears
7. Lessons learned about **how to reason through this class of problem**

Over time, the debate record library becomes **institutional knowledge about reasoning patterns** — not just what was decided, but how to think through specific classes of disagreement efficiently. The goal: future disagreements of the same type resolved faster and better, because the reasoning pattern already exists.

---

## 6. What a "Stored Fact" Becomes

**Currently:** a string of text in a file, with a date.

**New model:** a record with properties that travel with it everywhere:

```
{
  text:           "GITHUB_TOKEN is set in Railway vault",
  level:          VERIFIED,
  trial_count:    4,
  adversarial:    1,
  exceptions:     0,
  sources:        3,        // independent confirmations
  last_tested:    2026-04-25,
  decay_rate:     slow      // based on code churn in this area
}
```

The structure of the store communicates confidence before the agent reads the content. Agents act proportionally — LAW gets full trust, CLAIM gets GUESS treatment. A fact retrieved without a level is a CLAIM by default.

---

## 7. The Institutional Knowledge Layer (New — Doesn't Exist Yet)

Three tables that do not exist in any current memory system:

**Lessons Learned** — categorized by domain and impact class  
Fields: problem, solution, how novel, who surfaced it, retrieval count, impact score  
Purpose: things we solved that nobody else has solved; ideas with impact small or large  
Key question on everything logged: is this worth the retrieval cost later? Only log what has retrievable value — not every observation, but anything that would have saved time if we'd known it earlier.

**Debate Records** — as described above  
Fields: positions, arguments, what moved, consensus, lessons, class of problem, duration to resolution  
Purpose: institutional knowledge about how to reach consensus, not just what was decided

**Agent Performance** — track record by task type, including the human operator  
Fields: agent_id (including "adam"), task_type, prediction, outcome, confidence_calibration  
Purpose: route future tasks to the agent with the best track record on that type; learn from every decision, including overrides

---

## 8. How This Changes the Three Memory Layers

### Conscious pack (working set) — becomes situationally aware

Not just: compact rules + handoff + task

New: compact rules + handoff + task **+ contested zones** (where active facts are below VERIFIED) + **relevant agent performance signals** (who to trust on this task type) + **prefetched retrieval** (based on task embedding, relevant amendments fetched before asked)

### Subconscious (retrieval store) — becomes stratified

Physically organized by confidence level. LAWs at the top, CLAIMs at the bottom. Retrieval always returns: text + level + confidence + trial history + source list. An agent that treats a CLAIM as a LAW is making a traceable, logged epistemic error.

### Institutional layer (new) — learns how to reason, not just what is true

The layer that makes the system compound. Lessons, debates, performance records. Queryable by problem class, not just by keyword.

---

## 9. The 25 Ideas (Organized by Theme)

### Theme A — Epistemic Infrastructure
1. **Epistemic State Machine** — every fact has a tracked level (0-6); transitions require evidence; queryable
2. **Confidence Decay Curves** — decay rate tied to code churn in referenced area, not just elapsed time
3. **Conflict Entropy Score** — facts that have been contradicted repeatedly get flagged for council review
4. **Constitutional Hash Pinning** — North Star/Companion pinned to content hash; downstream claims cite hash; changes auto-flag stale dependents
5. **Anti-Hallucination Embedding** — embed on two axes: semantic meaning AND evidence quality; retrieval prefers high-evidence clusters

### Theme B — Write and Retrieval Discipline
6. **Memory Provenance Chains** — every fact links to what created it: receipt → commit → session → who said it
7. **Predictive Memory Prefetch** — based on declared task, prefetch relevant amendments before agent asks
8. **Timed Memory Injection** — some facts are time-relevant: "at session start, retrieve X"; "when editing auth, retrieve Y first"
9. **Memory-to-Code Coupling Verification** — inverse of SSOT enforcement: does code still match what the amendment claims?
10. **Semantic Dead Zone Mapping** — explicitly map known unknowns: questions asked repeatedly but never answered and written to canon

### Theme C — Institutional Knowledge
11. **Full Debate Records** — contested facts with complete reasoning trail, not just the outcome
12. **Agent Disagreement as Structured Signal** — divergence between agents is the highest-quality ambiguity signal; harvested not ignored
13. **Counterfactual Memory** — store what almost happened and why it didn't; prevents repeating near-misses
14. **Epistemic Dream Consolidation** — off-peak job reviews daily receipts, proposes condensed lessons for human approval
15. **Outcome-Coupled Memory** — track whether decisions held; decisions never reversed → promoted to load-bearing

### Theme D — Agent and System Performance
16. **Adversarial Memory Testing** — periodically give agent only the conscious pack; compare "what would you do next?" to actual next_task; gaps mean conscious pack is underspecified
17. **Agent Persona Memory** — track which agent type is most accurate on which problem class; route accordingly
18. **Memory Muscle Memory** — when same operation sequence appears 3+ times, compress into a procedural workflow fact automatically
19. **Memory Immune System** — when a false claim appears 3+ times, pattern is learned and flagged on next appearance

### Theme E — Architecture and Scale
20. **Memory Blast Radius Graph** — any amendment query returns what depends on it: routes, services, migrations, receipts
21. **Subconscious Compression Layer** — TSOS applied to memory: active facts decompressed, archive compressed; retrieval tracks cost
22. **Memory as Audit Trail for Decisions** — snapshot the active conscious pack at time of council run; replay later to see what the agent knew when it decided
23. **Constitutional Memory Inheritance** — new tenants inherit governance layer; start with empty episodic/semantic; correct behavior from day one
24. **Cross-Tenant Pattern Learning** — patterns shared across tenants without sharing data; federated retrieval heuristics
25. **Memory SLA as Product** — contractual commitment: cold-start pack in <N tokens, X% citation accuracy; enforced by verifiers; sold to B2B customers

---

## 10. The Build Order (Slow and Right)

**Phase 1 — Foundation (build nothing else until this is solid)**
- `epistemic_facts` DB table with all five confidence properties
- `fact_trials` table: every test result logged
- Write protocol: every new fact must declare level at write time
- Retrieval contract: always returns level + confidence alongside text
- Pre-commit enforcement: no fact commit without level declaration

**Phase 2 — Institutional Layer**
- `debate_records` table: full debate structure
- `lessons_learned` table: domain, impact class, retrieval count
- Devil's advocate gate: adversarial challenge before TESTED → VERIFIED promotion

**Phase 3 — Agent Performance**
- `agent_performance` table including human operator
- Task-to-agent routing based on track record
- Intent drift tracking: shipped work vs. declared ask

**Phase 4 — Temporal and Graph**
- Confidence decay curves
- Memory blast radius graph
- Cross-tenant pattern learning

---

## 11. Open Questions for Other Models

These are genuine open questions — not invitations to agree, but to pressure-test or add what was missed.

**Q1 — Epistemic ladder:** Is six levels right, or does this collapse to fewer that are actually distinguishable in practice? What's the minimum viable hierarchy that doesn't become cognitive overhead?

**Q2 — Decay rate:** Code churn as a proxy for fact decay is intuitive but imperfect. What's a better signal? What happens to facts about business logic (not code) — do they decay differently?

**Q3 — Devil's advocate gate:** This adds latency to every promotion. At what volume does this become a bottleneck? When should it be skipped, and what are the safe conditions for skipping it?

**Q4 — Lessons learned threshold:** How do you decide what's worth logging vs. what bogs the system down? Is "would this have saved time if we'd known it earlier?" sufficient, or is there a better filter?

**Q5 — Agent performance tracking including the human:** Adam proposed tracking the human operator's decisions the same way agent decisions are tracked. What are the implications — for trust, for feedback loop design, for how overrides are surfaced?

**Q6 — Constitutional inheritance for tenants:** The governance layer is the seed. But different tenants have different domains — a healthcare company's constitutional constraints differ from a real estate company's. How much of the governance layer is universal vs. tenant-configurable without losing the moat?

**Q7 — The competitive moat:** The claim is that the institutional knowledge corpus (receipts, debates, lessons, provenance chains) is uncopyable because it took time to build under disciplined governance. Is this true? What's the fastest a well-funded competitor could replicate it? What are the failure modes of this moat?

**Q8 — What was missed?** Given all of the above — what is the most important idea that wasn't surfaced? What assumption in this design is most likely to be wrong?

---

## 12. What This Is Not

- This is not a technical spec ready to implement. It is a design brief for review.
- This is not a claim that all 25 ideas should be built. Many will be refined or discarded after review.
- This is not a replacement for the existing SSOT system. It is a proposed evolution of how facts are stored and retrieved within that system.
- This will not be rushed. The right architecture here compounds in value for years. A wrong one built fast is worse than nothing.

---

*End of brief core. Prepared for cross-model review. Once reviewed, findings will be incorporated into SSOT — likely **Amendment 36** (handoff / cold-start) and/or **Amendment 02** (Memory), or a **new amendment with a free number** — **not** Amendment 37, which is already **[Universal Overlay](projects/AMENDMENT_37_UNIVERSAL_OVERLAY.md)**.*

---

## 13. External review — improvement proposals (2026-04-26)

Cross-model additions to pressure-test and harden the brief before any DB work:

1. **Map the ladder to existing NSSOT epistemics** — North Star / Companion already use KNOW / THINK / GUESS / DON'T KNOW. Define a **strict mapping** from ladder levels ↔ those labels so agents do not run two incompatible truth vocabularies.

2. **Split “truth domain” from level** — Same word “LAW” confuses **constitutional law** (Article II), **operational invariant** (“preflight exit 0”), and **empirical regularity** (“this API always returns 404 when drifted”). Tag each record: `domain: constitutional | operational | empirical | strategic`.

3. **LAW cannot be machine-promoted without human constitutional path** — Auto-promotion to level 6 conflicts with multi-party lock / gate-change for NSSOT. Reserve **LAW** for ratified constitution; use **FACT** or **VERIFIED** for “100% in all trials so far” at the operational layer.

4. **Full promotion/demotion audit chain** — Never overwrite level; append `fact_level_history` rows (who, when, old→new, evidence ref). “Was LAW until exception” is as valuable as the current level.

5. **Attach minimum sample sizes** — Define thresholds in the spec: e.g. cannot label **FACT** until N diverse trials + M adversarial attempts; prevents premature labels after one green run.

6. **Integrate debate records with existing council tables** — Prefer extending **`gate_change_proposals`** / `council_rounds_json` (or parallel keyed to `proposal_id`) over a siloed `debate_records` that duplicates HTTP council semantics.

7. **Separate “model routing reliability” from “claim truth level”** — Agent performance (#17) is **prediction quality**; epistemic level is **world claim quality**. Do not merge into one score or agents will mis-route on unrelated dimensions.

8. **Explicit uncertainty beyond ordinal levels** — Optional `confidence_01` or Beta(α,β) for statistical claims; the 0–6 ladder stays for governance-friendly UX.

9. **Constitutional hash pinning ↔ embedding versioning** — When NSSOT hash changes, invalidate or re-tag prefetches and embeddings that were trained on old text (#4 + #8 in brief).

10. **Privacy / redaction class on institutional records** — Debates and lessons may contain secrets; add `visibility: operator_only | tenant | public_pattern` before any cross-tenant pattern mining (#24).

11. **Contested-zone TTL and stale closure** — Contested zones in the conscious pack need **expiry or re-validation** so everything does not stay “contested forever” after the code path cooled.

12. **Dedup / canonical fact ID** — Same proposition in two amendments = one `canonical_fact_id` + references; avoids two conflicting levels for one world-state.

13. **Replay harness (institutional unit test)** — Snapshot conscious pack at time T + decision D; later, re-run “what would you do?” and measure divergence. Quantifies cold-start quality without philosophy.

14. **Graceful degradation** — If `epistemic_facts` does not exist yet, tools fall back to current markdown + receipts **without** displaying fake levels.

15. **Human override as first-class adversarial trial** — Operator demotion/promotion with **reason code** and optional evidence link; counts toward `adversarial` or `sources` intentionally.

16. **Time-bound hypotheses** — **HYPOTHESIS** rows carry `review_by`; expired → auto-flag as STALE or downgrade to CLAIM.

17. **Builder alignment** — Treat model-generated prose as **CLAIM** or **RECEIPT** until verifiers pass; passing CI = promotion event to **TESTED**, not automatic **FACT**.

18. **Zero-Waste coupling** — Any “dream consolidation” / nightly epistemic job must use **`createUsefulWorkGuard`** (real work check); cite `CLAUDE.md` in Phase 2+.

19. **Two-product clarity** — **Operator institutional memory** (this repo, Adam, council) vs **LifeOS end-user epistemics** (teach users how to think). Same ladder *concept*, possibly **different tables and tenancy** — spell out in Phase 1 schema doc.

20. **Bogging-down metric is mandatory** — Before scaling logging, track **write cost** (tokens + human time) vs **retrieval saves**; auto-surface if a lesson type’s net value < 0.

21. **Intent drift as memory event** — North Star **§2.11b / §0.5I** INTENT DRIFT should log into institutional layer (asked vs shipped) with the same structure as contested facts.

22. **Wording variants** — `canonical_statement_id` + localized or historical phrasings; retrieval merges variants so semantic search does not fragment levels.

23. **Failure mode: performative adversarial** — Devil’s advocate that always “loses” adds noise. Track **quality of attacks** (did it find real bugs?) and weight promotions accordingly.

---

## Additional design elements (post cross-model review)

**Residue risk:** When a council reaches consensus, the minority view is not discarded — stored as `residue_risk: { argument, confidence, conditions_that_would_reopen }`. Unresolved uncertainty survives consensus. It waits.

**Disproof recipe:** Every important fact carries a `disproof_recipe` — the fastest known way to try to break it. Makes adversarial challenges systematic, not random.

**The governing design sentence:** *”The system should not ask ‘what do we know?’ It should ask ‘what has earned the right to influence action, at what weight, in this context?’”*

---

*Reviewed by: Claude Code, Cursor, GPT-5.4. Now building: AMENDMENT_39 — Memory Intelligence System. (AMENDMENT_37 = Universal Overlay, AMENDMENT_38 = Idea Vault — both taken.)*
