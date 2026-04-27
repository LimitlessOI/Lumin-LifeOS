# AMENDMENT 36 — Zero-Drift Handoff & Cold-Start Protocol

| Field | Value |
|-------|--------|
| **Lifecycle** | `infrastructure` |
| **Reversibility** | `two-way-door` |
| **Stability** | `operational` |
| **Last Updated** | 2026-04-25 — **`scripts/generate-agent-rules.mjs`** — new **IDEA VAULT (Lane A/B)** block in **`docs/AGENT_RULES.compact.md`**: vault = map/routes only; source threads + **`raw/`** = nuance; promote via chunk → **38** §A or **`import-dumps-to-twin`**; tools + **INDEX** queue order; MEMORY/COUNCIL/SSOT/PROHIBITED lines tightened (token budget law). Prior: **`AMENDMENT_38_IDEA_VAULT.md`** + manifest; **`REPO_MASTER_INDEX`**; **`CONVERSATION_DUMP_IDEAS_INDEX`**. Prior: **`CONVERSATION_DUMP`** + **`INDEX.md`** candidates. Prior: **`REPO_BUCKET_INDEX`**. Prior: **`REPO_DEEP_AUDIT`**. Prior: **`npm run repo:catalog`**. Prior: **TSOS** in **`prompts/00`**. Prior: **`SSOT_DUAL_CHANNEL`**. Prior: **§2.11c**. Prior: **§2.15** + §2.14. |
| **Manifest** | _(none — this amendment is documentation + scripts; machine hooks live in `package.json` and `.github/workflows`)_ |
| **Verification** | `npm run handoff:self-test` → exit 0; `npm run cold-start:gen` regenerates `docs/AI_COLD_START.md` |

**Parent:** `docs/SSOT_NORTH_STAR.md`, `docs/SSOT_COMPANION.md`, `CLAUDE.md`

---

## Mission

Make every AI session **bounded**, **auditable**, and **non-hallucinatory** by forcing reads and writes through explicit lane manifests, generated cold-start packets, and optional strict git gates — without compressing human-readable SSOT markdown into LCL (that remains forbidden for amendments; use manifests for machine pulls).

---

## Autonomous build charter (blueprint → house)

**Principle:** Once a feature or product is **fully specified** in SSOT (amendment + manifest + readiness gates + acceptance checks), execution proceeds **without standing approvals**. The human is the architect; agents are the crew. Interruptions are **exceptions only**.

**Adam is pulled in only when all of the following have been tried and failed:**

1. **Blueprint defect** — SSOT contradicts itself, omits a required interface, or fails its own readiness gates (then fix the blueprint first; do not improvise).
2. **Capability gap** — No API, no credential, no legal path, or no safe automation exists yet (then either build the capability or record a scoped decision).
3. **Consensus deadlock** — The council / multi-model consensus protocol returns **unresolved conflict** on a material question (then human chooses; log receipt).
4. **External research exhausted** — For “how does the industry do X?” or “what broke?”, agents must run **documented web research** (sources, dates) and attach findings to the lane log **before** escalating.

**Not a reason to interrupt:** stylistic preference, “double-check this,” or low-risk implementation detail — those stay in receipts and CI.

**Continuous improvement:** Scheduled or guarded jobs (Zero-Waste AI per `CLAUDE.md`) may propose SSOT amendments or backlog items; they do **not** silently change production behavior without receipt + verification.

---

## Dedicated agent roles (future lanes)

These are **separate lanes** (own continuity log + manifest when built), not ad-hoc prompts.

| Role | Mandate | Guardrails |
|------|---------|------------|
| **Red team / security** | Actively attempt to break our security posture (authz, data isolation, prompt injection, SSRF, secret leakage, council abuse). Output: findings ranked P0–P2 + repro steps. | Sandboxed targets only; no production data destruction; Kingsman + sovereignty rules apply; every run produces an audit artifact. |
| **Horizon / competition + AI landscape** | Continuous scan: competitor releases, pricing, positioning; new model/API capabilities; regulatory or platform policy shifts relevant to LifeOS. Output: delta brief + suggested SSOT backlog lines (not silent code changes). | Zero-Waste AI: no burn unless there is a **fresh delta** (diff since last scan or new external signal); cite URLs + dates; no copyrighted scraping beyond fair use. |

**Implementation note:** Each role gets `createUsefulWorkGuard()` (or equivalent), a dedicated route or worker entry, and a row in `docs/CONTINUITY_INDEX.md` when operational.

---

## Approved Product Backlog

### Done (this ratification)
- [x] `docs/CONTINUITY_INDEX.md` + `CONTINUITY_LOG_COUNCIL.md` + `CONTINUITY_LOG_LIFEOS.md`
- [x] `docs/AI_COLD_START.md` via `scripts/generate-cold-start.mjs` + `npm run cold-start:gen`
- [x] `GET /api/v1/lifeos/builder/next-task` + builder task cache + `---METADATA---` placement JSON
- [x] `db/migrations/20260420_handoff_governance.sql` — audit tables
- [x] `scripts/zero-drift-check.mjs`, `amendment-readiness-check.mjs`, `handoff-self-test.mjs`, `evidence-required-check.mjs`, `ssot-compact-receipts-dryrun.mjs`, `git-diff-summary.mjs`
- [x] LCL: static `CODE_SYMBOLS` import; Ollama `lclMonitor.inspect`; domain overlays `config/codebook-domains.js`
- [x] `services/kingsman-gate.js` — minimal `kingsmanAudit()` logging
- [x] **Horizon MVP** — `db/migrations/20260421_lane_intel.sql`, `services/lane-intel-service.js` (`runHorizonScan` + web search + optional council synthesis), `routes/lane-intel-routes.js`, `docs/CONTINUITY_LOG_HORIZON.md`, `GET/POST /api/v1/lifeos/intel/horizon/*`, guarded `bootLaneIntel` tick.
- [x] **Red-team MVP (supply chain)** — same tables; `runRedTeamScan` = `npm audit` critical/high + scope note finding; `GET/POST /api/v1/lifeos/intel/redteam/*`, `docs/CONTINUITY_LOG_SECURITY.md`.

### Next (ordered)
1. [ ] **Repo catalog triage waves** — use `docs/REPO_TRIAGE_NOTES.md` + `docs/REPO_CATALOG.md`; delete or archive **DELETE-CANDIDATE** paths; re-run `npm run repo:catalog` after each wave (see ignore list in `scripts/generate-repo-catalog.mjs` for dump dirs).
2. [ ] **Red-team Phase 2** — scoped active probes (staging base URL, OWASP ZAP or custom harness, authz fuzz **only** on allowlisted routes); human-approved target list in SSOT.
3. [ ] **Horizon Phase 2** — auto-append vetted backlog lines to Amendment 21/INDEX (PR or file patch bot) + competitor watchlist table editable via overlay.
4. [ ] Optional: `session-receipt.pre.json` / `session-receipt.post.json` gitignored templates + `zero-drift-check.mjs` strict pairing (env `ZERO_DRIFT_STRICT=1`)
5. [ ] Per-model LCL codebook version pinning (when `codebook-v2.js` exists)
6. [ ] Wire `readiness:check` to **fail** CI when any manifest has `build_ready: true` and amendment lacks filled Pre-Build Readiness gates (today: warn-only in `ssot-compliance.yml`)
7. [ ] Kingsman runtime policy engine (beyond audit log — tie to `AMENDMENT_33`)

---

## Pre-Flight / Post-Flight Rules

**Pre-flight (before edits):** Read `docs/AI_COLD_START.md`, the lane log from `CONTINUITY_INDEX.md`, and the owning manifest JSON for the task. **If the task touches any SSOT markdown:** read that **entire** file in this session **before** the first edit (`CLAUDE.md` → **SSOT READ-BEFORE-WRITE**; `SSOT_COMPANION.md` → **§0.5B**).

**Post-flight (before push):** Update lane log + main log pointer + amendment Change Receipts + regenerate `AI_COLD_START.md`.

**Session tags:** Every log entry starts with `[PLAN]`, `[BUILD]`, `[FIX]`, `[REVIEW]`, or `[RESEARCH]`.

---

## Change Receipts

| Date | What Changed | Why |
|------|--------------|-----|
| 2026-04-25 | **`scripts/generate-agent-rules.mjs`** + regen **`docs/AGENT_RULES.compact.md`** + **`docs/.compact-rules-baseline`** — **§ IDEA VAULT (Lane A/B)** in condensed TSOS: **38** + **`CONVERSATION_DUMP*`** = index/router only; **primary nuance** in source chats + **`raw/`** exports; one-theme promotion → **38** §A or twin **`import-dumps-to-twin`**; **`operator-corpus:pipeline`**, **`idea-vault:catalog-keywords`**; programs/backlog → **38** § seed + portfolio, queue → **`INDEX.md`**. Shorter MEMORY/COUNCIL/SSOT/PROHIBITED/hook lines to satisfy token budget (net smaller packet). | Adam: carry vault vs primary-source discipline + recommended programs spine in every cold-agent read; align with **Channel A** compact packet. |
| 2026-04-25 | **`docs/projects/AMENDMENT_38_IDEA_VAULT.md`** + **`AMENDMENT_38_IDEA_VAULT.manifest.json`** — **Idea Vault** SSOT: streams A–H (LifeOS CoPilot dump, Grok 25 + pods, DeepSeek AURO/conductor, GPT builder/phone/overlay, GPT economic layers, Gemini capsule/revenue, IMMEDIATE_FEATURES doc, Mission/Directives/misc); **§6** protocol for auditable coverage without linear MB reads; routing to amendments **01–38** (38 = Idea Vault). **`docs/projects/INDEX.md`** — amendment **38** row + “forgotten ideas” pointer. **`docs/REPO_MASTER_INDEX.md`** — Idea Vault row. **`docs/CONVERSATION_DUMP_IDEAS_INDEX.md`** — owning pointer to **38** (manifest **38** owns vault + companion index). | Adam: one project amendment for all relevant captured ideas + mental load relief; honest audit scope. |
| 2026-04-25 | **`docs/CONVERSATION_DUMP_IDEAS_INDEX.md`** — inventory of **`•`+TAB+`Lumin-Memory/00_INBOX/raw/`** exports (sizes), placeholder warning for `Lumin-Memory/` 404 stubs, links to **`docs/THREAD_REALITY/`**, **`conversation_dumps/README`**, **`IMMEDIATE_FEATURES_AND_REVOLUTIONARY_IDEAS.md`**, split/import scripts; **§4** theme clusters (WellRoundedMomma SKUs, Mission & North Star overlay vision, Lumea directives, Miscellaneous sprint, immediate-features doc). **`docs/REPO_MASTER_INDEX.md`** — new row in §D. **`docs/projects/INDEX.md`** — pointer + **9 new Candidate Concepts** rows. | Adam: index and study conversation dumps; surface ideas not in prior candidate table. |
| 2026-04-26 | **`docs/REPO_MASTER_INDEX.md`** — single **navigation hub**: repo inventory files, SSOT, continuity logs, prompts, `FEATURE_INDEX`, runtime spine pointers, “when to update” table. **`scripts/generate-repo-catalog.mjs`** now also writes **`docs/REPO_BUCKET_INDEX.md`** (top-level buckets A→Z + **largest 15 by bytes**). Cross-links: **`INDEX.md`**, **`CONTINUITY_INDEX.md`**, **`QUICK_LAUNCH.md`**, **`REPO_TRIAGE_NOTES.md`**, **`REPO_DEEP_AUDIT.md`**. Manifest owns new paths. | Adam: “better index of all of them” while cataloguing — one page to find every index class. |
| 2026-04-26 | **`docs/REPO_DEEP_AUDIT.md`** — operator-facing **deep audit**: why multi-agent drift happened; **spine** = `server.js` + `startup/register-runtime-routes.js` (+ `api-v1-core`, `server-routes`, site-builder + command-center from `server.js`); **Tier A–D** value / archive / fix; **Wave 0–4** cleanup order; dual migration roots + `THREAD_REALITY` + `backups/` + `logs/` called out. Linked from **`REPO_TRIAGE_NOTES.md`** (seed rows) + **`docs/projects/INDEX.md`**. | Adam: “go deeper” — function/value per layer, archive vs fix, without pretending every file is production. |
| 2026-04-26 | **`scripts/generate-repo-catalog.mjs`** + **`npm run repo:catalog`** — writes **`docs/REPO_CATALOG.md`** + **`docs/REPO_CATALOG.json`**: every non-ignored file with path, bytes, line count (≤96KB files), kind, mtime, first-line hint. **Skips** by default: `node_modules`, `.git`, `.cursor`, `THREAD_REALITY` (~367k dump files), `audit/reports/` (generated FSAR/drift), other junk dirs (see script). **`docs/REPO_TRIAGE_NOTES.md`** — human **KEEP / GOLD / DELETE-CANDIDATE**. Pointers in **`docs/projects/INDEX.md`**, **`docs/CONTINUITY_INDEX.md`**, **`docs/QUICK_LAUNCH.md`**. Backlog: triage waves. | Adam: master inventory for multi-run cleanup, find gold vs trash, keep indexes updated after tree changes. |
| 2026-04-25 | **`scripts/generate-agent-rules.mjs`:** supreme-law row **§2.14 TSOS (non-human)** — machinery uses lexicon + council compression; **human + §2.11b NL exempt**; trimmed duplicate §2.14 line under §2.11. Regen **`docs/AGENT_RULES.compact.md`** (token budget OK). **`prompts/00-LIFEOS-AGENT-CONTRACT.md`** + **`00-SSOT-READ-SEQUENCE.md`:** explicit law — **other than talking to a human**, outputs use **TSOS compression** / **§2.14** / **`TSOS_SYSTEM_LANGUAGE.md`**. | Adam: non-human channels must use TSOS; human-facing + §2.11b stay plain language. |
| 2026-04-25 | **`prompts/00-SSOT-READ-SEQUENCE.md`**, **`prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md`** — agent/system read order + think vs execute model policy; **`scripts/generate-cold-start.mjs`** read order updated; builder **`GET /next-task`** includes snippets for those prompts. | Adam: explicit prompts + laws to reduce hallucination/drift; execute-tier routing for frozen specs. |
| 2026-04-25 | **`docs/SSOT_DUAL_CHANNEL.md`** — defines Channel A (agents: compact + QUICK_LAUNCH + lanes) vs Channel B (system: NSSOT + Companion + INDEX + capabilities + amendments); **one canonical tree, derived agent packet** via `npm run gen:rules` (no duplicate constitutional prose). **`docs/SSOT_AMENDMENT_BUILD_READINESS_AUDIT.md`** — criteria for “build from SSOT alone”; KNOW gaps (INDEX route drift, council SSOT injection, CI readiness hardness, Docker docs). **`docs/projects/INDEX.md`** — “Two channels, one law” pointer. | Adam: split agent vs system SOT without maintaining two editable law files; audit whether amendments are flush enough for autonomous build. |
| 2026-04-25 | **`scripts/generate-agent-rules.mjs`** — **§2.11c** supervisor row; **§2.11b** one-liner; **PROHIBITED** §2.11c; shorter supreme-law rows. Regen `docs/AGENT_RULES.compact.md`. | North Star **§2.11c**; Conductor = audit system, not default IDE product. |
| 2026-04-22 | **`scripts/generate-agent-rules.mjs`** — **§2.15** supreme-law row; **§2.11b** + **INTENT DRIFT**; **PROHIBITED** (§2.15 silent substitute); merged §2.14 into §2.11b line; shorter §2.12. Regen `docs/AGENT_RULES.compact.md`. | Adam: operator instruction in compact; paper law honest limits. |
| 2026-04-22 | **`scripts/generate-agent-rules.mjs`** — new **§2.14 MACHINE CHANNEL** block; supreme-laws row; **PROHIBITED**: §2.14 without TSOS lexicon; **ENDPOINTS** one-liner (replaces table) to save bytes under token budget. Regen `docs/AGENT_RULES.compact.md`. | Adam/CC: compact packet must enforce **North Star §2.14** + `docs/TSOS_SYSTEM_LANGUAGE.md` for machinery; stay under `.compact-rules-baseline`. |
| 2026-04-22 | **`scripts/generate-agent-rules.mjs`** — SESSION START step **5** (Railway proof already in thread → read `ENV_DIAGNOSIS_PROTOCOL` *Operator-supplied evidence*); §6 **PROHIBITED** adds **Env gaslighting**. Regen `docs/AGENT_RULES.compact.md` via `npm run gen:rules`. | Adam: SSOT must stop agents from asking for vars he already proved in Railway or calling them “not in prod” from empty Cursor shell — enforcement packet must carry the hard stop. |
| 2026-04-25 | **`scripts/generate-agent-rules.mjs`** — §2 “platform exceptions” line matches **`CLAUDE.md`**: no blanket exemption for `lifeos-council-builder-routes.js`; Conductor extends builder via **`POST /build`** or **`GAP-FILL:`** after failed `/build`. Regen `AGENT_RULES.compact.md`. **`scripts/council-builder-preflight.mjs`** — `finish()` + **`data/builder-preflight-log.jsonl`** (gitignored). | Adam: Conductor must not IDE-bypass the system; compact packet must not contradict CLAUDE. |
| 2026-04-25 | **`scripts/generate-agent-rules.mjs`** — North Star **§2.11a/§2.11b** split in generated packet: two supreme-law table rows; §2 one-liner; **§2.11b / §0.5G** end-of-slice report block; **END** handoff points to **§2.11b** not **§2.11a** for reporting. Regenerated `docs/AGENT_RULES.compact.md`. | Stop merging **TSOS** with **Conductor→Adam** epistemics in the enforcement packet. |
| 2026-04-23 | **`scripts/generate-agent-rules.mjs`** — §7 KEY ENDPOINTS: `GET /gate-change/presets` (auth: command key **or** admin JWT, per `lifeos-gate-change-routes.js` #65) + `npm run lifeos:gate-change-run -- --list-presets`. Regenerated `docs/AGENT_RULES.compact.md`. | LifeOS #64–#65: compact packet tracks gate-change operator paths + Settings panel JWT. |
| 2026-04-22 | **`scripts/generate-agent-rules.mjs`** (regen: `npm run gen:rules` → `docs/AGENT_RULES.compact.md`): §2.12 retitled; added **Real Council** epistemic block — agent is not the server, must **POST** gate-change or run CLI with `COMMAND_CENTER_KEY`+`PUBLIC_BASE_URL`, else state **`COUNCIL: NOT RUN`** + **`OPINION ONLY`**, never imply a panel; cite **`proposal.id`** when run; “misleading by omission = lying.” §6: forbid “virtual council” / omission. §7: npm lines for `lifeos:gate-change-run`. | Adam: past session framed council-like output without a server receipt — trust + §2.6 violation; **policy must be in generated enforcement packet** (not only QUICK_LAUNCH) so every cold agent sees it. |
| 2026-04-20 | **`docs/QUICK_LAUNCH.md` — Latest Completed:** added LifeOS **household invites + auth UX** bullet (`CONTINUITY_LOG_LIFEOS.md` #14) so NSSOT/Quick Launch reflects shipped conductor work, not only TC continuity. | North Star §2.6 ¶9 — every session that ships work updates the launch packet; LifeOS slice had landed in code/logs but was missing from Latest Completed. |
| 2026-04-20 | **`npm run cold-start:gen`** — regenerated `docs/AI_COLD_START.md` after Quick Launch continuity pass. | Amendment 36 post-flight: cold-start packet must track lane logs. |
| 2026-04-20 | **`docs/QUICK_LAUNCH.md`:** `Current Priority Queue` item 4 now points TC lane to next **code** work (intake/portal/QA) post-continuity pass; **Latest Completed** documents TC lane handoff hardening (Amendment 17 + `CONTINUITY_LOG_TC.md`). | TC conductor shipped documentation-only continuity; Quick Launch must stay the live queue surface per session contract. |
| 2026-04-19 | **NSSOT shortcut + lane router upgrade:** Added `docs/QUICK_LAUNCH.md` as mandatory conductor launch packet, added North Star §2.6 ¶9 alias semantics (“read NSSOT” => North Star + Quick Launch + lane routing), added TC lane log `docs/CONTINUITY_LOG_TC.md` and `CONTINUITY_INDEX.md` row, plus parallel-conductor non-overlap rule. | Adam wants a short command that any AI can follow immediately, including switching lanes (LifeOS/TC) and running two conductors safely. |
| 2026-04-19 | **Gate-change consensus protocol v2:** `POST /api/v1/lifeos/gate-change/proposals/:id/run-council` now runs multi-model round + forced opposite-argument round on disagreement, with persisted `council_rounds_json`/`consensus_reached`/`consensus_summary` and documented in Companion §5.5 + Amendment 01/21 receipts. | Adam requested full “debate the opposite opinion when there is disagreement” protocol and autonomous end-to-end execution. |
| 2026-04-19 | **§2.6 ¶8 gate-change API + Companion §5.5 HTTP paragraph:** `routes/lifeos-gate-change-routes.js` + migration + service + North Star ¶8 API sentence (cross-cutting SSOT). | Adam: close loop from constitution-only to runnable operator path without removing kill switches. |
| 2026-04-19 | **§2.6 mandatory compliance (¶5–7) + Article VI:** North Star text: law cannot be skipped for speed/tokens; cutting corners and laziness on reads/verify/receipts forbidden; downstream `CLAUDE.md`, Companion §0.5B, `prompts/00`, Amendment 21 epistemic §, `lifeos-lumin.js`. | Adam: no discretionary “choose to cut corners” on constitutional truth gates. |
| 2026-04-19 | **North Star Article II §2.6 (supreme law):** `docs/SSOT_NORTH_STAR.md` System Epistemic Oath + Article VI bullet; version 2026-04-19. Downstream: `CLAUDE.md`, `SSOT_COMPANION.md` §0.5B + Appendix A, `AMENDMENT_21` epistemic § implements §2.6, `prompts/00-LIFEOS-AGENT-CONTRACT.md` platform-wide, `lifeos-lumin.js` contract text. | Adam: system must never lie or mislead — to him, users, or itself — full platform constitutional law. |
| 2026-04-19 | **Adam ↔ agent epistemic contract (cross-repo):** `CLAUDE.md` truth-channel paragraph; `AMENDMENT_21` new § + continuity step 0; `prompts/00-LIFEOS-AGENT-CONTRACT.md`; all `lifeos-*.md` + README + CODEX wrapper; `services/lifeos-lumin.js` prepends contract to system prompt; `docs/SSOT_COMPANION.md` §0.5B bullet pointing at Amendment 21 + `00` file. | Adam: never lie; never operate on misunderstanding; correct immediately; fill gaps; Amendment 21 + prompts first. |
| 2026-04-19 | **SSOT read-before-write:** `CLAUDE.md` new section **SSOT READ-BEFORE-WRITE** + session checklist item 5; `docs/SSOT_COMPANION.md` new **§0.5B** + Appendix A bootstrap bullet; this amendment **Pre-flight** + **Last Updated** + receipt. | Adam: hard rule — cannot add to SSOT without reading whole file first; prevents direction-changing blind edits. |
| 2026-04-19 | **Cross-amendment competitive map (01–36)** vs Claude Cowork + **~2 year projection** (2028) + **API/training vs public-repo** risk framing (Privacy Center cite for commercial API no training by default). | Adam asked for portfolio-level strength/weakness vs Cowork and long-horizon competitor trajectory. |
| 2026-04-19 | **Coworker competition section:** retargeted from Cursor to **Anthropic Claude Cowork** (desktop, local folders, Max/subscription, org admin); refreshed gap table and moat framing. | Adam clarified the competitor is Claude Cowork, not Cursor. |
| 2026-04-19 | **Intel budget gate:** `LANE_INTEL_ENABLED=1` now required for any execution — `POST .../intel/*/run` returns 403 when unset; `bootLaneIntel` no-ops; horizon + redteam `createUsefulWorkGuard` prerequisites reject when disabled. Default = off until post-launch / budget approval (Adam). | Prevent accidental token or npm-audit spend before product launch or when cash-flow is priority. |
| 2026-04-19 | **Horizon + Red-team MVP shipped:** migration `20260421_lane_intel.sql`; `lane-intel-service.js` + `lane-intel-routes.js` at `/api/v1/lifeos/intel`; `bootLaneIntel` behind `LANE_INTEL_ENABLE_SCHEDULED=1`; continuity logs `CONTINUITY_LOG_HORIZON.md` + `CONTINUITY_LOG_SECURITY.md`; `lifeos-verify.mjs` extended. | Adam asked to build the lanes once executable; supply-chain audit + web horizon are safe defaults; active pentest deferred for scope SSOT. |
| 2026-04-19 | Added **Autonomous build charter** (blueprint-only interrupts; exception ladder: blueprint → capability → consensus → research) and **Dedicated agent roles** table (red team, horizon/competition scanner) with guardrails + backlog ordering. Fixed script list typo `zero-drift-check.mjs`. | Adam specified operating model: no approval churn after full spec; interruptions only for blueprint/system/impossible-after-research/consensus; standing improvement + future red-team and web-intel agents. |
| 2026-04-19 | Initial amendment + tooling listed in **Last Updated** | Compounding handoff stack requested by Adam |

---

## Configuration you must supply (full execution)

| Variable | Required for | Notes |
|----------|----------------|-------|
| **`LANE_INTEL_ENABLED`** | **Any execution** (manual `POST` or scheduled ticks) | Must be **`1`** to run Horizon or Red-team. **Default: unset = fully off** — no API spend, no `npm audit` from intel routes, no scheduler ticks (Adam: off until post-launch / budget approval). |
| `BRAVE_SEARCH_API_KEY` **or** `PERPLEXITY_API_KEY` | Horizon web results | Without either, set `LANE_INTEL_HORIZON_ALLOW_AI_ONLY=1` to use council training-data fallback (weaker, no live URLs). |
| `LANE_INTEL_HORIZON_ALLOW_AI_ONLY` | Horizon without Brave/Perplexity | `1` = allow AI-only search path. |
| `LANE_INTEL_HORIZON_QUERIES` | Horizon content | Comma-separated queries (default 3 competitor/landscape strings). |
| `LANE_INTEL_HORIZON_COOLDOWN_DAYS` | Scheduled horizon | Default `7` — guard skips if a completed run exists within window. |
| `LANE_INTEL_REDTEAM_COOLDOWN_DAYS` | Scheduled red team | Default `14`. |
| `LANE_INTEL_ENABLE_SCHEDULED` | Automatic ticks | `1` = run horizon + redteam guards on `LANE_INTEL_TICK_MS` interval (default 24h). |
| `LANE_INTEL_TICK_MS` | Scheduler interval | Milliseconds; default one day. |
| `COMMAND_CENTER_KEY` (or your existing `requireKey` secret) | All `/intel` routes | Same as other LifeOS admin APIs. |

**Still missing for “full” red-team (Phase 2):** explicit **staging base URL(s)**, **allowlisted route patterns**, **rate limits**, **who receives P0 alerts**, and **legal/compliance** sign-off for automated probing — document in this amendment before enabling probes.

---

## Coworker competition — **Anthropic Claude Cowork** (not Cursor)

**What Claude Cowork is (public positioning, ~2026):** an **agentic desktop** experience inside Anthropic’s world — **Claude / Claude Max**, **macOS** (initially), **local folder read/write**, multi-step execution toward an **outcome**, strong tilt toward **knowledge work** (documents, research, ops, spreadsheets), plus **org admin** (access, spend, policy) on enterprise tiers. It is **distribution + trust + local execution** in one subscription.

**What you have today (LifeOS “coworker”):** `prompts/*` domain briefs, `POST /api/v1/lifeos/builder/task` + `review` + `next-task`, **multi-model council on Railway**, task→model routing, **SSOT + per-lane continuity + manifests**, optional `---METADATA---` placement, cache + audit hooks. The **conductor** (Claude Code, Cursor, or you) still **applies** patches and **commits** — the app does not own the Mac filesystem loop end-to-end.

**Gap table — “their abilities + ours”:**

| Capability | **Claude Cowork** (Anthropic) | **What it would take for LifeOS** |
|------------|-------------------------------|-------------------------------------|
| **Native local workspace** | Reads/writes user-chosen folders on disk without you paste-uploading everything | **Trusted local runner** (thin CLI or desktop helper) with scoped paths + same receipts you use in SSOT — *or* a **GitHub App** that applies patches in-repo (no arbitrary disk access). |
| **Single-vendor model + UX** | One product, one bill, streaming UI tuned to Claude | You already **route across free/paid models**; “parity” here is **product packaging** (one overlay / one CLI command), not one model. |
| **Outcome loop on device** | Plan → act on files → summarize without leaving desktop | **Runner + artifacts**: after council returns code, **automated** `git apply` / test / PR (see deployment SSOT) with logs written back to continuity. |
| **Enterprise controls** | Admin gates, spend caps, org policy | You have **`requireKey`**, manifests, Kingsman audit stub — extend to **per-tenant budgets** + “coworker allowed actions” ACL matching Anthropic’s admin story. |
| **Recurring / scheduled desk work** | e.g. weekly folder hygiene, metrics pulls | You have **guarded schedulers** — same pattern for “coworker chores” with **Zero-Waste** work checks (already constitutional). |
| **Your moat (not a clone of Cowork)** | General knowledge work on disk | **Domain depth**: LifeOS SSOTs, ClientCare, TC, finance rails — **vertical governed agents** Cowork will not ship as first-party. Parity on **filesystem loop**; differentiation on **regulated, receipted, revenue-aware vertical OS**. |

**Strategic takeaway:** Claude Cowork is the **first serious “coworker” competition** because it combines **Claude quality + local execution + billing + brand**. You win by **not** racing them to “generic desktop agent” first — you win by **closing the apply/verify/PR loop** for *your* verticals while keeping **SSOT + gates** stricter than a mass-market agent can afford to be.

---

## Cross-amendment map (Index **01–36** + North Star) vs Claude Cowork

**Method:** `docs/projects/INDEX.md` registry + `docs/SSOT_NORTH_STAR.md` mission. Grouped by **economic and technical role**, not by file order.

| Cluster | Amendments (representative) | What this stack is | **Cowork overlap** | **Who is stronger today** |
|--------|-----------------------------|----------------------|--------------------|---------------------------|
| **North Star + ethics** | Constitution, **33** Kingsman | Mission lock, safety mandate, sovereignty language | Low — Cowork is horizontal productivity | **You** — they do not carry your healing/education/heist-free constitution as product law. |
| **AI platform & cost** | **01** Council, **02** Memory, **04** Auto-Builder (guarded), **10** API Cost Savings, **13** Knowledge / web intel, **19–20** Governance / capability map, **36** Handoff | Multi-model routing, compression, receipts, builders, continuity | **High** — same “agent + tools” battleground | **Cowork** on **desktop UX + local loop**; **you** on **multi-vendor routing, token economics, SSOT coupling, Zero-Waste guards**. |
| **Revenue & ops depth** | **03** Revenue, **05** Site Builder, **08** Outreach CRM, **11** BoldTrail, **17** TC, **18** ClientCare, **27** Sprint offers | Real money workflows, regulated-adjacent ops, CRM | **Very low** — Cowork will not ship your TC/MLS/claims stack | **You** — this is the moat Cowork cannot copy from a chat window. |
| **Command & surface** | **12** Command Center / overlay | Operator UX, dashboards | Medium — they own *personal* desktop; you own *ops* overlay on your domains | **Split** — polish vs domain dashboards. |
| **LifeOS + personal OS** | **09** Life coaching / twin, **21** LifeOS Core (+ conflict, finance, Lumin, etc.) | Purpose-first OS, family, emotion, decisions, truth delivery | Medium — generic “organize my life” is adjacent | **You** on **cross-domain fusion + consent + household rules**; **Cowork** on **faster file iteration** for generic tasks. |
| **Future verticals (mostly planning)** | **25–32, 34–35** Conflict arbitrator, PF OS, Wellness, Receptionist, Enterprise governance, Teacher/Kids/Music/University | Option value, large TAM slices | Medium — each vertical has a SaaS incumbent | **Neither yet** — mostly **paper + SSOT** until shipped; **Cowork** wins **default attention** until you ship. |
| **Media / games / WL** | **06, 07, 14, 15, 22–24** | Adjacent revenue & IP | Low | **You** when integrated into **your** funnel; **Cowork** irrelevant unless you delegate creative pipeline to it. |

**Where you are clearly stronger**

- **Validated revenue machinery** (18, 17, 11, 05, 08, 27) — Cowork is not competing for **ClientCare dollars** or **TC coordination**.
- **Constitutional product law** (North Star + **21** + **33**) — explicit sovereignty, evidence rule, fail-closed — hard to replicate as a mass-market consumer surface.
- **Governed self-programming** (**19**, **36**, manifests, hooks) — builder + receipts + lane logs; Cowork does not ship *your* amendment coupling.
- **Multi-model arbitrage** (**01**, **10**) — not locked to Anthropic; Cowork is **Anthropic-first** by design.

**Where Claude Cowork is clearly stronger (today)**

- **Local workspace loop** — read/write folders, multi-step “just do it” on disk without a separate conductor.
- **Distribution & trust** — one **Claude / Max** brand, enterprise admin story, consumer habit.
- **Product velocity on horizontal knowledge work** — spreadsheets, slides, research packs; faster path to “good enough” for millions.
- **Tight Claude model + UI co-evolution** — features can assume one stack; you integrate many providers.

---

## Projection — Claude Cowork in **~2 years** (April **2028**)

Labels: **KNOW** = grounded in public direction; **THINK** = reasonable extrapolation; **GUESS** = low confidence.

**KNOW — direction of travel**

- Deeper **enterprise** controls (spend, policy, audit, retention tiers) and **more host platforms** (beyond initial macOS research-preview positioning).
- Tighter **MCP / tool / connector** ecosystem — agents that reach more systems without manual glue.
- Continued **overlap with Claude Code lineage** — “agent that ships” is explicitly the narrative Anthropic markets for Cowork-style products.

**THINK — likely by 2028**

- **Windows + web** parity for the same “coworker” persona (desktop market share forces it).
- **Team / shared workspaces** — not only solo knowledge work; light CRM / project surfaces inside the same shell.
- **Regulated-industry packaging** (HIPAA-style narratives, admin attestations) for large contracts — same motion as every horizontal AI vendor.

**GUESS — possible but uncertain**

- **OS-level or browser-default** distribution partnerships (THINK: distribution war, not confirmed).
- **On-device or private-cluster** variants for enterprises that refuse cloud retention windows (THINK: market pull; **GUESS** on implementation).

**Implication for LifeOS:** in two years Cowork is less likely to **replace** your vertical rails than to **absorb generic “agent chores”** everywhere. Your defense is **shipping revenue verticals + governed agents + data that never needed to live in Anthropic’s folder model** (Neon, BoldTrail, claims, household consent graphs).

---

## “They see our ideas through the API — will they steal them?”

**KNOW (Anthropic commercial / API — training):** Anthropic’s Privacy Center states that for **commercial offerings including the Anthropic API**, they **will not use your chats or coding sessions to train their models** unless you join something like the **Development Partner Program** or **explicitly** opt in (e.g. feedback). Source: [How does Anthropic process data sent through the API?](https://privacy.anthropic.com/en/articles/7996885-how-does-anthropic-process-data-sent-through-the-api) — see section **“Data usage for Anthropic Commercial Offerings”**.

**KNOW (separate channel):** **Consumer** Claude (Free / Pro / Max / some Claude Code usage) can follow **different** training and retention rules than the **API**. Do not put **secret** product strategy only into consumer chat if you need strictest separation — use **Commercial API / enterprise terms** for sensitive automation, or keep specs **off-cloud**.

**THINK — what API policy does *not* solve**

- **Competitive copying does not require training.** If strategy lives in **public GitHub** (`docs/projects/*.md`), any competitor (including Anthropic employees) can **read the repo** like any engineer — no API involved.
- **Ideas are not IP by themselves** — execution, data, distribution, and trust are the moat. Your amendments describe **what to build**; the wall is **shipping** 17/18/11 and **operator lock-in**.

**GUESS — low confidence**

- Whether long-term enterprise DPA / ZDR terms stay as strict for all tiers — **monitor** Commercial Terms when you renew.

---

## Agent Handoff Notes

| Field | Value |
|-------|--------|
| **Next task** | **Do not** set `LANE_INTEL_ENABLED` until post-launch. **Claude Cowork:** see “Coworker competition,” **Cross-amendment map**, **Projection 2028**, and **API / idea theft** sections — next build is local runner / GitHub apply loop, not generic desktop agent. **SSOT routing:** read `docs/SSOT_DUAL_CHANNEL.md` (agent vs system); amend policy in NSSOT/Companion/amendments only — regen `AGENT_RULES.compact.md` via `npm run gen:rules`. **Amendment completeness:** `docs/SSOT_AMENDMENT_BUILD_READINESS_AUDIT.md`. **SSOT edits:** `CLAUDE.md` + Companion **§0.5B** — full read of any SSOT file before editing it. |
| **Blockers** | None for intel (intel intentionally dormant). |
| **⚠️ IN PROGRESS:** | None |
