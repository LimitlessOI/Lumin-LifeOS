# Founder Conversation Capture — Five-Alarm Never-Stop Law

**Date:** 2026-08-18
**Topics:** BuilderOS, SENTRY, autonomous recovery

## Load-bearing founder language

> "Let's be clear, if it stops, the system failed. It should never fucking stop. Ever. If it does, it should set off a five alarm fire, including texting me and calling me to inform me that the worst thing that the system could do has happened."

## Resulting law

- Any accidental builder stop while approved executable work remains is a P0 catastrophic failure.
- SENTRY immediately starts/continues autonomous recovery.
- First catastrophic detection immediately texts and calls the founder.
- Notification never replaces repair; SENTRY continues recovery and re-verification until manufacturing resumes.
- The unhealthy founder_builder process is restarted automatically as a first-line self-heal when the governed loop heartbeat is catastrophically stale.
- Default supervisory check cadence is 60 seconds; default catastrophic stale threshold is 6 minutes.
- Additional alarm stages occur if the same incident remains unresolved at 5 and 10 minutes.
- Explicit founder hard halt is not an accidental stop.

## Enforcement artifacts

- `services/autonomous-recovery-council.js`
- `routes/autonomous-recovery-runtime-routes.js`
- `tests/sentry-recovery-governance.test.js`
