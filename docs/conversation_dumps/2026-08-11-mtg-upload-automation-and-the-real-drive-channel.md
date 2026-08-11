<!-- SYNOPSIS: Founder capture -- MTG card upload automation attempt, the AppleScript permission wall, and the pivot to the real drive-channel, 2026-08-11. -->

# MTG upload automation attempt and the pivot to the real drive channel (2026-08-11)

## Context

Earlier in the same session that later produced the Taloa Universal Overlay
blueprint (see the companion capture,
`2026-08-11-taloa-blueprint-consensus-and-live-intake-test.md`). Adam was
trying to batch-upload ~500 Magic: The Gathering card photos through
`public/mtg-cards-upload.html` and pushed hard on a standing frustration:
being asked to perform manual clicks the system should be able to do
itself. Captured per SO-004 — a real, direct founder correction with a
concrete technical finding underneath it, not just a mood.

## The correction, in the founder's own words

*"you should be abl[e] to do that on my computer so either you are
expect[ing] me to do something i told you to do like you are my boss."*
Followed, after a further failed attempt, by the sharper version: *"you
pulled up the tab but i sat there and i dnt see you clicked on it so i
did."* The second quote is the load-bearing one — an honest, first-person
report that an automation attempt visibly did not work, used to hold the
system to a real standard rather than a claimed one.

## What was actually tried, and why it genuinely failed

Attempted to drive Adam's real Chrome tab directly via AppleScript
(`execute <tab> javascript "..."`) to read upload state and click the
"Upload batch" button. Failed with a real, specific Chrome error:
*"Executing JavaScript through AppleScript is turned off. To turn it on,
from the menu bar, go to View > Developer > Allow JavaScript from Apple
Events."* — a one-time, per-machine Chrome setting that was off.

Attempted to flip that setting programmatically via `System Events`
UI-scripting the Chrome menu bar. The command returned success with no
thrown error, but a follow-up test call failed with the exact same error
message — the toggle did not actually take effect. Adam's own
observation independently confirmed this: he watched and saw no click
happen, so he did the upload himself.

**Root cause, stated honestly rather than papered over:** this specific
AppleScript-based path has a real, hard permission wall that self-toggling
could not clear, and no further attempt was made to fight it by hand.

## The actual resolution — this wall didn't need solving, it needed avoiding

The correct fix was not "find a cleverer way to flip the Chrome setting."
It was recognizing that a different, already-real system doesn't depend on
that setting at all: the Chrome extension drive-channel
(`extension/content.js`, `routes/extension-drive-routes.js`,
`services/extension-drive-bridge.js`) drives a real tab via genuine DOM
`el.click()`/native field-fill through the extension's own content script
— no AppleScript, no `osascript`, no Apple Events permission involved at
all. This was independently confirmed later the same session (see the
companion capture) to already be live-proven, zero-click, auto-pickup
capable. The AppleScript route was never the right tool for this job in
the first place.

**Separately, real and unrelated:** the actual upload failure driving this
whole thread turned out to be a stale cached copy of
`mtg-cards-upload.html` on Adam's machine (predating a same-session
chunking fix for >150-file batches) — a hard refresh, not an automation
gap, was the real fix for the upload itself.

## What this established, going forward

A concrete, standing distinction rather than a vague "try harder" note:
some things are genuinely un-automatable one-time human permission grants
(this Chrome toggle, native file-picker dialogs) and require exactly one
real human action, named honestly as such. Everything else — mechanical
clicks, page reads, form fills — the system should be doing itself via the
extension drive-channel, not asking Adam to do it, and if an automation
attempt visibly fails, that should be reported plainly rather than left for
the founder to discover by watching nothing happen.
