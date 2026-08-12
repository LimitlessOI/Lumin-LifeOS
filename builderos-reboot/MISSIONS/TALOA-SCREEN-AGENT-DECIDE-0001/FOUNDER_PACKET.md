<!-- SYNOPSIS: Raw Founder Notes Intake — TALOA-SCREEN-AGENT-DECIDE-0001 -->

# Raw Founder Notes Intake — TALOA-SCREEN-AGENT-DECIDE-0001

Terminal direct intake entrypoint. Raw notes are intentionally unpolished.

## Raw Founder Notes
```text
## Problem

Taloa's native macOS overlay can already see the real screen (full-screen
capture) and move/click the real system cursor, both self-granted and
live-verified tonight. But nothing connects them to intelligence: the
system already has real vision-capable AI (services/mtg-card-vision.js's
OpenAI/Anthropic/Gemini fallback chain; services/voice-rail-attachments.js
describeVoiceRailImages, live in routes/lifeos-voice-rail-routes.js) --
but that AI is only ever asked to DESCRIBE an image for a chat reply,
never asked to decide where to click, and nothing takes an AI answer and
actually executes a click. The founder named this gap directly and also
set a hard architecture requirement: "even if you're making capabilities
for you, you need to make it for the system as well, that's what
matters" -- this must be a real capability Taloa's own Swift code calls
autonomously, not something only reachable by a human or an AI agent
typing terminal commands.

## Desired Outcome

A new backend endpoint, reusing the exact proven vision-provider-fallback
call shape from services/mtg-card-vision.js (same providers, same
fallback chain, different prompt), that accepts a screenshot + a goal and
returns a structured decision: {action: 'click'|'type'|'done'|'unclear',
x, y (normalized 0-1, resolution-independent), reasoning, confidence}.
Taloa's own native/macos-overlay/ContainerView.swift or
ScreenControl.swift must be extended with a real HTTP call site that
sends a captureFullScreen() screenshot + goal to this endpoint, parses
the response, and calls the already-real moveMouseAndClick() with the
returned coordinates -- closing the perceive-decide-act loop end to end
inside the actual product, not in a session script.

One explicit exception, out of scope on purpose: no app may be given the
ability to grant itself macOS system permissions (Accessibility/Screen
Recording) -- that is intentional OS security, not a gap to close here.

## Founder Success Test

Given a real screenshot of the founder's desktop and a real, concrete
goal (e.g. "click the Dock icon for Finder"), the new endpoint returns
real coordinates for the correct on-screen element, and Taloa's own Swift
code -- called autonomously by the running app, not manually invoked by a
human or an AI agent in a terminal -- actually moves the real system
cursor there and clicks, verified by reading the OS-reported cursor
position back afterward (same verification method already proven this
session: currentMouseLocation() before/after, not a log-line claim).
Acceptance must grep-verify the real Swift call site exists AND invokes
the endpoint AND acts on its response (per CLAUDE.md's "acceptance must
prove reachability, not just existence" rule) -- a passing backend unit
test alone is not sufficient.

## Value

Unblocks the entire fluid-UI / screen-agent vision the founder has been
describing across this session: Taloa able to actually operate arbitrary
apps on the founder's behalf, watched or backgrounded, not just chat.

## Priority

High -- founder is actively driving this build live tonight and asked for
BuilderOS to take token-heavy pieces in parallel while the interactive
session continues lighter, direct work, given an approaching usage limit.

## Ownership

BuilderOS governed factory (SO-001 -- new services/routes module, must not
be hand-authored).
```
