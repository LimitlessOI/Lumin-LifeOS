<!-- SYNOPSIS: LIP research — crypto + forex (itex) strategy stack for unbounded fleet -->

# Crypto + Forex (itex) investing — what to test

**Date:** 2026-07-27 · For LIP unbounded sim fleet · Not advice  
**Benchmarks (must beat after costs):** crypto → **BTC hold**; forex → **equal-weight major FX basket** or cash + carry index proxy

---

## Crypto — honest picture

| Claim | Reality |
|-------|---------|
| Most retail bots / “AI crypto” | **Fail vs BTC buy-and-hold** over a full cycle (high loss rates; regime blindness) |
| What tends to survive | Hard drawdown kills, regime gates, majors-only, costs in the backtest |
| Structural edges (worth testing) | **Funding carry** (spot long + perp short when funding rich); **cross-sectional funding**; **vol-managed momentum**; **DCA with bear pause** |
| What to avoid first | Martingale, grid-forever, leveraged “AI tips,” copy-trading late winners |

**Adam (2026-07-27):** We do **not** run pump-and-dumps. We **identify** public P&D / hype patterns and may take advantage — Limitless Protocol. Also open to **any crypto strategy with high chance of return and lowest risk**.

### Priority stack — return chance ↑ / risk ↓ (operator paper first)

| Rank | Strategy ID | Edge type | Risk | Return chance (THINK) | Notes |
|------|-------------|-----------|------|----------------------|-------|
| 1 | `crypto_funding_harvest` | Structural fee | **Lowest** among actives | Steady mid (often high-single to mid-teens % ann. when funding rich) | Spot + short perp; flat when funding flips. Best “low risk” sleeve |
| 2 | `crypto_btc_hold` | Beta | Low (drawdowns still real) | Market | **Control** — every sleeve must beat this after costs |
| 3 | `crypto_dca_regime` | Discipline | Low–med | Market-like + less regret | DCA majors; **pause** in bear regime |
| 4 | `crypto_funding_xs` | Cross-sectional carry | Low–med | Med–high if fees allow | Needs multi-perp book; verify net of costs |
| 5 | `crypto_mom_vol` | Trend | Med | Med–high in trends | Vol scale + cash in bear — no naked momentum |
| 6 | `crypto_grid_range` | Range harvest | Med (dies in trends) | Med **only** if regime-gated | Off when trending |
| 7 | `limitless_protocol` | Hype / P&D **pattern** | **Higher** | Stretch / fat-tail | Identify only — never organize; small accounts; scale-out |
| 8 | `crypto_house_high_rr` | Lottery | Highest | Lottery | House money only |

**Default fleet mix (when spawning more than Limitless):** overweight **1–4**; keep Limitless as a **bounded** sleeve; never let high-risk sleeves dominate paper equity until they beat funding + BTC hold on the scoreboard.

### Crypto sleeves to spawn (N accounts each — unbounded)

| ID | Strategy | Why |
|----|----------|-----|
| `crypto_btc_hold` | Buy BTC, hold | **Control** — if you can’t beat this, stop |
| `crypto_eth_hold` | ETH hold | Secondary control |
| `crypto_funding_harvest` | Spot + short perp when funding ≥ threshold; flat when funding flips | Structural, low direction risk; ~high-single to mid-teens % when positive historically (THINK; compresses in calm markets) |
| `crypto_funding_xs` | Long negative-funding / short rich-funding cross-section | Vendor backtests claim solid Sharpe — **verify ourselves** with fees |
| `crypto_mom_vol` | Momentum with vol scaling + MA regime (cash in bear) | Classic; crashes without regime gate |
| `crypto_dca_regime` | DCA majors; **pause** in confirmed downtrend | Beats dumb DCA that never stops |
| `crypto_grid_range` | Grid **only** when range regime detected; off in trends | Grid dies in trends — gate or kill |
| `crypto_ai_rank` | LLM ranks alts weekly → small sleeve | Research only until it beats BTC control |
| `crypto_pull_me_up` / `limitless_protocol` | **Limitless Protocol** — see hype/trends early; legit vs P&D; scale-out; human-noise fleet | Adam — see `40_LIMITLESS_PROTOCOL.md` |
| `crypto_house_high_rr` | High leverage / alt lottery | **House money only** |

**Real-time:** exchange WS prices + funding rates every 8h (or venue schedule).  
**Devil’s advocate:** Funding arb needs **perp + spot** and margin skill; $300 accounts may be too small for clean delta-neutral — use logical larger paper size or pool funding sleeve.

---

## Forex (itex) — honest picture

| Claim | Reality |
|-------|---------|
| Classic academic edges | **Carry** and **momentum** both historically paid; **combo** often best Sharpe (low correlation of the two) |
| Retail EAs / scalpers | Usually die to spreads, swap, and leverage |
| Walk-forward reality | Many pairs fail tradeability bar; **EURUSD / USDJPY time-series momentum** more often clear than exotic pairs |
| Crash risk | Pure carry blows up in risk-off (2008/2020-style); momentum or “cash” gate helps |

### Forex sleeves to spawn (N each)

| ID | Strategy | Why |
|----|----------|-----|
| `fx_cash` | Sit USD / T-bill proxy | Control for “do nothing” |
| `fx_eq_majors` | Equal-weight long majors basket | Dumb FX exposure control |
| `fx_carry` | Long high-yield / short low-yield G10 | Classic premium; watch crash months |
| `fx_mom_ts` | Time-series momentum on EURUSD, USDJPY first | Most tradeable in recent walk-forwards |
| `fx_carry_mom` | Only trade when carry **and** momentum agree | Best documented combo |
| `fx_breakout` | Donchian/breakout on liquid pairs | Crisis-alpha cousin of CTA; test vs mom |
| `fx_ai_macro` | LLM reads rates/CPI → ranks pairs monthly | Slow sleeve; must beat carry_mom |
| `fx_house_high_rr` | Exotic / high leverage | House money only |

**Real-time:** broker/FX stream; include **swap/carry accrual** in P&L (otherwise carry looks fake).  
**No martingale / no “news scalper EA”** until a control sleeve beats majors.

---

## Cross-lane rules (same as stocks)

1. Unbounded **sim** accounts; replicate N≥20–50 per ID when comparing.  
2. Score **alpha vs lane benchmark**, max DD, kill underperformers, clone winners.  
3. Harvest >$2k → treasury → more accounts.  
4. Live crypto/FX only after paper proves edge **and** Adam Go.  
5. LLM ranks; **code** executes.

---

## What I’d prioritize first (crypto + FX)

**Crypto order:** BTC hold → funding harvest → mom+vol regime → DCA-regime → everything else.  
**FX order:** cash/majors → carry+mom combo → EURUSD/USDJPY momentum → pure carry → AI macro.

Skip “AI daytrades every alt/pair” until those beat the dumb controls.
