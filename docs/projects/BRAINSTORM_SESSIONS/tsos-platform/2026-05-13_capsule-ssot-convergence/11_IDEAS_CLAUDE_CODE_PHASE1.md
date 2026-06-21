<!-- SYNOPSIS: Phase 1 — Idea rain (Claude Code independent) -->

# Phase 1 — Idea rain (Claude Code independent)

**Session:** `2026-05-13_capsule-ssot-convergence`  
**Program:** `tsos-platform` (cross-cutting: Lumin / SSOT / TSOS / Capsule convergence)  
**Participant:** Claude Code (independent generation — no operator idea list visible during generation)  
**Source label:** `C` — all 25 ideas in this file are Claude Code's first-pass, uninfluenced by A01–A25 or G01–G10 at generation time.  
**Not law:** Brainstorm artifact only. Load-bearing forks → `AMENDMENT_01` + `run-council` / gate-change on the running app per North Star Article II §2.12.

**Crosswalk:** See `01_CONVERGENCE_CHRONICLE.md` §4 / §16 for what already exists vs MISSING / INERT.  
**Ranking:** `20_RANKINGS_PHASE2.md` §6 uses these as the C-series input — `independent_convergence_score` rises wherever C overlaps A/N/G. **Do not collapse overlaps before scoring.**

---

## C01–C25 (exactly 25; no ranking in Phase 1)

### C01 — Memory Triage Layer `[SYS]`

A classification stage that runs at **ingestion**, not retrieval. Incoming system events (builder outcomes, gate-change decisions, repair logs, user feedback) are classified into `episodic` | `semantic` | `procedural` before being written to AM39 tables. Classification is rule-based first, ML-assisted later. Prevents undifferentiated data from polluting retrieval quality.  
**Chronicle:** AM39 has the destination tables (episodic_facts, lessons_learned) but no ingestion classifier — writes go directly. **MISSING** as a triage stage.

### C02 — Lessons_Learned Bootstrap Seed `[SYS]`

`lessons_learned` is confirmed INERT (chronicle §16a — zero rows in prod). This idea is specifically the **cold-start solver**: a one-time seeding script that mines existing receipts in AMENDMENT_*.md, CONTINUITY_LOG.md entries, and builder failure logs → extracts lesson candidates → writes them with appropriate `confidence_score` (0.5 = seeded, unconfirmed) and `ladder_level = 1`. Separate from ongoing accumulation (A01) — this is the bootstrap. Running it once would activate the entire memory system.  
**Chronicle:** **MISSING**; `npm run memory:seed` is documented but likely not yet implemented for lessons_learned specifically.

### C03 — Memory Citation Requirement `[SYS]`

Every Lumin reply or council output that references a stored belief must cite `fact_id` + `ladder_level` inline. Example: `[fact:ep_4892 L3]`. This makes the chain from memory storage → retrieval → output **verifiable** rather than implicit. The absence of citations signals the system is answering from weights, not from governed memory. Audit mode: any output without citation on a load-bearing claim triggers a soft warning.  
**Chronicle:** AM39 routes support memory retrieval; citation enforcement on output **MISSING**.

### C04 — Pre-Build Outcome Declaration `[SYS]`

Before `POST /api/v1/lifeos/builder/build`, the request body must include three fields: `success_criteria` (string), `failure_signals` (string), and `expected_tokens` (int estimate). These get written to a `build_declarations` table keyed to the task and commit. After build closes, the system auto-compares actual vs declared. The declaration contract forces sharper specs and creates the data needed for outcome learning (A03, N06).  
**Chronicle:** Builder `/build` endpoint exists; no declaration schema or pre-flight enrichment — **MISSING**.

### C05 — Outcome Delta Score `[SYS]`

After a builder task closes (committed, syntax-clean, verifier pass), compute a structured score: `spec_fidelity` (did the output match what was asked?), `surprise_count` (unexpected additions or omissions), `repair_needed` (did the next build fix something this one introduced?). Stored in builder trace. Fed back to model routing (A13) and token efficiency reporting (A19). The score does not require human input — computed from observable signals.  
**Chronicle:** Builder logs outcomes; no structured scoring layer — **MISSING**.

### C06 — SSOT Amendment Drift Alert `[SYS]`

Weekly job: for each amendment, diff the "Last Updated" field against `git log --follow` for that file. When the file changed but Last Updated wasn't bumped (or was bumped without a receipt row), flag it as **amendment drift** in the compliance report. Also checks that every Change Receipt row has a corresponding commit SHA. Makes SSOT maintenance automated rather than honor-system.  
**Chronicle:** `ssot-check.js` catches @ssot tag gaps; amendment date drift **MISSING**.

### C07 — Governance Friction Meter `[SYS]`

Compute: `(advisory_notices_issued + gate_change_proposals) / max(1, (approvals + queue_advances))` per 7-day window. Normalize by queue depth. Output: a single `friction_score` appended to the weekly compliance report. Alert threshold (e.g. >3.0) auto-generates a `pending_adam` notice. Quantifies safe-but-stuck without requiring human observation.  
**Chronicle:** Compliance JSON has inputs (advisory notices, gate proposals); the ratio computation **MISSING** (A10 names the concept).

### C08 — Task Provenance Chain `[SYS]`

Every task written to a builder queue JSON must carry an optional `parent_task_id`. When present, the daemon validates that the parent exists and is closed before pushing the child (unless explicitly unblocked). The lineage chain is queryable: "show me everything that was triggered by task X." Kills ghost-task accumulation at the schema level rather than through manual audits.  
**Chronicle:** Queue JSON has no provenance fields — **MISSING** (A06 names the concept; C08 is the schema-enforcement mechanism).

### C09 — Build Closure Contract `[SYS]`

A task may not advance the cursor **unless** it satisfies: `(committed: true AND commit_sha present) OR (committed: false AND explicit_reason logged)` AND `node --check` passes on target_file. Violations get logged as `closure_contract_violation` before cursor advance. SIS1 partially addresses the already-shipped case — C09 generalizes closure proof to all success and failure paths.  
**Chronicle:** Cursor advance currently happens after any `ok: true` response — no closure contract enforced — **MISSING**.

### C10 — Operator Cognitive State Signal `[PRODUCT:LifeOS]`

A 3-state enum: `fresh` | `overloaded` | `crisis`. Set via simple API endpoint or env var at session start. Agent reads this before deciding verbosity, escalation threshold, and how many decisions to surface at once. `fresh` = normal operation. `overloaded` = suppress non-critical alerts, batch decisions. `crisis` = immediate escalation only, no brainstorm outputs. Lighter implementation than G09's 6-state model; achievable in a single config field.  
**Chronicle:** No cognitive state signal in operator API — **MISSING**.

### C11 — Builder Call Trace Index `[SYS]`

Append-only JSONL or DB table: every `POST /build` call logs `task_id`, `model_used`, `prompt_tokens`, `completion_tokens`, `outcome` (committed/failed/skipped), `commit_sha`, `duration_ms`, `lane`. Queryable via CLI or endpoint. Enables SLO tracking (p50/p95 latency, failure rates by model, token burn by lane). Currently builder logs exist but are lane-specific and not consolidated for cross-lane SLO queries.  
**Chronicle:** `data/builder-daemon-log.*.jsonl` exist per lane; consolidated trace index — **MISSING** (N24 names the SLO dashboard; C11 is the trace substrate).

### C12 — Repeated Failure Incident Report `[SYS]`

When a task's FPM1 `escalationLevel` reaches 3 (10+ failures), the system auto-generates a human-readable incident report: what failed, failure signatures, how many build attempts, estimated token cost of failed attempts, recommended action. Delivered as a `pending_adam` notice with priority `HIGH`. Not just logs — a structured summary an operator can act on immediately.  
**Chronicle:** FPM1 (shipped this session) adds level-3 quarantine; human-readable incident report **MISSING**.

### C13 — Constitutional Reference Tagging `[SYS]`

Machine-readable constitutional tags in outputs and logs. When a council output or governance decision references a North Star article, it includes `[§2.6]`, `[§2.12]`, etc. as structured metadata, not just prose. Makes constitutional compliance programmatically verifiable: a script can sweep logs and confirm §2.6 is cited whenever a truth-channel decision is logged. Converts constitutional law from advisory text to auditable machine assertion.  
**Chronicle:** §2.6 / §2.12 are referenced in CLAUDE.md prose; no machine-readable citation in outputs — **MISSING**.

### C14 — Structured Session Handoff Generator `[SYS]`

At session end, auto-query: (1) amendment receipts staged in this session, (2) CONTINUITY_LOG last entry, (3) open queue tasks and their states, (4) PENDING_CONFIRMATION markers. Generate the full handoff block in the format CLAUDE.md requires — ready to paste into the amendment. Removes manual effort from the session-end protocol and eliminates the most common source of drift (handoffs written from memory when tired).  
**Chronicle:** Continuity Log + amendment handoff blocks are human-written — auto-generation **MISSING** (N14 is the nightly export; C14 is session-handoff specifically).

### C15 — Staged Hunk Commit Enforcer `[SYS]`

Pre-commit script: parse `git diff --cached --stat`, extract hunks by file, require each hunk to map to a declared work item (queue task ID, amendment section, or governance repair item). Reject commit if any hunk is unaccounted-for. The manual "hunk audit rule" established in this session is a workaround until this enforcer exists. Eliminates mixed-scope commits at the tooling level.  
**Chronicle:** Standing hunk-audit rule added to AM36 this session as a manual process — automated enforcement **MISSING**.

### C16 — Epistemic Fact Freshness SLA `[SYS]`

Any `epistemic_fact` with `ladder_level >= 3` and no `last_confirmed_at` update in >30 days is automatically tagged `STALE` by a weekly batch job. STALE facts are still retrievable but are appended with `⚠️ stale: unconfirmed since [date]` in citations (C03). Facts at level < 3 decay on a 90-day clock. This is the AM39-specific implementation of the broader freshness SLA (N03) and truth aging (G10).  
**Chronicle:** AM39 has `decay_rate` field; automated STALE tagging batch job — **MISSING**.

### C17 — Memory Write Gate (Reader-First Contract) `[SYS]`

Before accepting new writes to `epistemic_facts` or `lessons_learned`, the system checks: has any consumer read from these tables in the last 7 days? If not → reject new writes with `MEMORY_THEATER_BLOCK` error. The gate enforces that memory accumulation only continues if memory is actually being used. Prevents the well-documented failure mode of systems that write to memory forever and read never. Can be bypassed with `FORCE_MEMORY_WRITE=1` for seeding operations.  
**Chronicle:** AM39 has write routes; no reader-activity prerequisite check — **MISSING** as a gate.

### C18 — Repair Token Cost Ledger `[SYS]`

Each repair task logs: `estimated_tokens` (pre-declared, C04), `actual_tokens` (post-close from trace), `repair_duration_ms`, `root_cause_category` (FPM1 failure sig), `value_delivered` (C05 delta). These rows form a ledger queryable for: most expensive failure categories, ROI of repair vs quarantine, model efficiency per failure type. Feeds model routing (A13) and operator weekly digest (N20).  
**Chronicle:** FPM1 tracks failure count and escalation; token cost per repair — **MISSING**.

### C19 — Spec Richness Pre-Flight Gate `[SYS]`

Before forwarding a spec to the council, auto-score it: `length_score` (>100 chars), `has_success_criteria` (boolean check), `has_context_section` (boolean), `has_anti_patterns` (boolean). Minimum passing score: 3/4. Below threshold → reject the task with structured feedback: "spec is missing: success_criteria, context_section." Council receives only specs that pass. Reduces the single largest source of poor council output (underspecified tasks).  
**Chronicle:** Builder `/build` accepts any spec string; no richness validation — **MISSING**.

### C20 — Canary Build Lane `[SYS]`

New queue tasks run on a shadow lane first: same council call, same output, but no `git push`, no cursor advance, no DB write. Output goes to a `build_canary_results` table. A comparison script checks: does the output pass `node --check`, schema validation, and size sanity? If yes → promote to real execution. If no → log `canary_failure`, increment FPM1 without burning a git commit. Overlaps N17 (adaptive route shadow canary) but C20 is specifically the builder queue pre-commit proving ground.  
**Chronicle:** Shadow execution before commit — **MISSING**.

### C21 — AUTONOMY_WRITE_LOCK (Concrete Implementation) `[SYS]`

The concrete implementation of O01. A `data/autonomy.lock` file is written by any process that creates a PENDING_CONFIRMATION marker in AM36. The daemon checks for this file before every `git push`. If present: commit is staged to `autonomy/staging` branch instead of `main`, and a `pending_adam` notice is created with the lock reason. Lock cleared only when the confirmation event is logged (e.g. `task_skip_already_shipped`). The file contains: `locked_by`, `locked_at`, `reason`, `confirmation_event_needed`.  
**Chronicle:** AUTONOMY_WRITE_LOCK concept documented in chronicle §16c; implementation — **MISSING** (this is the blueprint).

### C22 — Model Affinity Registry `[SYS]`

Each council member in `config/council-members.js` gains an optional `task_affinities[]` array: task type strings the model is observed to handle best (e.g. `["spec_enrichment", "code_review", "summarization"]`). Incoming builder tasks are scored for affinity match before routing. If a task type matches a member's affinity AND that member's recent success rate (C11 trace) is >70%, they get first routing priority. Degrades gracefully to existing routing if no affinity match.  
**Chronicle:** Council routing exists (AM01); affinity registry and trace-informed routing — **MISSING** (A13 names adaptive routing; C22 is the affinity mechanism).

### C23 — Governance Decision Timeline `[SYS]`

Queryable endpoint or CLI command: `GET /api/v1/governance/timeline?days=30` → returns all gate-change proposals, decision timestamps, vote outcomes, implementation receipts, and gaps between decision and implementation. Metrics: mean time-to-decision, mean time-to-implementation, oldest unimplemented approved proposal. Surfaces governance drag quantitatively. Converts the amendment audit trail from a pile of markdown into an operational metric.  
**Chronicle:** Gate-change routes exist; timeline query endpoint — **MISSING**.

### C24 — Token Efficiency Ratio (TER) `[SYS]`

Per-task metric: `TER = tokens_consumed / max(1, outcome_delta_score)`. Low TER = high value for tokens burned. High TER = expensive and questionable. Logged in builder trace (C11). Fed weekly to operator digest (N20) as: "Top 5 highest-TER tasks last week" = most expensive relative to value. Triggers routing adjustment if a model consistently produces high-TER results for a task class. Operationalizes the otherwise qualitative "is this worth it?" question.  
**Chronicle:** Token usage logged; no per-task efficiency ratio computed — **MISSING** (A19 names the concept; C24 is the formula).

### C25 — Anti-Pattern Signature Catalog `[SYS]`

Structured catalog (DB table or `data/anti-pattern-catalog.json`): each entry has `signature_hash`, `spec_pattern` (regex or embedding match), `failure_mode`, `examples[]` (task IDs), `recommended_action`. Before a new build, the spec is matched against all catalog entries. On match: the `SCOPE_HINT` or `TOKEN_HINT` from the matched anti-pattern is injected into the spec (smarter than FPM1's generic escalation hints). Catalog grows from FPM1 level-3 quarantine events and operator-confirmed failures. The implementation substrate for G05 (Cognitive Immune System).  
**Chronicle:** FPM1 stores `lastSig` per task; cross-task pattern catalog for spec matching — **MISSING**.

---

## Self-assessment: where C-series adds most

**Most unique (no A/N equivalent):**  
C02 (bootstrap seed — solves cold start), C04 (pre-build declaration — forces spec sharpness upstream), C15 (hunk enforcer — tooling-level hygiene), C17 (writer gate — blocks memory theater), C21 (lock impl — makes O01 concrete).

**Highest likely convergence (expect overlap with A/N/G):**  
C01 ↔ A01/N02 (memory taxonomy), C07 ↔ A10/N16 (governance friction), C11 ↔ N01/N24 (observability), C16 ↔ N03/G10 (freshness SLA), C25 ↔ G05 (immune system).

**Dangerous-too-early (acknowledge):**  
C20 (canary lane) adds a second execution path which multiplies token burn unless carefully gated — delay until C09 (closure contract) and C11 (trace index) exist. C22 (affinity registry) should wait until C11 gives enough historical data to make affinity meaningful.

---

## Next protocol steps

1. **`20_RANKINGS_PHASE2.md` §6** — populate C01–C25 from this file (pointer exists in scaffold).  
2. **`30_META_25_PHASE3.md`** — exactly 25 synthesized ideas from full Phase-2 worksheet.  
3. **`50_TRIAGE.md`** — BUILD_NOW / NEXT / MARKET_ICEBOX / DISCARD with owner + rationale.

---

*End of Phase 1 Claude Code artifact — independent generation confirmed.*
