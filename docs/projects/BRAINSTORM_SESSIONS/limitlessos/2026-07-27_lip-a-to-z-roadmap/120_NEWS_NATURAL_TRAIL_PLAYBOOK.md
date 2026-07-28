<!-- SYNOPSIS: Natural / news moves — early entry, hard stop, trailing stop -->

# Natural & news moves — get in early, hard stop, trail

**Not P&D.** This is for normal market moves: news, listings, ETF/flows, sector rotation, breakouts.

---

## Can we get in early enough?

**Sometimes — if we buy the setup, not the headline peak.**

| Too late | Early enough |
|----------|--------------|
| Buying when it’s already everywhere on Twitter/TV | Buying when price breaks a quiet range **with volume**, while the story is still forming |
| FOMO after a +30% day on no structure | First daily close above resistance + volume confirm |
| “News is out, chase” | News **expected** or first reaction **with** tape confirmation |

**Honest:** True early (hours before the world knows) needs research/feeds.  
**Practical early (what we can code):** the **breakout of accumulation** — often still early relative to the full run.

---

## What causes “normal” ups (so we know what to watch)

1. **Real news / catalyst** — ETF flows, listing, unlock done, partnership with substance, regulation clarity  
2. **BTC tide** — alts usually need BTC not crashing  
3. **Quiet buying then break** — sideways range + rising volume/OBV → expansion  
4. **Sector narrative** — AI, L2, etc., moving as a group  

If none of those → treat as noise or possible P&D (different playbook).

---

## The trade (simple)

### Buy (most of these)

```
1. Price coiled in a range (not already vertical)
2. Volume / OBV rising while price was flat-ish
3. Daily close ABOVE the range top (not just a wick)
4. That break candle has volume ≥ ~1.5× average
5. RSI > 50 (momentum flipped up)
6. BTC not in freefall
→ BUY
```

### Hard stop (protect the account)

- Place stop under the **range floor** (or ~8% below entry, whichever is tighter/safer for the coin).  
- If price closes back under the breakout level → **out** (failed break).  
- Rule: **small loss, fast.** Don’t hope.

### Trailing stop (let winners run)

Once price is up about **+8%** from entry:

```
Trail = highest price since entry × 0.92
(i.e. give back ~8% from the peak)
```

- Peak keeps ratcheting up with new highs.  
- Trail only moves **up**, never down.  
- Sell when price closes at/under the trail.

Optional: take a partial at **+15%**, let the rest trail — or run full size on trail only.

### Time stop

If nothing much happens in ~40 trading days → exit. Capital isn’t free.

---

## Picture

```
        news / flow / sector
                │
   quiet range ─┼─► BREAK + volume ──► BUY
                │         │
                │    hard stop under range
                │         │
                │    +8% → arm trailing stop
                │         │
                └── trail hit / failed break / time ──► SELL
```

---

## What we already measured (paper, 2024–2026 majors)

Same idea, daily bars, costs on (`npm run lip:blind:breakout`):

| Period | Breakout sleeve | BTC hold |
|--------|-----------------|----------|
| 2024 H1 | **~+30%** | ~+42% |
| 2024 H2 | **~+16%** | ~+48% |
| 2025 H1 | **~+5%** | ~+13% |
| 2025–26 | **~−15%** | ~−45% |

**Plain:** It can make money in bulls; it **rarely beats just holding BTC** in strong bulls; in the bad half it **lost less** than BTC. Trailing stops and failed-break exits are what keep damage bounded.

---

## News vs breakout — how they fit

| Source | How we use it |
|--------|----------------|
| **News** | Watchlist / “why might this move?” — not automatic buy |
| **Tape breakout** | Actual **entry trigger** (early enough to catch a chunk of the run) |
| **Stop + trail** | Exit system so one bad trade doesn’t wipe the sleeve |

Best combo: **know the catalyst → wait for the break → stop under → trail the rest.**

---

## Labels

- **KNOW:** Late headline chase is usually worse than structure+volume entry; our breakout sleeve was green in 3/4 halves.  
- **THINK:** Trailing after +8% with ~8% giveback is a solid default for daily crypto.  
- **DON’T KNOW:** Exact best trail % per coin until we tune more.

---

## Next

1. Keep this as the **`crypto_breakout_pre` / natural-move** sleeve (separate from P&D shorts).  
2. Optional: news feed → watchlist only; entries still require the break.  
3. Tune trail (e.g. arm at +5% / trail 6%) on a fresh half and compare.
