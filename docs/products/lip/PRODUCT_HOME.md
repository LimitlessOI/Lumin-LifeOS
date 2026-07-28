<!-- SYNOPSIS: Canonical product home — LIP (Limitless Investment Protocol) -->

# LIP — Limitless Investment Protocol

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `lip` |
| **Full name** | Limitless Investment Protocol |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/lip/FILE_MANIFEST.json` |
| **Plan charter** | `docs/projects/BRAINSTORM_SESSIONS/limitlessos/2026-07-27_lip-a-to-z-roadmap/00_CHARTER.md` |
| **Last Updated** | 2026-07-28 |

---

## Mission

Operator-only capital experiments: multi-account paper → testnet → capped live across crypto, stocks, forex. **Not** consumer investment advice. **Not** organizing pumps — pattern detection only.

## Current BP

**Slice LIP-0 / Limitless Protocol paper (IN PROGRESS):**
- Seed **100** logical crypto accounts (`limitless_protocol`)
- Detect pump-like volume/price anomalies (public market data)
- Scale-out exits (~60–70% of typical swing + secure tranche)
- Historical + synthetic walk-forward backtest (aim to measure vs Adam’s prior ~200%/6mo / ~700%/mo sims — **report honest numbers**)

## Runtime (scripts — no live orders)

| Command | Purpose |
|---------|---------|
| `npm run lip:seed` | Seed 100 paper accounts |
| `npm run lip:scan` | Scan live CoinGecko movers for pump-like candidates |
| `npm run lip:backtest` | Walk-forward Limitless Protocol sim |
| `npm run lip:paper` | One paper cycle: scan → assign → log |
| `npm run lip:blind` | Segment A blind (Feeder/Reader, real Binance + TG) |
| `npm run lip:blind:b` | Segment B + Reader v2 (all lessons) + optional Reddit |
| `npm run lip:blind:c` | Segment C (unused 2020 H2) success-trail blind test |
| `npm run lip:blind:d` | Segment D retest after C lessons (trail v4) |
| `npm run lip:blind:solve` | Fade-primary solve reader (E + replay A–D) |
| `npm run lip:blind:breakout` | Takeoff breakout buy/sell across 2024–26 halves |
| `npm run lip:blind:win` | Winning shootout: BTC hold, regime, vol MR/fade, hybrid, funding |
| `npm run lip:blind:pump-drop` | Pump shout → short first down minute (A–E blind) |
| `npm run lip:blind:v3` | Lessons v3 short-only + fresh Segment F |
| `npm run lip:blind:both` | Both sides: UP trail + DOWN short (A–G) |

State: `data/lip/` · Lessons: `70_LESSONS_APPLIED.md` · Both-sides: `110_BOTH_SIDES_UP_AND_DOWN.md` · Natural/news trail: `120_NEWS_NATURAL_TRAIL_PLAYBOOK.md` · Win note: `100_WINNING_SOLUTION_SHOOTOUT.md`

## Fence

- Paper/sim until Adam Go + kill switch  
- No shill / wash / organize P&D  
- PFOS: no consumer “signals” product  

## Change Receipts

| Date | Change | Why | State | Next |
|------|--------|-----|-------|------|
| 2026-07-27 | Blind partitioned sim on **real** Binance 1m + Sapienza Telegram pump timestamps; costs on | Adam: feeder vs reader, real posts/tape | **40 real pumps**, 83k candles. Net of costs: posts+tape **−25.6%**; tape-only **−20.9%** ($10k paper). Optimistic synthetic ≠ blind real yet. | Tune entry to post-second; reduce false tape entries; more practice |
| 2026-07-28 | News/natural move playbook: early break + hard stop + trail | Adam: buy normal/news moves early; stop + trailing stop | Wrote `120_NEWS_NATURAL_TRAIL_PLAYBOOK.md`. Entry = coil+vol break; hard stop under range; trail arms ~+8% / gives back ~8%. Prior blind: +30/+16/+5/−15 vs BTC. | Optional trail-only tune; news→watchlist only |
| 2026-07-28 | Lessons v3 short-only + fresh F (2021 Q1) | Adam: bake lessons; no late buy; just short? | **6/6 green**; F **+7.23%** vs late-long **−17%**; **0 longs**. `npm run lip:blind:v3` | Keep short-only P&D satellite; need live shout feed |
| 2026-07-28 | Pump → short first drop blind (A–E) | Adam: if pumping, short when it drops | **5/5 green** (~+0.8–2.2%); beat late-long every segment. Short-at-shout mixed (E red). `npm run lip:blind:pump-drop` | Keep as P&D satellite; live needs shout feed + short |
| 2026-07-28 | Winning shootout: vol MR/fade vs BTC hold vs regime vs funding | Adam: buy volatility? find winning solution | Vol overlays **lost**. BTC hold **+30%** compound / **−45%** worst half. P&D fade remains only consistent small edge. Receipt: `winning-solution-shootout.json`. `npm run lip:blind:win` | Core = BTC; satellite = fade; funding when data+infra ready |

## Agent Handoff Notes

Commands: `npm run lip:seed|scan|backtest|scenarios|blind|blind:b|paper`. Blind A: `data/lip/blind-sim-report.json`. Blind B: `data/lip/blind-sim-segment-b.json`.
