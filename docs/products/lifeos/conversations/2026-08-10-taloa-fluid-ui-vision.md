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
- Dynamic, contextual widget/page surfacing inside the expanded chat —
  this is close to the "Conversation Composer" / cognitive-mode concepts
  already specified in `COMMUNICATION_SYSTEM_BLUEPRINT.md` §6-§7; the gap
  is wiring, not doctrine (doctrine already exists, per this file's own
  §6.2/§11 already reviewed earlier this session).
- Active walkthrough/narrated UI automation — closest existing relative is
  the browser-drive/extension-drive system built earlier this session, but
  that's a different surface (Chrome extension observing a web page), not
  the native overlay narrating and driving arbitrary app UI.

## What shipped concretely from this same conversation

Corner-snap positioning (pick a standard home corner instead of being
fixed to bottom-left only) — see Change Receipts, same date, universal-overlay
PRODUCT_HOME.md.
