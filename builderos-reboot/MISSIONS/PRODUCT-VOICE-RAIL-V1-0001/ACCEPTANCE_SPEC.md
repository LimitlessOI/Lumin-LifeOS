# Acceptance Specification — LifeOS Voice Rail v1

**Mission ID:** `PRODUCT-VOICE-RAIL-V1-0001`  
**Acceptance command:** `npm run lifeos:voice-rail:v1-acceptance`  
**Receipt path:** `products/receipts/VOICE_RAIL_V1_ACCEPTANCE.json`  
**Locked:** 2026-06-11  

> This document defines **PASS / FAIL only**. It does not specify routes, schemas, files, or build steps. BuilderOS derives those in `BLUEPRINT.json`.

---

## Scoreboard rule

**PASS** or **FAIL** — no “mostly,” “close,” or subsystem wins.

Technical PASS and Founder usability PASS are **both required** for mission complete.

---

## Environment

- Proof runs against **production Railway** (`PUBLIC_BASE_URL`) with auth aligned to operator shell  
- Local-only proof does **not** count as mission complete  
- Typed fallback must pass when microphone is unavailable (HTTPS/gesture/browser limits on mobile are expected; fallback must not fail the mission)  

---

## Technical acceptance tests

All must pass in one command run. Names below become receipt `tests_passed` entries.

| ID | Test | PASS condition |
|----|------|----------------|
| **VR1-T01** | Canonical page exists | Voice Rail v1 page is served at the locked canonical URL |
| **VR1-T02** | Page loads responsive shell | Mobile-width and desktop-width render without horizontal break; mic/control reachable |
| **VR1-T03** | Mode selector | All four locked modes selectable: Conversation, Command, Brainstorm, Private |
| **VR1-T04** | Typed message send | Typed fallback message submits successfully in Conversation mode |
| **VR1-T05** | Transcript persistence (non-private) | Submitted message appears in scrollback; reload restores conversation |
| **VR1-T06** | Simulated voice/transcript path | Transcript-like payload (simulating STT output) submits and persists equal to typed path |
| **VR1-T07** | Live interim display | While “speaking,” interim/partial transcript is visible before send (browser STT or equivalent staged input acceptable for proof) |
| **VR1-T08** | Pause without auto-interrupt | Pause/stop input does not auto-send partial thought; resume continues input |
| **VR1-T09** | Intent classification — Command | Command-shaped utterance returns primary intent `command` |
| **VR1-T10** | Intent classification — Commitment | Commitment-shaped utterance returns primary intent `commitment` |
| **VR1-T11** | Intent classification — Brainstorm | Brainstorm-shaped utterance returns primary intent `brainstorm` |
| **VR1-T11b** | Intent classification — Governance | Governance-correction utterance returns primary intent `governance_correction` |
| **VR1-T11c** | Intent classification — Emotional | Venting/emotional utterance returns primary intent `emotional` or `venting` |
| **VR1-T12** | Commitment routing hook | Commitment intent triggers commitment extraction path (≥1 extracted **or** empty-with-evidence when text has no promise — must not invent) |
| **VR1-T13** | Command staging (no execute) | Command intent in Command mode creates **visible staged command** record; **no** BuilderOS auto-execution |
| **VR1-T14** | Playback controls present | UI exposes replay last response, speed control, voice/text switch affordance |
| **VR1-T15** | TTS or speak path | Spoken reply path fires for at least one assistant response (browser TTS acceptable) |
| **VR1-T16** | Private mode non-persistence | Message sent in Private mode **absent** from durable conversation store, commitment store, command staging, and search after session end simulation |
| **VR1-T17** | Tag example (optional proof) | One deferred-mode tag (e.g. Meeting on Conversation) can be set or inferred without adding a fifth mode |
| **VR1-T18** | Receipt emission | On all above pass, receipt written with `verdict: PASS`, git SHA, production base URL |

---

## Founder usability PASS (human — not automated)

| ID | Test | PASS condition |
|----|------|----------------|
| **VR1-F01** | Real use | Adam completes at least one real conversation (voice or typed) on phone **or** desktop |
| **VR1-F02** | 48-hour success test | Adam confirms: *“I used Voice Rail again within 48 hours instead of Cursor for normal communication.”* |

Automated command may exit 0 on technical tests while **VR1-F02** is still pending. Mission verdict remains **NOT COMPLETE** until founder usability PASS is recorded.

---

## FAIL conditions (any one = technical FAIL)

- Canonical page missing or wrong URL  
- Any required mode missing  
- Non-private transcript lost on reload  
- Private content found in durable storage after session-end simulation  
- Command auto-executes BuilderOS without staging  
- Commitment invented when text contains no promise  
- Classification missing or wrong primary intent on scripted fixture utterances  
- Playback controls absent  
- Receipt claims PASS when any automated test failed  
- Proof run only from IDE/local without production path  

---

## Receipt schema (minimum)

```json
{
  "schema": "voice_rail_v1_acceptance_v1",
  "mission_id": "PRODUCT-VOICE-RAIL-V1-0001",
  "verdict": "PASS",
  "tests_passed": [],
  "tests_failed": [],
  "git_sha": "",
  "production_base": "",
  "completed_at": "",
  "founder_usability_pass": false
}
```

`founder_usability_pass` may be `false` at technical PASS time; mission complete requires `true`.

---

## Explicit v1 scope boundaries

### In scope

- One canonical overlay page (phone + desktop, same URL)  
- Four modes, six intents  
- Live transcript + pause/resume + send/cancel  
- Text fallback when mic fails  
- Conversation persistence (non-private)  
- Intent classification + routing hooks  
- Commitment extraction hook (reuse Objective 1 capability)  
- Command **staging** only  
- Playback controls (browser TTS acceptable)  
- Private session-only ephemerality  
- Tags for deferred “modes” (Meeting, Driving, Couple context, Emergency priority)  

### Out of scope

- Cursor replacement for engineering/debug (Cursor remains audit/support)  
- Native apps, browser extension, arbitrary-site overlay  
- Auto BuilderOS execution  
- Eleven standalone modes  
- Full emotion engine / therapy / relationship interpretation  
- Cross-device real-time sync  
- Always-listening background recording  
- Replacing all legacy chat entry points in one release  

---

## Blocker check (CUR)

**No remaining scope blockers** for founder packet → blueprint permission.

**Operational notes (not blockers):**

- Mobile mic requires HTTPS + user gesture — acceptance must allow typed fallback (VR1-T04).  
- “Session ends” for Private = tab close or full reload — acceptance simulates this (VR1-T16).  
- Salvage existing voice/rail parts — blueprint phase decision, not founder packet content.  

---

## Permission gate

**BuilderOS may author `BLUEPRINT.json` only after:**

1. Adam reviews and locks this founder packet + acceptance spec  
2. No material changes to locked A–G decisions without new founder lock  

Until then: **no blueprint, no code, no fake PASS.**
