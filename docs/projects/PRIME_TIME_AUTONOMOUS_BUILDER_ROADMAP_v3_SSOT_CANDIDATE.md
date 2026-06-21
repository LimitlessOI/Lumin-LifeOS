<!-- SYNOPSIS: Prime-Time Autonomous Builder Roadmap — **v3 SSOT Candidate** -->

# Prime-Time Autonomous Builder Roadmap — **v3 SSOT Candidate**

**Status:** `SSOT_CANDIDATE` — **not constitutional law** until Adam approves, CAI verifies **no NSSOT conflict**, links land in **`docs/QUICK_LAUNCH.md`**, **`docs/projects/AMENDMENT_21_LIFEOS_CORE.md`**, and **`docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md`**, and (where load-bearing) **Article II §2.12** / **Article VII** paths are satisfied.  
**Audience:** Adam · **CC** (Claude Code) · **CAI** (Cursor AI) · **Codex** · **Council** (live Railway `run-council` / gate-change — **not** IDE chat).  
**Implementation:** **Out of scope for this file** — this document is the **canonical plan candidate** only.

---

## v3 consensus amendments (apply before canonizing)

These deltas are **accepted into v3** relative to earlier drafts:

1. **Runtime truth stack moves early** — runtime scanner, deploy truth, migration truth, operator-truth consistency (same receipts as gates; Decoder does not invent health).
2. **Ownership before promotion** — write lock → per-file ownership → branch ladder → collision receipt (order is **mandatory**).
3. **Council threshold in Phase 0** — “Council” = **live Railway** `gate-change` / `run-council` per **`AMENDMENT_01`** + NSSOT **§2.12** — **never** “the models agreed in chat.”
4. **Metrics registry in Phase 0** — each metric: name, **source script/file**, owner, refresh cadence, **UNKNOWN policy** (no competing ETA brains).
5. **Task DNA + queue** — `queue_schema_version`, DNA validator **semver**, **legacy grandfathering** rules.
6. **Verification = deterministic-first** — deterministic proof first; **LLM-as-judge only assists**; **false green kill test** in the core regression pack.
7. **Regression pack expands** — extractor, queue truth, write lock, false green, Founder Decoder **calm** mode, Task DNA validator.
8. **Confidence-gated promotion** — **not** “confidence-gated commit” alone; **self-score cannot approve merge path** without independent verifier / gate receipts.
9. **Truth ladder collapses for enforcement** — operational enforcement starts with **5 levels** (idea → observation → lesson → verified fact → law). An **11-layer philosophy appendix** may remain narrative only until AM39/NSSOT mapping is ratified.
10. **Burn-in denominator defined** — measure **eligible READY** product/platform tasks; **exclude** `SKIP_SHIPPED`, `DOC_ONLY`, unresolved `bad_spec`, unresolved `env_disconnect`.
11. **Prime-time suspension is quantitative** — caps on: false greens, high-severity regressions, stale runtime truth duration, Adam interruptions, unclassified failures (each **numeric** or explicit **UNKNOWN** with HALT).
12. **Minimum useful output rule** — a task **counts** toward completion only if it produces at least one of: verified code, runtime truth, operator clarity, revenue progress, platform hardening (ties **value-per-cycle**).

---

## Definition — Prime-Time Builder

**Prime-Time Builder** means the system can take a **bounded product directive** and move it through:

**spec → Task DNA → build → verify → runtime proof → audit → receipt → learning → next task**

without **silent drift**, **merge collision**, **false green** status, or Adam judging **code quality by intuition**.

Prime-time does **not** mean unlimited autonomy. It means **bounded, measured, reversible** autonomy.

---

## Roles & forbidden actions (summary)

| Role | Responsibility |
|------|----------------|
| **Adam** | Mission, values, unacceptable risk, constitutional / money / legal / health / irreversible decisions. **Not** default line-by-line code judge. |
| **CC** | Implements roadmap **slices** with files, tests, commit hash, proof, residue risk. |
| **CAI** | Audits slices vs roadmap; **NSSOT conflict check** before canonize; **no silent improv** off-roadmap work. |
| **Codex** | Hardening: tests, edge cases, security, alt review, spec completeness. |
| **Council** | **HTTP on running app** — architecture forks, autonomy tier changes, self-modification, constitutional issues, deploy-policy changes (per Phase 0 threshold table). |

**Forbidden:** silent off-roadmap slices; chat-only “council agrees”; merge path from **self-score alone**; production claims without **deploy truth** contract; **two competing truth ladders** enforced in parallel without AM39/NSSOT mapping.

---

## Phase 0 — Canonical Prime-Time SSOT + scope + metrics + council

### Slice 0.1 — Roadmap SSOT file (this candidate → `PRIME_TIME_AUTONOMOUS_BUILDER_ROADMAP.md` when canonized)

**Must include:** definition; **all phases/slices**; owner + verifier + exit per slice; deferred **Phase 17** ideas; **CAI audit checklist**; **CC implementation checklist**; **Codex hardening checklist**; link to **metrics registry** (0.3).

**Done when:** linked from `QUICK_LAUNCH.md`, **AMENDMENT_21**, **AMENDMENT_36**; **CAI: no NSSOT conflict** receipt.

### Slice 0.2 — Prime-Time scope guard

No slice starts unless: **phase**, **owner**, **target files**, **verifier**, **halt condition**, **receipt path**, **rollback path**.

**Done when:** every roadmap slice template includes these fields and CAI can reject a slice definition that omits any of them.

### Slice 0.3 — Metrics registry (v3)

| Column | Description |
|--------|-------------|
| metric | Name |
| source | Script or file that is **source of truth** |
| owner | Lane or role |
| cadence | e.g. per task / hourly / daily |
| UNKNOWN_policy | When UNKNOWN is allowed vs HALT |

**Purpose:** `builder:eta`, `throughput-meter`, `tsos:builder`, `operational-grade`, compliance JSON — **one row each**, no duplicate KPI definitions.

**Done when:** all Prime-Time-critical metrics have a single registry row and no duplicate metric has conflicting sources or cadences.

### Slice 0.4 — Council threshold rules (v3)

**Council** = **`POST …/gate-change/...`** or **`run-council`** on **running** Railway with receipts — per **`AMENDMENT_01`** + NSSOT **§2.12**.

| decision class | council required? | verifier-only allowed? | human required? | evidence required |
|---|---|---|---|---|
| architecture fork | yes | no | no | live council receipt + decision summary + residue risk |
| autonomy tier increase | yes | no | no | live council receipt + risk review + rollback path |
| constitutional / NSSOT interpretation | yes | no | yes | live council receipt + Adam decision receipt + cited NSSOT section |
| money / legal / health risk | yes | no | yes | live council receipt + Adam decision receipt + risk statement |
| self-modification | yes | no | no | live council receipt + rollback path + verifier plan |
| deploy-policy change | yes | no | no | live council receipt + deploy truth impact note |
| bounded bug-fix within existing slice law | no | yes | no | verifier receipt + change receipt |
| deterministic gate addition without policy change | no | yes | no | verifier receipt + regression proof |

**Done when:** this matrix is the only allowed threshold reference in the roadmap and any decision class not covered by the table defaults to council-required until explicitly added.

---

## Phase 1 — Runtime truth stack (**moved early, v3**)

### Slice 1.1 — Runtime reality scanner

Compare **with receipts:** GitHub HEAD · Railway deployed SHA · queue state · active quarantine · compliance / gate JSON · **not** ungrounded “Decoder says healthy.”

**Done when:** scanner output can show agreement or divergence across all listed truth surfaces with a cited receipt or explicit UNKNOWN.

### Slice 1.2 — Deploy truth contract

No production claim unless: deployed SHA **known** · runtime route responds · required env **verified or UNKNOWN labeled** · drift explicit.

**Done when:** any production-health or deployment claim fails closed when one required field is missing, stale, or contradictory.

### Slice 1.3 — Migration truth

Latest applied migration · failed migrations · repair migrations · **UNKNOWN** (no Neon reachability) with **proof path** or HALT for load-bearing claims.

**Done when:** migration status always resolves to known-good, known-bad, or explicit UNKNOWN with proof path and never silently omits migration state.

### Slice 1.4 — Operator truth consistency

Operator-facing summaries **must** consume the **same** machine receipts as gates (single graph of truth).

**Done when:** `operator:status`, Founder Decoder, and gate outputs agree on health or fail closed on contradiction.

---

## Phase 2 — Collision control & ownership (**before promotion, v3**)

### Slice 2.1 — `AUTONOMY_WRITE_LOCK` v0

Lock state: locked, owner, reason, created_at, expires_at, allowed_paths, blocked_paths. When active: **no autonomous push to `main`**; staging only; read-only checks allowed.

**Done when:** a protected-path autonomous write is blocked under lock and a receipt records the block without allowing direct `main` promotion.

### Slice 2.2 — Per-file ownership registry

Every runtime/product file has **one** owning lane. Two lanes target same file → **halt before execution**.

**Done when:** every protected runtime/product file has exactly one owner and duplicate ownership claims fail before task start.

### Slice 2.3 — Branch promotion ladder

**draft → staging → reviewed → verified → mergeable → `main`**  
No direct `main` unless gate explicitly allows.

**Done when:** every autonomous code path can be mapped to one ladder state and no path can promote from `draft` or `staging` directly to `main`.

### Slice 2.4 — Collision receipt

Every blocked push: `task_id`, lane, attempted branch, reason, next action — **Founder Decoder** can explain in plain English.

**Done when:** every collision or lock block produces a receipt that can be rendered in Founder Decoder without manual reconstruction.

---

## Phase 3 — Task DNA & queue truth

### Slice 3.1 — Task DNA required

Fields: `task_id`, `lane`, `why_created`, `source_doc`, `source_decision_id`, `target_files`, `depends_on`, `blocks`, `proof_required_to_close`, `risk_tier`, `autonomy_tier`, `expected_duration`, `expected_output_type`.  
**No DNA → no autonomous run.**

**Done when:** a validator can reject any autonomous task missing one required DNA field.

### Slice 3.2 — Queue schema versioning (v3)

`queue_schema_version` · DNA validator **semver** · **legacy grandfathering** (`legacy_pending_dna`) with migration path.

**Done when:** active queues declare a schema version and legacy rows are explicitly marked rather than silently treated as current.

### Slice 3.3 — Buildability score

Spec clarity · verifier readiness · dependency readiness · runtime risk · **target ownership** · proof quality. Low score → **rewrite spec**, do not burn builder cycles.

**Done when:** every autonomous task receives a buildability score before run and low-score tasks are blocked from execution.

### Slice 3.4 — Anti-zombie queue logic

Repeated skip / stale / orphan / unverifiable → shipped · superseded · rewritten · quarantined · **tombstoned** — no silent linger.

**Done when:** no task can remain in repeated stale/skip state without being reclassified into one terminal or repairable outcome.

### Slice 3.5 — Cross-lane target conflict

Duplicate `target_files` across **active** tasks (any lane) → **halt** before run (complements per-file ownership).

**Done when:** duplicate active targets across lanes are detected before execution and emit a halt reason.

### Slice 3.6 — Environment snapshot per task

Every task receipt captures the execution environment at the moment of run:

| Field | Description |
|-------|-------------|
| `commit_sha` | GitHub HEAD at execution start |
| `queue_schema_version` | Active queue schema semver |
| `prompt_file_version` | Prompt file(s) read + their git SHA or content hash |
| `env_presence` | Presence (not value) of required env vars |
| `target_file_state` | Exists / missing / size for each target file |

**Done when:** every task receipt includes this snapshot; two snapshots from different runs can be diffed to diagnose "worked yesterday, not today."

### Slice 3.7 — Prompt version tracking per task run

Every task run records: which `prompts/` file(s) were read, their content hash, and any domain-override active at execution time.

**Done when:** prompt regressions are distinguishable from model failures in quarantine analysis (failure class `model_failure` vs `prompt_regression`).

---

## Phase 4 — Existing builder proof

### Slice 4.1 — SIS1 proof

Already-shipped: target exists · required output present · verifier passes · `task_skip_already_shipped` **with proof** — **no false skip**.

**Done when:** a shipped task can be skipped only when all three proof conditions are present in the receipt.

### Slice 4.2 — FPM1 failure pattern memory

Families: `syntax_ghost`, `truncation`, `missing_context`, `bad_spec`, `route_unmounted`, `env_disconnect`, `model_failure`, `verifier_gap` — **retry by class**; **failure_family_id** in quarantine JSON (taxonomy).

**Done when:** repeated failures are grouped by family id and retry behavior changes based on the family, not raw string matching alone.

### Slice 4.3 — Extractor golden pack

Permanent tests: leading `*/`, bare `/`, markdown fences, HTML-as-JS, self-import, CSS pseudo-comments, truncation, spec contamination. **No extractor change without green pack.**

**Done when:** reverting any covered extractor fix causes the golden pack to fail and current extractor changes pass the same suite.

### Slice 4.4 — Adversarial spec injection test

Periodically inject a deliberately flawed spec into the builder to verify verification gates catch it before commit. Flaw classes to cover:

| Flaw | What it tests |
|------|---------------|
| Wrong function name | Semantic completion gate |
| Missing auth check | Security gate |
| SQL injection risk in generated query | Code safety gate |
| Missing route mount instruction | Route mount verification |
| Self-import in generated output | Import/circular dep check |

**Rule:** if an adversarial spec passes all gates, that is a **gate failure**, not a test pass.

**Done when:**
- At least one adversarial spec per flaw class is in the regression pack
- Suite is run as part of the expanded regression pack (Slice 5.5)
- Adversarial test failures block Prime-Time declaration

---

## Phase 5 — Verification gates (**deterministic-first, v3**)

### Slice 5.1 — Post-commit smoke router

By artifact: route → mount + HTTP probe · JS → syntax + import · UI → static + smoke · migration → dry-run / applied proof · config → schema · doc → SSOT + manifest.

**Done when:** every supported artifact type resolves to one required proof route and unsupported artifact types fail closed instead of defaulting green.

### Slice 5.2 — Semantic completion gate

Required symbols present · target changed · no unrelated writes · spec satisfied · `proof_required_to_close` met.

**Done when:** a task can fail semantic completion even if syntax passes, and the failure reason is receipt-backed.

### Slice 5.3 — False green kill test

If **any** operator-facing surface reports healthy while a **required** gate is red → **suite fails** (CI or dedicated script).

**Done when:** one intentional health contradiction makes the false-green suite fail.

### Slice 5.4 — Deterministic vs LLM-assist boundary

**Order:** deterministic proofs **first**; LLM-judge **assists only** (never sole merge authority).

**Done when:** every verifier class is explicitly labeled deterministic-required, LLM-assist-allowed, or deterministic-unavailable.

### Slice 5.5 — Regression pack (v3 expanded)

Extractor · queue truth · write lock · false green · Founder Decoder **calm** · Task DNA validator — **must pass** before prime-time declaration.

**Done when:** the regression pack contains each listed category and a failing case in any category blocks Prime-Time declaration.

---

## Phase 6 — Founder Decoder / calm console / attention

### Slice 6.1 — Founder Decoder modes

`--calm` · `--strategic` · `--engineer` · `--crisis` · `--governance`. **Calm:** short, plain, **max UNKNOWN** then “insufficient evidence” (v3 **UNKNOWN budget**).

**Done when:** all five modes render from the same truth source and calm mode enforces the UNKNOWN budget.

### Slice 6.2 — Unified Command Core

One object: `task → lane → agent → status → blocker → receipt → next_step` (JSON + Decoder render).

**Done when:** every active lane can be represented in one machine-readable command-core object.

### Slice 6.3 — Human attention cost KPI

Interruptions: count, reason, time cost, repeated asks, unresolved UNKNOWNs. **Prime-time requires downward trend** (quantitative suspension ties here).

**Done when:** the KPI can be calculated from receipts rather than narrative memory alone.

---

## Phase 7 — Memory activation

### Slice 7.1 — Seed real lessons

Only with **receipts** (extractor bugs, quarantine clears, collisions, bad ETA, route mount, stale runtime).

**Done when:** every seeded lesson points to at least one source receipt and unreceipted lessons are rejected.

### Slice 7.2 — First reader

**Founder Decoder / `operator:status`** — memory must **change** a visible output; else **theater**.

**Done when:** at least one live operator-facing output renders a memory-derived lesson with source linkage.

### Slice 7.3 — Memory is not truth (**5-level enforcement, v3**)

| Level | Role |
|-------|------|
| idea | |
| observation | |
| lesson | |
| verified fact | |
| law | Constitutional / NSSOT only |

**Rule:** memory **never** outranks **runtime** or **SSOT**. Full 11-layer narrative = **appendix only** until mapped to **AM39** + NSSOT in a ratified pass.

**Done when:** every enforced memory label maps to one of the five operational levels and no sixth enforcement level appears in runtime logic.

---

## Phase 8 — Prediction / ETA

### Slice 8.1 — Duration log

Predicted vs actual duration · lane · model · attempts · token cost · blocked time · verification time.

**Done when:** task runs consistently emit both predicted and actual timing fields into one queryable log.

### Slice 8.2 — Prediction before build

`predicted_ok`, duration range, likely failure class, confidence, **basis** (logged **before** run).

**Done when:** every prediction record is timestamped before task execution begins.

### Slice 8.3 — ETA engine

Optimistic / realistic / conservative · hours · days · 24/7 assumption · **sample size** · **confidence** · explicit **UNKNOWN** when data thin.  
Formula (indicative): `remaining_eligible_slices × historical p50/p90 × blocker_penalty ÷ lane_parallelism`.

**Done when:** ETA output always includes the stated confidence bands, sample size, and explicit UNKNOWN when data is too thin.

### Slice 8.4 — Prediction error review

Post-run: actual vs predicted · `prediction_error` · `lesson_candidate`.

**Done when:** every completed run writes a prediction delta that can be compared against the pre-run forecast.

### Slice 8.5 — Prediction honesty scoring

Overconfident predictions are penalized more than conservative misses. This directly attacks hallucinated forecasting.

| Outcome | Score |
|---------|-------|
| Overconfident + wrong | −2 |
| Conservative + wrong | −1 |
| Overconfident + right | 0 (no credit for lucky accuracy) |
| Conservative + right | +1 |
| Calibrated + right | +2 |

**Definitions:**
- *Overconfident* = predicted `confidence > 0.85` but was wrong
- *Conservative* = predicted `confidence ≤ 0.6`

**Done when:**
- Every prediction record gets a honesty score post-run
- Cumulative honesty score visible in `npm run builder:eta` output
- Repeated overconfident wrong predictions trigger spec-review before next run of same task class

---

## Phase 9 — Agent identity / autonomy / kill switch

### Slice 9.1 — Agent identity cards

Role · allowed/forbidden paths · commands · max cost · autonomy tier · escalation · shutdown.

**Done when:** every declared agent has one identity card and no agent runs without one.

### Slice 9.2 — Autonomy tier matrix

0 read-only · 1 propose · 2 branch commit · 3 staging autonomous · 4 main with gates · 5 production gated.

**Done when:** every autonomous task class maps to exactly one tier.

### Slice 9.3 — Kill switch

Pause by lane · agent · task class · fleet.

**Done when:** each pause scope has one testable command path and a paused scope cannot continue executing tasks.

### Slice 9.4 — Confidence-gated **promotion** (v3)

Promotion to **mergeable / `main`** requires **verifier + receipts** — **not** model self-score alone.

**Done when:** no task can reach mergeable or `main` on self-score without independent verifier proof.

---

## Phase 10 — Governance without paralysis

### Slice 10.1 — Governance paralysis score

Stale blockers · repeat audits · no-action cycles · UNKNOWN pressure · Adam attention · advisory vs required mix.

**Done when:** one numeric or bucketed paralysis score is derived from these inputs and reported consistently.

### Slice 10.2 — Safe-but-stuck protocol

Every blocker: owner · gate name · required/advisory · next action · **max stale cycles** (numeric).

**Done when:** any blocker missing one required field is treated as invalid governance state.

### Slice 10.3 — Flake vs bug tree (optional v3.1)

Class → retry vs quarantine vs platform fix — **enum** in quarantine rows.

**Done when:** if this optional slice is adopted, every quarantine row uses the enum rather than free-form class prose.

---

## Phase 11 — Truth architecture (operational)

### Slice 11.1 — Five-level ladder (enforcement)

See Phase 7.3; **no duplicate** long ladder in enforcement body.

**Done when:** the enforcement body uses only the five-level ladder and points to the appendix for the narrative extension.

### Slice 11.2 — Belief revision

`old_belief` · `new_belief` · evidence · why · `supersedes_fact_id` — **no silent overwrite**.

**Done when:** superseded beliefs remain queryable and every revision cites its replacement.

### Slice 11.3 — Truth drift observatory

Divergence: SSOT · memory · runtime · receipts · queues · deploy — **green / amber / red** with proof paths.

**Done when:** each divergence color is backed by a documented proof path rather than narrative judgment.

---

## Phase 12 — Adaptive builder intelligence

### Slice 12.1 — Model success by task class

Model · task type · lane · cost · failure class · quality score.

**Done when:** routing decisions can cite historical model-performance data by task class.

### Slice 12.2 — Adaptive routing

After repeated failure: switch model · shrink task · tighten spec · **council if load-bearing**.

**Done when:** at least one repeated-failure class has a documented adaptive-routing response and load-bearing escalations point to council.

---

## Phase 13 — Human value & waste visibility

### Slice 13.1 — Feedback micro-prompt (sparse)

Useful · too long · confusing · solved · style — **rare**, not every cycle.

**Done when:** the prompt cadence is bounded and feedback is captured without becoming an every-cycle burden.

### Slice 13.2 — Value-per-cycle accounting

Each cycle: **product** | **revenue** | **operator clarity** | **platform hardening** | **waste** — **waste must be visible.**

**Done when:** every cycle resolves to exactly one visible category and uncategorized cycles fail accounting.

---

## Phase 14 — Burn-in (**denominator v3**)

### Slice 14.1 — 24-hour burn-in

No collisions · no infinite retries · queues advance · DNA present · Decoder works · memory reader used · ETA generated · **no false green**.

**Done when:** all listed conditions hold for one uninterrupted 24-hour observation window.

### Slice 14.2 — 72-hour burn-in

**≥85%** autonomous completion on **eligible READY** product/platform tasks (see **v3 denominator**); zero high-severity drift; prediction error trend improving; no stale blocker over threshold; paralysis score bounded; **Adam attention below threshold**.

**Done when:** all listed conditions hold for one uninterrupted 72-hour observation window using the defined denominator.

### Slice 14.3 — Minimum real human signal

No lane certified on **synthetic-only** flows — at least **one** real operator/user-valued path per lane.

**Done when:** each certifiable lane has one documented real-valued flow in the certification record.

---

## Phase 15 — Per-lane prime-time certification

Lanes in fleet certification v1: **TC** · **Site Builder** · **LifeOS Dashboard** · **Builder infrastructure**.  
**Memory/governance is not a Prime-Time product lane in v1.** It is a supporting governance capability unless later promoted by explicit roadmap amendment.

**No fleet-wide** prime-time unless **every** declared v1 lane passes.

**Certification inputs:** completion rate · regression rate · rollback proof · runtime truth proof · human attention KPI · prediction accuracy · **CAI audit** · **Codex hardening** review.

**Done when:** a lane has a certification record proving every listed input and passes the v1 lane checklist without unresolved blockers.

---

## Phase 16 — Regression & suspension (**quantitative, v3**)

Prime-time **revocable**. **Suspend** when any threshold exceeded.

### ⛔ HALT BLOCKER — Suspension thresholds must be set before Prime-Time declaration

The values below are **placeholders**. Each `N_` and `T_` must be replaced with a real number or marked `UNKNOWN` only through a temporary waiver that includes:

- explicit Adam decision receipt
- expiration date
- CAI audit receipt

**No lane may be declared Prime-Time while any threshold is still a placeholder.**
**No lane may be declared Prime-Time while a temporary waiver is active unless Adam explicitly accepts that lane as uncertified.**
This is not advisory — it is a hard gate.

| Signal | Threshold (placeholder) | Action |
|--------|------------------------|--------|
| False green events | count ≥ **N_fg** ← SET THIS | Suspend affected lane |
| High-severity regressions | count ≥ **N_reg** ← SET THIS | Suspend affected lane |
| Stale runtime truth | hours ≥ **T_rt** ← SET THIS | Suspend all lanes |
| Adam interruptions (routine tasks) | count ≥ **N_adam** / 24h ← SET THIS | Alert + queue review |
| Unclassified quarantine failures | count ≥ **N_unc** / 24h ← SET THIS | Suspend affected lane |

**How to unblock:** Adam sets each value in this table, or issues a temporary waiver meeting the conditions above. CAI audit checklist must confirm all rows resolved or explicitly waived before Phase 15 certification proceeds.

---

## Phase 17 — Long-horizon intelligence (**preserved, gated**)

Decision replay · wisdom graph · bounded consequence simulator · digital twin · adversarial council lite · token compression language · cognitive cache · scout tools · ZK layer · SLSA · MCP universal adapter · staged self-rewrite sandbox — **not first-wave**; **receipt** required to promote any item into Phases 0–16.

---

## Gate 0 — Builder preflight (repo law, **pointer**)

Before CC changes **`routes/`** (and other protected paths per **`CLAUDE.md`**): **`npm run builder:preflight`** (and **`builder:diagnose-prod`** when deploy truth is in scope). **Not optional** for “builder prime-time” work on live paths.

---

## Final A→Z build order (**v3 consolidated**, 50 steps)

1. Roadmap SSOT (canon file + links)  
2. Scope guard  
3. Metrics registry  
4. Council threshold table  
5. Runtime reality scanner  
6. Deploy truth contract  
7. Migration truth  
8. Operator truth consistency  
9. `AUTONOMY_WRITE_LOCK`  
10. Per-file ownership registry  
11. Branch ladder  
12. Collision receipt  
13. Task DNA required  
14. `queue_schema_version` + DNA validator semver + grandfathering  
15. Buildability score  
16. Anti-zombie + tombstone + cross-lane target conflict  
17. **Environment snapshot per task** (commit SHA, queue schema version, prompt version, env presence, file state)  
18. **Prompt version tracking per task run**  
19. SIS1 proof  
20. FPM1 proof + failure_family_id  
21. Extractor golden pack  
22. **Adversarial spec injection test** (gate fire-drill — wrong name, missing auth, SQL risk, missing mount, self-import)  
23. Post-commit smoke router  
24. Semantic completion gate  
25. False green kill test  
26. Deterministic-first + LLM-assist boundary  
27. Expanded regression pack (includes adversarial test suite)  
28. Founder Decoder modes + UNKNOWN budget  
29. Unified Command Core  
30. Human attention KPI  
31. Seed real lessons (receipted)  
32. Memory first reader  
33. Five-level memory/truth enforcement + AM39 mapping note  
34. Duration log  
35. Prediction before build  
36. ETA engine + error review  
37. **Prediction honesty scoring** (overconfident wrong = −2; conservative wrong = −1; no score inflation)  
38. Agent identity cards  
39. Autonomy tier matrix  
40. Kill switch  
41. Confidence-gated **promotion** (no self-score merge)  
42. Governance paralysis score  
43. Safe-but-stuck protocol  
44. Flake vs bug (optional enum)  
45. Truth drift observatory  
46. Belief revision  
47. Adaptive routing + model success  
48. Feedback micro-prompt  
49. Value-per-cycle accounting  
50. 24h / 72h burn-in + denominator + human signal + per-lane certification + **quantitative suspension** (⛔ thresholds must be set — see Phase 16)

---

## CAI audit checklist (pre-canon)

- [ ] No NSSOT conflict (read full NSSOT + Companion if touching mission/priority).  
- [ ] Council = **HTTP** path only, documented.  
- [ ] No duplicate metrics / ETA definitions (registry complete).  
- [ ] Truth enforcement = **5 levels** + AM39 pointer; no second “law” ladder.  
- [ ] Burn-in suspension thresholds: all N_/T_ values set, **or** each unset value has an explicit Adam waiver on file (decision receipt + expiration date + CAI audit receipt). "UNKNOWN" without a waiver does not satisfy this item.  
- [ ] `builder:preflight` / protected-path rules **referenced**.  
- [ ] Confidence promotion ≠ self-score merge.

## CC implementation checklist (per slice)

- [ ] Slice contract fields present before start.  
- [ ] Tests + commit hash + receipt row (AM21/AM36 as applicable).  
- [ ] No `main` push under lock without ladder step.

## Codex hardening checklist

- [ ] Regression tests for slice class.  
- [ ] Edge cases for failure families.  
- [ ] Security for tier-4/5 paths.

---

## Appendix A — Philosophy ladder (11 levels, **non-enforcing** until mapped)

Raw conversation → … → immutable law — **narrative only** in v3; enforcement uses **Slice 7.3 / 11.1** five-level model + NSSOT/AM39 ratification path.

---

## Appendix B — Source idea mapping (for convergence voting)

- **A-series** — Adam / operator Phase-1 brainstorm (`10_IDEAS_OPERATOR_PHASE1.md`).  
- **C-series** — Claude Code independent list (when captured in repo).  
- **N-series** — Industry / CAI numbered ideas (e.g. metrics registry, slice contract).  
- **G-series** — GPT synthesis add-ons.  
- **Legacy Capsule** — Command readability, human feedback, lineage — recovered via **Decoder + DNA + attention KPI**, not unconstrained swarm.

---

*End of **PRIME_TIME_AUTONOMOUS_BUILDER_ROADMAP_v3_SSOT_CANDIDATE.md** — ready for redline + council review. No implementation implied.*
