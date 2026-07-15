<!-- SYNOPSIS: Stage map + follow-up clocks — every ClientCare billing scenario -->

# Stage clocks — follow-ups only; file completed births ASAP

**Founder rules (2026-07-15):**
1. **Global fee $4,900** / CPT **59400** — do not itemize the full episode to inflate pay.
2. **Do not bill current/active prenatal clients.** Only completed births that should already have been filed.
3. **Charting + ClientCare** hold contracts, coverage, and clinical truth — we push ClientCare buttons; we do not invent charges.
4. Clocks = **next follow-up after file** only. Capture of completed unbilled births is FILE NOW.

## Runtime

| Loop | Interval | What |
|------|----------|------|
| **FILE NOW blast** | **~2 min** | Completed-birth unbilled only (birth activity / `birth_completed`) — batch of 2 |
| Follow-up clocks | **15 min** | After Sent Bills prove — ERA / status / underpay |

## Explicitly excluded from auto global-file

- Active prenatal / current clients  
- Billing-notes backlog **unless** chart proves birth completed (`birth_completed: true`)  
- Anything that would invent services not in the chart  
