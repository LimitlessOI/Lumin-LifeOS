<!-- SYNOPSIS: Founder capture -- Taloa/overlay fluid-UI product vision, 2026-08-10. -->

# Taloa fluid-UI vision — founder capture (2026-08-10)

## Context

Same session that shipped the first real, working slice of the Taloa native
macOS overlay: click-to-expand, shrink-back-to-circle, real Accessibility
conformance, and real founder auto-login (no password typed). After seeing
that working, Adam described the actual, fuller product vision this is
building toward. This capture exists so that vision survives past this
session's chat history — per SO-004, a substantive conversation like this
gets routed to a real destination, not left to vanish at compaction.

## Founder's vision, organized (near-verbatim, cleaned of dictation noise)

**Resting position.** A small circle/dot, freely movable anywhere on
screen, but with standard "home" positions — one of the four screen
corners — somewhere genuinely out of the way, "not bugging people."

**Two ways to wake her.** Click it — already real, already shipped. Or
speak: "Hey, Taloa" — a real wake-word, not yet built. On either trigger,
she "shows up."

**Avatar direction, explicit and current.** "For now, we'll use the [S]eon
from Elantris as her avatar" — his own words, a definite choice for this
alpha, not speculative. Wants her to pulsate to the rhythm of actual speech
(hers or his) and shift color with emotion/state — closer to the existing
`coreColor()`/mode system already in `TaloaImageCharacterView.swift`, but
tied to something real, not hardcoded.

**Dynamic, contextual surfacing.** Not just a chat box — "it displays in
real time... widgets or different pages or different information,
different applications. It pulls it up as it's needed... in the moment."
The UI itself should be fluid, assembling around whatever the actual task
is, not a fixed set of screens.

**Active walkthrough/teaching, not just answering.** "What does this do?
How do I use this function? And it can literally show and walk through it
for me and clicks the button." Distinct from Q&A — Taloa demonstrating,
narrating, and executing UI actions live while explaining them.

**Worked example, illustrating the shape of the interaction (his own
video-production workflow, used as a concrete stand-in, not a build spec
for tonight):** planning a shooting schedule and content genre for the next
two months of videos; distinguishing shoot types (green screen vs.
on-location, needing B-roll); where footage lives (local machine vs.
uploaded); the overlay being able to review B-roll directly; the system
editing, assembling, and posting to the right social platforms. The point
of the example: a long, exploratory, multi-turn planning conversation that
naturally pulls in the right tools and information at each step, not a
rigid form-fill.

**Interaction modes.** Type or talk, freely. Live transcript visible while
speaking. A toggle between a "just respond in text" quiet mode and a
default spoken-response mode — spoken by default specifically because
there are real contexts (his example: a classroom) where typing isn't
practical and voice is the only option, so voice-out should be the
fallback-safe default, not an opt-in.

**Explicit correction: this is NOT chat-box-scoped.** Follow-up, direct,
after the above was captured: "why would we have these tied to the inside
of the chat? We have an overlay that covers the entire screen. We use the
entire screen. Has our interactive UI. We can pull up any app that's
[operated] for them. We can pull up a report. We can have the app... if
we're videoing... because our app we can control, we could set up the
lighting preferences for the camera, like exposure, frame rates, make sure
sound quality is good, make sure video quality is good. Help them set up
the whole thing." Real, important correction to the "dynamic widget
surfacing inside the expanded chat" framing above — the actual vision is a
full-screen control layer (arbitrary app control, reports, and Taloa's
*own* first-party apps — his example: a recording app with real
hardware-level camera/audio controls), not content boxed inside a chat
panel. The chat is one entry point into that layer, not its container.

## Honest scoping — what's real tonight vs. real future work

Already shipped, real, this same session: click-to-expand, shrink button,
real Accessibility conformance (System Events/VoiceOver can both drive
her), real founder auto-login via `mint-browser-session` (no password ever
typed).

**Named as genuinely separate, larger builds — not attempted blind at this
hour, not silently dropped either:**
- Voice wake-word ("Hey, Taloa") — continuous audio capture + keyword
  spotting is a real subsystem (battery, privacy, false-wake handling),
  not a quick add.
- Seon-style avatar redesign — the current character is a fully illustrated
  static-photo-style figure (`TaloaCharacter.png` + blink/speak frames);
  a genuine Seon look (simple, glowing, geometric) is a real asset/rendering
  direction change, not a parameter tweak.
- Voice-reactive pulsing tied to real audio amplitude (TTS output or mic
  input), not a timer-driven animation.
- Dynamic, contextual widget/page/app surfacing across the FULL SCREEN
  (corrected scope, see below — not confined inside the expanded chat
  panel) — this is close to the "Conversation Composer" / cognitive-mode
  concepts already specified in `COMMUNICATION_SYSTEM_BLUEPRINT.md` §6-§7;
  the gap is wiring, not doctrine (doctrine already exists, per this
  file's own §6.2/§11 already reviewed earlier this session). A real
  first-party app (his example: video recording with real camera/audio
  hardware controls) is its own, separate, substantial build.
- Active walkthrough/narrated UI automation — closest existing relative is
  the browser-drive/extension-drive system built earlier this session, but
  that's a different surface (Chrome extension observing a web page), not
  the native overlay narrating and driving arbitrary app UI.

**Real infrastructure fact, checked live, relevant to "free tokens"/AI
availability:** a local Ollama server is genuinely running (`localhost:11434`,
three real models: `gemma2:27b-instruct`, `deepseek-coder-v2`, `qwen2.5:32b`)
— real, free capacity for text/reasoning tasks. Two real limits, checked,
not assumed: (1) it's reachable only from this Mac, not from Railway where
the actual production request-handling code runs, so it can't directly
replace a blocked backend AI call without a real bridging mechanism; (2)
none of the three installed models are vision-capable, so it would not
have unblocked the MTG card photo-identification credits issue specifically
even if reachability weren't a problem.

## What shipped concretely from this same conversation

Corner-snap positioning (pick a standard home corner instead of being
fixed to bottom-left only) — see Change Receipts, same date, universal-overlay
PRODUCT_HOME.md.

## Continuation — real screen control + the "one AI agent" framing (same night, later)

After watching a pasted description of the Chrome extension's DOM-based
drive and correctly rejecting it as not matching what he'd asked for, Adam
pushed for and got real, self-granted OS-level screen vision + system
cursor control on the native macOS overlay (see universal-overlay
PRODUCT_HOME.md same-date receipt: `ScreenControl.swift`,
`grant_accessibility.py`). Immediately after, he extended the vision
further, near-verbatim (cleaned of dictation noise):

"What we need is to have an overlay that can see what's under it and read
all the backend stuff that you already have access to now, and that window
we can control what is seen on the screen — like we have Taloa represented
as an avatar we can talk to at any time and ask it to do whatever we want
to ask, unless unethical or illegal, or we are blocked as we are on Apple
phones for the most part. There will be times where they will want to see
what is being done, and other times where they will want it done in the
background — but without the ability to actually push a button, then we
are way too limited in our abilities, and without being able to really
know what's there we are even more hindered. And we need to be able to use
the entire screen to have multiple apps up at the same time, and you can
be working multiple things at once."

**What this actually names, distinct from the earlier vision capture
above:**
- **Vision + backend fusion.** Not just screen pixels — Taloa should
  reason with both what's visibly on screen *and* whatever backend/DB
  context the system already has access to (chair/founder-interface,
  memory, product data), as one combined picture, not two separate
  sources the user has to bridge themselves.
- **Foreground vs. background execution as an explicit, switchable mode**
  — sometimes the user wants to watch it happen (the real cursor moving,
  per the immediately-prior work), sometimes they want it silently done
  off-screen. Both are named as real, wanted modes, not just the
  visible one.
- **Multi-app, multi-task parallelism** — Taloa operating several apps
  across the full screen at once, not one modal action at a time.
- **Explicit ethical/legal ceiling, self-imposed by the founder** — "unless
  unethical or illegal" is his own stated boundary on what the agent
  should do on his behalf, independent of any technical limit.
- **Named, accepted platform constraint, not a gap to solve around**: "or
  we are blocked as we are on Apple phones for the most part" — Adam is
  already aware iOS's sandboxing forbids the kind of arbitrary
  screen-capture/synthetic-input control just proven on macOS; this is a
  real Apple platform restriction (no public API equivalent to macOS's
  Accessibility/CGEvent path for controlling arbitrary third-party app UI
  system-wide), not something buildable around on iOS today. The existing
  Android accessibility-driver + background-command-queue work (shipped
  earlier this same session) is the closer mobile analogue, since
  Android's platform permissions actually allow it.

**Honest scoping, not attempted blind tonight:** the perceive→decide→act
loop that actually connects the newly-shipped screen capture and cursor
control into one intelligent action (something has to look at the
captured pixels, reason about them alongside backend context, and decide
where to click) is real, substantial, next-priority work — the vision +
backend fusion, foreground/background mode switch, and multi-app
orchestration described above are each their own real slices on top of
that, not implied for free once the base loop exists.
