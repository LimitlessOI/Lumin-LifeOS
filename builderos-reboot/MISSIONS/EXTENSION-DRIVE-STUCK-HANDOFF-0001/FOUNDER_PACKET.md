<!-- SYNOPSIS: Founder Packet — stuck-field human handoff for the drive channel. -->

# Founder Packet — Extension Drive Stuck-Field Handoff

**Mission ID:** `EXTENSION-DRIVE-STUCK-HANDOFF-0001`
**Locked:** 2026-08-10 (Adam: "then where there's something like that, you need to bring up the windows so that all I have to do is just type it in. Yep. Then you take over, after i submit it.")

## Priority

The drive channel gets genuinely stuck when a step needs something only Adam
has -- a verification code, a CAPTCHA answer, an OTP -- and currently just
re-clicks the same element for the whole step budget (confirmed live twice
tonight on the Fiverr signup's email-verification step). `services/general-
browser-agent.js` already computes `stuck`/`stuckCount` every loop iteration
and has an `onAfterStep` hook built for exactly this (with a code comment
describing the original incident), but `routes/extension-drive-routes.js`
never passes it in -- the safety net exists and is wired to nothing.

## Desired outcome

When the loop detects it's stuck on a click/type action twice in a row, stop
cleanly and surface which field needs a human value (`handoff: {selector,
label, url}`) instead of burning the step budget. A new `POST
/handoff-resume {session_id, value}` types Adam's value into that exact
field and resumes the goal loop from there -- so once Adam submits, the AI
takes back over immediately, matching his own words exactly.

## FOUNDER SUCCESS TEST

A session that gets stuck on a real input field surfaces `status:"handoff"`
with a `handoff` object on `GET /status`; `POST /handoff-resume` with a
value types it into the field and the loop continues (verified against a
synthetic stuck-loop fixture, not a live site, per the acceptance script).

## Acceptance command

```bash
npm run extension-drive-stuck-handoff:acceptance
```
