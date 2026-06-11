# Founder Packet — LifeOS Voice Rail v1

**Mission ID:** `PRODUCT-VOICE-RAIL-V1-0001`  
**Locked:** 2026-06-11 (Adam)  
**Authority:** Outcome truth only. System derives HOW (blueprint). Receipts prove PASS.

> **Product truth:** This is not a voice gadget. It is the **direct communication layer** between Adam and the LifeOS / LimitlessOS / BuilderOS (TSOS) ecosystem. Voice is the fastest transport; text is equal fallback.

---

## Priority

**Primary interface mission.** Voice Rail v1 is the communication layer Adam uses to reach Commitments, BuilderOS, LifeOS, and LimitlessOS **without opening Cursor**.

Conversation Commitments v1 remains important; Voice Rail is how Adam **talks to** those subsystems.

BuilderOS outranks Voice Rail only when it directly blocks Voice Rail delivery.

---

## Problem

Adam depends on Cursor as the primary mouth of the system. LifeOS does not yet offer one always-reachable place to speak or type to the ecosystem, see live transcript, pause without interruption, get responses, and have words classified and routed — on phone or desktop — without hunting across chat surfaces.

---

## Desired outcome

Adam opens one URL on phone or desktop, reaches one control, speaks or types naturally, sees words appear live, pauses and continues without being cut off, sends or cancels, receives text and/or spoken reply, replays the reply, finds the conversation later (when not in Private mode), sees extracted commitments and staged commands, and never needs Cursor for normal system communication.

The system infers intent, classifies, and routes. Adam does not remember which subsystem, project, or surface a conversation belongs to.

---

## FOUNDER SUCCESS TEST

**Adam voluntarily uses Voice Rail again within 48 hours instead of opening Cursor for normal system communication.**

---

## Canonical surface (LOCKED)

**One page only:** `/overlay/lifeos-voice-rail-v1.html`

This is the primary communication interface for LifeOS and eventually TSOS.

**Not** Cursor. **Not** Dashboard placeholder rail. **Not** multiple competing chat surfaces for this mission.

---

## v1 modes (LOCKED — 4 only)

| Mode | Purpose |
|------|---------|
| **Conversation** | Default dialogue with Lumin / LifeOS |
| **Command** | Orders to the system; stage for BuilderOS visibility |
| **Brainstorm** | Exploratory; no auto-execution |
| **Private / Off-Record** | No durable persistence (see below) |

**Deferred as standalone modes** — implement as **tags/classifications** on Conversation or Command where noted:

- Meeting → Conversation + Meeting tag  
- Driving → Conversation + Driving tag  
- Couple → Conversation + Couple context tag  
- Emergency → Command + Emergency priority tag  
- Build, Review, Dictation, etc. → deferred or mapped to Command/Conversation in v2  

---

## v1 intents (LOCKED — 6 only)

The system classifies every submitted utterance into **one primary intent**:

1. **Command** — order to the system (stage only in v1)  
2. **Brainstorm** — ideation, no execution  
3. **Commitment** — promise / follow-through language  
4. **Governance Correction** — fix policy, routing, or system behavior  
5. **Emotional / Venting** — tone-aware response; not therapy  
6. **General Conversation** — default chat  

Tone/emotion informs **response timing, length, and calmness** — not manipulation, steering, or hidden storage.

---

## BuilderOS handoff (LOCKED)

**Stage only.** Voice Rail is the command center; BuilderOS is the worker.

Commands are **staged for approval and visibility** before any execution. **No automatic BuilderOS execution in v1.**

Adam must be able to see what was staged and that nothing ran silently.

---

## Private / Off-Record (LOCKED)

Private mode must **not** persist to:

- Memory systems  
- Commitments  
- BuilderOS routing or staging queues  
- Search indexes  
- Analytics  
- Long-term storage  

Private content exists **only in the active browser session** and **disappears when the session ends** (tab close or full page reload).

---

## Constraints (non-negotiable)

- Never lose Adam’s words (non-private sessions)  
- Never lose transcript (non-private sessions)  
- Never interrupt an unfinished thought — pause/resume without auto-send mid-thought  
- Never require technical knowledge  
- Never make Adam remember where something should be stored — system classifies and routes  
- Never hide actions taken on Adam’s behalf — staging must be visible  
- Never trap interaction on one device class — same URL on phone and desktop (responsive PWA)  
- Never require Cursor for normal communication  
- Always ask approval before external actions unless prior permission exists  
- Preserve Adam’s authority; Sherry’s household/business authority remains second-level where applicable  

---

## Acceptance command

```bash
npm run lifeos:voice-rail:v1-acceptance
```

(System authors this command and proof script. Founder packet names the bar only.)

---

## PASS criteria (both required)

### 1. Technical PASS

- Acceptance command exits **0**  
- Receipt: `products/receipts/VOICE_RAIL_V1_ACCEPTANCE.json` with `"verdict": "PASS"`  
- Nothing else counts — no subsystem wins, no IDE-only proof, no partial credit  

### 2. Founder usability PASS

- Adam uses Voice Rail for real communication  
- Adam confirms the **48-hour success test**  

**I'll know this worked when:** I open phone or desktop, use one control, talk or type to the system, trust that my words are handled correctly, and I reach for Voice Rail again tomorrow instead of Cursor.

---

## Out of scope (v1)

- Cursor as primary interface  
- Native iOS/Android apps  
- Chrome extension / inject into arbitrary third-party webpages  
- Cross-device sync beyond same-account reload of persisted sessions  
- Perfect realtime AI voice (premium TTS clones, sub-200ms latency)  
- Automatic BuilderOS execution  
- Standalone modes beyond the locked four  
- Full emotional/psychological profiling or therapy  
- Meeting transcription pipeline, telephony, always-listening background surveillance  
- Replacing full `lifeos-chat.html` advanced thread management in v1  
- Sherry multi-user household UI (tags may exist; full Couple mode UI deferred)  

---

## Salvage guidance (for blueprint phase — not implementation spec)

**Adapt, do not greenfield ignore:**

- Browser voice engine patterns (existing shared voice module)  
- Alpha rail UI prototype (dock, collapse, interim transcript)  
- Existing chat API persistence  
- Conversation Commitments v1 extraction hook  

**Reject for v1 home:**

- Dashboard AI rail that only redirects to full chat without live voice/transcript  

---

## Founder touches

**Alert only on UNSOLVED** after system exhausts recovery. No billing gate. No Cursor required for proof.

---

## Document layers

| Layer | Role |
|-------|------|
| Founder packet | WHAT + PASS |
| PSSOT | Product truth (system-maintained after lock) |
| Blueprint | HOW |
| Receipts | PROOF |
