<!-- SYNOPSIS: Enforcement audit (what's real code vs. text) + legacy/dead-code audit + a combined structural tree — third companion to the governance and systems-map snapshots, checked directly against the repo. -->

# Enforcement & Legacy Audit (2026-08-06)

**Purpose:** Adam: "what is the map tree of things, what is the governance, what is enforced and what is not, and what is legacy shit still lingering in the system we don't want." The prior two documents (`AS_IS_GOVERNANCE_STRUCTURE_2026-08-06.md`, `ECOSYSTEM_SYSTEMS_MAP_2026-08-06.md`) answered "what exists." This one answers the two harder questions: **does the code actually enforce what's written down**, and **what's dead weight still sitting in the system**. Every claim below was checked directly against `origin/main`, several personally re-verified rather than trusted from a single pass.

**Status: FACTUAL AUDIT.** Not doctrine, not a proposal, not exhaustive — a full dead-code sweep of a 1000+ file repo is its own project; this reports what surfaced from targeted checks and what was already self-documented in past change receipts, not a first-ever static analysis of everything.

---

## 1. The combined structure, as a tree

```
NORTH_STAR_SSOT.md (Constitution — supreme, Article VII amends)
│
├── Article III — Human Guardian Authority (Adam's veto)
├── Article VII — Amendment process (AI Council unanimous + Adam + 7-day review)
├── Article VIII — Kingsman Protocol          [TEXT ONLY — not built]
├── Article IX — AI Coexistence Framework     [TEXT ONLY — no code, by design]
│
└── BuilderOS  ("Subordinate to SSOT" — explicit, docs/products/builderos/PRODUCT_HOME.md:30,694)
    │  the construction/repair mechanism, not a product
    │
    ├── AI Council (config/council-members.js — standing model-lane roster:
    │   Claude Sonnet, OpenAI GPT ×3 tiers, Century/o1, DeepSeek, Groq,
    │   Gemini Flash, Mistral, Cerebras, GitHub Llama, Fireworks)
    │
    └── Minimal real-seat order (BuilderOS's own doctrine, line 306-312):
        Chair/Lumin → CFO → Historian → SNT → ARC
        │
        └── Chair/Lumin  (the reasoning + approval authority — not a product)
            │  services/lumin-chair-orchestrator.js, chair-direct-agent.js
            │
            ├── hosted inside → LifeOS  ("the human operating system,
            │   the Chair-facing... shell" — consumes, does not own,
            │   the constitution or BuilderOS)
            │
            └── LimitlessOS  (peer to LifeOS per Vision Statement — OR
                child-of-LifeOS per the same file's Child Products table.
                UNRESOLVED CONTRADICTION — see systems map §1)
                │
                ├── ~16 business-facing products (MarketingOS, SalesOS,
                │   Site Builder, TC Service, AI Receptionist, etc.)
                └── ~12 person-facing products under LifeOS
                    (LifeRE, Life Coaching, Wellness Studio, etc.)

Shared infrastructure (registry-confirmed, serves multiple products):
  creative-engine · boldtrail · ideavault

Platform/governance-layer products (serve the ecosystem, not an end client):
  ai-council · command-center · project-governance · capability-map ·
  token-accounting-os · memory-intelligence · memory-system ·
  universal-overlay · kingsman-protocol (product home exists; Article
  VIII itself is not confirmed live)
```

---

## 2. Enforcement audit — what's actually code, not just written

| Claim | Status | Evidence |
|---|---|---|
| **SO-001** (governed-factory requirement for new services/routes) | **HARD-ENFORCED** | Personally experienced tonight: a pre-commit hook rejected my own commit for lacking a `HAND-AUTHORED-JUSTIFICATION:` tag on a large diff, and logs the event to `docs/products/builderos/GAP_FILL_LEDGER.json`. This is real, live, and it does not care who's asking. |
| **SO-003** chair-channel cost-tier violation | **FIXED, now enforced** | `services/lumin-chair-orchestrator.js:243-245` returns `estimated_cost_tier: 'strong'` for chair/counsel/lumin/life_admin — was `'cheap'` when this order was written, confirmed fixed on `origin/main` earlier tonight. |
| **Article III §3.1** — "$100" spending veto | **DOCUMENTED ONLY — no code enforces the $100 threshold specifically** | Real code (`services/council-service.js:932-991`) only enforces a *daily aggregate* spend cap (env-configurable, not fixed at $100). This exact gap is already self-flagged as unresolved: `docs/constitution/PRE_ARC_FOUNDER_PACKET_V2/SNT_INTENT_ATTACK_RECEIPT.md:13` names it a HIGH-severity attack path — CFO/Builder can clear a spending path with no check against Article III's $100 line. |
| **Article VII** amendment process | **PARTIALLY ENFORCED** | The mechanics exist (`npm run lifeos:gate-change-run` → `scripts/council-gate-change-run.mjs` → `services/lifeos-gate-change-council-run.js`, real round-1 + opposite-argument-round-2 debate) but no direct citation ties this script specifically to Article VII amendments by name — plausible, not proven. |
| **Article VIII** (Kingsman Protocol) | **TEXT ONLY** | Real constitutional language, `docs/products/kingsman-protocol/PRODUCT_HOME.md` exists as a product home, but no live code confirmed. Not built. |
| **Article IX** (AI Coexistence) | **TEXT ONLY, by design** | A values/precautionary statement, not meant to be a runtime check. |
| **Article II §2.13** "no regression" (token-budget law) | **HARD-ENFORCED** | Pre-commit hook blocks growth of `docs/AGENT_RULES.compact.md` beyond its last-committed byte count — confirmed by the doctrine text itself describing the hook, consistent with the SO-001 enforcement style actually observed tonight. |
| **Wisdom** (Pattern Intelligence role) | **CODE EXISTS, FUNCTIONALLY INERT** | `decision_outcome_ledger` real, but only 6 seeded predictions — not enough to produce a meaningful calibration signal yet. The doctrine is real; the thing it's supposed to be learning from barely exists. |
| **The governance-review scheduler** (North Star §2.0G — "are we drifting off course") | **RE-FIXED, now enforced** | Was found structurally dead in production (2026-07-29 receipt, `docs/products/builderos/PRODUCT_HOME.md:51-52`); the original fix (removing a `fullRuntimeProfile` gate inside `boot-domains.js`) turned out to be real but insufficient, because the whole file is unreachable in production one layer above that gate. Actually fixed by re-registering the scheduler directly inside `server-founder-runtime.js:538-558`, confirmed live. |

---

## 3. Legacy/lingering — the real, current findings, led by the one that matters most

### The recurring root cause: two runtime files, one silently wins

`services/runtime-modes.js:21-38` — `getRuntimeProfile()` hard-locks Railway to `'founder_builder'`, no override, by explicit founder directive quoted in the code's own comment: *"Railway is the governed founder-builder lane until BuilderOS is proven... production must fail closed to founder_builder even if stale env flags remain."* `server.js:38-40` therefore **only ever loads `server-founder-runtime.js` in production** — `server-full-runtime.js` (and everything wired only through it) is genuinely unreachable on Railway, not merely gated.

This is not a one-off bug. It's the same root cause that has already caused, and been separately re-discovered and fixed, **at least four times**:
1. The governed 7-seat factory pipeline lived only in `factory-staging/`, unmounted in production (fixed via `routes/factory-mount-routes.js`, per `docs/products/lifeos/PRODUCT_HOME.md:1799`).
2. A control-plane endpoint mounted only in `register-runtime-routes.js` (full-runtime lane), unreachable on Railway (`docs/products/builderos/PRODUCT_HOME.md:47`, Q-001).
3. The governance-review scheduler, described above.
4. **Currently, right now, unresolved:** `routes/lifeos-core-routes.js` is wired only through `startup/register-runtime-routes.js`, imported only from `server-full-runtime.js:1025` — confirmed genuinely unreachable in production, personally verified tonight, not yet fixed.

### Currently dead in production, personally confirmed tonight

`startup/boot-domains.js`'s `bootAllDomains()` is called only from `server-full-runtime.js:1119` — never loaded in production. A prior audit (`.claude/worktrees/agent-aeb36f91e976a9167/docs/audits/builderos-mission-1/MISSION_1_BUILDEROS_AUDIT.md:508-537`) already found **27 boot functions dead in production** inside this one file. Only the governance-review scheduler got the real fix (re-registered elsewhere). These five, named in the original 2026-07-29 receipt as "not yet individually audited," are still dead today:

- `bootLifeOSScheduled` (`startup/boot-domains.js:166`)
- `bootChairPredictionScore` (`:230`)
- `bootLaneIntel` (`:272`)
- `bootOILDailySummary` (`:353`)
- `bootFactoryAutopilotRecoveryOwner` (`:454`)

Whatever these five were supposed to be doing for the live system — they aren't doing it. Not gated, not throttled — unreachable.

### Already found and cleaned up (for calibration — this pattern has real precedent of getting fixed)

- 43 legacy Express-MVC files + 9 import-broken orphans + 12 dead config modules, archived to `docs/history/legacy-mvc/` (`docs/products/lifeos/PRODUCT_HOME.md:170`).
- A separate 231-orphaned-file purge (junk root JS, dead route files, unreferenced `frontend/`/`backend/` directories) (`docs/products/lifeos/PRODUCT_HOME.md:2029,538`).
- The duplicate `mistral_free` key in `config/council-members.js` (was silently winning and truncating responses) — **confirmed fixed**, one entry only as of today.

---

## 4. What this means for "where we're at"

The constitution and the governed-factory discipline are genuinely real where they've been tested (SO-001 blocked me directly, tonight, no exceptions). But the same one architectural seam — full-runtime vs. founder-runtime — has silently killed real functionality at least four separate times, and it's doing it again right now with `lifeos-core-routes.js` and five boot schedulers. That's a more urgent, more concrete problem than any new constitutional office: **the system doesn't yet have a way to catch "this got wired into the wrong runtime lane and will silently never run" before it ships**, and it's the single most repeated category of real bug found across tonight's own audits.

@ssot docs/products/lifeos/PRODUCT_HOME.md
