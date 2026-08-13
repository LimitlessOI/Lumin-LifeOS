# 2026-08-12 — Overlay never stops; factory-3 is a switch

Founder: overlay must not stop; both factories; SENTRY watching; factory-2 working; factory-3 a near-instant switch we can leave idle.

The governed loop had skipped overlay because leftover JS hold-to-talk steps were pending but unrunnable. That is why LifeOS queue-status commits showed up. Closed by re-queueing real overlay work and registering factory-N as enable/idle rather than a rewrite.

Twin intake: overlay remains priority one; factory count is a switch not a redesign.

Follow-up: WIRE-HOST then blocked AIC_GATE_FAILURE because product-queue twins requested skip_intake_gate and execute-step denied it. trustedIntakeSkip is the in-process grant after blueprint follow. Railway 9bfdace7 did trigger; exit 1 was SHA-parity race.
