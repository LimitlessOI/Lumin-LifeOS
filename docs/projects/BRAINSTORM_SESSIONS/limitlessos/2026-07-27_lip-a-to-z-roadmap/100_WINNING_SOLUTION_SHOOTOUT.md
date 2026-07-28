<!-- SYNOPSIS: Volatility / funding / BTC shootout — winning LIP stack -->

# Winning solution shootout (2026-07-28)

**Command:** `npm run lip:blind:win`  
**Receipt:** `data/lip/winning-solution-shootout.json`  
**Window:** real daily majors, halves F–I (2024-01 → 2026-06)

## Do we “buy volatility”?

**No.** Volatility (ATR) tells you **how big** a move often is, not **which way**.

| Idea | Result on this window |
|------|------------------------|
| Buy dumps ≥1.5–2 ATR (mean-revert long) | Lost (BTC MR ~−7.5% compounded) |
| Short spikes ≥2 ATR | Lost (~−2% compounded) |
| Multi-asset dump buy | ~flat (safest worst-segment, not a money machine) |
| Regime BTC (hold only above 100d MA) | Cut bear bleed (−19% vs −45% on I) but **whipsawed bulls** → worse compound |
| BTC buy & hold | **Best compound ~+30%** across 4 halves; **worst half −45%** |
| Funding harvest (OKX, ~3 mo public history) | Incomplete — not a full-window proof |

## Known up / known down?

We do **not** know direction after a spike (near coin-flip). We **can** structure size: ~1 ATR take-profit, ~1.5 ATR stop, skip when ATR is exploding.

## Winning stack (operator capital)

1. **Core — BTC hold (or DCA into BTC)** when the goal is growth and drawdowns are acceptable. Won the shootout on compound return.
2. **Satellite — P&D fade-after-dump** (prior blind A–E, all green, ~+1–2%/segment). Small size. Needs shout timestamp + short ability. Not the core book.
3. **Optional later — funding harvest** (spot long + perp short when funding rich). Research-backed for steadier yield; full multi-year tape not available from public OKX here (Binance fapi geo-blocked). Prove on tip before sizing up.
4. **Do not** make “buy volatility” or daily ATR mean-reversion the main engine — it lost on 2024–26 daily.

## Labels

- **KNOW:** BTC hold beat vol overlays on compound; vol MR/fade lost; P&D fade won on labeled history.
- **THINK:** Funding is the best *risk-adjusted* candidate once full history + delta-neutral execution exist.
- **DON’T KNOW:** Live funding P&L on this machine path for 2024–25 (data gap).
