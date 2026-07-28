<!-- SYNOPSIS: Historical P&D identification — signals, cases, blogs/social where strategy is discussed -->

# Historical crypto pump-and-dumps — what identified them

**Date:** 2026-07-27 · For Limitless Protocol / LIP  
**Fence:** We **identify** patterns; we do **not** organize pumps.  
**Sources:** peer-reviewed / arXiv datasets + practitioner blogs (labeled KNOW / THINK).

---

## 1. Real historical pattern (what it looked like)

### Coordinated Telegram / Discord pumps (classic)

**Ground truth datasets**
- [SystemsLab Sapienza `pump_telegram.csv`](https://github.com/SystemsLab-Sapienza/pump-and-dump-dataset) — **~1,100** labeled events: `symbol, group, date, hour, exchange` (Yobit, Cryptopia, Binance, etc.)
- Example rows (KNOW — from that CSV): daily ~16:00 pumps on **Yobit** for obscure tickers (`R`, `DALC`, `LRC`, `SEL`… groups like `ATW`) starting Jan 2018
- Xu et al. “Anatomy” (arXiv 1811.10109): **412** Telegram-orchestrated events in ~8 months; one case (**BVB**): volume from ~0 → **1.41 BTC** in 15 min; price **35 → 115 sat** (~3×); **pre-pump** small volume = organizer accumulation
- La Morgia et al.: **~900** events over 3+ years monitoring; ML detects start in **~25 seconds** (F1 ~94.5% in paper)

**Market fingerprint (repeated across papers)**
1. Low-cap / thin book coin  
2. Optional **pre-pump** volume (admins buy early)  
3. Telegram/Discord “coin release” → burst of **market buy (rush) orders**  
4. Price vertical for **minutes**  
5. Dump: sell volume / crash; late buyers hold worthless bag  
6. Artificial volume often **many ×** pre-pump (Anatomy: aggregate pump-hour volume ~9× pre-pump in their sample)

### Crowd pump (different animal)

- **DOGE / XRP / GME-style**: Reddit-driven, longer horizon, not always a 15-minute Telegram coin-drop  
- Still: social heat + volume + FOMO — but more “legit_trend / meme” than classic admin dump  
- Limitless classifier should separate **classic_pd** vs **crowd_meme**

---

## 2. What actually helped identify them

| Signal | Why it works | Timing |
|--------|--------------|--------|
| **Telegram/Discord pump channels** | Ground truth for classic schemes; VIP gets ticker seconds earlier | Earliest for *organized* P&D |
| **Rush / market buy bursts** | Pump members hit market buys; rare in calm thin books | Seconds–minutes into pump |
| **Volume z-score / mult vs baseline** | Volume explodes (often 3–10×+; blogs cite 300%+ vs 7d avg) | Concurrent with pump |
| **Price velocity on low liquidity** | Small notional moves price a lot | Concurrent |
| **Buy volume > sell early; reverse on dump** | Anatomy charts show inflated buy side during pump | During / after |
| **No fundamental catalyst** | Listing/news absent; “100x / buy now” copy | Filter |
| **Mcap often &lt; ~$50M** (Victor/Hagemann-style Binance studies) | Prefer small caps | Pre-screen |
| **Order-book spoof / vanishing walls** | Practitioner (Kalena etc.) — cancel-heavy books | Advanced |
| **Holder concentration / unlock** | On-chain: few wallets can dump | Pre-screen |
| **Cross-platform hype burst** | Same urgency language on TG + X + Reddit in minutes | Mid–late (often **too late**) |

**Hard lesson from blogs (BeforePump, Markaicode, Changelly):**  
By the time the coin is **trending on public Twitter/Reddit**, organizers are often **already dumping**. Social is great for *labeling* and for *early private channels*; bad as a lone late entry signal.

**Best identify stack for LIP (THINK):**  
`Telegram/Discord monitor (public) OR rush-order tape` → confirm with volume/price → classify → small paper entries. Do **not** wait for viral Reddit alone.

---

## 3. Where people discuss this (blogs / social)

| Place | Role |
|-------|------|
| **Telegram** | Where classic pumps are *organized* (also where researchers scrape) |
| **Discord** | Same ecosystem (Hamrick / NSF “ecosystem” paper) |
| **Reddit** | Crowdsourced anomaly talk; GME/DOGE crowd pumps; Kalena: use for **timestamps**, distrust predictions |
| **X / Twitter** | Amplifier; often late |
| **Academic** | arXiv / ACM: Anatomy, La Morgia, Doge of Wall Street, Victor & Hagemann |
| **Blogs / docs** | [BlockMind — P&D signs](https://docs.blockmind.app/blog/crypto-pump-and-dump-signs), [BeforePump — detect in time](https://beforepump.com/blog/how-to-detect-crypto-pump-and-dump/), [Markaicode — social+volume](https://markaicode.com/crypto-pump-dump-prediction-ollama/), [Kalena — Reddit vs order book](https://blog.kalena.ai/crypto-market-manipulation-reddit-what-the-order-book-proves-that-thread-screenshots-never-will), [Changelly — spot & avoid](https://changelly.com/blog/what-is-pump-and-dump-in-crypto/) |
| **GitHub datasets** | Sapienza pump CSV — train/backtest labels |

Note: Many “how to profit from pumps” posts are either **victim-education** or **gray**. Our fence stays: **detect + optional reactive trade**, never join organizer groups as a participant/shill.

---

## 4. Implications for Limitless Protocol

| Current LIP scan | Gap |
|------------------|-----|
| CoinGecko 24h % + vol/mcap | Catches **aftermath / coincidental** heat; weak on **minute-scale** classic P&D |
| Need next | Labeled history from Sapienza CSV + exchange trades; **rush-order / short-window volume**; optional public TG message classifer |
| Monthly 15–20 identify target | Consistent with research averages (~11/mo classic; higher in hot windows) if we watch **channels + tape**, not only CG daily movers |

---

## 5. One concrete “could we identify it?” checklist

For any candidate (historical or live):

1. Was there a **coordinated social drop** (TG/Discord) near the spike?  
2. Did **volume** jump multiple × baseline in **minutes** with **thin book**?  
3. **Rush buys** / marketable aggression?  
4. **No** real catalyst?  
5. Did price **mean-revert hard** within hours?  

If 1+2+4+5 → strong `likely_pd`. If only Reddit heat over days → `crowd_meme` / `unclear`.

Devil’s advocate: Without Telegram or second-level tape, pure daily CoinGecko scans will **miss** most classic pumps and **false-flag** random alt volatility.
