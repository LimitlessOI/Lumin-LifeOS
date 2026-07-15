<!-- SYNOPSIS: Stage map + follow-up clocks — every ClientCare billing scenario -->

# Stage clocks — follow-ups only; file completed episodes ASAP

**Founder rules (2026-07-15):**
1. **Global fee $4,900** / CPT **59400** for full midwife episodes — do not itemize the full episode to inflate pay.
2. **Do not bill current/active prenatal clients.**
3. **Notes + charting are the determinant.** Transports / hospital globals → midwife still collects **prenatal** (`59425`/`59426`). See `INSURANCE_BILLING_KNOWLEDGE/09_TRANSPORT_AND_PRENATAL.md`.
4. **Charting + ClientCare** hold contracts, coverage, and clinical truth — we push ClientCare buttons; we do not invent charges.
5. Clocks = **next follow-up after file** only. Capture of completed unbilled episodes is FILE NOW.
6. **Phone / constant insurer contact** = Phase 2 after filing volume is rolling (`ask_insurer` / forever-chase).

## Runtime

| Loop | Interval | What |
|------|----------|------|
| **FILE NOW blast** | **~2 min** | Completed births + notes-classified transport/prenatal billable — batch of 2 |
| Notes reclassify | on `sync-clocks` | `inferCareBillingFromNotes` stamps `care_billing` / `billable_now` |
| Follow-up clocks | **15 min** | After Sent Bills prove — ERA / status / underpay |
| Phone chase | **after file volume** | Outbound insurer calls — not a gate on filing |

## Explicitly excluded from auto global-file

- Active prenatal / current clients (`care_billing.reason = current_prenatal`)
- Billing-notes backlog **unless** notes determinant says billable (`birth_completed` / transport prenatal)
- Anything that would invent services not in the chart
