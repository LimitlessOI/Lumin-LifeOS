<!-- SYNOPSIS: Real-tape pattern study — what went up, what went down -->

# Real-tape pattern study — what went up, what went down

**Date:** 2026-07-28 · **Data:** Binance Vision 1m + Sapienza TG labels · Segments A+B · **n=47** unique announces  
**Scripts:** `scripts/lip/blind/study-patterns.mjs` · outputs `data/lip/pattern-study-real.json`, `pattern-study-deep.json`

## Headline (KNOW — this sample)

| Window | Median move |
|--------|-------------|
| **T−30 → announce** | **+12.2%** |
| **Announce → +15m** | **−5.8%** |
| Already peaked at announce | **60%** |
| Still ran ≥+5% after announce | **21%** |

The mass Telegram timestamp is usually **late**. Money on the long side was mostly **before** the label.

## What indicated “up”

1. **Volume acceleration into the announce** (median ~100× baseline in T−5…0; ~230× in T0…+3).
2. **Price drift up in the 30m before** the public/group call (median +12%).
3. **Rare post-announce runners** (EVX, STORJ, TCT, NXS…): peak in **1–3 minutes**, extreme post volume; still dumped hard after (~−17% from peak median among pumpish).

## What led “down”

1. **Buying the announce** — 60% dump ≥5% within 15m; median path keeps falling through +30m.
2. **Huge volume after T0** often = distribution, not “more bullish.”
3. **Already red by minute 2** (~49% of events) → dead-on-arrival for longs.

## Strategy results on this history (net of ~1.85% RT)

| Strategy | Median net | Win rate |
|----------|------------|----------|
| Buy T−10 → sell at announce | **+11.3%** | **91%** |
| Buy T−5 → sell at announce | **+10.3%** | **89%** |
| Short announce → cover +15m | **+3.9%** | **75%** |
| Long announce → hold 8m | **−6.9%** | **13%** |

**Caveat:** Pre-announce buy assumes you know the schedule early (VIP/channel timing). That is not the same as scanning CoinGecko after the move. Fence stays: identify patterns, never organize.

## Implications for “consistent high returns”

- **High + consistent on this labeled set** = early information long *or* modest post-announce **fade/short**.
- **Public-late long** (what we paper-traded) is a **poor** primary strategy on this history.
- Past may decay; sample is TG-labeled Binance rows we could still download — not all crypto ups/downs.

## Next bake-ins

1. Pre-announce regime detector (vol accel + drift).  
2. Announce-time: long only if flat then explodes in &lt;2m; else skip or fade.  
3. Hard abort if red by m2.  
4. Keep funding-harvest as steadier capital sleeve.
