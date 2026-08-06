<!-- SYNOPSIS: Founder's integrated vision — Universal Overlay as a perception-aware, conversation-driven, verbal AI director. Source: 2026-08-05 conversation dumps + full Lumin-Memory corpus analysis. -->

# Intelligent Overlay Blueprint

**Product:** `universal-overlay`  
**Document ID:** UNIVERSAL-OVERLAY-INTELLIGENCE-BP-001  
**Status:** PROPOSED — founder vision capture, not ratified, no runtime code  
**Canonical SSOT:** `docs/products/universal-overlay/PRODUCT_HOME.md`  
**Last Updated:** 2026-08-06

## 1. The one-sentence vision

A single conversation layer that sees what the user sees, hears what they say, senses how they feel, and either suggests the next move or just does it — across any app, any website, any device the user allows.

## 2. What the founder is describing

- **Chat-first, but action-native.** The interface is a conversation like ChatGPT, except it can also point, click, fill, submit, and control the user's own programs by voice or directive.
- **Host-agnostic overlay.** It sits on top of any software — the web, the desktop, the phone — and understands what is behind it: page structure, forms, buttons, context, even the user's own data.
- **See and act.** When an API exists, use it. When it does not, the overlay reads the screen in real time and performs the action visually (click this arrow, fill this field, select that option).
- **Verbal AI director.** The user says "do it," "fill this out," "send that," "compare these," "book this," and the system figures out the steps and executes under explicit direction.
- **Multi-modal perception.** It uses face, voice, tone, body language, eye gaze, posture, biometrics, environment, and interaction history to reduce ambiguity — not to judge, but to understand intent and state.
- **Conversational memory + contracts.** It remembers the thread, tracks promises it makes ("I'll read all 25"), finishes sequences, and gracefully handles interruption.

## 3. Relationship to existing Universal Overlay product

The `universal-overlay` product home already owns the host-agnostic iframe/extension, the `content.js` bridge, form-fill, struggle detection, proactive toast, and the overlay drawer. This blueprint adds the **perception, conversation, and action intelligence** that turns the overlay from a helpful form-filler into a verbal AI director.

| Existing layer | New intelligence layer |
|---|---|
| `content.js` reads page fields and fills forms | Perception Engine reads face/voice/body and fuses evidence |
| Proactive toast based on dwell/click/edit signals | Proactive assistance based on fused cognitive state + conversation context |
| Chat inside overlay drawer | Conversation with contracts, interruption, presence, and action intent |
| URL/form pattern router | Goal/intent router: "do X on this page" → API or visual plan |
| Form fill with mapped user data | General action execution: click, type, navigate, confirm by voice |

## 4. Core architecture

```text
Perception Inputs
  ├─ Voice (tone, pace, energy, interruption, silence, turn-taking)
  ├─ Face (expression, eye contact, gaze, micro-expressions, fatigue, attention)
  ├─ Body (posture, gestures, fidgeting, orientation)
  ├─ Environment (screen contents, active app/URL, form fields, selected text)
  ├─ Biometrics (wearables: heart rate, sleep, stress, activity — opt-in)
  └─ History (Twin, past conversations, learned preferences, outcome feedback)
           ↓
Evidence Fusion Engine
  ├─ Calibrated confidence per modality
  ├─ Context-specific weighting (text chat vs video call vs voice-only)
  ├─ Learned from real outcomes (did the intervention help? did the user correct us?)
  └─ State estimate: ambiguity, certainty, agency, openness, cognitive load, readiness, emotional intensity, momentum, trust
           ↓
Conversation Director
  ├─ Moment recognition (what is this interaction for?)
  ├─ Objective + need hypotheses
  ├─ Cognitive mode selection (Presence, Observation, Reflection, Discovery, Expansion, Guidance, Execution, Safety)
  ├─ Conversational contract tracking (promise → completion condition → fulfillment)
  ├─ Interruption decay model (fade out, trail off, resume gracefully)
  └─ Composer + response plan
           ↓
Action Layer
  ├─ API path: use available integrations (Stripe, CRM, calendar, forms, etc.)
  ├─ Visual/RPA path: overlay sees the screen and performs clicks/typing/selections
  └─ Confirm by user voice or tap for irreversible / sensitive actions
           ↓
Outcome Feedback
  ├─ Did the action succeed?
  ├─ Did the user correct or undo?
  ├─ Did trust increase or decrease?
  └─ Recalibrate Evidence Fusion weights
```

## 5. Versioned roadmap

The order below is deliberate. Each version proves the next one's foundation and keeps risk/legal surface manageable.

### V0 — Observation & Context (exists, needs hardening)
**What it is:** Overlay can read the host page, see fields, know URL/title, and pass that context into Lumin chat.

- Page context reader: fields, labels, selected text, visible text.
- User data mapping for basic form fill (name, DOB, address, insurance member ID from `lifeos_users`).
- Simple proactive triggers (dwell, repeat click, edit cycles).
- Chat drawer with LifeOS identity.

**Acceptance gate:** Real browser extension loads on a live site, reads a form, and the user can ask "what is this form asking for?" and get a correct answer.

### V1 — Conversational Contracts & Voice Presence
**What it is:** The overlay becomes reliable at finishing what it starts and sounding natural in voice.

- **Conversational Contracts:** whenever the assistant promises a sequence ("I'll read the 25 ideas"), the runtime tracks the promise, completion condition, user interruption, and fulfillment. It cannot silently abandon mid-sequence.
- **Interruption Decay Model:** in voice, detect user speech start, finish current syllable/word, fade volume over 100–300ms, trail off, and switch back to listening.
- **Presence Layer:** continuous low-latency feedback (listening sounds, acknowledgements, thinking indicators, partial streaming) so silence does not feel like failure.
- **Voice dictation into any field** (LuminVoice bridge).

**Acceptance gate:** A 25-item voice list is delivered without abandonment; interruption feels natural; the user can stop and restart without repeating context.

### V2 — Evidence Fusion & Cognitive Dynamics
**What it is:** The assistant starts combining multiple evidence sources to estimate the user's current state and choose the right conversational move.

- **Evidence Fusion Engine** with at least two real sources per interaction: transcript + timing/rhythm for voice; transcript + interaction history for text; page context + device signals for overlay.
- **Cognitive Dynamics:** continuous estimates of ambiguity, certainty, agency, openness, cognitive load, readiness, emotional intensity, momentum, trust.
- **Confidence by modality:** the system learns which sources predict best in which situation and weights them accordingly.
- **Positive-signal recognition:** detect curiosity, excitement, relief, pride, flow, etc., and lean in to reinforce momentum.

**Acceptance gate:** In a test corpus, fusion-based state estimates outperform single-source guesses on a labeled set of "frustrated / stuck / ready / celebrating" moments.

### V3 — Face, Body, and Biometric Perception
**What it is:** Add optional visual and biometric channels under explicit per-context consent.

- **Face analysis:** expression, eye contact, gaze, attention, fatigue, surprise, confusion.
- **Body language:** posture, leaning, gestures, fidgeting.
- **Wearables / sensors:** ring, watch, glasses, EEG (when user opts in and data is available).
- **Environment:** camera view, screen contents, active app.
- **Consent layers:** per-modality, per-session, per-product, with clear visual indicators when a channel is active.

**Acceptance gate:** A user can opt in to camera + mic, and the system correctly detects "user looks confused" or "user is looking away" with calibrated confidence and without presenting inference as fact.

### V4 — Verbal AI Director & Autonomous Overlay Action
**What it is:** The user can say "do it" and the overlay plans and executes multi-step actions across arbitrary pages, confirming only for irreversible or sensitive steps.

- **Goal → plan:** "fill and submit this insurance form" → decompose into field mapping, value lookup, fill, review, submit.
- **API-first, visual fallback:** prefer real integrations; when absent, generate a safe click/type sequence and execute through `content.js`.
- **Observation before action:** show the user what it will do (arrows, highlights, tooltips) and get a tap/voice "yes" before irreversible steps.
- **Failure recovery:** if a button is missing or a field changes, the overlay stops, explains, and asks.
- **Cross-program memory:** "book the flight we talked about yesterday" → recall prior intent, open site, execute.

**Acceptance gate:** User says "fill this form with my info and stop before submitting"; overlay correctly fills 90%+ of fields on a previously unseen form and stops at submit.

### V5 — Cross-Domain Personal Intelligence
**What it is:** The same perception/conversation/action loop serves every LifeOS product and learns the user once, with domain firewalls.

- LifeOS: conversation, reflection, wellness, daily rhythm.
- SalesOS: detect buyer confidence, hesitation, engagement, pacing; fill CRM, build meeting kit.
- TherapyOS: recognize emotional shifts, readiness, progress; support between-session practices.
- MediaOS: generate believable character reactions.
- LeadershipOS / EducationOS: meeting facilitation, coaching, explanation pacing.

**Acceptance gate:** A single user profile improvement in one domain measurably improves response quality in a second domain without leaking private context.

## 6. Key design constraints

1. **User direction always wins.** No silent action. No action on sensitive/irreversible steps without explicit confirm.
2. **Evidence, not conclusions.** A fused inference is never presented as a fact about the user. It is used to choose behavior.
3. **Consent per channel and per context.** Face, body, voice, screen, and biometric access are opt-in, revocable, and visibly indicated.
4. **Fail-closed on missing evidence.** If perception data is unavailable or confidence is low, fall back to the existing text/chat path.
5. **No cross-domain leakage.** Therapy notes, sales calls, and personal conversations do not share inference context.
6. **Honest receipts.** Every action produces a receipt: what was observed, what was inferred, what was promised, what was done, and how the user can correct it.

## 7. Product surfaces

| Surface | V | What the user experiences |
|---|---|---|
| Browser extension overlay | V0 | Floating icon, drawer, chat, form context, fill-form, proactive help |
| Native app shell (Capacitor) | V0 | Same overlay as browser, plus device sensor access |
| Voice-only channel | V1 | Phone/voice call with natural turn-taking, contracts, presence |
| Video channel | V3 | Video call where assistant sees user reactions and adapts |
| Wearable / ambient | V3 | Subtle haptic/audio nudges based on fused state, not raw sensor spam |
| Desktop co-pilot | V4 | Overlay on desktop apps, not just web pages |

## 8. Open decisions

1. Which modality do we collect first after transcript + page context? (voice timing, face, wearable)
2. Does Evidence Fusion live as one shared service or as a pattern each OS consumes?
3. What is the legal/consent boundary for face/voice/biometric data per jurisdiction?
4. How do we represent "do it for me" intent safely — explicit confirmation for each step, or a per-task permission?
5. Which platforms get visual/RPA fallback first? (web extension, desktop app, mobile in-app browser)
6. Where does the conversation state live when the user switches devices mid-flow?

## 9. Source map

This blueprint is drawn from:

- `docs/products/universal-overlay/PRODUCT_HOME.md` — existing overlay/extension architecture, form fill, struggle detection, proactive toast, approved backlog.
- `docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md` — cognitive modes, composer, calibration, anti-patterns, outcome hierarchy.
- `docs/conversation_dumps/2026-08-05-voice-interaction-torture-suite.md` — interruption decay, conversational contracts, presence layer, conversation torture suite.
- `docs/conversation_dumps/2026-08-05-cognitive-interaction-constitutional-merge-shared-engines.md` — Human Perception Engine, Evidence Fusion Engine, Tonality Engine, Cognitive Dynamics, positive-signal recognition, cross-product sharing.
- `memory_dump_chunks` table — full historical conversation corpus from GPT, Gemini, Grok, DeepSeek, LifeOS, and founder notes; theme analysis confirms overlay, builder, memory, sales, voice, evidence fusion, contracts, and face/body as recurring topics.

## 10. Next step

Founder review of this version order. After agreement, the first build target is **V1 Conversational Contracts + Interruption Decay** because it fixes a real failure mode (voice abandonment) and can be implemented on the existing transcript/timing metadata without new hardware or legal surface.
