<!-- SYNOPSIS: Founder Packet — Communication System V1: Voice Presence (Interruption Decay + turn-completion detection) -->

# Founder Packet — Communication System V1: Voice Presence

**Mission ID:** `PRODUCT-COMMUNICATION-V1-VOICE-PRESENCE-0001`
**Locked:** 2026-08-06 (Adam — "install all five" versions of the Communication System Blueprint)
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.
**Source doctrine:** `docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md` §22, row "V1 — Conversational Contracts & Voice Presence"

---

## Priority

First of five. The blueprint's own build order requires V1 before V2 (V2 is the shared Evidence Fusion layer V3-V5 depend on), and V1 before that requires this mission — the manual/text-side of "Conversational Contracts" (extracting commitments a user can see and track) is already live in production as of tonight (`routes/lifeos-core-routes.js` reactivation + `services/commitment-tracker.js`). What remains, and what this mission is scoped to, is V1's other half: **Voice Presence** — detecting whether the user has actually finished speaking, and letting Chair's spoken reply back off gracefully instead of hard-cutting when the user starts talking again.

---

## Problem

Right now, when read-aloud is on, Chair's TTS reply and the user's next utterance can talk over each other with no graceful handling — `stopSpeaking()` exists but is only ever called manually (muting), never automatically. There is no signal anywhere in the live pipeline for "has the user actually finished their thought" versus "they just paused" — every STT chunk is treated identically. This is the literal "abandonment failure" the source blueprint documents: a real founder conversation where the system talked past him.

A tested, passing prototype for exactly this already exists (`scripts/prototype-conversational-contracts-v1.mjs`, 39/39 tests: `fuseTurnCompletion` for the completion-confidence score, the `TtsTrack` class for graceful interruption decay: finish the current word, fade, stop) — it has never been wired into the live voice pipeline.

---

## Desired outcome

1. When the user starts speaking while Chair's TTS reply is still playing, the reply audio fades out gracefully (finishes the current word if possible, ramps volume down, stops) instead of hard-cutting or continuing to talk over the user.
2. The live pipeline computes a real turn-completion confidence score (reusing `fuseTurnCompletion`'s proven logic: punctuation, pause length, trailing conjunctions/fillers) so the system has an honest signal for "did they finish" rather than guessing from silence alone.
3. This is scoped to the existing LifeOS voice UI (`public/overlay/lifeos-app.html` + `public/shared/lifeos-voice-chat.js`) — not a new communication surface.

---

## Constraints

- **Reuse, do not re-derive**: `fuseTurnCompletion` and the `TtsTrack` decay-state-machine logic in `scripts/prototype-conversational-contracts-v1.mjs` are already tested (39/39) — port/adapt them, do not rewrite the algorithm from scratch.
- **Browser API reality check, do not assume**: the Web Speech API's `speechSynthesis.cancel()` has no native volume ramp — it is an instant stop. Graceful fade is only achievable on the **server-TTS `<audio>` element** path (`activeServerAudio` in `lifeos-voice-chat.js`), which has a real `.volume` property that can be ramped over ~150-300ms before pausing. On the `speechSynthesis` fallback path (no server TTS), the honest behavior is an immediate stop with no fade — do not fake a fade that cannot actually happen; document the limitation instead of inventing a workaround.
- **New logic lives in a new service**, not bolted onto `chair-lumin-unified.js` (this was an explicit open question in the source blueprint's §23 #1 — resolved here: single-responsibility, matches the pattern of every other service this session).
- **No new communication surface, no redesign of the chat/turn pipeline itself** — this is an additive behavior on the existing voice path.
- **Must not break voice transcription or TTS if this feature errors** — same fail-safe discipline as the STT quality-loop work shipped earlier tonight. A completion-scoring bug must never block a message from sending; a decay-fade bug must never leave audio stuck playing or silently broken.
- **requires DOM/Audio APIs it cannot unit-test headlessly** — the client-side fade logic needs a manual/browser-driven acceptance check in addition to automated tests, same as `scripts/prototype-avatar-widget.html` was manually verified.

---

## Acceptance command

```bash
npm run lifeos:communication-v1-voice-presence:acceptance
```

(System authors this command and the proof script. Founder packet names the bar only.)

---

## PASS criteria (both required)

### 1. Technical PASS
- Acceptance command exits **0**
- Receipt: `products/receipts/COMMUNICATION_V1_VOICE_PRESENCE_ACCEPTANCE.json` with `"verdict": "PASS"`
- Unit-level: turn-completion scoring matches the 39/39-proven prototype behavior on the same fixtures (ported, not reinvented)

### 2. Founder usability PASS
- With read-aloud on, starting to speak while Chair is talking measurably fades/stops the reply instead of talking over the user
- Adam confirms this feels natural, not jarring or broken

**I'll know this worked when:** I can interrupt Chair mid-sentence while it's speaking to me, and it backs off gracefully instead of plowing through what I'm saying.

---

## Out of scope

- Tonality/pitch/energy analysis (that's V1.1 Tonality Engine — separate prototype, separate mission if the founder wants it wired next)
- The visual avatar/presence badge (V0.5 — already a separate sandbox prototype, not this mission)
- V2-V5 (separate missions, built in the blueprint's stated dependency order after this one)
- Any change to the STT quality-feedback-loop work shipped earlier tonight

## Document layers (do not mix)

| Layer | Role | Active file |
|-------|------|-------------|
| Founder packet | WHAT + PASS | **This file** |
| Blueprint | HOW to build | `BLUEPRINT.json` (system-authored) |
| Receipts | PROOF | `products/receipts/`, mission proof JSON |
