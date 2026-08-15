<!-- SYNOPSIS: Overlay + Taloa Communication — Current-State Audit -->

# Overlay + Taloa Communication — Current-State Audit

**Date:** 2026-08-15 · **HEAD:** `348e2f8d67444b8566f3a27ac3a0b7fb6bed8e5f` · **Type:** read-only evidence/navigation
**Authority:** none. This document decides nothing, changes nothing, and does not supersede any blueprint, Product Home, queue, or governance record. It exists so Adam and ChatGPT can reason from the same evidence.
**Method:** direct file reads + grep against the working tree; no code, blueprint, queue, or receipt was modified to produce this.

---

## PART 1 — UNIVERSAL OVERLAY

### 1.1 Active-file inventory

| Path | Declared status | Authority claim | Last meaningful update | Runtime consumes it? | Conflicts? |
|---|---|---|---|---|---|
| `docs/products/universal-overlay/PRODUCT_HOME.md` | `active-build` / `evolving` (line ~25-31) | Canonical product home | Two disagreeing "Last Updated" fields in the same file: top table says `2026-08-13`, second metadata table says `2026-08-09` | N/A (doc) | Yes — internal self-contradiction (see below) |
| `docs/products/universal-overlay/INTELLIGENT_OVERLAY_BLUEPRINT.md` | Defines V0–V5 roadmap | Cited by PRODUCT_HOME as "the full versioned roadmap"; §10 of the doc itself says *"Founder review of this version order. After agreement…"* — i.e. never explicitly ratified as final | Git: created 2026-08-05, last touched 2026-08-06 | Yes — `services/overlay-blueprint-terminal.js` regex-parses this file's `### V…` headings at runtime to compute "versions proven" | **Yes, major** — see §1.3 |
| `docs/products/universal-overlay/TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md` | "Consensus Blueprint — Revision 2, ChatGPT-cross-reviewed twice" | Self-declared authority for the §-numbered execution scheme (§12–§65a) | 2026-08-11 | **Yes** — `config/overlay-print-sequence.js` names `OVERLAY_PRINT_SOURCE = 'TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md'` and the §64 print sequence is what the factory has actually been building | **Yes, major** — this is a different authority/versioning scheme than the V0–V5 doc above, for the same product |
| `docs/products/universal-overlay/FILE_MANIFEST.json` | `updated_at: 2026-08-06` | Lists 3 `owned_files` only (PRODUCT_HOME, itself, INTELLIGENT_OVERLAY_BLUEPRINT.md) | 2026-08-06 | No | Stale — none of `services/taloa/*`, `routes/taloa-*`, or `native/macos-overlay/*` (all built 2026-08-09 through 2026-08-14) are listed |
| `docs/products/universal-overlay/BUILD_QUEUE.json` | `multi_project: true` | Execution queue | `updated_at: 2026-08-13T04:00:00Z`; latest step activity `2026-08-14T19:45:06Z` | Yes — read by factory-lane scripts | Carries both `universal-overlay` (112 steps) and `collectibles` (46 steps) under one `mission_id: PRODUCT-universal-overlay` |
| Terminal-scope state | `terminal: false` | `services/overlay-blueprint-terminal.js` → `evaluateOverlayBlueprintTerminal` | Receipt generated `2026-08-15T15:11:20Z` | Yes — this is the live evaluator | Consistent with SENTRY findings below |
| `products/receipts/SENTRY_OVERLAY_LAYER_B.json` | `ok: false` | Independent SENTRY Layer B pass | `2026-08-15T15:11:20Z` (newest file examined in this audit) | N/A (receipt) | None — this is the ground-truth receipt |
| `docs/products/universal-overlay/conversations/*.md` (9 files, 2026-08-12/13) | Founder-captured session logs | Direct founder quotes | 2026-08-13 (newest) | N/A | Corroborate SENTRY findings |
| `builderos-reboot/MISSIONS/TALOA-OVERLAY-P1-0001/`, `OVERLAY-DRIVE-CHANNEL-0001/`, `OVERLAY-ENGINE-RISK-GATE-0001/`, `OVERLAY-STUCK-LOOP-RECOVERY-0001/`, `PRODUCT-COMMUNICATION-V4-OVERLAY-ACTION-0001/` | All 5 have `OBJECTIVE_VERDICT.json` verdict `OBJECTIVE_COMPLETE`, `founder_usability_pass: false` | Governed-factory mission acceptance | `generated_at` 2026-08-14T22:12:0x on git_sha `348e2f8d67` | N/A | `builderos-reboot/PRODUCT_READINESS_REPORT.json` labels the same two missions `verdict: "TECHNICAL_PASS"` — a different string for the same state |
| `builderos-reboot/MISSIONS/OVERLAY-DRIVE-AUTOPICKUP-0001/`, `OVERLAY-DRIVE-CORS-FIX-0001/`, `OVERLAY-DRIVE-MODEL-CALL-FIX-0001/` | No `OBJECTIVE_VERDICT.json` present | — | — | — | Incomplete mission records, not verdictable from repo alone |
| `builderos-reboot/governance/SENTRY_FINDINGS_QUEUE.json` | 3 overlay findings, all `queue_status: "open"` | Governance | `last_deep_review_at: 2026-08-15T19:09:08Z` | Yes | See §1.4 |
| `native/macos-overlay/` (27 files) | Local Mac app, actively developed | Founder-facing overlay app (badge/avatar/voice/perception) | Files dated through 2026-08-14; no CI test suite (only 1 excluded ad-hoc `.swift` test file, excluded from `build.sh`) | Runs locally, not server-side | None found |

### 1.2 PRODUCT_HOME.md self-contradiction (verbatim)

Top table: `**Last Updated** | 2026-08-13 — Founder: do not start using the overlay as the hands; it is not good yet.`
Second table, same file: `**Last Updated** | 2026-08-09 — All 6 real Chrome-extension install bugs confirmed working live end to end...`

Two different "Last Updated" claims in one document is itself a small but real governance-hygiene gap, not just a curiosity — it means a reader can walk away with either state depending which table they read first.

### 1.3 THE central structural finding: two competing authority documents

- `INTELLIGENT_OVERLAY_BLUEPRINT.md` defines the **V0 → V5 ladder** (7 versions) that SENTRY's Layer B evaluator scores against (`versions_total: 7`, `versions_proven: 0`).
- `TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md` defines a **completely different §-numbered scheme** (§12 Control Plane … §64 print sequence … §65 "Done" definition) — and **this is the document the factory has actually been building against** (`config/overlay-print-sequence.js` cites it by name; all `TALOA-S64-*` steps in `BUILD_QUEUE.json` are `done`).
- Neither document has been founder-ratified as *the* acceptance authority: the V0–V5 doc's own §10 says the version order awaits founder agreement; nothing in the repo shows Adam signing off on either ladder as canonical over the other.
- Practical consequence: the factory finished 95 of 112 overlay `BUILD_QUEUE.json` steps (mostly §64 capability-registry / body-adapter / auth-envelope construction), the queue is now empty (`open_queue_steps: 0`), and **none of that construction maps onto proof of any V0–V5 acceptance gate** — because the two documents were never reconciled into one measurable ladder in the first place. This is exactly the kind of ambiguity SENTRY itself flags (`architect_status: needs_manual_targeting`, see §1.4).

### 1.4 Version-by-version reconstruction (V0 → V5, 7 versions total)

For every version: **do not treat `BUILD_QUEUE.json` "done"/"skipped" as proof** — per instruction, and per the repo's own doctrine (`services/overlay-blueprint-terminal.js` header: *"Queue exhaustion is construction state, not product completion."*).

**V0 — Observation & Context**
1. Requirement: browser extension reads a live page/form; user asks "what is this asking for?" and gets a correct answer.
2. Acceptance predicate: real extension, live site, correct answer to that question.
3. Artifacts: a Chrome extension exists; PRODUCT_HOME (2026-08-09 note) claims "6 real Chrome-extension install bugs confirmed working live end to end" — but that is an *install* fix, not a form-comprehension proof.
4. Runtime reachability: unclear from repo evidence alone (extension install ≠ extension answering a question).
5. Front-door UAT evidence: none found.
6. Independent acceptance receipt: **none** — SENTRY Layer B explicitly names `overlay_front_door_operation_proof_missing`: *"No runtime proof exists at `products/receipts/SENTRY_OVERLAY_FRONT_DOOR_OPERATION.json`."*
7. **Honest state: UNPROVEN** (install mechanics likely exist; the specific V0 comprehension gate has zero receipt evidence either way).
8. Missing work: one real run producing `SENTRY_OVERLAY_FRONT_DOOR_OPERATION.json` against a live form.
9. Ambiguity: none specific to V0 itself, but see §1.3 — is V0 even still the gate the factory is building toward?

**V0.5 — AI Persona / Avatar**
1. Requirement: HTML prototype — drag a badge, expand/collapse a face figure, switch expressions wired to a mocked `state`.
2. Acceptance predicate: the prototype interaction working as specified.
3. Artifacts: substantial real native code — `native/macos-overlay/TaloaImageCharacterView.swift` (20KB), `ContainerView.swift` (32KB), `ShowLayer.swift` — with a documented, founder-fed bug-fix history (badge-form expression triggers were dead code; fixed after founder said "it looks exactly the same").
4. Runtime reachability: runs as a local Mac app, not server-mediated — "reachable" in the sense of launchable on Adam's machine.
5. Front-door UAT evidence: 2026-08-13 conversation capture shows Adam actually interacting with it and reporting it's "no different" after ~4 days of iteration.
6. Independent acceptance receipt: **none formal** — SENTRY Layer B still scores this `proven: false, failures: ["run_missing"]`.
7. **Honest state: BUILT_UNWIRED** (real, used, founder-tested code; no independent front-door receipt exists to formally close the gate).
8. Missing work: a receipt that runs the actual acceptance predicate (drag/expand/expression-switch against mocked state) and records pass/fail.
9. Ambiguity: none.

**V1 — Conversational Contracts & Voice Presence**
1. Requirement: 25-item voice list without abandonment; natural interruption.
2. Artifacts: `scripts/prototype-conversational-contracts-v1.mjs` + receipt `COMMUNICATION_SYSTEM_V1_TEST_TRANSCRIPT.json` (promise/commitment extraction from raw text — a standalone script test, not the live overlay). `services/interaction-decision-service.js` (`computeTurnCompletionConfidence`) exists but has **zero live callers anywhere** (`grep` across routes/services/startup/public — file itself only).
4. Runtime reachability: none — the barge-in trigger that does exist (`fadeAndStopSpeaking`, see Part 2 §18) checks only `isSpeaking()`, never calls `computeTurnCompletionConfidence` at all.
5–6. No front-door or independent proof.
7. **Honest state: BUILT_UNWIRED**.
8. Missing work: wire `interaction-decision-service.js` into a real caller, or retire it if superseded.
9. Ambiguity: V1 here (Overlay ladder) and "Communication System V1" (chat product) appear to be the *same* underlying work item scored in two different product spaces — worth resolving which product owns it.

**V2 — Evidence Fusion & Cognitive Dynamics**
1. Requirement: fusion-based state estimates beat single-source guesses on a labeled "frustrated/stuck/ready/celebrating" test set.
3. Artifacts: `services/evidence-fusion-service.js` — confirmed **wired into `services/chair-direct-agent.js`** (PRODUCT_HOME 2026-08-08: computes a conversational-state signal from transcript + history).
4. Runtime reachability: reachable, but through the **founder-chat conductor path**, not through any Universal Overlay surface — no overlay route/UI was found consuming this service.
5–6. No overlay-specific front-door proof; no labeled-accuracy benchmark receipt found for the stated acceptance predicate.
7. **Honest state: NOT BUILT** (for the Overlay product specifically — the underlying service exists and is wired, but into a different product's surface, not the Overlay's).
8. Missing work: either wire evidence-fusion into an actual Overlay surface, or formally re-scope V2 as chat-product work and remove it from the Overlay ladder.
9. Ambiguity: yes — same root cause as V1: work exists but its product ownership vs. the V0–V5 ladder is unresolved.

**V3 — Face, Body, and Biometric Perception**
1. Requirement: opt-in camera+mic; correctly detects "user looks confused."
3. Artifacts: `SemanticPerception.swift`, `ScreenControl.swift`, `MacOsBodyAdapter.swift` — `BUILD_QUEUE.json` shows `TALOA-S64-MACOS-PERCEPTION-001` / `TALOA-S64-MACOS-BODY-001` as `done`.
4–6. No opt-in consent flow, no confusion-detection accuracy test, no receipt found proving the specific acceptance gate.
7. **Honest state: BUILT_UNWIRED** (files exist and are queue-"done"; the actual biometric-detection gate is unproven — SENTRY: `proven: false`).
8. Missing work: consent UX + one real detection-accuracy proof.
9. Ambiguity: none beyond §1.3.

**V4 — Verbal AI Director & Autonomous Overlay Action**
1. Requirement: "fill this form with my info and stop before submitting" → ≥90% correct fill on an unseen form, stops at submit.
3. Artifacts: mission `PRODUCT-COMMUNICATION-V4-OVERLAY-ACTION-0001` verdict `OBJECTIVE_COMPLETE` — but built on shallow callability checks (per pattern seen across all 5 overlay mission receipts: `"detail": "createX: methodY, methodZ callable"`, not functional proof). `services/overlay-action-service.js` is in the **zero-real-callers** set named by the 2026-08-08 PRODUCT_HOME audit ("4 of 5 new Communication System V1–V5 services have zero real callers").
7. **Honest state: BUILT_UNWIRED**.
8. Missing work: wire the service to a real caller, then run the actual 90%-fill-accuracy test against an unseen form.
9. Ambiguity: none beyond §1.3.

**V5 — Cross-Domain Personal Intelligence**
1. Requirement: a profile improvement in one domain measurably improves quality in a second domain without leaking private context.
3. Artifacts: `scripts/prototype-cross-domain-v5.mjs` + `COMMUNICATION_SYSTEM_V5_TEST_TRANSCRIPT.json` (calendar/finance "firewall"/consent logic tested in isolation, local script run, no `base`/production field). `services/cross-domain-intelligence-service.js` — zero real callers (same audit finding as V4).
7. **Honest state: NOT BUILT** (prototype-script level only; no product service reachable from any live path).
8. Missing work: everything — this is the least-built rung of the ladder.
9. Ambiguity: none beyond §1.3.

### 1.5 Verification of the reported condition

> "terminal false, 7 total versions, 0 proven, queue exhausted, continuity finding open, handoff-only recovery"

**CONFIRMED — current repository/runtime evidence matches this exactly, as of the newest receipt in the repo (`SENTRY_OVERLAY_LAYER_B.json`, generated `2026-08-15T15:11:20Z`, ~4 hours before this audit):**

```json
"terminal": false, "versions_total": 7, "versions_proven": 0,
"versions_open": ["V0","V0.5","V1","V2","V3","V4","V5"],
"open_queue_steps": 0, "queue_exhausted_before_terminal": true
```

- **Continuity finding open, confirmed:** `builderos-reboot/governance/SENTRY_FINDINGS_QUEUE.json` carries 3 chained findings, all `queue_status: "open"` — `overlay_blueprint_idle_before_terminal` (P0, detected 2026-08-14T23:54Z, `chair_status: "approved"`, `architect_status: "needs_manual_targeting"`) → `fixer_failed:...` → `fixer_unrepaired:...` (`chair_status: "escalate_to_founder"`).
- **Handoff-only recovery, confirmed at code level:** `services/manufacturing-self-repair.js` (lines ~249–255) pushes `request_architect_blueprint_slice` to `tip_actions` and records `overlay_blueprint_continuity_handoff_requested` — but never derives, persists, or projects an actual next slice. `scripts/run-factory-lane.mjs` (`applyWatchdogAndMaybeReship`, ~line 315) has no branch that consumes `request_architect_blueprint_slice` at all. Root-cause doc `docs/projects/BRAINSTORM_SESSIONS/tsos-platform/2026-08-14_lifeos-builderos-blueprint-revision/192_OVERLAY_CONTINUITY_HANDOFF_NO_CONSUMER_ROOT_CAUSE_2026-08-15.md` names this precisely: *"The recovery action exists only as a return value/status label."*
- Latest independent live recheck (`193_LIVE_CONTINUITY_AND_P0_SCOPE_RECHECK_2026-08-15_0937.md`, same day as this audit): *"No Overlay version or recovery transition advanced. The live factories remain in visible unrepaired idle."*

**Nothing in current evidence contradicts the reported condition. It is accurate and, per the newest timestamped receipt in the repo, still true as of hours before this audit was written.**

---

## PART 2 — TALOA COMMUNICATION SYSTEM

### 2.0 Naming note

The founder ratified "Taloa" (persona/brand) and "Digital Imprint"/"Conductor" (target names for "Digital Twin"/"Chair") on 2026-08-11 (`docs/products/lifeos/conversations/2026-08-11-taloa-blueprint-consensus-and-live-intake-test.md`). **The running code has not been renamed** — the live system still identifies itself as `"interface": "Lumin"` in API responses, and every file below is still named/keyed `lumin`/`chair`. This audit uses the code's actual current names and notes the ratified rename is cosmetic-pending, not yet executed.

### 2.1 Capability classification

No state is inferred above what was directly evidenced. "—" means no evidence found in either direction.

| # | Capability | Key file(s) | State | Evidence |
|---|---|---|---|---|
| 1 | Front-door chat UI (canonical) | `public/overlay/lifeos-app.html`, served `GET /lifeos` | **FRONT_DOOR_REACHABLE** | Prod receipt `FOUNDER_CHAT_ALPHA_BATTERY.json` (base `lumin-web-production-e3a9.up.railway.app`, 2026-08-08): `H0_founder_login_health` → HTTP 200 |
| 1b | Dead alt chat UI | `public/chat/index.html` | **BROKEN** | References `/scripts/chat.js`, `/styles/chat.css` — neither file exists on disk; no route mounts it |
| 2 | Founder message path | `POST .../founder-interface/message` (`routes/lifeos-builderos-command-control-routes.js:1461`) | **FRONT_DOOR_REACHABLE, BEHAVIORALLY_VERIFIED** | Same-day prod smoke test (PRODUCT_HOME 2026-08-08): frustration-worded msg → distinct empathetic reply; neutral technical msg → plain factual reply; both HTTP 200 |
| 3 | Conductor orchestration | `services/lumin-chair-orchestrator.js` (`runLuminChairTurn`) | **WIRED, DEPLOYED** | Called directly from the route above; SO-003 canned-answer guard present in code (`chair-lumin-unified.js`) but no dedicated receipt independently verifies the guard in production — behavioral state there is **UNKNOWN** |
| 4 | Conversation routing | `chair-context-classifier.js`, `chair-intent-signals.js` | **WIRED, DEPLOYED** | Imported into orchestrator; exercised indirectly by the message-path receipts above |
| 5 | Context loading | `services/chair-native-facts.js` (`gatherChairNativeFacts`) | **WIRED, DEPLOYED, BEHAVIORALLY_VERIFIED** | Prod receipt shows twin-sourced identity content surfaced correctly: *"Adam, you're the founder to me. Right now, your top priorities are: Clearing debt…"* |
| 6 | Twin/Imprint context — core facets | `services/lumin-context-loader.js` reading `data/twins/default/adam/{_meta,personal,personality,communication,goal,operating_system,decision_identity,permission,memory}.json` | **WIRED, DEPLOYED, BEHAVIORALLY_VERIFIED** | Same receipt as #5; `CORE_KEYS` confirmed loaded into every chair turn |
| 6b | Twin — `future.json` | `services/lifere-scenario-engine.js` | **CODE_EXISTS** (not part of chat path) | Only reader is a LifeRE real-estate scenario engine, unrelated to founder chat |
| 6c | Twin — `modules/buyer.json`, `modules/seller.json` | LifeRE services (`lifere-boot.js` etc.) | **CODE_EXISTS** (not part of chat path) | Zero readers among chat/orchestrator files |
| 7 | Communication profile/calibration (live) | `services/communication-profile.js` | **WIRED, DEPLOYED** | Live caller in `lumin-context-loader.js` (`getProfileForPrompt`) |
| 7b | `founder-communication-calibration.js` `calibrateMessage()` | same file | **CODE_EXISTS, DESIGNED_ONLY in effect** | Zero callers anywhere in repo; only `getDefaultProfile` (a static fallback) is used |
| 8 | Anti-formula / response variety | `services/lumin-communication-guard.js` (`enforceCommunicationLaw`) | **WIRED, DEPLOYED** | Real callers: `chair-personality-translate.js`, `chair-direct-agent.js`. PRODUCT_HOME itself still labels this row "IN PROGRESS" — not claimed complete by the product doc |
| 9 | Conversation history/preservation | `services/lumin-thread-context.js`, `persistFounderTurn` | **WIRED, DEPLOYED, FRONT_DOOR_REACHABLE** | Every turn persisted; client re-hydrates thread on load (`lifeos-app.html:4438`) |
| 10 | Instructions/tasks FROM conversation | Build-intent detection + `chair-direct-agent.js` `{"action":"build",...}` | **WIRED, DEPLOYED, BEHAVIORALLY_VERIFIED (stale)** | `LUMIN_CHAIR_DIRECT_CONNECTION_PARITY.json`, T5 test: 202, `chair_channel: build_async` — but dated 2026-06-28 against `robust-magic-production.up.railway.app`, a **different Railway service name** than current prod (`lumin-web-production-e3a9`) — needs a fresh receipt |
| 11 | Routing work to BuilderOS | `createFounderBuildJob` → `routeToBuilder` → `runFounderBuildWithSelfRepair` | **WIRED, DEPLOYED** | Same stale-receipt caveat as #10 |
| 12 | Long-running job persistence | In-memory `Map` (`founder-build-job-store.js`, 30-min TTL) + DB fallback (`builderos_command_control_jobs` table) | **WIRED, DEPLOYED** | Real gap, not a bug: in-memory store is the *primary* read path; DB is only consulted when memory returns null — a Railway redeploy mid-job loses in-flight state until the DB fallback path is hit |
| 13 | Status reporting back into conversation | `runtimeStatusTurn` branch in `chair-native-facts.js` (pulls `getGovernedAutonomousShipStatus`, `getNeverStopProductFactoryStatus` live) | **WIRED, DEPLOYED** | No dedicated receipt found exercising "what's the status of X" specifically — behavioral verification **UNKNOWN** |
| 14 | Result/artifact return into conversation | `pollFounderBuildJob` → `luminFinalizeWorklog` → `luminDeliverReply` (client, same thread) | **WIRED, DEPLOYED** | Confirmed in shipped client code; no production receipt found proving an actual long job completing and landing back in-thread — **UNKNOWN** behaviorally |
| 15 | Visible transcript | `_appendLuminMsg` (renders history + live turns) | **WIRED, DEPLOYED, FRONT_DOOR_REACHABLE** | Confirmed in shipped client code |
| 16 | Voice input | `public/shared/lifeos-voice-chat.js` → `POST /api/v1/lifeos/voice-rail/stt` (Groq Whisper) | **WIRED, DEPLOYED** | Shared across 5+ surfaces including the Lumin drawer; no dedicated STT round-trip production receipt found — **UNKNOWN** behaviorally |
| 17 | Voice playback/TTS | Same file, `speakTextAsync` + server TTS | **WIRED, DEPLOYED** | Same caveat as #16 |
| 18 | Interruption handling (voice interrupts TTS) | `fadeAndStopSpeaking` on mic-start | **WIRED, DEPLOYED** | Confirmed in code with explicit design comment on why `speechSynthesis` fallback uses instant cancel vs. fade |
| 18b | Interruption handling (text generation) | — | **NOT BUILT** | No abort/cancel control found for an in-flight text reply; only client-side request timeout exists |
| 19 | Unfinished-thought protection (silence timing) | `computeSilenceWaitMs` in `lifeos-voice-chat.js` | **CODE_EXISTS, not active in canonical UI** | `lifeos-app.html` explicitly sets `silenceAutoSendMs: 0`, which short-circuits the function to a no-op |
| 20 | Manual send / dictation | `manualSendOnly: true` + voice-command "send it" bypass | **WIRED, DEPLOYED, FRONT_DOOR_REACHABLE** | Confirmed in shipped client code |
| 21 | Office/specialist consultation | — | **NOT BUILT** | No chat-triggered domain-specialist routing found anywhere. `institutional-constellation.js` is a superficially similar but unrelated (governance-role prediction-tracking) file with zero importers |
| 22 | Receipts | `products/receipts/COMMUNICATION_SYSTEM_V1…V5_*`, `FOUNDER_CHAT_ALPHA_BATTERY.json`, etc. | **Mixed — see below** | V1/V3/V4/V5 receipts are standalone local-script tests (no `base` field, no production call); V2 (evidence-fusion) is the one genuinely wired into a live path (`chair-direct-agent.js`) |
| 23 | UI surfaces | `GET /lifeos` (real), `/overlay/:file` (generic), many legacy 301s into `/lifeos`, `POST /api/v1/chat` (dead stub, never mounted), Chrome-extension `POST /api/v1/extension/chat` | **Mixed** | `/lifeos` = FRONT_DOOR_REACHABLE; `/api/v1/chat` = DESIGNED_ONLY/dead; extension path = WIRED, DEPLOYED, explicitly flagged in PRODUCT_HOME as *"Not yet live-verified against production"* |
| 24 | Authentication | `isFounderInterfaceAuthenticated` (page), `requireFounderInterfaceAuth` (API: JWT → cookie → command-key fallback, fallback usage logged to `founder_interface_fallback_auth_log`) | **WIRED, DEPLOYED, FRONT_DOOR_REACHABLE** | Confirmed via the same H0 login-health 200 |
| 25 | Production reachability (overall) | — | **Mostly current, one stale receipt** | Current: `FOUNDER_CHAT_ALPHA_BATTERY.json` + `SENTRY_OVERLAY_LAYER_A.json`, both against `lumin-web-production-e3a9.up.railway.app`, both 2026-08-08/14. Stale: `LUMIN_CHAIR_DIRECT_CONNECTION_PARITY.json` against `robust-magic-production.up.railway.app`, 2026-06-28 — likely an old/renamed Railway service. The legacy `/api/v1/lifeos/chat/threads/:id/messages` and its SSE stream are intentionally retired (HTTP 410 `LUMIN_LEGACY_PATH_RETIRED` when `LUMIN_SINGLE_CONNECTION` is enforced, which is the default) — not a bug, a deliberate single-connection guard |

One more honest caveat that applies across the whole table: **every "BEHAVIORALLY_VERIFIED" row above is backed by a scripted probe or an automated receipt, not evidence of Adam personally using the interface interactively.** No row in this audit reaches REAL_USER_PROVEN — that state was not found to be independently evidenced anywhere in the repo for any of the 25 capabilities.

### 2.2 Shortest path to the stated target

Target: *"Adam can open one Taloa interface and use it instead of Cursor agent chat to converse naturally, preserve context, give system instructions, have Taloa route work internally, allow long-running work to continue, ask for truthful status, receive results back in the same relationship."*

**Finding: nearly the entire loop already exists, deployed, wired, front-door reachable.** `/lifeos` → `founder-interface/message` → `lumin-chair-orchestrator` → `chair-direct-agent` (build routing) → `founder-build-job-store` (+ DB fallback) → live status facts → result delivered back into the same thread is a real, connected, production-reachable chain today. This is **not** a "build a bridge" problem — it is a **"prove and harden what's already wired"** problem. Concretely, the three smallest gaps between current evidence and the stated target:

1. **Stale production receipt for build-routing** (#10/#11): the only receipt proving "chat instruction → real build job" is 6+ weeks old against what looks like a retired Railway service name. One fresh end-to-end receipt against current prod would close this.
2. **No dedicated receipt for the status-question path** (#13) or **the artifact-return path** (#14): both are wired in code, neither has an independent production proof. One receipt each (or one combined "ask status mid-job, then receive the finished result in-thread" receipt) closes both.
3. **In-memory job store is the primary path, DB is fallback-only** (#12): a redeploy during a long job risks losing state until the DB fallback is exercised — worth either flipping the priority or adding a receipt that proves the fallback actually recovers state correctly.

None of this requires new product design, new UI, or a new blueprint — it requires re-running/refreshing verification against what's already built.

---

## PART 3 — PRIORITY RECOMMENDATION

**A. What Overlay work is genuinely left.** Two things, in order: (1) resolve which document is the actual acceptance authority — the V0–V5 ladder (`INTELLIGENT_OVERLAY_BLUEPRINT.md`) or the §-numbered print sequence (`TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md`) — since the factory has been building against one while SENTRY scores against the other; (2) once resolved, produce the first real front-door operation receipt (`SENTRY_OVERLAY_FRONT_DOOR_OPERATION.json`, currently missing) for whichever version is actually next in the corrected order.

**B. Communication infrastructure that already exists and should be ACTIVATED, not rebuilt.** The founder-message path, Conductor orchestration, build-intent routing to BuilderOS, job persistence (memory + DB), live status-fact gathering, visible transcript, voice in/out, and manual-send-with-voice-override are all real, wired, and deployed (Part 2 table). Nothing here needs new architecture.

**C. The smallest missing communication bridge.** Not a bridge at all — a **verification gap**. One fresh end-to-end production receipt exercising: send a message → get a contextual reply → issue a build instruction → poll the job → receive the result in-thread → ask "what's the status" mid-flight → get a truthful live answer. This closes items #10/#11/#13/#14 from Part 2 at once.

**D. Which first / parallel.** The Overlay authority question is already flagged `chair_status: "escalate_to_founder"` in live governance — it is genuinely blocked and should go to Adam first, independent of everything else. The communication-bridge verification work has no such blocker and can run in parallel starting now.

**E. Requires Adam's reserved authority.**
1. Which Overlay blueprint document is canonical (V0–V5 ladder vs. §-numbered print sequence) — this is exactly what SENTRY already escalated and Architect cannot resolve alone (`architect_status: needs_manual_targeting`).
2. Whether continued Overlay investment is still the right call given Adam's own 2026-08-13 statement that after ~4 days it is "absolutely no different" and not to use it as operator hands yet — a product-priority call, not a technical one.

**F. Everything else Architect/system should resolve without asking Adam.** All of Part 3.C's verification work (fresh end-to-end receipt, refreshing the stale Railway-URL receipt, deciding memory-vs-DB job-store priority) is pure mechanics — no business judgment required, consistent with routing "100% intention, zero% mechanics" decisions away from Adam.

---

## PART 4 — SOURCE APPENDIX

**Overlay:**
- `docs/products/universal-overlay/PRODUCT_HOME.md` — two disagreeing "Last Updated" fields (top table vs. line ~25-31 table)
- `docs/products/universal-overlay/INTELLIGENT_OVERLAY_BLUEPRINT.md` §5 (version ladder), §10 (founder-agreement-pending statement)
- `docs/products/universal-overlay/TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md` §12–§65a
- `config/overlay-print-sequence.js` — `OVERLAY_PRINT_SOURCE` constant
- `services/overlay-blueprint-terminal.js` — `extractOverlayVersions`, `evaluateOverlayBlueprintTerminal`
- `docs/products/universal-overlay/FILE_MANIFEST.json` — `updated_at: 2026-08-06`, 3 `owned_files`
- `docs/products/universal-overlay/BUILD_QUEUE.json` — 158 steps total (141 done / 17 skipped), `updated_at: 2026-08-13T04:00:00Z`
- `builderos-reboot/MISSIONS/{TALOA-OVERLAY-P1-0001,OVERLAY-DRIVE-CHANNEL-0001,OVERLAY-ENGINE-RISK-GATE-0001,OVERLAY-STUCK-LOOP-RECOVERY-0001,PRODUCT-COMMUNICATION-V4-OVERLAY-ACTION-0001}/OBJECTIVE_VERDICT.json` — all `OBJECTIVE_COMPLETE`, `founder_usability_pass: false`, `git_sha: 348e2f8d67`
- `builderos-reboot/PRODUCT_READINESS_REPORT.json` — `bp_priority` rank 29/30, `verdict: "TECHNICAL_PASS"`
- `products/receipts/SENTRY_OVERLAY_LAYER_B.json` — `generated_at: 2026-08-15T15:11:20Z`, `terminal:false`, `versions_proven:0/7`
- `products/receipts/{TALOA_OVERLAY_P1_ACCEPTANCE,OVERLAY_LIFECYCLE_EXAM_RECEIPT,OVERLAY_REGRESSION_EXAM_RECEIPT,OVERLAY_ALPHA_BATTERY,SENTRY_OVERLAY_LAYER_A}.json`
- `builderos-reboot/governance/SENTRY_FINDINGS_QUEUE.json` — `overlay_blueprint_idle_before_terminal` chain (3 records), `last_deep_review_at: 2026-08-15T19:09:08Z`
- `services/manufacturing-self-repair.js` ~line 249-255; `scripts/run-factory-lane.mjs` ~line 315; `scripts/lib/system-watchdog.mjs` ~line 50-51
- `docs/projects/BRAINSTORM_SESSIONS/tsos-platform/2026-08-14_lifeos-builderos-blueprint-revision/192_OVERLAY_CONTINUITY_HANDOFF_NO_CONSUMER_ROOT_CAUSE_2026-08-15.md`, `193_LIVE_CONTINUITY_AND_P0_SCOPE_RECHECK_2026-08-15_0937.md`
- `docs/products/universal-overlay/conversations/2026-08-13-do-not-start-using-overlay.md`, `2026-08-13-hard-gate-print-invention.md`, `2026-08-12-overlay-progress-after-handoff.md`
- `native/macos-overlay/TaloaImageCharacterView.swift`, `TaloaLog.swift`, `build.sh` (test-file exclusion)

**Communication:**
- `config/taloa-brand.js` (unused outside `site-builder-public-base.js`)
- `docs/products/lifeos/conversations/2026-08-11-taloa-blueprint-consensus-and-live-intake-test.md` — naming ratification
- `routes/lifeos-builderos-command-control-routes.js:1461` (message handler), `:734-775` (`requireFounderInterfaceAuth`), `:1304-1407` (job-status route)
- `services/lumin-connection-guard.js:12-17,26-28` (`CANONICAL_FOUNDER_MESSAGE_PATH`, single-connection 410 guard)
- `services/lumin-chair-orchestrator.js:1-4,231-235,516`
- `services/chair-lumin-unified.js:35-49,200-341` (SO-003 grounding)
- `services/chair-direct-agent.js:11-19`
- `services/chair-native-facts.js:106-362,269-288,348-359`
- `services/lumin-context-loader.js:70-80,153-278,508-512,625-663`
- `services/lifere-twin-store.js:19-26`
- `services/communication-profile.js`; `services/founder-communication-calibration.js` (dead `calibrateMessage`)
- `services/lumin-communication-guard.js:117-156`; `builderos-reboot/governance/LUMIN_COMMUNICATION_LAW.json`
- `services/response-variety.js:108,268`
- `services/lumin-thread-context.js:1-52,58`
- `services/founder-build-job-store.js:1-35`; `services/builderos-command-control-service.js:80,101,126,138,181,264,357,373`
- `public/overlay/lifeos-app.html:4023,4438,4574,4602-4679,4720-4741,5171-5244,5423,5462-5463,5486`
- `public/shared/lifeos-voice-chat.js:19-37,121-231,238-265,534,547-570,865-895`
- `public/chat/index.html` (dead); `routes/chat.js:8` (dead stub); `routes/public-routes.js:130-152,167-168,271,333-375`
- `routes/lifeos-extension-routes.js` (Chrome-extension chat, not yet live-verified per PRODUCT_HOME 2026-08-10 entry)
- `products/receipts/FOUNDER_CHAT_ALPHA_BATTERY.json` (2026-08-08, `lumin-web-production-e3a9.up.railway.app`)
- `products/receipts/LUMIN_CHAIR_DIRECT_CONNECTION_PARITY.json` (2026-06-28, `robust-magic-production.up.railway.app` — stale service name)
- `docs/products/lifeos/PRODUCT_HOME.md:16,167,1123,1793,1801,1821` (change-receipt entries cited above)
- `CLAUDE.md` SO-003 (§ "Never Idle On Tokens...") — original canned-answer bug this code was written to fix
