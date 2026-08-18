# Founder Conversation Capture — Five-Alarm Never-Stop Law

**Date:** 2026-08-18
**Product:** BuilderOS

## Load-bearing founder language

> "Let's be clear, if it stops, the system failed. It should never fucking stop. Ever. If it does, it should set off a five alarm fire, including texting me and calling me to inform me that the worst thing that the system could do has happened."

## Canonical interpretation

- A builder that stops while approved executable work remains is a P0 catastrophic BuilderOS failure.
- SENTRY must not merely report the stop. It must trigger autonomous recovery and continue until manufacturing resumes.
- First catastrophic-stop detection triggers immediate founder SMS and immediate founder voice call.
- Founder notification does not replace recovery; recovery continues in parallel.
- The stopped runtime is restarted automatically as a first-line self-heal when the governed loop heartbeat exceeds the catastrophic threshold.
- Recovery is not complete until SENTRY observes manufacturing heartbeat/progress resumed.
- Explicit founder hard halt is distinct from accidental stoppage and must not be misclassified.

## Enforcement artifacts

- `services/autonomous-recovery-council.js`
- `routes/autonomous-recovery-runtime-routes.js`
- `tests/sentry-recovery-governance.test.js`

## Current threshold/cadence

- SENTRY recovery supervisor checks every 60 seconds by default.
- Governed loop heartbeat older than 6 minutes is catastrophic by default (`SENTRY_CATASTROPHIC_STOP_STALE_MS` may override).
- Alarm escalation stages: initial, still stopped at 5 minutes, still stopped at 10 minutes.
