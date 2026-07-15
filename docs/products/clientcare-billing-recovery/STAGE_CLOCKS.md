<!-- SYNOPSIS: Stage map + follow-up clocks — every ClientCare billing scenario -->

# Stage clocks — follow-ups only; file ASAP

**Doctrine (founder 2026-07-15):** Clocks are for **when to next follow up** after a claim is filed (ERA wait, status chase, underpay). They do **not** stagger filing the open unpaid queue. Capture/file runs **as fast as tip can take**.

## Runtime

| Loop | Interval | What |
|------|----------|------|
| **FILE NOW blast** | **~2 min** (`CLIENTCARE_FILE_BLAST_INTERVAL_MS`) | Burn through unpaid / unbilled / notes-with-link — batch of ~8 |
| Follow-up clocks | **15 min** | Only `await_era` / status / ask-insurer / underpay when `next_due_at` hit |

## APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/stages/due?mode=file_now` | Everything that should file immediately |
| GET | `/stages/due?mode=follow_up` | Only clock-gated follow-ups |
| POST | `/stages/execute-due` `{ "mode":"file_now", "limit":8 }` | Blast file batch |
| POST | `/hands-off/run` | Same |

## After file

`proved_sent` → stage `filed_await_era` with **7d** follow-up clock (then 14d status / forever ask). That clock is the only intentional delay.
