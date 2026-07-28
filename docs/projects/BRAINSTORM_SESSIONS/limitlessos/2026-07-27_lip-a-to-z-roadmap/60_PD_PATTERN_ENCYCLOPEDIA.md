<!-- SYNOPSIS: P&D pattern encyclopedia — identify methods, dump timing, % ups, shared vs unique -->

# Pump-and-dump pattern encyclopedia

**Goal:** Know the pattern cold — every identify path, when dump hits, how high they go, what’s shared vs unique.  
**Fence:** Identify / optional reactive trade only — never organize.  
**Labels:** KNOW = peer-reviewed / large academic samples; THINK = practitioner blogs; GUESS = low confidence.

---

## 1. Shared playbook (not unique — same skeleton every time)

Classic Telegram/Discord P&D is **stereotyped**. Coins and sizes change; the **script** does not.

```
ACCUMULATE (quiet) → COUNTDOWN (time/exchange known) → REVEAL ticker
  → RUSH BUYS (seconds) → PEAK (minutes) → DUMP → POST-MORTEM / next pump
```

| Phase | Typical length | What’s happening |
|-------|----------------|------------------|
| **Accumulation** | Hours–days (often &lt;4 days; ~70% of pre-volume in last hour before announce in one minute-level study) | Organizers (and VIPs) buy thin coin |
| **Countdown** | Hours–days before | Exchange + time announced; coin hidden |
| **Reveal / pump** | **Seconds → ~8 minutes to peak** | Market buys / rush orders; FOMO |
| **Dump** | Starts at/near peak; crash over **minutes–hours** | Organizers sell into buyers |
| **Aftermath** | Hours–2 days | Price often back near or **below** pre-pump |

**VIP vs free (structural, not unique per coin):** paid tiers get ticker **seconds–minutes earlier**; free members = exit liquidity. KNOW as business model; exact offsets vary by group.

**Two archetypes (still shared families):**
1. **Pre-accumulation** — detectable volume before reveal  
2. **On-the-spot** — little pre-volume; all action at/after reveal (~30% in one microstructure sample)

**Crowd pumps** (DOGE/Reddit) share FOMO/volume but **not** the 8-minute Telegram script — longer, messier. Classify separately.

---

## 2. When do they dump? (timing)

| Finding | Number | Source class |
|---------|--------|--------------|
| Time **signal → peak** | **Mean ~8 minutes**; **median ~1.5 minutes** | Dhawan & Putniņš (KNOW) |
| Reversal often begins | **~70 seconds** after start (avg +25% by then) | Li / Columbia Blue Sky summary of ~500 P&Ds (KNOW) |
| After 1 hour | Most of the spike **gone** | Same |
| Dump start | **At or just after peak** — organizers/VIPs selling while channel still says “HOLD” | Anatomy + practitioner (KNOW/THINK) |
| Organizer sell style | Often **into the rise** (tranches ~50–80% of peak in microstructure models) | arXiv microstructure (THINK–KNOW) |
| Full revert | Hours; sometimes 1–2 days; many coins **lower** 48h later | Hamrick/Gandal: median post vs pre **~−38% to −41%**; ~60% of coins lower post than pre (KNOW) |

**Practical dump clock for Limitless:**  
Assume peak window **1–10 minutes** after public reveal; treat **first downtick + volume still high** as dump-phase start; do **not** wait for “HOLD” messages to stop.

---

## 3. How much % do they typically go up?

**Depends how you measure — and coin popularity. Not one number.**

### A. Aggressive “manipulation day” samples (short horizon to peak)

| Stat | Value | Notes |
|------|-------|-------|
| Mean return **to peak** | **~65%** | Dhawan & Putniņš — minutes |
| Mean time to peak | **~8 min** (median **~1.5 min**) | Same |
| Manipulator avg profit | **~49%** | Same |
| Volume on pump day | **~13.5×** normal daily | Same |
| First **70 seconds** | **~+25%** avg; vol **~148×** | Li et al. style results |

### B. Broader ecosystem (5-minute jump after signal — includes “failed” / liquid coins)

| Coin popularity | Median ~5-min price jump |
|-----------------|---------------------------|
| Top ~75 coins | **~2.4–4.8%** |
| Rank &gt;500 (obscure) | **~19–23%** |
| Overall Discord median / mean | **~3.5% / ~7.4%** |
| Overall Telegram median / mean | **~5.1% / ~9.8%** |

(Hamrick / Gandal / WEIS — KNOW)

### C. Practitioner blogs

Often cite **higher** medians (e.g. 100%+). Treat as **THINK/GUESS** — selection bias toward spectacular charts.

### D. Pre-pump leak

Prices often **+~5%** with abnormal volume in **~5 minutes before** public start (insiders/VIP) — Li et al. (KNOW).

**Answer to “are % unique?”:**  
**Magnitudes are unique to each event** (liquidity, coin rank, group size, BTC regime).  
**The shape is shared:** fast spike, fast dump. Obscure coins → bigger %; majors → small %.

---

## 4. Every way to identify (checklist — stack them)

### Social / organizational
1. Countdown without ticker (“pump at 16:00 UTC on X exchange”)  
2. OCR-proof image reveal  
3. VIP tier pricing / “early signal” upsell  
4. Ban dissent; “buy hold don’t sell” spam  
5. Same channels recycling (ecosystem is **concentrated** — few channels = most pumps)  
6. Cross-post urgency on X/Reddit **after** TG (often late)  
7. No real catalyst / fake “partnership”

### Tape / microstructure
8. Volume multiple vs baseline (3–10×+; blogs 300%+ vs 7d)  
9. **Rush / market buy** burst (La Morgia features)  
10. Price velocity on thin book  
11. Buy vol ≫ sell early; reverse on dump  
12. Bid walls that **vanish** (spoof)  
13. Spread blowout  
14. Pre-pump volume anomaly (accumulation)  
15. Spillover vol on other exchanges listing same coin  

### Coin / on-chain selection
16. Low mcap / low ADV preference  
17. Few listing venues (easier to move)  
18. Holder concentration / insider wallets  
19. Coin pumped **before** on same venue (common)  
20. Ranking: obscure ≫ liquid for % size  

### ML / research detectors
21. Random Forest on 5–25s chunks (rush, vol, price std) — detect in **~5–25s**  
22. Labeled history (Sapienza CSV, academic lists) for training  
23. NLP on TG messages (countdown / reveal / cancel classes)  

### What does **not** uniquely identify
- A green candle alone  
- Reddit hype alone (often dump already on)  
- “Influencer said moon”

---

## 5. Shared vs unique — direct answer

| Question | Answer |
|----------|--------|
| Is each pump unique? | **Unique coin, size, exact %.** **Shared script and timing shape.** |
| Same dump rule? | **Yes in spirit:** dump starts near peak, usually **within minutes** of reveal; channel language lags reality. |
| Same upside? | **No.** Expect **~2–5%** on liquid majors vs **~20%+ median** (sometimes **~65% mean** in harsh thin-coin samples) on obscure targets. |
| Can we memorize one % target? | **No** — calibrate **swing_est by liquidity bucket** (exactly Limitless Protocol design). |

---

## 6. Limitless Protocol mapping

| Research | Our rule |
|----------|----------|
| Peak in ~1.5–8 min | Time-stop tight; don’t hold hours hoping |
| Dump at peak | Scale-out **before** assumed tip (60–70% of **bucket** typical swing) |
| Obscure ≫ liquid % | Separate calibrations per mcap/volume tier |
| Pre-pump +5% | Prefer detect **accumulation or rush**, not Twitter late |
| Post often −40% vs pre | Never bag-hold “for recovery” |

Devil’s advocate: Averages hide variance — some pumps are duds (+2%), some are 3× candles. Fleet + many events beats predicting one rocket.
