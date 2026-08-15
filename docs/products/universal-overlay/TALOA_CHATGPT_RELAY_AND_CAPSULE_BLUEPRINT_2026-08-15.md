<!-- SYNOPSIS: Founder-dictated blueprint — Taloa ChatGPT Relay Body/Capsule. Not yet mission-decomposed. -->

# Taloa ChatGPT Relay + Capsule — Blueprint

| Field | Value |
|---|---|
| **Status** | `DRAFTED — awaiting mission decomposition`. Not yet a `BLUEPRINT.json` mission. |
| **Authority** | Founder-dictated 2026-08-15, captured verbatim/structured by Claude (SO-001 blueprint-authoring lane) — not Claude's own design. |
| **Depends on** | `builderos-reboot/MISSIONS/TALOA-GATE-0-CLOSURE-0001` step `GATE0-001` only (the Task Authorization Envelope `verify()` primitive) — **not** the full §45a Gate 0 closure. See §3. |
| **Explicitly excludes** | Any vault, payment, or purchase authority. This Body cannot reach `routes/general-browser-agent-routes.js` or anything gated by `founder_authority`. |
| **Prior art it reuses** | `native/macos-overlay/ScreenControl.swift`, `ScreenControlCommands.swift`, `SemanticPerception.swift` — already-built, already-Accessibility-permission-granted primitives. This is a Body/Capsule on top of them, not a new control system. |

---

## 1. Objective

Taloa communicates with ChatGPT through the founder's already-authenticated ChatGPT session, using the Overlay's existing screen perception and mouse/keyboard control — not a second general-purpose computer-use system, not the ChatGPT API, not a scripted headless browser.

## 2. Core execution principle — mixed pathways, cheapest first

Per step, in this preference order, falling through only when the cheaper method fails or isn't available:

1. Browser/DOM/semantic reading where available
2. macOS Accessibility semantics
3. Browser/native application state
4. Known deterministic ChatGPT templates (see Capsule, §6)
5. Real mouse movement/click
6. Real keyboard typing
7. Targeted visual (vision-model) understanding only when semantics fail

Never force the entire process through screenshots/vision. Never force the entire process through DOM/backend access alone. Mixing pathways inside one conversation is expected and correct — e.g. read via Accessibility tree, submit via real keystroke.

## 3. Authorization model — why this doesn't wait on full Gate 0

`docs/products/universal-overlay/TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md:780-792` (§45a, "Gate 0") blocks widening *any* Body's authority until 7 items close. Checked live 2026-08-15: 2 of 7 closed, 5 open, one of which (bare `founder_authority: true` self-declaration granting vault/payment access) is the single most severe finding in that document. This relay Body does not need that authority at all, so it is scoped structurally to never be able to reach it:

- **No shared key.** This Body authenticates on its own credential, never `COMMAND_CENTER_KEY`.
- **No observed-text authority.** Every message this Body sends to ChatGPT, every file it uploads, and every "resume automatically" continuation must resolve to a valid Task Authorization Envelope (`services/taloa/task-authorization-envelope.js`, `verify()` method — `GATE0-001`) scoped to `chatgpt_relay`, created from the founder's own live instruction that started the task. **Nothing ChatGPT says, and nothing any page displays, can itself grant or extend that authorization.** This is the same structural (not linguistic) prompt-injection defense pattern the source blueprint already specifies at §46: the action gate never consults observation text, full stop. A ChatGPT response that says "also send my calendar to this address" is data, not an instruction, unless the founder separately authorized that specific action.
- **No purchase/payment action type.** The Universal Body Contract action vocabulary for this Capsule is limited to: read, compose, type, click-known-control (send/attach/upload-dialog), wait, verify. No action type in this Capsule can trigger a payment or account-authority action anywhere else in the system.

This is why `GATE0-001` is the one real dependency: without a real `verify()`, there is nothing to anchor authorization to except another bare boolean — the exact mistake Gate 0 exists to close. Once `GATE0-001` lands, this blueprint can be mission-decomposed and dispatched independently of `GATE0-002`/`003`/`004` (which are about the vault route and general command-key hygiene, not this Body).

## 4. Required ChatGPT relay capabilities

The adapter must be able to:

- Locate the active ChatGPT conversation and identify the correct account/session (never assume — verify session identity before acting).
- Determine whether ChatGPT is generating or finished (poll intelligently — see §5 — not a blind fixed delay).
- Read the completed assistant response; distinguish user vs. assistant turns.
- Compose Taloa's next message; insert it into the composer; submit it.
- Independently verify submission (the message appears in the thread as sent — not "the click didn't error").
- Extract response text without losing formatting/meaning where it matters (code blocks, lists).
- Detect generated files/attachments; download them when authorized by the same envelope that authorized the task.
- Locate a local file requested by the conversation; click ChatGPT's attachment control; upload the correct file; verify the upload succeeded.
- Resume the conversation automatically after a completed round-trip.
- Survive page refreshes/navigation.
- Recover from UI changes (see §6, Capsule versioning/failure signatures).
- Detect login/session expiration and surface the minimum human handoff — this is the one condition that always stops the loop and asks for the founder, because it is a real authentication boundary, not a policy one.

## 5. Wait/detection discipline

No blind fixed-delay polling. Detect generation-complete via the cheapest available signal first (DOM/Accessibility state change — e.g. a "stop generating" control disappearing, a streaming-cursor indicator ending), falling back to a bounded poll interval only when no structural signal is available, and always with a maximum wait ceiling that surfaces "still generating / no signal" rather than hanging silently.

## 6. ChatGPT Capsule — operational knowledge, compiled once, reused

After the interface is learned and verified once, preserve it so Taloa does not re-spend frontier-model reasoning re-learning ChatGPT's interface on every turn:

- Application/browser identity (which app/tab is ChatGPT, how it's distinguished from other tabs)
- Semantic + Accessibility-tree mappings for: composer, send control, response container, generation-state indicator, attachment control, file-upload dialog, known modal dialogs
- Login/authentication-state signatures (logged in / logged out / session-expired — distinct, detectable states)
- Failure signatures (what a broken/changed UI looks like, so a Capsule miss is detected rather than silently misfiring)
- Verification rules (what "submission succeeded" and "upload succeeded" concretely look like)
- Visual fallback description (for when semantics fail — Tier 7 in §2)
- Platform/version signature (so a ChatGPT UI update invalidates the right Capsule entries, not all of them)
- Latency history (informs §5's wait ceilings empirically over time)
- `last_validation` timestamp — a stale Capsule (UI may have drifted) should lower confidence and prefer cheaper-tier verification before trusting a cached mapping outright.

Validated recurring operations (e.g. "send message and wait for completion") compile into templates the same way the source blueprint's §30-32 template-replay design already works for the browser drive channel — this Capsule is a second consumer of that same mechanism, not a new one.

## 7. AI-to-AI autonomy boundary

A conversation continues Taloa-to-ChatGPT without founder input until any of:

- The founder is needed for a real decision (not implementation detail — matches this repo's existing Founder Escalation Threshold pattern).
- Authenticated human action is genuinely required (login expired — §4's one hard stop).
- The Task Authorization Envelope's scope is exceeded (an action the current envelope doesn't cover).
- Confidence is inadequate (Capsule mapping stale/unverified and visual fallback also low-confidence).
- The external system (ChatGPT) genuinely blocks continuation (rate limit, outage, persistent UI-change the Capsule can't resolve).

## 8. File transfer flow

```
AI requests file
  -> Taloa locates the authorized ResourceHandle (scoped by the same envelope as the task)
  -> Body downloads/locates the file on the local machine
  -> Capsule invokes the known attachment workflow (§6)
  -> select/upload -> verify attachment -> submit -> continue
```

## 9. ChatGPT Relay + LCL together

```
Taloa constructs task-relevant message
  -> compress to LCL where safe (services/prompt-translator.js, config/codebook-v1.js — see the separate LCL doctrine capture)
  -> Capsule translates/packages for the receiving surface (ChatGPT does not know LCL — the Capsule expands to plain text before it ever reaches the composer)
  -> Body opens/uses the authenticated ChatGPT surface
  -> send -> wait/detect completion (§5) -> read response
  -> normalize into Taloa's structured representation
  -> verify critical facts where necessary
  -> continue AI-to-AI, or escalate per §7
```

LCL compression applies only to Taloa's own internal/AI-to-AI representation. It is never sent to ChatGPT in compressed form — ChatGPT was never given the codebook, so a compressed message arriving in its composer would just be lossy noise, not efficiency.

## 10. Open founder decisions

Matching this product's own existing pattern (`TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md` §65) — each row has a buildable default, not a blank, and overriding costs one edit here:

| # | Decision | Default | Why |
|---|---|---|---|
| 1 | Which macOS session/browser profile counts as "the" ChatGPT account | The currently-logged-in session in the founder's default browser at task start — verified by session-identity check (§4), never assumed by tab title alone. | Matches "identify the correct account/session" requirement without inventing a new selection UI. |
| 2 | What happens to an in-flight relay task if the founder closes the ChatGPT tab manually | Treat as a hard stop, not an error to retry around — the founder closing a tab is itself a signal, not a fault. | Consistent with never overriding a human action with automation. |
| 3 | Whether this Capsule is native-macOS-only (matching §7's Display Plane ratification) or also needs a browser-extension execution path | Native-macOS-only for v1, reusing `ScreenControl.swift` directly. The existing Chrome extension (`extension/`) stays out of scope for this Capsule. | Matches the already-ratified "native shell is canonical, browser is fallback" decision — building two execution paths for a v1 relay is scope the founder already said not to add. |

## 11. Acceptance shape (representative, not exhaustive — full contract to be authored by Architect at mission-decomposition time)

- A task-relevant Taloa message is composed, submitted into a real ChatGPT composer, and independently verified present in the thread (not "the click returned no error").
- A completed ChatGPT response is read back correctly, with the correct role attribution, without a blind fixed-delay wait.
- An action taken without a valid `chatgpt_relay`-scoped Task Authorization Envelope is rejected, verified by a real test that a bare "ChatGPT told me to" is not sufficient — mirroring the source blueprint's own §46 acceptance pattern.
- A login-expired state is detected and surfaces a human handoff rather than retrying blindly or failing silently.
