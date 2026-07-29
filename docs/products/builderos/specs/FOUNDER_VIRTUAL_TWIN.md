<!-- SYNOPSIS: Founder Virtual Twin — what to capture, how to compile it, and the build order -->

# Founder Virtual Twin — Decision Compiler Spec

**Status:** CANONICAL SPEC (implementation partially started)  
**Constitutional anchor:** North Star §2.0H Founder Intent Model Law  
**Internal name:** Adam Simulator (implementation); **Founder Virtual Twin** (product name)  
**Not to be confused with:**
- `docs/products/builderos/TWIN.md` — **code** digital twin (BuilderOS wiring map)
- `docs/products/life-coaching/twins/DIGITAL_TWIN_TEMPLATE.md` — **full person** twin template (goals, OS, communication, modules). This FVT doc is the **decision-identity** facet (`decision_identity.json`) that feeds that template.

**Last Updated:** 2026-07-29  
**Founder delegation (2026-07-29):** Adam does not know the right next step; trusts the system to decide and document it here so other agents can execute without re-deriving.

**Person twin home (Adam reference fill):** `data/twins/default/adam/` — includes seeded `decision_identity.json` from digests; compiler still Phase 2.

---

## Executive decision (ratified by delegation)

**Do spec + pipeline order first. Do not build prediction yet.**

| Phase | What | Status | Owner lane |
|---|---|---|---|
| **0** | Preserve raw founder decisions in a queryable log | ✅ Shipped | `services/founder-intent-model.js` |
| **1** | Backfill historical corpus → log (all categories, especially `ai_failure_pattern`) | ⚠️ IN PROGRESS | `scripts/founder-decision-backfill.mjs` |
| **2** | **Decision Compiler** — promote log rows → reusable patterns | 🔜 NEXT BUILD | governed factory (SO-001) |
| **3** | Inject compiled twin block into Chair / pods / founder chat | After Phase 2 | orchestration glue (hand-write OK) |
| **4** | Historian outcome loop on patterns (prediction → outcome → lesson) | After ~100 patterns with outcomes | Cognitive Core + Amendment 39 |
| **5** | Simulator calibration + trust delegation (§2.0H purposes 2–7) | After Phase 4 volume | explicit founder gate |

**Why Phase 2 is next:** The log captures *what Adam said*. The twin must capture *how Adam decides* — reusable heuristics, vetoes, and escalation rules. Without the compiler, backfill produces a searchable diary, not a twin.

**Why not prediction now:** §2.0H and §2.15 — predicting founder intent before calibrated history is assumptive steering dressed as infrastructure.

---

## Definition

The **Founder Virtual Twin** is the minimum structured model of:

1. **Who Adam is** — values, non-negotiables, mission anchors  
2. **How Adam decides** — heuristics, tradeoff weights, escalation triggers  
3. **What proved true** — decisions with reason, prediction, outcome, lesson  

It is **not**:

- Raw chat transcripts as primary memory (conversation is intake, not canon)  
- A flat list of decision labels ("Adam chose multi-pod")  
- AI-inferred preferences Adam never expressed  
- A substitute for founder gates on business/constitutional choices  

---

## Six layers (taxonomy)

Every compiled pattern belongs to exactly one **primary layer**. Secondary tags allowed.

| Layer | ID | Captures | Example |
|---|---|---|---|
| 1 | `values` | Non-negotiables, mission anchors | ROI-first; never claim shipped without deploy receipt |
| 2 | `vetoes` | Anti-patterns — what always gets killed | No human-gated PR wait; no legacy overlay HTML |
| 3 | `heuristics` | Reusable if-then tradeoff rules | ~2 min tiered debug before human escalation |
| 4 | `escalation` | When Adam stays hands-on vs delegates | System sets Railway env; founder gates constitutional edits |
| 5 | `precedents` | Situational decisions with reason + rejected alternatives | Chose parallel pods over serial queue because revenue can't wait |
| 6 | `presentation` | How to frame choices for Adam | WHAT + PASS packets; step-by-step for money/deploy |

**Log category → layer mapping (extraction time):**

| `founder_decision_log.category` | Default layer |
|---|---|
| `governance` | 1 or 4 |
| `quality_standard` | 1 or 2 |
| `financial` | 3 |
| `product_scope` | 3 or 5 |
| `priority` | 3 or 4 |
| `process` | 4 |
| `ai_failure_pattern` | 2 |
| `founder_insight` | 3 or 1 |
| `other` | 5 (or discard if not twin-worthy) |

---

## Twin-worthy test (promotion gate)

A log row may be promoted to a compiled pattern only if **at least one** is true:

1. **Reusable** — future agents will face the same fork again  
2. **Identity** — states what Adam optimizes for (ROI, honesty, sovereignty)  
3. **Corrective** — fixes a repeated AI failure mode  
4. **Calibratable** — implies a measurable prediction  
5. **Delegation** — teaches when to act vs ask  

**Exclude** (keep in log only):

- Session-specific debugging ("fix line 597")  
- Duplicate restatements of the same heuristic (merge, don't duplicate)  
- AI-paraphrased "decisions" with no source quote  
- Unvalidated preferences (stay HYPOTHESIS until outcome exists)  

---

## Compiled pattern schema (Phase 2 target)

New table: `founder_decision_patterns` (name TBD at implementation; spec is authoritative).

```json
{
  "pattern_id": "uuid",
  "layer": "values|vetoes|heuristics|escalation|precedents|presentation",
  "pattern_text": "When [situation], prefer [X] over [Y] because [Z]",
  "category": "governance|product_scope|financial|quality_standard|process|priority|ai_failure_pattern|founder_insight|other",
  "applies_when": "scope string — e.g. 'autonomous ship path', 'Chair high-stakes reasoning'",
  "rejected_alternatives": ["what Adam said no to"],
  "source_evidence": [
    { "log_id": 123, "quote": "founder's words", "source": "historical_conversation_backfill" }
  ],
  "evidence_level": "CLAIM|HYPOTHESIS|TESTED|RECEIPT|VERIFIED|FACT|INVARIANT",
  "confidence": 0.0,
  "prediction": "what Adam expected to happen (nullable)",
  "outcome": "what actually happened (nullable, Historian fills)",
  "lesson": "post-outcome update (nullable)",
  "conflicts_with": ["pattern_id"],
  "last_validated_at": "ISO8601|null",
  "promoted_at": "ISO8601",
  "promoted_by": "decision_compiler|founder_manual"
}
```

**Conflict resolution (when two patterns clash):**

1. Narrower `applies_when` scope wins over broad  
2. Higher `evidence_level` wins  
3. More recent `last_validated_at` wins  
4. If still tied → `escalation_required: true`, do not auto-resolve  

---

## Pipeline

```
Historical corpus                    Live sessions
       │                                  │
       ▼                                  ▼
 POST /factory/founder-decisions/extract   POST /factory/founder-decisions
       │                                  │
       └──────────────┬───────────────────┘
                      ▼
            founder_decision_log  (Phase 0–1, EXISTS)
                      │
                      ▼
         Decision Compiler (Phase 2, NOT BUILT)
         - dedupe / merge similar rows
         - extract pattern_text + rejected_alternatives
         - assign layer + evidence_level
         - twin-worthy filter
                      │
                      ▼
         founder_decision_patterns  (Phase 2)
                      │
                      ▼
         Twin inject block (Phase 3)
         - Chair / Council context
         - pod autopilot context
         - founder-interface message handler
                      │
                      ▼
         Outcome loop (Phase 4)
         - Cognitive Core programs + Historian
         - evidence_level promotion/demotion
```

---

## Corpus sources (verified)

| Source | Path | Notes |
|---|---|---|
| Cursor session exports | `docs/conversation_dumps/raw/*.jsonl` | Real, parseable |
| Lumin-Memory dumps | `• Lumin-Memory/` (U+2022 bullet prefix — canonical) | ~108MB, 19 files; NOT `Lumin-Memory` without bullet |
| Broken capture (ignore) | `Lumin-Memory/00_INBOX/raw/00_INBOX/raw/` | 404 stubs — not recoverable here |

Backfill script: `scripts/founder-decision-backfill.mjs`  
Endpoint: `POST /factory/founder-decisions/extract` (`routes/factory-mount-routes.js`)

---

## Integration map (existing systems)

| System | Role in twin | File / endpoint |
|---|---|---|
| Founder decision log | Raw intake | `services/founder-intent-model.js` |
| Cognitive Core programs | Heuristics as testable hypotheses | `services/cognitive-core-programs.js` |
| Learning style | Layer 6 presentation | `GET/PUT /api/v1/cognitive-core/learning-style` |
| Decision replay | Precedent reasoning | Cognitive Core improve engine |
| Counterfactual | Rejected alternatives exploration | `POST /decisions/:id/counterfactual` |
| Memory capsules | Evidence-weighted retrieval of twin facts | `services/memory-retrieval.js` |
| North Star SSOT | Layer 1 constitutional invariants | `docs/constitution/NORTH_STAR_SSOT.md` |
| Founder memory store | Live founder↔AI exchanges | `services/founder-memory-store.js` |

**Rule:** Constitutional invariants (North Star) outrank compiled patterns. A pattern must never override LAW; it guides operational forks inside LAW.

---

## Phase 2 implementation sketch (for factory / next agent)

**Deliverables:**

1. Migration: `founder_decision_patterns` table matching schema above  
2. Service: `services/founder-decision-compiler.js`  
   - `compilePatternsFromLog(pool, { since_id, limit })`  
   - `getTwinInjectBlock(pool, { context, max_tokens })`  
   - `promoteLogRow(pool, log_id)` — manual override  
3. Route: `POST /factory/founder-twin/compile` (batch)  
4. Route: `GET /factory/founder-twin/inject` (preview block for agents)  
5. Tests: promotion gate, dedupe, conflict detection, inject block size cap  

**Compiler prompt must extract:**

- `pattern_text` (reusable rule, not quote alone)  
- `rejected_alternatives`  
- `layer`  
- `applies_when`  
- link to source `log_id`(s)  

**SO-001:** New `services/founder-decision-compiler.js` → governed factory (`/factory/ship-queue`), not hand-authored in chat.

**Orchestration glue (Phase 3, hand-write OK):**

- Thread `getTwinInjectBlock()` into Chair context assembly  
- Thread into pod context cache (shared 5 min TTL per multi-autopilot design)  

---

## Operator commands (today)

```bash
# Dry-run corpus chunk counts (local)
node scripts/founder-decision-backfill.mjs --dry-run

# Full backfill (calls live Railway extract endpoint — needs COMMAND_CENTER_KEY)
node scripts/founder-decision-backfill.mjs

# Query log (production)
curl -s "$BASE/factory/founder-decisions?category=ai_failure_pattern&limit=20" \
  -H "x-command-key: $KEY"

# Search log
curl -s "$BASE/factory/founder-decisions?q=deploy+receipt" \
  -H "x-command-key: $KEY"
```

After Phase 2 ships, add:

```bash
curl -X POST "$BASE/factory/founder-twin/compile" -H "x-command-key: $KEY"
curl -s "$BASE/factory/founder-twin/inject?context=chair" -H "x-command-key: $KEY"
```

---

## Agent handoff checklist

Cold agent picking this up:

1. Read this file end-to-end  
2. Read `services/founder-intent-model.js` (current log)  
3. Check backfill progress: `GET /factory/founder-decisions` counts by category  
4. If log row count < 50: finish Phase 1 before Phase 2  
5. If log row count ≥ 50: queue Phase 2 via governed factory  
6. Do **not** wire simulator prediction until Phase 4 criteria met  
7. Update `docs/products/builderos/PRODUCT_HOME.md` Change Receipts on any ship  

---

## Open questions (founder gate only)

| ID | Question | Default if silent |
|---|---|---|
| FVT-001 | Auto-promote compiler output, or founder review queue first? | Auto-promote at CLAIM/HYPOTHESIS; founder gate for INVARIANT promotion |
| FVT-002 | Max inject block size for Chair (tokens)? | 2000 tokens, layers 1–4 prioritized over precedents |
| FVT-003 | Merge twin with Cognitive Core `/programs` or keep separate? | Separate tables; programs reference pattern_id when aligned |

---

## Change log

| Date | Change |
|---|---|
| 2026-07-29 | Initial spec. Founder delegated next-step decision; Phase 2 (Decision Compiler) chosen as next build after backfill. |
